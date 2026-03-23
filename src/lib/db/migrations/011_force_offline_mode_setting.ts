import type { Migration } from './index';

export const migration011ForceOfflineModeSetting: Migration = {
	version: 11,
	name: '011_force_offline_mode_setting',
	up: async (db) => {
		const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(user_settings)`);
		const columnNames = new Set(columns.map((column) => column.name));

		if (!columnNames.has('force_offline_mode')) {
			await db.execAsync(`
				ALTER TABLE user_settings
				ADD COLUMN force_offline_mode INTEGER NOT NULL DEFAULT 0;
			`);
		}

		await db.runAsync(
			`UPDATE user_settings
			 SET force_offline_mode = COALESCE(force_offline_mode, 0)
			 WHERE id = 'local'`
		);
	},
};
