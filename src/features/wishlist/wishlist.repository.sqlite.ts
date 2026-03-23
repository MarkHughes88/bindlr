import type { WishlistRepository } from './wishlist.repository';
import type { WishlistCardItem, WishlistSummary } from './wishlist.types';
import type { CatalogLanguage, CatalogTcg } from '@/src/domain/catalog/catalog.types';
import { getDatabase } from '@/src/lib/db/client';

function createLocalId(prefix: string): string {
	return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

type WishlistRow = {
	id: string;
	name: string;
	description: string | null;
	created_at: string;
	updated_at: string;
};

export class SqliteWishlistRepository implements WishlistRepository {
	async getWishlists(): Promise<WishlistSummary[]> {
		const db = await getDatabase();
		const rows = await db.getAllAsync<WishlistRow>(
			`SELECT id, name, description, created_at, updated_at
			 FROM wishlists
			 ORDER BY updated_at DESC`
		);

		return rows.map((row) => ({
			id: row.id,
			name: row.name,
			description: row.description,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		}));
	}

	async createWishlist(name: string, description?: string | null): Promise<WishlistSummary> {
		const db = await getDatabase();
		const now = new Date().toISOString();
		const id = createLocalId('wishlist');

		await db.runAsync(
			`INSERT INTO wishlists (id, user_id, name, description, created_at, updated_at)
			 VALUES (?, 'local', ?, ?, ?, ?)`,
			[id, name, description ?? null, now, now]
		);

		return {
			id,
			name,
			description: description ?? null,
			createdAt: now,
			updatedAt: now,
		};
	}

	async renameWishlist(wishlistId: string, name: string): Promise<void> {
		const db = await getDatabase();
		await db.runAsync(
			`UPDATE wishlists
			 SET name = ?, updated_at = ?
			 WHERE id = ?`,
			[name, new Date().toISOString(), wishlistId]
		);
	}

	async deleteWishlist(wishlistId: string): Promise<void> {
		const db = await getDatabase();
		await db.runAsync('DELETE FROM wishlists WHERE id = ?', [wishlistId]);
	}

	async addCardToWishlists(input: {
		catalogTcgCardId: string;
		tcg: CatalogTcg;
		language?: CatalogLanguage;
		wishlistIds: string[];
		variantName?: string;
	}): Promise<void> {
		if (input.wishlistIds.length === 0) {
			return;
		}

		const db = await getDatabase();
		const now = new Date().toISOString();

		for (const wishlistId of input.wishlistIds) {
			await db.runAsync(
				`INSERT OR IGNORE INTO wishlist_cards (id, wishlist_id, catalog_tcg_card_id, tcg, language, variant_name, added_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
				[
					createLocalId('wishlist-card'),
					wishlistId,
					input.catalogTcgCardId,
					input.tcg,
					input.language ?? null,
					input.variantName ?? null,
					now,
				]
			);

			await db.runAsync(
				`UPDATE wishlists
				 SET updated_at = ?
				 WHERE id = ?`,
				[now, wishlistId]
			);
		}
	}

	async removeCardFromWishlist(input: {
		catalogTcgCardId: string;
		tcg: CatalogTcg;
		language?: CatalogLanguage;
		wishlistId: string;
	}): Promise<void> {
		const db = await getDatabase();
		await db.runAsync(
			`DELETE FROM wishlist_cards
			 WHERE wishlist_id = ?
			   AND catalog_tcg_card_id = ?
			   AND tcg = ?
			   AND COALESCE(language, '') = COALESCE(?, '')`,
			[input.wishlistId, input.catalogTcgCardId, input.tcg, input.language ?? null]
		);
	}

	async getWishlistCards(wishlistId: string): Promise<WishlistCardItem[]> {
		const db = await getDatabase();
		const rows = await db.getAllAsync<{
			wishlist_id: string;
			catalog_tcg_card_id: string;
			tcg: CatalogTcg | null;
			language: CatalogLanguage | null;
			variant_name: string | null;
			added_at: string;
		}>(
			`SELECT wishlist_id, catalog_tcg_card_id, tcg, language, variant_name, added_at
			 FROM wishlist_cards
			 WHERE wishlist_id = ?
			 ORDER BY added_at DESC`,
			[wishlistId]
		);

		return rows
			.filter((row): row is typeof row & { tcg: CatalogTcg } => Boolean(row.tcg))
			.map((row) => ({
				wishlistId: row.wishlist_id,
				catalogTcgCardId: row.catalog_tcg_card_id,
				variantName: row.variant_name ?? undefined,
				tcg: row.tcg,
				language: row.language ?? undefined,
				addedAt: row.added_at,
			}));
	}

	async getWishlistsForCard(input: {
		catalogTcgCardId: string;
		tcg: CatalogTcg;
		language?: CatalogLanguage;
	}): Promise<WishlistSummary[]> {
		const db = await getDatabase();
		const rows = await db.getAllAsync<WishlistRow>(
			`SELECT w.id, w.name, w.description, w.created_at, w.updated_at
			 FROM wishlists w
			 INNER JOIN wishlist_cards wc
			 ON wc.wishlist_id = w.id
			 WHERE wc.catalog_tcg_card_id = ?
			   AND wc.tcg = ?
			   AND COALESCE(wc.language, '') = COALESCE(?, '')
			 ORDER BY w.updated_at DESC`,
			[input.catalogTcgCardId, input.tcg, input.language ?? null]
		);

		return rows.map((row) => ({
			id: row.id,
			name: row.name,
			description: row.description,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		}));
	}
}
