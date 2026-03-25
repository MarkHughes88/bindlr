import type { Migration } from './index';

export const migration013BinderInsideColor: Migration = {
	version: 13,
	name: '013_binder_inside_color',
	up: async (db) => {
		const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(binders)`);
		const columnNames = new Set(columns.map((col) => col.name));

		if (!columnNames.has('inside_color')) {
			await db.execAsync(`ALTER TABLE binders ADD COLUMN inside_color TEXT;`);
		}
	},
};
