import type { ImageStatus } from "@/src/shared/config/image";

export interface ImageCacheRepository {
	getImageStatus(catalogTcgCardId: string): Promise<ImageStatus>;
	setImageStatus(catalogTcgCardId: string, status: ImageStatus): Promise<void>;
	markImageFailed(catalogTcgCardId: string, failedAtIso: string): Promise<void>;
}
