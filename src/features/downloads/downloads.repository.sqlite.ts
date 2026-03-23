import { Directory, File, Paths } from 'expo-file-system';

import type { CatalogRepository } from '@/src/features/catalog/catalog.repository';
import type { CatalogLanguage, CatalogTcg } from '@/src/domain/catalog/catalog.types';
import type { CatalogTcgCardSummary } from '@/src/features/catalog/catalog.types';
import type { DownloadsRepository } from './downloads.repository';
import type {
	DownloadAssetKind,
	DownloadCardImageInput,
	DownloadEnqueueResult,
	DownloadScopeStatus,
	DownloadScopeType,
	DownloadSetImageInput,
	DownloadStatus,
	DownloadTcgImageInput,
	DownloadImageQuality,
} from './downloads.types';
import { getDatabase } from '@/src/lib/db/client';
import { createId } from '@/src/lib/db/id';

const CATALOG_PAGE_SIZE = 200;
const DOWNLOADS_DIR_NAME = 'downloads';
const CARD_IMAGES_DIR_NAME = 'cards';

type ScopeRow = {
	id: string;
	scope_type: DownloadScopeType;
	tcg: CatalogTcg;
	set_id: string;
	language: string;
	image_quality: DownloadImageQuality;
	status: DownloadScopeStatus['status'];
	requested_total: number;
	downloaded_total: number;
	failed_total: number;
};

type AssetRow = {
	id: string;
	status: DownloadStatus;
	local_uri?: string | null;
};

type JobRow = {
	id: string;
	scope_id: string;
	asset_id: string;
	source_url: string;
	tcg: CatalogTcg;
	set_id: string;
	catalog_tcg_card_id: string;
	language: string;
};

type ScopeCounts = {
	requested: number;
	downloaded: number;
	failed: number;
	running: number;
	queued: number;
};

type AssetDraft = {
	assetKind: DownloadAssetKind;
	tcg: CatalogTcg;
	setId: string;
	catalogTcgCardId: string;
	language: string;
	sourceUrl: string;
};

function toLanguageValue(language?: CatalogLanguage): string {
	return language ?? '';
}

function toScopeStatus(counts: ScopeCounts): DownloadScopeStatus['status'] {
	if (counts.requested === 0) {
		return 'idle';
	}

	if (counts.downloaded >= counts.requested) {
		return 'complete';
	}

	if (counts.running > 0) {
		return 'running';
	}

	if (counts.queued > 0) {
		return 'queued';
	}

	if (counts.failed > 0 && counts.downloaded > 0) {
		return 'partial';
	}

	if (counts.failed > 0) {
		return 'failed';
	}

	return 'idle';
}

function pickCardImageSourceUrl(card: CatalogTcgCardSummary, imageQuality: DownloadImageQuality = 'small'): string | null {
	// TODO(downloads): Route these URLs through first-party CDN/server manifests instead of raw catalog URLs.
	if (imageQuality === 'large') {
		return card.imageLarge ?? card.imageMedium ?? card.imageSmall ?? null;
	}

	if (imageQuality === 'medium') {
		return card.imageMedium ?? card.imageLarge ?? card.imageSmall ?? null;
	}

	return card.imageSmall ?? card.imageMedium ?? card.imageLarge ?? null;
}

function sanitizePathPart(value: string): string {
	if (!value) {
		return '_';
	}

	return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function inferExtensionFromUrl(url: string): string {
	const cleanUrl = url.split('?')[0] ?? '';
	const match = cleanUrl.match(/\.([a-zA-Z0-9]{2,5})$/);
	if (!match) {
		return 'jpg';
	}

	return match[1].toLowerCase();
}

function ensureCardDownloadsDirectory(): Directory {
	const cardsDir = new Directory(Paths.document, DOWNLOADS_DIR_NAME, CARD_IMAGES_DIR_NAME);
	cardsDir.create({ intermediates: true, idempotent: true });
	return cardsDir;
}

function buildCardAssetFile(input: {
	baseDir: Directory;
	tcg: CatalogTcg;
	setId: string;
	catalogTcgCardId: string;
	language: string;
	sourceUrl: string;
}): File {
	const extension = inferExtensionFromUrl(input.sourceUrl);
	const safeTcg = sanitizePathPart(input.tcg);
	const safeSetId = sanitizePathPart(input.setId || 'no-set');
	const safeCardId = sanitizePathPart(input.catalogTcgCardId);
	const safeLanguage = sanitizePathPart(input.language || 'default');
	return new File(input.baseDir, `${safeTcg}_${safeSetId}_${safeCardId}_${safeLanguage}.${extension}`);
}

async function localFileExists(uri?: string | null): Promise<boolean> {
	if (!uri) {
		return false;
	}

	return new File(uri).exists;
}

async function deleteLocalFileIfExists(uri?: string | null): Promise<void> {
	if (!uri) {
		return;
	}

	if (await localFileExists(uri)) {
		new File(uri).delete();
	}
}

export class SqliteDownloadsRepository implements DownloadsRepository {
	constructor(private readonly catalogRepository: CatalogRepository) {}

	async enqueueCardImageDownloads(input: DownloadCardImageInput): Promise<DownloadEnqueueResult> {
		const languageValue = toLanguageValue(input.language);
		const uniqueCardIds = Array.from(new Set(input.catalogTcgCardIds));
		const drafts: AssetDraft[] = [];

		for (const cardId of uniqueCardIds) {
			const resolved = await this.catalogRepository.getCatalogTcgCardById(input.tcg, cardId, input.language);
			if (!resolved) {
				continue;
			}

			const sourceUrl = pickCardImageSourceUrl({
				id: resolved.id,
				tcg: input.tcg,
				language: resolved.language,
				name: resolved.name,
				setId: resolved.setId ?? '',
				imageSmall: resolved.imageSmall,
				imageMedium: resolved.imageMedium,
				imageLarge: resolved.imageLarge,
			}, input.imageQuality ?? 'small');

			if (!sourceUrl) {
				continue;
			}

			drafts.push({
				assetKind: 'card-image',
				tcg: input.tcg,
				setId: resolved.setId ?? '',
				catalogTcgCardId: resolved.id,
				language: languageValue,
				sourceUrl,
			});
		}

		return this.enqueueScopeAssets({
			scopeType: 'card',
			tcg: input.tcg,
			setId: '',
			language: languageValue,
			imageQuality: input.imageQuality ?? 'small',
			forceRedownload: input.forceRedownload ?? false,
			drafts,
		});
	}

	async enqueueSetImageDownloads(input: DownloadSetImageInput): Promise<DownloadEnqueueResult> {
		const languageValue = toLanguageValue(input.language);
		const cards = await this.catalogRepository.getTcgCardsBySet(input.tcg, input.setId, input.language);
		const drafts: AssetDraft[] = cards
			.map((card) => {
				const sourceUrl = pickCardImageSourceUrl(card, input.imageQuality ?? 'small');
				if (!sourceUrl) {
					return null;
				}

				return {
					assetKind: 'card-image' as const,
					tcg: input.tcg,
					setId: input.setId,
					catalogTcgCardId: card.id,
					language: languageValue,
					sourceUrl,
				};
			})
			.filter((draft): draft is AssetDraft => Boolean(draft));

		return this.enqueueScopeAssets({
			scopeType: 'set',
			tcg: input.tcg,
			setId: input.setId,
			language: languageValue,
			imageQuality: input.imageQuality ?? 'small',
			forceRedownload: input.forceRedownload ?? false,
			drafts,
		});
	}

	async enqueueTcgImageDownloads(input: DownloadTcgImageInput): Promise<DownloadEnqueueResult> {
		const languageValue = toLanguageValue(input.language);
		const cards: CatalogTcgCardSummary[] = [];
		let page = 1;

		while (true) {
			const pageResult = await this.catalogRepository.getCatalogTcgCardsPage({
				page,
				pageSize: CATALOG_PAGE_SIZE,
				filters: {
					tcgs: [input.tcg],
					...(input.language ? { languages: [input.language] } : {}),
				},
			});

			cards.push(...pageResult.items);
			if (pageResult.page >= pageResult.totalPages) {
				break;
			}

			page += 1;
		}

		const drafts: AssetDraft[] = cards
			.map((card) => {
				const sourceUrl = pickCardImageSourceUrl(card, input.imageQuality ?? 'small');
				if (!sourceUrl) {
					return null;
				}

				return {
					assetKind: 'card-image' as const,
					tcg: input.tcg,
					setId: card.setId ?? '',
					catalogTcgCardId: card.id,
					language: languageValue,
					sourceUrl,
				};
			})
			.filter((draft): draft is AssetDraft => Boolean(draft));

		return this.enqueueScopeAssets({
			scopeType: 'tcg',
			tcg: input.tcg,
			setId: '',
			language: languageValue,
			imageQuality: input.imageQuality ?? 'small',
			forceRedownload: input.forceRedownload ?? false,
			drafts,
		});
	}

	async processNextJob(): Promise<boolean> {
		const db = await getDatabase();
		const now = new Date().toISOString();
		const nextJob = await db.getFirstAsync<JobRow>(
			`SELECT dj.id, dj.scope_id, dj.asset_id, dj.source_url,
			        da.tcg, da.set_id, da.catalog_tcg_card_id, da.language
			 FROM download_jobs dj
			 INNER JOIN download_assets da ON da.id = dj.asset_id
			 WHERE dj.status = 'queued'
			 ORDER BY dj.created_at ASC
			 LIMIT 1`
		);

		if (!nextJob) {
			return false;
		}

		await db.runAsync(
			`UPDATE download_jobs
			 SET status = 'running', started_at = ?, updated_at = ?, attempt_count = attempt_count + 1
			 WHERE id = ?`,
			[now, now, nextJob.id]
		);
		await db.runAsync(
			`UPDATE download_assets
			 SET status = 'running', updated_at = ?, attempt_count = attempt_count + 1
			 WHERE id = ?`,
			[now, nextJob.asset_id]
		);

		const cardDownloadsDir = ensureCardDownloadsDirectory();
		const localFile = buildCardAssetFile({
			baseDir: cardDownloadsDir,
			tcg: nextJob.tcg,
			setId: nextJob.set_id,
			catalogTcgCardId: nextJob.catalog_tcg_card_id,
			language: nextJob.language,
			sourceUrl: nextJob.source_url,
		});
		const localUri = localFile.uri;

		try {
			const downloadedFile = await File.downloadFileAsync(nextJob.source_url, localFile, {
				idempotent: true,
			});

			const localInfo = downloadedFile.info();
			if (!localInfo.exists) {
				throw new Error('Downloaded file does not exist after download.');
			}

			const fileSize = typeof localInfo.size === 'number' ? localInfo.size : null;

			const completedAt = new Date().toISOString();
			await db.runAsync(
				`UPDATE download_assets
				 SET status = 'downloaded', local_uri = ?, file_size_bytes = ?, last_error = NULL, last_error_at = NULL, downloaded_at = ?, updated_at = ?
				 WHERE id = ?`,
				[localUri, fileSize, completedAt, completedAt, nextJob.asset_id]
			);
			await db.runAsync(
				`UPDATE download_jobs
				 SET status = 'downloaded', completed_at = ?, error_message = NULL, updated_at = ?
				 WHERE id = ?`,
				[completedAt, completedAt, nextJob.id]
			);
		} catch (error) {
			if (await localFileExists(localUri)) {
				new File(localUri).delete();
			}

			const failedAt = new Date().toISOString();
			const message = error instanceof Error ? error.message : 'Unknown download failure';
			await db.runAsync(
				`UPDATE download_assets
				 SET status = 'failed', local_uri = NULL, file_size_bytes = NULL, last_error = ?, last_error_at = ?, updated_at = ?
				 WHERE id = ?`,
				[message, failedAt, failedAt, nextJob.asset_id]
			);
			await db.runAsync(
				`UPDATE download_jobs
				 SET status = 'failed', error_message = ?, completed_at = ?, updated_at = ?
				 WHERE id = ?`,
				[message, failedAt, failedAt, nextJob.id]
			);
		}

		await this.refreshScopeStatus(nextJob.scope_id);
		return true;
	}

	async getCardImageLocalUri(input: {
		tcg: CatalogTcg;
		catalogTcgCardId: string;
		setId?: string;
		language?: CatalogLanguage;
	}): Promise<string | null> {
		const db = await getDatabase();
		const row = await db.getFirstAsync<{ local_uri: string | null }>(
			`SELECT local_uri
			 FROM download_assets
			 WHERE asset_kind = 'card-image'
			   AND tcg = ?
			   AND catalog_tcg_card_id = ?
			   AND set_id = ?
			   AND language = ?
			   AND status = 'downloaded'
			 LIMIT 1`,
			[
				input.tcg,
				input.catalogTcgCardId,
				input.setId ?? '',
				input.language ?? '',
			]
		);

		if (!row?.local_uri) {
			return null;
		}

		return (await localFileExists(row.local_uri)) ? row.local_uri : null;
	}

	async getDownloadedCardCountByTcg(input: {
		tcg: CatalogTcg;
		language?: CatalogLanguage;
		imageQuality?: DownloadImageQuality;
	}): Promise<number> {
		const breakdown = await this.getDownloadedCardBreakdownByTcg({
			tcg: input.tcg,
			language: input.language,
		});

		if (input.imageQuality === 'small') {
			return breakdown.small;
		}

		if (input.imageQuality === 'medium') {
			return breakdown.medium;
		}

		if (input.imageQuality === 'large') {
			return breakdown.large;
		}

		return breakdown.total;
	}

	async getDownloadedCardBreakdownByTcg(input: {
		tcg: CatalogTcg;
		language?: CatalogLanguage;
	}): Promise<{
		total: number;
		small: number;
		medium: number;
		large: number;
	}> {
		const db = await getDatabase();
		const language = input.language ?? '';
		const languageFilterClause = language
			? ` AND da.language IN (?, '')`
			: '';
		const params = language
			? [input.tcg, language]
			: [input.tcg];
		const row = await db.getFirstAsync<{
			total: number;
			small: number;
			medium: number;
			large: number;
		}>(
			`SELECT
				COUNT(DISTINCT da.catalog_tcg_card_id) as total,
				COUNT(DISTINCT CASE
					WHEN ds.image_quality = 'small' THEN da.catalog_tcg_card_id
					WHEN ds.image_quality IS NULL
						AND (
							da.source_url LIKE '%/small%'
							OR da.source_url LIKE '%=small%'
							OR da.source_url LIKE '%_small%'
						) THEN da.catalog_tcg_card_id
					ELSE NULL
				END) as small,
				COUNT(DISTINCT CASE
					WHEN ds.image_quality = 'medium' THEN da.catalog_tcg_card_id
					WHEN ds.image_quality IS NULL
						AND (
							da.source_url LIKE '%/medium%'
							OR da.source_url LIKE '%=medium%'
							OR da.source_url LIKE '%_medium%'
						) THEN da.catalog_tcg_card_id
					ELSE NULL
				END) as medium,
				COUNT(DISTINCT CASE
					WHEN ds.image_quality = 'large' THEN da.catalog_tcg_card_id
					WHEN ds.image_quality IS NULL
						AND (
							da.source_url LIKE '%/large%'
							OR da.source_url LIKE '%=large%'
							OR da.source_url LIKE '%_large%'
						) THEN da.catalog_tcg_card_id
					ELSE NULL
				END) as large
			 FROM download_assets da
			 LEFT JOIN download_scope_assets dsa ON dsa.asset_id = da.id
			 LEFT JOIN download_scopes ds ON ds.id = dsa.scope_id
			 WHERE da.asset_kind = 'card-image'
			   AND da.tcg = ?
			   AND da.status = 'downloaded'${languageFilterClause}`,
			params
		);

		return {
			total: row?.total ?? 0,
			small: row?.small ?? 0,
			medium: row?.medium ?? 0,
			large: row?.large ?? 0,
		};
	}

	async getScopeStatus(input: {
		scopeType: DownloadScopeType;
		tcg: CatalogTcg;
		setId?: string;
		language?: CatalogLanguage;
		imageQuality?: DownloadImageQuality;
	}): Promise<DownloadScopeStatus> {
		const db = await getDatabase();
		const setId = input.setId ?? '';
		const language = input.language ?? '';
		const scope = await db.getFirstAsync<ScopeRow>(
			`SELECT id, scope_type, tcg, set_id, language, image_quality, status, requested_total, downloaded_total, failed_total
			 FROM download_scopes
			 WHERE scope_type = ? AND tcg = ? AND set_id = ? AND language = ?
			 LIMIT 1`,
			[input.scopeType, input.tcg, setId, language]
		);

		if (!scope) {
			return {
				scopeType: input.scopeType,
				tcg: input.tcg,
				setId: input.setId,
				language: input.language,
				status: 'idle',
				requestedTotal: 0,
				downloadedTotal: 0,
				failedTotal: 0,
			};
		}

		if (input.imageQuality && scope.image_quality !== input.imageQuality) {
			return {
				scopeType: scope.scope_type,
				tcg: scope.tcg,
				setId: scope.set_id || undefined,
				language: (scope.language || undefined) as CatalogLanguage | undefined,
				status: 'idle',
				qualityMismatchFrom: scope.image_quality,
				requestedTotal: 0,
				downloadedTotal: 0,
				failedTotal: 0,
			};
		}

		return {
			scopeType: scope.scope_type,
			tcg: scope.tcg,
			setId: scope.set_id || undefined,
			language: (scope.language || undefined) as CatalogLanguage | undefined,
			status: scope.status,
			requestedTotal: scope.requested_total,
			downloadedTotal: scope.downloaded_total,
			failedTotal: scope.failed_total,
		};
	}

	private async enqueueScopeAssets(input: {
		scopeType: DownloadScopeType;
		tcg: CatalogTcg;
		setId: string;
		language: string;
		imageQuality: DownloadImageQuality;
		forceRedownload: boolean;
		drafts: AssetDraft[];
	}): Promise<DownloadEnqueueResult> {
		const db = await getDatabase();
		const scopeId = await this.getOrCreateScopeId({
			scopeType: input.scopeType,
			tcg: input.tcg,
			setId: input.setId,
			language: input.language,
			imageQuality: input.imageQuality,
		});
		const scope = await db.getFirstAsync<{ image_quality: DownloadImageQuality }>(
			`SELECT image_quality
			 FROM download_scopes
			 WHERE id = ?
			 LIMIT 1`,
			[scopeId]
		);
		const isQualityChange = Boolean(scope && scope.image_quality !== input.imageQuality);
		if (isQualityChange) {
			await db.runAsync(
				`UPDATE download_scopes
				 SET image_quality = ?, updated_at = ?
				 WHERE id = ?`,
				[input.imageQuality, new Date().toISOString(), scopeId]
			);
		}
		const shouldForceRedownload = input.forceRedownload || isQualityChange;

		let queuedCount = 0;
		for (const draft of input.drafts) {
			const assetId = await this.getOrCreateAssetId(draft);
			const linkedAt = new Date().toISOString();
			await db.runAsync(
				`INSERT OR IGNORE INTO download_scope_assets (scope_id, asset_id, created_at)
				 VALUES (?, ?, ?)`,
				[scopeId, assetId, linkedAt]
			);

			const existingActiveJob = await db.getFirstAsync<{ id: string }>(
				`SELECT id
				 FROM download_jobs
				 WHERE scope_id = ? AND asset_id = ? AND status IN ('queued', 'running')
				 LIMIT 1`,
				[scopeId, assetId]
			);
			if (existingActiveJob) {
				continue;
			}

			const asset = await db.getFirstAsync<AssetRow>(
				`SELECT id, status, local_uri
				 FROM download_assets
				 WHERE id = ?
				 LIMIT 1`,
				[assetId]
			);
			if (!asset) {
				continue;
			}

			if (!shouldForceRedownload && asset.status === 'downloaded' && (await localFileExists(asset.local_uri))) {
				continue;
			}

			if (asset.status === 'downloaded' || asset.status === 'failed') {
				await deleteLocalFileIfExists(asset.local_uri);

				await db.runAsync(
					`UPDATE download_assets
					 SET status = 'queued', local_uri = NULL, file_size_bytes = NULL, updated_at = ?
					 WHERE id = ?`,
					[new Date().toISOString(), assetId]
				);
			}

			const now = new Date().toISOString();
			await db.runAsync(
				`INSERT INTO download_jobs (id, scope_id, asset_id, source_url, status, attempt_count, created_at, updated_at)
				 VALUES (?, ?, ?, ?, 'queued', 0, ?, ?)`,
				[createId('download-job'), scopeId, assetId, draft.sourceUrl, now, now]
			);
			queuedCount += 1;
		}

		const counts = await this.refreshScopeStatus(scopeId);
		return {
			scopeId,
			queuedCount,
			totalCount: counts.requested,
		};
	}

	private async getOrCreateScopeId(input: {
		scopeType: DownloadScopeType;
		tcg: CatalogTcg;
		setId: string;
		language: string;
		imageQuality: DownloadImageQuality;
	}): Promise<string> {
		const db = await getDatabase();
		const existing = await db.getFirstAsync<{ id: string }>(
			`SELECT id
			 FROM download_scopes
			 WHERE scope_type = ? AND tcg = ? AND set_id = ? AND language = ?
			 LIMIT 1`,
			[input.scopeType, input.tcg, input.setId, input.language]
		);

		if (existing) {
			return existing.id;
		}

		const now = new Date().toISOString();
		const id = createId('download-scope');
		await db.runAsync(
			`INSERT INTO download_scopes
			 (id, scope_type, tcg, set_id, language, image_quality, status, requested_total, downloaded_total, failed_total, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, 'idle', 0, 0, 0, ?, ?)`,
			[id, input.scopeType, input.tcg, input.setId, input.language, input.imageQuality, now, now]
		);

		return id;
	}

	private async getOrCreateAssetId(draft: AssetDraft): Promise<string> {
		const db = await getDatabase();
		const existing = await db.getFirstAsync<{ id: string }>(
			`SELECT id
			 FROM download_assets
			 WHERE asset_kind = ?
			   AND tcg = ?
			   AND set_id = ?
			   AND catalog_tcg_card_id = ?
			   AND language = ?
			 LIMIT 1`,
			[draft.assetKind, draft.tcg, draft.setId, draft.catalogTcgCardId, draft.language]
		);

		if (existing) {
			await db.runAsync(
				`UPDATE download_assets
				 SET source_url = ?, updated_at = ?
				 WHERE id = ?`,
				[draft.sourceUrl, new Date().toISOString(), existing.id]
			);
			return existing.id;
		}

		const now = new Date().toISOString();
		const id = createId('download-asset');
		await db.runAsync(
			`INSERT INTO download_assets
			 (id, asset_kind, tcg, set_id, catalog_tcg_card_id, language, source_url, status, attempt_count, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', 0, ?, ?)`,
			[id, draft.assetKind, draft.tcg, draft.setId, draft.catalogTcgCardId, draft.language, draft.sourceUrl, now, now]
		);

		return id;
	}

	private async refreshScopeStatus(scopeId: string): Promise<ScopeCounts> {
		const db = await getDatabase();
		const counts = await db.getFirstAsync<ScopeCounts>(
			`SELECT
				COUNT(*) AS requested,
				SUM(CASE WHEN da.status = 'downloaded' THEN 1 ELSE 0 END) AS downloaded,
				SUM(CASE WHEN da.status = 'failed' THEN 1 ELSE 0 END) AS failed,
				SUM(CASE WHEN da.status = 'running' THEN 1 ELSE 0 END) AS running,
				SUM(CASE WHEN da.status = 'queued' THEN 1 ELSE 0 END) AS queued
			 FROM download_scope_assets dsa
			 INNER JOIN download_assets da ON da.id = dsa.asset_id
			 WHERE dsa.scope_id = ?`,
			[scopeId]
		);

		const normalized: ScopeCounts = {
			requested: counts?.requested ?? 0,
			downloaded: counts?.downloaded ?? 0,
			failed: counts?.failed ?? 0,
			running: counts?.running ?? 0,
			queued: counts?.queued ?? 0,
		};
		const status = toScopeStatus(normalized);
		await db.runAsync(
			`UPDATE download_scopes
			 SET status = ?, requested_total = ?, downloaded_total = ?, failed_total = ?, updated_at = ?
			 WHERE id = ?`,
			[
				status,
				normalized.requested,
				normalized.downloaded,
				normalized.failed,
				new Date().toISOString(),
				scopeId,
			]
		);

		return normalized;
	}
}
