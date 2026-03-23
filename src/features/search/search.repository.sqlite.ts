import type { SearchRepository } from "./search.repository";
import type { SearchData } from "./search.types";
import { getSetIndex, getTcgCardIndex } from "@/src/lib/catalog/catalog.lookup";
import { getDatabase } from "@/src/lib/db/client";
import type { CatalogTcg } from "@/src/domain/catalog/catalog.types";
import { normalizeSearchQuery } from "./search.utils";

const SEARCH_LIMIT = 50;

const TCGS: CatalogTcg[] = ["pokemon", "mtg", "lorcana", "one-piece"];

export class SqliteSearchRepository implements SearchRepository {
	async search(query: string): Promise<SearchData> {
		const trimmed = query.trim();
		if (!trimmed) {
			return { query, results: [] };
		}

		const q = normalizeSearchQuery(trimmed);
		const results: SearchData["results"] = [];

		for (const tcg of TCGS) {
			const sets = getSetIndex(tcg, "en") ?? {};
			for (const set of Object.values(sets) as any[]) {
				if (results.length >= SEARCH_LIMIT) break;
				const name = String(set.name ?? set.id ?? "");
				if (!normalizeSearchQuery(name).includes(q)) continue;

				results.push({
					id: `set:${tcg}:${set.id}`,
					title: name,
					subtitle: `${tcg.toUpperCase()} set`,
					type: "set",
				});
			}

			if (results.length >= SEARCH_LIMIT) break;

			const tcgCards = getTcgCardIndex(tcg, "en") ?? {};
			for (const card of Object.values(tcgCards) as any[]) {
				if (results.length >= SEARCH_LIMIT) break;
				const name = String(card.name ?? card.id ?? "");
				if (!normalizeSearchQuery(name).includes(q)) continue;

				results.push({
					id: card.id,
					title: name,
					subtitle: `${tcg.toUpperCase()} card`,
					imageUri: card.imageSmall ?? card.imageMedium ?? card.imageLarge,
					type: "tcg-card",
				});
			}
		}

		if (results.length < SEARCH_LIMIT) {
			const db = await getDatabase();
			const binders = await db.getAllAsync<{ id: string; name: string }>(
				`SELECT id, name
				 FROM binders
				 WHERE LOWER(name) LIKE LOWER(?)
				 ORDER BY updated_at DESC
				 LIMIT ?`,
				[`%${trimmed}%`, SEARCH_LIMIT - results.length]
			);

			for (const binder of binders) {
				results.push({
					id: binder.id,
					title: binder.name,
					subtitle: "Binder",
					type: "binder",
				});
			}
		}

		return { query: trimmed, results };
	}
}