import type {
	OwnedItem,
	InventoryResolvedTcgCard,
	InventoryTcg,
	InventoryOverviewStats,
	TcgSummary,
} from "./inventory.types";

export interface InventoryRepository {
	getOwnedItems(): Promise<OwnedItem[]>;
	upsertCatalogCardOwnedItem(input: {
		tcg: InventoryTcg;
		catalogTcgCardId: string;
		language?: string;
		variantName?: string;
		quantityDelta?: number;
	}): Promise<void>;
	getCatalogCardOwnership(input: {
		tcg: InventoryTcg;
		catalogTcgCardId: string;
		language?: string;
	}): Promise<{
		totalQuantity: number;
		variants: { variantName?: string; quantity: number }[];
	}>;
	getOwnedCountByTcg(): Promise<Record<InventoryTcg, number>>;
	getOwnedUniqueCountBySet(input: { tcg: InventoryTcg; language?: string }): Promise<Record<string, number>>;
	getResolvedOwnedTcgCards(limit?: number): Promise<InventoryResolvedTcgCard[]>;
	getOverviewStats(): Promise<InventoryOverviewStats>;
	getTcgSummaries(): Promise<TcgSummary[]>;
}