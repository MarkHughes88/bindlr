import type { HomeRepository } from "./home.repository";
import type { HomeData, HomeRecentViewRecord, HomeTcgCardRailItem, RecordRecentViewInput } from "./home.types";
import type { InventoryRepository } from "@/src/features/inventory/inventory.repository";
import type { CatalogRepository } from "@/src/features/catalog/catalog.repository";
import type { BindersRepository } from "@/src/features/binders/binders.repository";
import { getDatabase } from "@/src/lib/db/client";
import { createId } from "@/src/lib/db/id";
import { getCatalogTcgCardById } from '@/src/lib/catalog/catalog.lookup';
import { resolveTcgCardImageSource } from "@/src/lib/catalog/resolveTcgCardImageSource";
import type { CatalogLanguage, CatalogTcg } from '@/src/domain/catalog/catalog.types';

type RecentViewRow = {
	id: string;
	kind: "catalog-tcg-card" | "custom-tcg-card";
	tcg: "pokemon" | "mtg" | "lorcana" | "one-piece";
	catalog_tcg_card_id: string | null;
	custom_tcg_card_id: string | null;
	language: "en" | "ja" | null;
	viewed_at: string;
};

const RECENT_VIEWS_RETENTION_LIMIT = 100;
const HOME_RAIL_LIMIT = 10;
const HOME_RUNTIME_SHUFFLE_SEED = Date.now();

type CatalogCardReferenceRow = {
	catalog_tcg_card_id: string;
	tcg: CatalogTcg | null;
	language: CatalogLanguage | null;
	added_at: string;
};

function hashString(value: string): number {
	let hash = 0;
	for (let index = 0; index < value.length; index += 1) {
		hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
	}

	return hash;
}

function orderByRuntimeShuffle<T extends { id: string }>(items: T[]): T[] {
	return [...items].sort((left, right) => (
		hashString(`${HOME_RUNTIME_SHUFFLE_SEED}:${left.id}`) - hashString(`${HOME_RUNTIME_SHUFFLE_SEED}:${right.id}`)
	));
}

function toHomeRailItem(input: {
	mode: 'wishlist' | 'missingCards';
	catalogTcgCardId: string;
	tcg: CatalogTcg;
	language?: CatalogLanguage;
	addedAt: string;
}): HomeTcgCardRailItem | null {
	const card = resolveCardByIdentity(input.tcg, input.catalogTcgCardId, input.language);
	if (!card) {
		return null;
	}

	return {
		id: `${input.mode}:${input.tcg}:${input.catalogTcgCardId}:${input.language ?? 'en'}`,
		kind: 'catalog-tcg-card',
		tcg: input.tcg,
		catalogTcgCardId: input.catalogTcgCardId,
		language: input.language,
		viewedAt: input.addedAt,
		title: card.name,
		setName: card.setName,
		number: card.number,
		imageSource: resolveTcgCardImageSource(card),
	};
}

function resolveCardByIdentity(tcg: CatalogTcg, catalogTcgCardId: string, language?: CatalogLanguage) {
	return getCatalogTcgCardById(tcg, catalogTcgCardId, language);
}

export class SqliteHomeRepository implements HomeRepository {
	constructor(
		private readonly inventoryRepository: InventoryRepository,
		private readonly catalogRepository: CatalogRepository,
		private readonly bindersRepository: BindersRepository
	) {}

	async getRecentViews(limit = 10): Promise<HomeRecentViewRecord[]> {
		const db = await getDatabase();
		const rows = await db.getAllAsync<RecentViewRow>(
			`SELECT id, kind, tcg, catalog_tcg_card_id, custom_tcg_card_id, language, viewed_at
			 FROM recent_tcg_card_views
			 ORDER BY viewed_at DESC
			 LIMIT ?`,
			[limit]
		);

		return rows
			.map((row): HomeRecentViewRecord | null => {
				if (row.kind === "catalog-tcg-card" && row.catalog_tcg_card_id) {
					return {
						id: row.id,
						kind: row.kind,
						tcg: row.tcg,
						catalogTcgCardId: row.catalog_tcg_card_id,
						language: row.language ?? undefined,
						viewedAt: row.viewed_at,
					};
				}

				if (row.kind === "custom-tcg-card" && row.custom_tcg_card_id) {
					return {
						id: row.id,
						kind: row.kind,
						tcg: row.tcg,
						customTcgCardId: row.custom_tcg_card_id,
						viewedAt: row.viewed_at,
					};
				}

				return null;
			})
			.filter((item): item is HomeRecentViewRecord => Boolean(item));
	}

	async getWishlistCards(limit?: number): Promise<HomeTcgCardRailItem[]> {
		const db = await getDatabase();
		const rows = await db.getAllAsync<CatalogCardReferenceRow>(
			`SELECT catalog_tcg_card_id, tcg, language, MAX(added_at) AS added_at
			 FROM wishlist_cards
			 WHERE tcg IS NOT NULL
			 GROUP BY catalog_tcg_card_id, tcg, COALESCE(language, '')`
		);

		const items = rows
			.filter((row): row is CatalogCardReferenceRow & { tcg: CatalogTcg } => Boolean(row.tcg))
			.map((row) => toHomeRailItem({
				mode: 'wishlist',
				catalogTcgCardId: row.catalog_tcg_card_id,
				tcg: row.tcg,
				language: row.language ?? undefined,
				addedAt: row.added_at,
			}))
			.filter((item): item is HomeTcgCardRailItem => Boolean(item));

		const ordered = orderByRuntimeShuffle(items);
		return typeof limit === 'number' ? ordered.slice(0, limit) : ordered;
	}

	async getMissingBinderCards(limit?: number): Promise<HomeTcgCardRailItem[]> {
		const db = await getDatabase();
		const rows = await db.getAllAsync<CatalogCardReferenceRow>(
			`SELECT bc.catalog_tcg_card_id, bc.tcg, bc.language, MAX(bc.added_at) AS added_at
			 FROM binder_cards bc
			 WHERE bc.tcg IS NOT NULL
			   AND NOT EXISTS (
			 	SELECT 1
			 	FROM inventory_items ii
			 	WHERE ii.kind = 'catalog-tcg-card'
			 	  AND ii.catalog_tcg_card_id = bc.catalog_tcg_card_id
			 	  AND ii.tcg = bc.tcg
			 	  AND COALESCE(ii.language, '') = COALESCE(bc.language, '')
			 	  AND ii.quantity > 0
			 )
			 GROUP BY bc.catalog_tcg_card_id, bc.tcg, COALESCE(bc.language, '')`
		);

		const items = rows
			.filter((row): row is CatalogCardReferenceRow & { tcg: CatalogTcg } => Boolean(row.tcg))
			.map((row) => toHomeRailItem({
				mode: 'missingCards',
				catalogTcgCardId: row.catalog_tcg_card_id,
				tcg: row.tcg,
				language: row.language ?? undefined,
				addedAt: row.added_at,
			}))
			.filter((item): item is HomeTcgCardRailItem => Boolean(item));

		const ordered = orderByRuntimeShuffle(items);
		return typeof limit === 'number' ? ordered.slice(0, limit) : ordered;
	}

	async recordRecentView(input: RecordRecentViewInput): Promise<void> {
		const db = await getDatabase();
		const now = new Date().toISOString();

		if (input.kind === "catalog-tcg-card") {
			const existing = await db.getFirstAsync<{ id: string }>(
				`SELECT id
				 FROM recent_tcg_card_views
				 WHERE kind = 'catalog-tcg-card'
				   AND tcg = ?
				   AND catalog_tcg_card_id = ?
				   AND COALESCE(language, '') = COALESCE(?, '')
				 LIMIT 1`,
				[input.tcg, input.catalogTcgCardId, input.language ?? null]
			);

			if (existing) {
				await db.runAsync(
					"UPDATE recent_tcg_card_views SET viewed_at = ?, updated_at = ? WHERE id = ?",
					[now, now, existing.id]
				);
			} else {
				await db.runAsync(
					`INSERT INTO recent_tcg_card_views
					 (id, kind, tcg, catalog_tcg_card_id, custom_tcg_card_id, language, viewed_at, created_at, updated_at)
					 VALUES (?, 'catalog-tcg-card', ?, ?, NULL, ?, ?, ?, ?)`,
					[
						createId("recent"),
						input.tcg,
						input.catalogTcgCardId,
						input.language ?? null,
						now,
						now,
						now,
					]
				);
			}
		} else {
			const existing = await db.getFirstAsync<{ id: string }>(
				`SELECT id
				 FROM recent_tcg_card_views
				 WHERE kind = 'custom-tcg-card'
				   AND custom_tcg_card_id = ?
				 LIMIT 1`,
				[input.customTcgCardId]
			);

			if (existing) {
				await db.runAsync(
					"UPDATE recent_tcg_card_views SET viewed_at = ?, updated_at = ? WHERE id = ?",
					[now, now, existing.id]
				);
			} else {
				await db.runAsync(
					`INSERT INTO recent_tcg_card_views
					 (id, kind, tcg, catalog_tcg_card_id, custom_tcg_card_id, language, viewed_at, created_at, updated_at)
					 VALUES (?, 'custom-tcg-card', ?, NULL, ?, NULL, ?, ?, ?)`,
					[createId("recent"), input.tcg, input.customTcgCardId, now, now, now]
				);
			}
		}

		await db.runAsync(
			`DELETE FROM recent_tcg_card_views
			 WHERE id NOT IN (
			   SELECT id FROM recent_tcg_card_views
			   ORDER BY viewed_at DESC
			   LIMIT ?
			 )`,
			[RECENT_VIEWS_RETENTION_LIMIT]
		);
	}

	async getHomeData(): Promise<HomeData> {
		const [overview, tcgSummaries, recentViewRecords, bindersData, wishlistCountRow, wishlist, missingCards] =
			await Promise.all([
				this.inventoryRepository.getOverviewStats(),
				this.inventoryRepository.getTcgSummaries(),
				this.getRecentViews(10),
				this.bindersRepository.getBindersData(),
				getDatabase().then((db) =>
					db.getFirstAsync<{ count: number }>("SELECT COUNT(1) as count FROM wishlist_cards")
				),
				this.getWishlistCards(HOME_RAIL_LIMIT),
				this.getMissingBinderCards(HOME_RAIL_LIMIT),
			]);

		const recentlyViewed = await Promise.all(
			recentViewRecords.map(async (recentView) => {
				const catalogTcgCard =
					recentView.kind === "catalog-tcg-card"
						? await this.catalogRepository.getCatalogTcgCardById(
								recentView.tcg,
								recentView.catalogTcgCardId,
								recentView.language
						  )
						: null;

				return {
					id: recentView.id,
					kind: recentView.kind,
					tcg: recentView.tcg,
					viewedAt: recentView.viewedAt,
					catalogTcgCardId:
						recentView.kind === "catalog-tcg-card"
							? recentView.catalogTcgCardId
							: undefined,
					customTcgCardId:
						recentView.kind === "custom-tcg-card"
							? recentView.customTcgCardId
							: undefined,
					language:
						recentView.kind === "catalog-tcg-card"
							? recentView.language
							: undefined,
					title:
						catalogTcgCard?.name ??
						(recentView.kind === "catalog-tcg-card"
							? recentView.catalogTcgCardId
							: recentView.id),
					setName: catalogTcgCard?.setName,
					number: catalogTcgCard?.number,
					imageSource: resolveTcgCardImageSource(catalogTcgCard),
				};
			})
		);

		return {
			overview: {
				totalOwned: overview.totalOwned,
				totalUnique: overview.totalUnique,
				totalSets: overview.totalSets,
				wishlistCount: wishlistCountRow?.count ?? 0,
			},
			binders: bindersData.binders,
			tcgs: tcgSummaries.map((tcgSummary) => ({
				id: tcgSummary.id,
				title: tcgSummary.title,
				totalOwned: tcgSummary.totalOwned,
				logoImage: tcgSummary.logoImage,
			})),
			recentlyViewed,
			wishlist,
			missingCards,
		};
	}
}