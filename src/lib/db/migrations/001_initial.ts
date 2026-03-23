import type { SQLiteDatabase } from "expo-sqlite";
import type { Migration } from "./index";

async function ensureLocalProfile(db: SQLiteDatabase): Promise<void> {
	const existing = await db.getFirstAsync<{ id: string }>(
		"SELECT id FROM user_profiles WHERE id = ? LIMIT 1",
		["local"]
	);

	if (existing) return;

	const now = new Date().toISOString();
	await db.runAsync(
		`INSERT INTO user_profiles (id, name, email, avatar_url, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		["local", "Collector", null, null, now, now]
	);
}

export const migration001Initial: Migration = {
	version: 1,
	name: "001_initial",
	up: async (db) => {
		await db.execAsync("PRAGMA foreign_keys = ON;");

		await db.execAsync(`
			CREATE TABLE IF NOT EXISTS user_profiles (
				id TEXT PRIMARY KEY NOT NULL,
				name TEXT NOT NULL,
				email TEXT,
				avatar_url TEXT,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			);

			CREATE TABLE IF NOT EXISTS wishlists (
				id TEXT PRIMARY KEY NOT NULL,
				user_id TEXT,
				name TEXT NOT NULL,
				description TEXT,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL,
				FOREIGN KEY (user_id) REFERENCES user_profiles(id)
			);

			CREATE TABLE IF NOT EXISTS wishlist_cards (
				id TEXT PRIMARY KEY NOT NULL,
				wishlist_id TEXT NOT NULL,
				catalog_tcg_card_id TEXT NOT NULL,
				added_at TEXT NOT NULL,
				FOREIGN KEY (wishlist_id) REFERENCES wishlists(id) ON DELETE CASCADE,
				UNIQUE (wishlist_id, catalog_tcg_card_id)
			);

			CREATE TABLE IF NOT EXISTS inventory_items (
				id TEXT PRIMARY KEY NOT NULL,
				kind TEXT NOT NULL,
				quantity INTEGER NOT NULL DEFAULT 1,
				tcg TEXT,
				catalog_tcg_card_id TEXT,
				custom_tcg_card_id TEXT,
				asset_id TEXT,
				set_id TEXT,
				language TEXT,
				condition TEXT,
				notes TEXT,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			);

			CREATE TABLE IF NOT EXISTS binders (
				id TEXT PRIMARY KEY NOT NULL,
				user_id TEXT,
				name TEXT NOT NULL,
				description TEXT,
				current_count INTEGER NOT NULL DEFAULT 0,
				total_capacity INTEGER NOT NULL DEFAULT 360,
				cover_image_uri TEXT,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL,
				FOREIGN KEY (user_id) REFERENCES user_profiles(id)
			);

			CREATE TABLE IF NOT EXISTS recent_tcg_card_views (
				id TEXT PRIMARY KEY NOT NULL,
				kind TEXT NOT NULL,
				tcg TEXT NOT NULL,
				catalog_tcg_card_id TEXT,
				custom_tcg_card_id TEXT,
				language TEXT,
				viewed_at TEXT NOT NULL,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			);

			CREATE TABLE IF NOT EXISTS image_cache (
				id TEXT PRIMARY KEY NOT NULL,
				tcg TEXT NOT NULL,
				catalog_tcg_card_id TEXT NOT NULL,
				image_status TEXT NOT NULL,
				cached_at TEXT,
				failed_at TEXT,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			);

			CREATE TABLE IF NOT EXISTS download_packs (
				id TEXT PRIMARY KEY NOT NULL,
				tcg TEXT NOT NULL,
				set_id TEXT,
				status TEXT NOT NULL,
				downloaded_at TEXT,
				size_bytes INTEGER,
				image_count INTEGER,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			);

			CREATE INDEX IF NOT EXISTS idx_inventory_tcg ON inventory_items (tcg);
			CREATE INDEX IF NOT EXISTS idx_inventory_card ON inventory_items (catalog_tcg_card_id);
			CREATE INDEX IF NOT EXISTS idx_binders_user ON binders (user_id);
			CREATE INDEX IF NOT EXISTS idx_recent_viewed_at ON recent_tcg_card_views (viewed_at DESC);
			CREATE INDEX IF NOT EXISTS idx_recent_catalog_lookup
			ON recent_tcg_card_views (kind, tcg, catalog_tcg_card_id, language);
			CREATE INDEX IF NOT EXISTS idx_recent_custom_lookup
			ON recent_tcg_card_views (kind, custom_tcg_card_id);
		`);

		await ensureLocalProfile(db);
	},
};
