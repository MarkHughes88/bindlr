import { getDatabase } from "@/src/lib/db/client";
import { migrations } from "@/src/lib/db/migrations";
import { seedDatabaseIfEmpty } from "@/src/lib/db/seed";

let hasInitialized = false;

/**
 * Initializes local database and applies pending migrations.
 * Safe to call multiple times; migration work runs once per app start.
 */
export async function initDatabase(): Promise<void> {
	if (hasInitialized) {
		return;
	}

	const db = await getDatabase();

	await db.execAsync(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY NOT NULL,
			name TEXT NOT NULL,
			applied_at TEXT NOT NULL
		);
	`);

	const appliedRows = await db.getAllAsync<{ version: number }>(
		"SELECT version FROM schema_migrations"
	);
	const applied = new Set(appliedRows.map((row) => row.version));

	for (const migration of migrations) {
		if (applied.has(migration.version)) {
			continue;
		}

		await migration.up(db);
		await db.runAsync(
			"INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)",
			[migration.version, migration.name, new Date().toISOString()]
		);
	}

	if (__DEV__) {
		const seedResult = await seedDatabaseIfEmpty(db);
		if (seedResult.seeded) {
			console.log(
				`[db-seed] inserted ${seedResult.insertedInventoryCount} inventory items ` +
					`(${seedResult.extraHighRarityCount} high-rarity extras, ` +
					`${seedResult.skippedUnavailableInventoryCount} skipped unavailable catalog picks)`
			);
		}
	}

	hasInitialized = true;
}
