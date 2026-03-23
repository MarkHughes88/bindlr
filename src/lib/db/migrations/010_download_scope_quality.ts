import type { Migration } from './index';

export const migration010DownloadScopeQuality: Migration = {
	version: 10,
	name: '010_download_scope_quality',
	up: async (db) => {
		const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(download_scopes)`);
		const columnNames = new Set(columns.map((column) => column.name));

		if (!columnNames.has('image_quality')) {
			await db.execAsync(`
				ALTER TABLE download_scopes
				ADD COLUMN image_quality TEXT NOT NULL DEFAULT 'small';
			`);
		}

		await db.runAsync(
			`UPDATE download_scopes
			 SET image_quality = COALESCE(image_quality, 'small')`
		);
	},
};
