import type { Migration } from './index';

export const migration006CatalogFilterPersistence: Migration = {
	version: 6,
	name: '006_catalog_filter_persistence',
	up: async (db) => {
		const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(user_settings)`);
		const columnNames = new Set(columns.map((column) => column.name));

		if (!columnNames.has('remember_catalog_filters')) {
			await db.execAsync(`
				ALTER TABLE user_settings
				ADD COLUMN remember_catalog_filters INTEGER NOT NULL DEFAULT 0;
			`);
		}

		if (!columnNames.has('last_catalog_state')) {
			await db.execAsync(`
				ALTER TABLE user_settings
				ADD COLUMN last_catalog_state TEXT;
			`);
		}

		await db.runAsync(
			`UPDATE user_settings
			 SET remember_catalog_filters = COALESCE(remember_catalog_filters, 0)
			 WHERE id = 'local'`
		);
	},
};
