import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

const DATABASE_NAME = "bindlr.db";

let databasePromise: Promise<SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLiteDatabase> {
	if (!databasePromise) {
		databasePromise = openDatabaseAsync(DATABASE_NAME);
	}

	return databasePromise;
}
