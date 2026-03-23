import { SQLiteDatabase } from 'expo-sqlite';
import type { Migration } from './index';

async function createFavoriteSetsTable(db: SQLiteDatabase): Promise<void> {
	await db.execAsync(`
		CREATE TABLE IF NOT EXISTS favorite_sets (
			tcg TEXT NOT NULL,
			set_id TEXT NOT NULL,
			is_favorite INTEGER NOT NULL DEFAULT 1,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (tcg, set_id)
		);
	`);
}

export const migration004FavoriteSets: Migration = {
	version: 4,
	name: 'favorite_sets',
	up: createFavoriteSetsTable,
};
