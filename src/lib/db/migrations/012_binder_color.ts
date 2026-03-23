import type { Migration } from './index';

export const migration012BinderColor: Migration = {
	version: 12,
	name: '012_binder_color',
	up: async (db) => {
		const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(binders)`);
		const columnNames = new Set(columns.map((col) => col.name));

		if (!columnNames.has('color')) {
			await db.execAsync(`ALTER TABLE binders ADD COLUMN color TEXT;`);
		}
	},
};
