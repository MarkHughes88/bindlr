import type { SQLiteDatabase } from 'expo-sqlite';
import type { Migration } from './index';

type TableInfoRow = {
	name: string;
};

export const migration008DownloadAssetLocalPaths: Migration = {
	version: 8,
	name: '008_download_asset_local_paths',
	up: async (db: SQLiteDatabase) => {
		const columns = await db.getAllAsync<TableInfoRow>("PRAGMA table_info('download_assets')");
		const names = new Set(columns.map((column) => column.name));

		if (!names.has('local_uri')) {
			await db.runAsync('ALTER TABLE download_assets ADD COLUMN local_uri TEXT');
		}

		if (!names.has('file_size_bytes')) {
			await db.runAsync('ALTER TABLE download_assets ADD COLUMN file_size_bytes INTEGER');
		}
	},
};
