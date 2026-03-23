import type { SQLiteDatabase } from 'expo-sqlite';
import type { Migration } from './index';

type TableColumnInfo = {
	name: string;
};

async function hasColumn(db: SQLiteDatabase, table: string, column: string): Promise<boolean> {
	const rows = await db.getAllAsync<TableColumnInfo>(`PRAGMA table_info(${table})`);
	return rows.some((row) => row.name === column);
}

export const migration002CardDestinations: Migration = {
	version: 2,
	name: '002_card_destinations',
	up: async (db) => {
		await db.execAsync('PRAGMA foreign_keys = ON;');

		if (!(await hasColumn(db, 'wishlist_cards', 'variant_name'))) {
			await db.execAsync('ALTER TABLE wishlist_cards ADD COLUMN variant_name TEXT;');
		}

		await db.execAsync(`
			CREATE TABLE IF NOT EXISTS binder_cards (
				id TEXT PRIMARY KEY NOT NULL,
				binder_id TEXT NOT NULL,
				catalog_tcg_card_id TEXT NOT NULL,
				variant_name TEXT,
				slot_index INTEGER NOT NULL,
				added_at TEXT NOT NULL,
				FOREIGN KEY (binder_id) REFERENCES binders(id) ON DELETE CASCADE,
				UNIQUE (binder_id, slot_index)
			);

			CREATE INDEX IF NOT EXISTS idx_binder_cards_binder ON binder_cards (binder_id);
		`);
	},
};
