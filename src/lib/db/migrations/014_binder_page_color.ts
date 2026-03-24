import type { Migration } from './index';

export const migration014BinderPageColor: Migration = {
	version: 14,
	name: '014_binder_page_color',
	up: async (db) => {
		const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(binders)`);
		const columnNames = new Set(columns.map((col) => col.name));

		if (!columnNames.has('page_color')) {
			await db.execAsync(`ALTER TABLE binders ADD COLUMN page_color TEXT;`);
		}
	},
};
