import type { CatalogLanguage, CatalogTcg } from '@/src/domain/catalog/catalog.types';

export type DownloadImageQuality = 'small' | 'medium' | 'large';

export type DownloadScopeType = 'card' | 'set' | 'tcg';

export type DownloadAssetKind = 'card-image';

export type DownloadStatus = 'queued' | 'running' | 'downloaded' | 'failed';

export type DownloadScopeStatus = {
	scopeType: DownloadScopeType;
	tcg: CatalogTcg;
	setId?: string;
	language?: CatalogLanguage;
	status: 'idle' | 'queued' | 'running' | 'partial' | 'complete' | 'failed';
	qualityMismatchFrom?: DownloadImageQuality;
	requestedTotal: number;
	downloadedTotal: number;
	failedTotal: number;
};

export type DownloadCardImageInput = {
	tcg: CatalogTcg;
	catalogTcgCardIds: string[];
	language?: CatalogLanguage;
	imageQuality?: DownloadImageQuality;
	forceRedownload?: boolean;
};

export type DownloadSetImageInput = {
	tcg: CatalogTcg;
	setId: string;
	language?: CatalogLanguage;
	imageQuality?: DownloadImageQuality;
	forceRedownload?: boolean;
};

export type DownloadTcgImageInput = {
	tcg: CatalogTcg;
	language?: CatalogLanguage;
	imageQuality?: DownloadImageQuality;
	forceRedownload?: boolean;
};

export type DownloadEnqueueResult = {
	scopeId: string;
	queuedCount: number;
	totalCount: number;
};
