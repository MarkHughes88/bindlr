import type { SQLiteDatabase } from "expo-sqlite";

import { getCatalogTcgCardById, getTcgCardIndex } from "@/src/lib/catalog/catalog.lookup";
import { createId } from "@/src/lib/db/id";
import type { CatalogLanguage, CatalogTcg } from "@/src/domain/catalog/catalog.types";
import type { OwnedItem } from "@/src/features/inventory/inventory.types";

type SeedResult = {
	seeded: boolean;
	insertedInventoryCount: number;
	skippedUnavailableInventoryCount: number;
	extraHighRarityCount: number;
};

type SeedCardCandidate = {
	tcg: CatalogTcg;
	catalogTcgCardId: string;
	setId?: string;
	language: CatalogLanguage;
	rarity?: string;
};

type CatalogCardRecord = {
	id?: string;
	setId?: string;
	rarity?: string;
};

function shuffle<T>(items: T[]): T[] {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = copy[i];
		copy[i] = copy[j];
		copy[j] = temp;
	}
	return copy;
}

function pickRandom<T>(items: T[], count: number): T[] {
	if (count <= 0) return [];
	return shuffle(items).slice(0, Math.max(0, Math.min(count, items.length)));
}

function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom<T>(items: T[]): T {
	return items[randomInt(0, items.length - 1)];
}

function normalizeLanguage(tcg: CatalogTcg, language: CatalogLanguage): CatalogLanguage {
	if (tcg !== "pokemon") return "en";
	return language;
}

function getSeedCandidates(tcg: CatalogTcg, language: CatalogLanguage): SeedCardCandidate[] {
	const normalizedLanguage = normalizeLanguage(tcg, language);
	const index = getTcgCardIndex(tcg, normalizedLanguage) as Record<string, CatalogCardRecord> | null;
	if (!index) return [];

	const candidates: SeedCardCandidate[] = [];
	for (const card of Object.values(index)) {
		const id = String(card.id ?? "");
		if (!id) continue;

		const resolved = getCatalogTcgCardById(tcg, id, normalizedLanguage);
		if (!resolved) continue;

		candidates.push({
			tcg,
			catalogTcgCardId: id,
			setId: resolved.setId ?? card.setId,
			language: normalizedLanguage,
			rarity: resolved.rarity ?? card.rarity,
		});
	}

	return candidates;
}

function pickUniqueCandidates(
	candidates: SeedCardCandidate[],
	count: number,
	seen: Set<string>
): SeedCardCandidate[] {
	const picked: SeedCardCandidate[] = [];
	for (const candidate of shuffle(candidates)) {
		if (picked.length >= count) break;

		const key = `${candidate.tcg}:${candidate.language}:${candidate.catalogTcgCardId}`;
		if (seen.has(key)) continue;

		seen.add(key);
		picked.push(candidate);
	}

	return picked;
}

function randomQuantity(): number {
	return randomFrom([1, 1, 1, 1, 2, 2, 3]);
}

function randomCondition(): string {
	return randomFrom(["nm", "nm", "lp", "lp", "mp"]);
}

function toOwnedItem(candidate: SeedCardCandidate, prefix: string): OwnedItem {
	const notes = Math.random() < 0.15 ? "seeded randomized inventory" : undefined;

	return {
		id: createId(prefix),
		kind: "catalog-tcg-card",
		quantity: randomQuantity(),
		tcg: candidate.tcg,
		catalogTcgCardId: candidate.catalogTcgCardId,
		setId: candidate.setId,
		language: candidate.language,
		condition: randomCondition(),
		notes,
	};
}

function isHighRarityPokemon(rarity?: string): boolean {
	const value = (rarity ?? "").toLowerCase();
	return (
		value.includes("special illustration rare") ||
		value.includes("illustration rare") ||
		value.includes("special art rare") ||
		value === "hyper rare"
	);
}

function isLorcanaEnchanted(rarity?: string): boolean {
	return (rarity ?? "").toLowerCase() === "enchanted";
}

function isMtgFinHighRarity(card: SeedCardCandidate): boolean {
	const setId = String(card.setId ?? "").toLowerCase();
	const rarity = String(card.rarity ?? "").toLowerCase();
	if (!setId.includes("fin")) return false;
	return rarity === "rare" || rarity === "mythic";
}

function isMtgGeneralHighRarity(card: SeedCardCandidate): boolean {
	const rarity = String(card.rarity ?? "").toLowerCase();
	return rarity === "rare" || rarity === "mythic";
}

function buildRandomInventorySeed(): {
	inventory: OwnedItem[];
	skippedUnavailableInventoryCount: number;
	existingInventoryKeys: Set<string>;
} {
	const existingInventoryKeys = new Set<string>();
	const requestedByPool: { tcg: CatalogTcg; language: CatalogLanguage; count: number }[] = [
		{ tcg: "pokemon", language: "en", count: 35 },
		{ tcg: "pokemon", language: "ja", count: 20 },
		{ tcg: "mtg", language: "en", count: 25 },
		{ tcg: "lorcana", language: "en", count: 20 },
		{ tcg: "one-piece", language: "en", count: 20 },
	];

	const inventory: OwnedItem[] = [];
	let skippedUnavailableInventoryCount = 0;

	for (const pool of requestedByPool) {
		const candidates = getSeedCandidates(pool.tcg, pool.language);
		const picked = pickUniqueCandidates(candidates, pool.count, existingInventoryKeys);

		skippedUnavailableInventoryCount += Math.max(0, pool.count - picked.length);
		for (const candidate of picked) {
			inventory.push(toOwnedItem(candidate, "owned"));
		}
	}

	return {
		inventory,
		skippedUnavailableInventoryCount,
		existingInventoryKeys,
	};
}

function buildHighRarityExtras(existingKeys: Set<string>): OwnedItem[] {
	const pokemonCandidates = getSeedCandidates("pokemon", "en").filter((card) =>
		isHighRarityPokemon(card.rarity)
	);
	const lorcanaCandidates = getSeedCandidates("lorcana", "en").filter((card) =>
		isLorcanaEnchanted(card.rarity)
	);
	const mtgFinCandidates = getSeedCandidates("mtg", "en").filter((card) =>
		isMtgFinHighRarity(card)
	);

	const picked = [
		...pickRandom(pokemonCandidates, 10),
		...pickRandom(lorcanaCandidates, 10),
		...pickRandom(mtgFinCandidates, 10),
	];

	const mtgFallbackCandidates = getSeedCandidates("mtg", "en").filter((card) =>
		isMtgGeneralHighRarity(card)
	);

	const fallbackPool = [
		...pokemonCandidates,
		...lorcanaCandidates,
		...mtgFinCandidates,
		...mtgFallbackCandidates,
	];

	const deduped: SeedCardCandidate[] = [];
	const seen = new Set(existingKeys);

	for (const candidate of picked) {
		const key = `${candidate.tcg}:${candidate.language}:${candidate.catalogTcgCardId}`;
		if (seen.has(key)) continue;

		const resolved = getCatalogTcgCardById(
			candidate.tcg,
			candidate.catalogTcgCardId,
			candidate.language
		);
		if (!resolved) continue;

		seen.add(key);
		deduped.push(candidate);
	}

	if (deduped.length < 30) {
		for (const candidate of shuffle(fallbackPool)) {
			if (deduped.length >= 30) break;

			const key = `${candidate.tcg}:${candidate.language}:${candidate.catalogTcgCardId}`;
			if (seen.has(key)) continue;

			const resolved = getCatalogTcgCardById(
				candidate.tcg,
				candidate.catalogTcgCardId,
				candidate.language
			);
			if (!resolved) continue;

			seen.add(key);
			deduped.push(candidate);
		}
	}

	return deduped.map((candidate, index) => ({
		id: `seed-extra-${index + 1}-${createId("owned")}`,
		kind: "catalog-tcg-card",
		quantity: randomFrom([1, 1, 2]),
		tcg: candidate.tcg,
		catalogTcgCardId: candidate.catalogTcgCardId,
		setId: candidate.setId,
		language: candidate.language,
		condition: randomFrom(["nm", "nm", "lp"]),
		notes: "seeded high rarity",
	}));
}

function buildRandomBinders(totalInventoryCount: number): {
	id: string;
	name: string;
	currentCount: number;
	totalCapacity: number;
}[] {
	const binderNames = shuffle([
		"Main Binder",
		"Trade Binder",
		"Deck Staples",
		"Premium Hits",
		"Set Progress",
		"To Grade",
		"Duplicates",
	]);
	const capacities = [180, 360, 480, 720, 1025];

	return binderNames.slice(0, 4).map((name, index) => {
		const totalCapacity = randomFrom(capacities);
		const estimatedShare = Math.max(8, Math.floor(totalInventoryCount / 4));
		const currentCount = Math.min(totalCapacity, randomInt(estimatedShare, estimatedShare + 45));

		return {
			id: `binder-seed-${index + 1}`,
			name,
			currentCount,
			totalCapacity,
		};
	});
}

function buildRandomRecentViews(inventory: OwnedItem[], count: number): SeedCardCandidate[] {
	const candidates = inventory
		.filter(
			(item): item is OwnedItem & { tcg: CatalogTcg; catalogTcgCardId: string; language: string } =>
				item.kind === "catalog-tcg-card" &&
				Boolean(item.tcg) &&
				Boolean(item.catalogTcgCardId) &&
				Boolean(item.language)
		)
		.map((item) => ({
			tcg: item.tcg,
			catalogTcgCardId: item.catalogTcgCardId,
			setId: item.setId,
			language: (item.language === "ja" ? "ja" : "en") as CatalogLanguage,
		}));

	return pickRandom(candidates, count);
}

export async function seedDatabaseIfEmpty(db: SQLiteDatabase): Promise<SeedResult> {
	const countRow = await db.getFirstAsync<{ count: number }>(
		"SELECT COUNT(1) AS count FROM inventory_items"
	);
	const hasInventory = (countRow?.count ?? 0) > 0;
	if (hasInventory) {
		return {
			seeded: false,
			insertedInventoryCount: 0,
			skippedUnavailableInventoryCount: 0,
			extraHighRarityCount: 0,
		};
	}

	const now = new Date().toISOString();
	const randomInventorySeed = buildRandomInventorySeed();
	const validInventory = randomInventorySeed.inventory;
	const skippedUnavailableInventoryCount = randomInventorySeed.skippedUnavailableInventoryCount;
	const existingInventoryKeys = randomInventorySeed.existingInventoryKeys;

	const extraHighRarity = buildHighRarityExtras(existingInventoryKeys);
	const allInventory = [...validInventory, ...extraHighRarity];
	const seededBinders = buildRandomBinders(allInventory.length);
	const seededRecentViews = buildRandomRecentViews(allInventory, 10);

	await db.execAsync("BEGIN TRANSACTION;");
	try {
		for (const item of allInventory) {
			await db.runAsync(
				`INSERT INTO inventory_items (
					id, kind, quantity, tcg, catalog_tcg_card_id, custom_tcg_card_id,
					asset_id, set_id, language, condition, notes, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					item.id,
					item.kind,
					item.quantity,
					item.tcg ?? null,
					item.catalogTcgCardId ?? null,
					item.customTcgCardId ?? null,
					item.assetId ?? null,
					item.setId ?? null,
					item.language ?? null,
					item.condition ?? null,
					item.notes ?? null,
					now,
					now,
				]
			);
		}

		for (const binder of seededBinders) {
			await db.runAsync(
				`INSERT INTO binders (
					id, user_id, name, description, current_count, total_capacity,
					cover_image_uri, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					binder.id,
					"local",
					binder.name,
					null,
					binder.currentCount,
					binder.totalCapacity,
					null,
					now,
					now,
				]
			);
		}

		for (let index = 0; index < seededRecentViews.length; index += 1) {
			const recent = seededRecentViews[index];
			const viewedAt = new Date(Date.now() - index * 8 * 60 * 1000).toISOString();
			await db.runAsync(
				`INSERT INTO recent_tcg_card_views (
					id, kind, tcg, catalog_tcg_card_id, custom_tcg_card_id,
					language, viewed_at, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					createId("recent"),
					"catalog-tcg-card",
					recent.tcg,
					recent.catalogTcgCardId,
					null,
					recent.language,
					viewedAt,
					now,
					now,
				]
			);
		}

		const wishlistId = "seeded-high-rarity";
		await db.runAsync(
			`INSERT INTO wishlists (id, user_id, name, description, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?)`,
			[
				wishlistId,
				"local",
				"High Rarity Targets",
				"Auto-seeded wishlist of high rarity cards",
				now,
				now,
			]
		);

		for (const item of extraHighRarity.slice(0, 12)) {
			if (!item.catalogTcgCardId || !item.tcg) continue;
			await db.runAsync(
				`INSERT INTO wishlist_cards (id, wishlist_id, catalog_tcg_card_id, tcg, language, added_at)
				 VALUES (?, ?, ?, ?, ?, ?)`,
				[createId("wishlist-card"), wishlistId, item.catalogTcgCardId, item.tcg, item.language ?? null, now]
			);
		}

		await db.execAsync("COMMIT;");
	} catch (error) {
		await db.execAsync("ROLLBACK;");
		throw error;
	}

	return {
		seeded: true,
		insertedInventoryCount: allInventory.length,
		skippedUnavailableInventoryCount,
		extraHighRarityCount: extraHighRarity.length,
	};
}
