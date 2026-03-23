import type { SQLiteDatabase } from 'expo-sqlite';
import type { Migration } from './index';

type TableColumnInfo = {
	name: string;
};

async function hasColumn(db: SQLiteDatabase, table: string, column: string): Promise<boolean> {
	const rows = await db.getAllAsync<TableColumnInfo>(`PRAGMA table_info(${table})`);
	return rows.some((row) => row.name === column);
}

export const migration005CardIdentity: Migration = {
	version: 5,
	name: '005_card_identity',
	up: async (db) => {
		await db.execAsync('PRAGMA foreign_keys = ON;');

		if (!(await hasColumn(db, 'wishlist_cards', 'tcg'))) {
			await db.execAsync('ALTER TABLE wishlist_cards ADD COLUMN tcg TEXT;');
		}

		if (!(await hasColumn(db, 'wishlist_cards', 'language'))) {
			await db.execAsync('ALTER TABLE wishlist_cards ADD COLUMN language TEXT;');
		}

		if (!(await hasColumn(db, 'binder_cards', 'tcg'))) {
			await db.execAsync('ALTER TABLE binder_cards ADD COLUMN tcg TEXT;');
		}

		if (!(await hasColumn(db, 'binder_cards', 'language'))) {
			await db.execAsync('ALTER TABLE binder_cards ADD COLUMN language TEXT;');
		}

		await db.execAsync(`
			UPDATE wishlist_cards
			SET tcg = (
				SELECT ii.tcg
				FROM inventory_items ii
				WHERE ii.kind = 'catalog-tcg-card'
				  AND ii.catalog_tcg_card_id = wishlist_cards.catalog_tcg_card_id
				  AND ii.tcg IS NOT NULL
				GROUP BY ii.catalog_tcg_card_id, ii.tcg
				HAVING COUNT(DISTINCT ii.tcg) = 1
				LIMIT 1
			)
			WHERE tcg IS NULL;

			UPDATE wishlist_cards
			SET language = (
				SELECT ii.language
				FROM inventory_items ii
				WHERE ii.kind = 'catalog-tcg-card'
				  AND ii.catalog_tcg_card_id = wishlist_cards.catalog_tcg_card_id
				  AND ii.tcg = wishlist_cards.tcg
				GROUP BY ii.catalog_tcg_card_id, ii.tcg, COALESCE(ii.language, '')
				HAVING COUNT(DISTINCT COALESCE(ii.language, '')) = 1
				LIMIT 1
			)
			WHERE language IS NULL;

			UPDATE binder_cards
			SET tcg = (
				SELECT ii.tcg
				FROM inventory_items ii
				WHERE ii.kind = 'catalog-tcg-card'
				  AND ii.catalog_tcg_card_id = binder_cards.catalog_tcg_card_id
				  AND ii.tcg IS NOT NULL
				GROUP BY ii.catalog_tcg_card_id, ii.tcg
				HAVING COUNT(DISTINCT ii.tcg) = 1
				LIMIT 1
			)
			WHERE tcg IS NULL;

			UPDATE binder_cards
			SET language = (
				SELECT ii.language
				FROM inventory_items ii
				WHERE ii.kind = 'catalog-tcg-card'
				  AND ii.catalog_tcg_card_id = binder_cards.catalog_tcg_card_id
				  AND ii.tcg = binder_cards.tcg
				GROUP BY ii.catalog_tcg_card_id, ii.tcg, COALESCE(ii.language, '')
				HAVING COUNT(DISTINCT COALESCE(ii.language, '')) = 1
				LIMIT 1
			)
			WHERE language IS NULL;
		`);
	},
};