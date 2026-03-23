import type { SQLiteDatabase } from 'expo-sqlite';
import type { Migration } from './index';

export const migration007DownloadsFoundation: Migration = {
	version: 7,
	name: '007_downloads_foundation',
	up: async (db: SQLiteDatabase) => {
		await db.execAsync(`
			CREATE TABLE IF NOT EXISTS download_scopes (
				id TEXT PRIMARY KEY NOT NULL,
				scope_type TEXT NOT NULL,
				tcg TEXT NOT NULL,
				set_id TEXT NOT NULL DEFAULT '',
				language TEXT NOT NULL DEFAULT '',
				status TEXT NOT NULL,
				requested_total INTEGER NOT NULL DEFAULT 0,
				downloaded_total INTEGER NOT NULL DEFAULT 0,
				failed_total INTEGER NOT NULL DEFAULT 0,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL,
				UNIQUE(scope_type, tcg, set_id, language)
			);

			CREATE TABLE IF NOT EXISTS download_assets (
				id TEXT PRIMARY KEY NOT NULL,
				asset_kind TEXT NOT NULL,
				tcg TEXT NOT NULL,
				set_id TEXT NOT NULL DEFAULT '',
				catalog_tcg_card_id TEXT NOT NULL DEFAULT '',
				language TEXT NOT NULL DEFAULT '',
				source_url TEXT NOT NULL,
				status TEXT NOT NULL,
				attempt_count INTEGER NOT NULL DEFAULT 0,
				last_error TEXT,
				last_error_at TEXT,
				downloaded_at TEXT,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL,
				UNIQUE(asset_kind, tcg, set_id, catalog_tcg_card_id, language)
			);

			CREATE TABLE IF NOT EXISTS download_scope_assets (
				scope_id TEXT NOT NULL,
				asset_id TEXT NOT NULL,
				created_at TEXT NOT NULL,
				PRIMARY KEY (scope_id, asset_id),
				FOREIGN KEY (scope_id) REFERENCES download_scopes(id) ON DELETE CASCADE,
				FOREIGN KEY (asset_id) REFERENCES download_assets(id) ON DELETE CASCADE
			);

			CREATE TABLE IF NOT EXISTS download_jobs (
				id TEXT PRIMARY KEY NOT NULL,
				scope_id TEXT NOT NULL,
				asset_id TEXT NOT NULL,
				source_url TEXT NOT NULL,
				status TEXT NOT NULL,
				attempt_count INTEGER NOT NULL DEFAULT 0,
				error_message TEXT,
				started_at TEXT,
				completed_at TEXT,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL,
				FOREIGN KEY (scope_id) REFERENCES download_scopes(id) ON DELETE CASCADE,
				FOREIGN KEY (asset_id) REFERENCES download_assets(id) ON DELETE CASCADE,
				UNIQUE(scope_id, asset_id)
			);

			CREATE INDEX IF NOT EXISTS idx_download_scopes_lookup
				ON download_scopes (scope_type, tcg, set_id, language);

			CREATE INDEX IF NOT EXISTS idx_download_assets_lookup
				ON download_assets (tcg, set_id, catalog_tcg_card_id, language, status);

			CREATE INDEX IF NOT EXISTS idx_download_jobs_status_created
				ON download_jobs (status, created_at);
		`);
	},
};
