import type { CatalogLanguage, CatalogTcg } from '@/src/domain/catalog/catalog.types';
import type { WishlistCardItem, WishlistSummary } from "./wishlist.types";

export interface WishlistRepository {
	getWishlists(): Promise<WishlistSummary[]>;
	createWishlist(name: string, description?: string | null): Promise<WishlistSummary>;
	renameWishlist(wishlistId: string, name: string): Promise<void>;
	deleteWishlist(wishlistId: string): Promise<void>;

	addCardToWishlists(input: {
		catalogTcgCardId: string;
		tcg: CatalogTcg;
		language?: CatalogLanguage;
		wishlistIds: string[];
		variantName?: string;
	}): Promise<void>;
	removeCardFromWishlist(input: {
		catalogTcgCardId: string;
		tcg: CatalogTcg;
		language?: CatalogLanguage;
		wishlistId: string;
	}): Promise<void>;

	getWishlistCards(wishlistId: string): Promise<WishlistCardItem[]>;
	getWishlistsForCard(input: {
		catalogTcgCardId: string;
		tcg: CatalogTcg;
		language?: CatalogLanguage;
	}): Promise<WishlistSummary[]>;
}
