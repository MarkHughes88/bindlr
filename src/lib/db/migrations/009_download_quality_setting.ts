import type { Migration } from './index';

export const migration009DownloadQualitySetting: Migration = {
	version: 9,
	name: '009_download_quality_setting',
	up: async (db) => {
		const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(user_settings)`);
		const columnNames = new Set(columns.map((column) => column.name));

		if (!columnNames.has('download_image_quality')) {
			await db.execAsync(`
				ALTER TABLE user_settings
				ADD COLUMN download_image_quality TEXT NOT NULL DEFAULT 'small';
			`);
		}

		await db.runAsync(
			`UPDATE user_settings
			 SET download_image_quality = COALESCE(download_image_quality, 'small')
			 WHERE id = 'local'`
		);
	},
};