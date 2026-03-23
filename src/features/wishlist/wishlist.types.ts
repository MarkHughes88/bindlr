import type { CatalogLanguage, CatalogTcg } from "@/src/domain/catalog/catalog.types";

export type WishlistSummary = {
	id: string;
	name: string;
	description?: string | null;
	createdAt: string;
	updatedAt: string;
};

export type WishlistCardItem = {
	wishlistId: string;
	catalogTcgCardId: string;
	tcg: CatalogTcg;
	variantName?: string;
	language?: CatalogLanguage;
	addedAt: string;
};
