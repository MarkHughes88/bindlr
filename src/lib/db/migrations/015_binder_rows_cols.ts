import type { Migration } from './index';

export const migration015BinderRowsCols: Migration = {
  version: 15,
  name: '015_binder_rows_cols',
  up: async (db) => {
    const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(binders)`);
    const columnNames = new Set(columns.map((col) => col.name));

    if (!columnNames.has('rows')) {
      await db.execAsync(`ALTER TABLE binders ADD COLUMN rows INTEGER DEFAULT 3;`);
    }
    if (!columnNames.has('columns')) {
      await db.execAsync(`ALTER TABLE binders ADD COLUMN columns INTEGER DEFAULT 3;`);
    }
  },
};
