import type { CatalogLanguage, CatalogTcg } from '@/src/domain/catalog/catalog.types';
import type { BindersData } from "./binders.types";

export interface BindersRepository {
	getBindersData(): Promise<BindersData>;
	createBinder(input: {
		name: string;
		description?: string | null;
		totalCapacity?: number;
	}): Promise<{ id: string; name: string; currentCount: number; totalCapacity: number }>;
	getBinderById(binderId: string): Promise<{ id: string; name: string; currentCount: number; totalCapacity: number; color: string | null; coverImageUri: string | null } | null>;
	updateBinderCover(binderId: string, update: { color?: string | null; coverImageUri?: string | null }): Promise<void>;
	addCardToFirstFreeSlot(input: {
		binderId: string;
		catalogTcgCardId: string;
		tcg: CatalogTcg;
		language?: CatalogLanguage;
		variantName?: string;
	}): Promise<{ added: boolean; reason?: 'full' | 'missing' }>;
	deleteBinders(binderIds: string[]): Promise<void>;
}