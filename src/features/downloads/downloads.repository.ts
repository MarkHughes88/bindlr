import type { CatalogLanguage, CatalogTcg } from '@/src/domain/catalog/catalog.types';
import type {
	DownloadCardImageInput,
	DownloadEnqueueResult,
	DownloadImageQuality,
	DownloadScopeStatus,
	DownloadSetImageInput,
	DownloadTcgImageInput,
} from './downloads.types';

export interface DownloadsRepository {
	enqueueCardImageDownloads(input: DownloadCardImageInput): Promise<DownloadEnqueueResult>;
	enqueueSetImageDownloads(input: DownloadSetImageInput): Promise<DownloadEnqueueResult>;
	enqueueTcgImageDownloads(input: DownloadTcgImageInput): Promise<DownloadEnqueueResult>;
	processNextJob(): Promise<boolean>;
	getDownloadedCardCountByTcg(input: {
		tcg: CatalogTcg;
		language?: CatalogLanguage;
		imageQuality?: DownloadImageQuality;
	}): Promise<number>;
	getDownloadedCardBreakdownByTcg(input: {
		tcg: CatalogTcg;
		language?: CatalogLanguage;
	}): Promise<{
		total: number;
		small: number;
		medium: number;
		large: number;
	}>;
	getCardImageLocalUri(input: {
		tcg: CatalogTcg;
		catalogTcgCardId: string;
		setId?: string;
		language?: CatalogLanguage;
	}): Promise<string | null>;
	getScopeStatus(input: {
		scopeType: 'card' | 'set' | 'tcg';
		tcg: CatalogTcg;
		setId?: string;
		language?: CatalogLanguage;
		imageQuality?: DownloadImageQuality;
	}): Promise<DownloadScopeStatus>;
}
