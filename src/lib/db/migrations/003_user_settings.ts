import type { Migration } from './index';

export const migration003UserSettings: Migration = {
	version: 3,
	name: '003_user_settings',
	up: async (db) => {
		await db.execAsync(`
			CREATE TABLE IF NOT EXISTS user_settings (
				id TEXT PRIMARY KEY NOT NULL,
				display_name TEXT NOT NULL,
				handle TEXT NOT NULL,
				email TEXT NOT NULL,
				avatar_initials TEXT NOT NULL,
				avatar_color TEXT NOT NULL,
				avatar_image_uri TEXT,
				default_tcg TEXT NOT NULL,
				preferred_language TEXT NOT NULL,
				ownership_mode TEXT NOT NULL,
				set_scope TEXT NOT NULL,
				updated_at TEXT NOT NULL
			);
		`);

		const existing = await db.getFirstAsync<{ id: string }>(
			`SELECT id FROM user_settings WHERE id = 'local' LIMIT 1`
		);

		if (!existing) {
			await db.runAsync(
				`INSERT INTO user_settings (
					id,
					display_name,
					handle,
					email,
					avatar_initials,
					avatar_color,
					avatar_image_uri,
					default_tcg,
					preferred_language,
					ownership_mode,
					set_scope,
					updated_at
				)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					'local',
					'Anonymous User',
					'@collector',
					'user@bindlr.local',
					'AU',
					'#2EC4B6',
					null,
					'',
					'',
					'',
					'',
					new Date().toISOString(),
				]
			);
		}
	},
};
