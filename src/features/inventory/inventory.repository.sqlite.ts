import type { InventoryRepository } from "./inventory.repository";
import type { OwnedItem, InventoryTcg, InventoryResolvedTcgCard, InventoryOverviewStats, TcgSummary } from "./inventory.types";
import { getCatalogSetById, getCatalogTcgCardById } from "@/src/lib/catalog/catalog.lookup";
import { getDatabase } from "@/src/lib/db/client";
import { TCG_META } from "@/src/shared/config/tcg";
import type { CatalogLanguage } from '@/src/domain/catalog/catalog.types';

type InventoryItemRow = {
	id: string;
	kind: OwnedItem["kind"];
	quantity: number;
	tcg: InventoryTcg | null;
	catalog_tcg_card_id: string | null;
	custom_tcg_card_id: string | null;
	asset_id: string | null;
	set_id: string | null;
	language: string | null;
	condition: string | null;
	notes: string | null;
};

function mapRowToOwnedItem(row: InventoryItemRow): OwnedItem {
	return {
		id: row.id,
		kind: row.kind,
		quantity: row.quantity,
		tcg: row.tcg ?? undefined,
		catalogTcgCardId: row.catalog_tcg_card_id ?? undefined,
		customTcgCardId: row.custom_tcg_card_id ?? undefined,
		assetId: row.asset_id ?? undefined,
		setId: row.set_id ?? undefined,
		language: row.language ?? undefined,
		condition: row.condition ?? undefined,
		notes: row.notes ?? undefined,
	};
}

function emptyCounts(): Record<InventoryTcg, number> {
	return {
		pokemon: 0,
		mtg: 0,
		lorcana: 0,
		"one-piece": 0,
	};
}

function createLocalId(prefix: string): string {
	return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function toVariantNotes(variantName?: string): string | null {
	if (!variantName) {
		return null;
	}

	return `variant:${variantName}`;
}

function fromVariantNotes(notes?: string | null): string | undefined {
	if (!notes || !notes.startsWith('variant:')) {
		return undefined;
	}

	return notes.slice('variant:'.length) || undefined;
}

export class SqliteInventoryRepository implements InventoryRepository {
	async getOwnedItems(): Promise<OwnedItem[]> {
		const db = await getDatabase();
		const rows = await db.getAllAsync<InventoryItemRow>(
			`SELECT id, kind, quantity, tcg, catalog_tcg_card_id, custom_tcg_card_id,
			        asset_id, set_id, language, condition, notes
			 FROM inventory_items
			 ORDER BY updated_at DESC`
		);

		return rows.map(mapRowToOwnedItem);
	}

	async upsertCatalogCardOwnedItem(input: {
		tcg: InventoryTcg;
		catalogTcgCardId: string;
		language?: string;
		variantName?: string;
		quantityDelta?: number;
	}): Promise<void> {
		const db = await getDatabase();
		const now = new Date().toISOString();
		const variantNotes = toVariantNotes(input.variantName);
		const quantityDelta = Math.trunc(input.quantityDelta ?? 1);

		if (quantityDelta === 0) {
			return;
		}

		const existing = await db.getFirstAsync<{ id: string; quantity: number }>(
			`SELECT id, quantity
			 FROM inventory_items
			 WHERE kind = 'catalog-tcg-card'
			   AND tcg = ?
			   AND catalog_tcg_card_id = ?
			   AND COALESCE(language, '') = COALESCE(?, '')
			   AND COALESCE(notes, '') = COALESCE(?, '')
			 LIMIT 1`,
			[input.tcg, input.catalogTcgCardId, input.language ?? null, variantNotes]
		);

		if (existing) {
			const nextQuantity = existing.quantity + quantityDelta;

			if (nextQuantity <= 0) {
				await db.runAsync(
					`DELETE FROM inventory_items
					 WHERE id = ?`,
					[existing.id]
				);
				return;
			}

			await db.runAsync(
				`UPDATE inventory_items
				 SET quantity = ?, updated_at = ?
				 WHERE id = ?`,
				[nextQuantity, now, existing.id]
			);
			return;
		}

		if (quantityDelta < 0) {
			return;
		}

		await db.runAsync(
			`INSERT INTO inventory_items (
				id,
				kind,
				quantity,
				tcg,
				catalog_tcg_card_id,
				language,
				notes,
				created_at,
				updated_at
			)
			VALUES (?, 'catalog-tcg-card', ?, ?, ?, ?, ?, ?, ?)`,
			[
				createLocalId('owned-item'),
				quantityDelta,
				input.tcg,
				input.catalogTcgCardId,
				input.language ?? null,
				variantNotes,
				now,
				now,
			]
		);
	}

	async getCatalogCardOwnership(input: {
		tcg: InventoryTcg;
		catalogTcgCardId: string;
		language?: string;
	}): Promise<{
		totalQuantity: number;
		variants: { variantName?: string; quantity: number }[];
	}> {
		const db = await getDatabase();
		const rows = await db.getAllAsync<{ notes: string | null; quantity: number }>(
			`SELECT notes, COALESCE(SUM(quantity), 0) AS quantity
			 FROM inventory_items
			 WHERE kind = 'catalog-tcg-card'
			   AND tcg = ?
			   AND catalog_tcg_card_id = ?
			   AND COALESCE(language, '') = COALESCE(?, '')
			 GROUP BY COALESCE(notes, '')
			 ORDER BY MAX(updated_at) DESC`,
			[input.tcg, input.catalogTcgCardId, input.language ?? null]
		);

		const variants = rows
			.map((row) => ({
				variantName: fromVariantNotes(row.notes),
				quantity: row.quantity,
			}))
			.filter((row) => row.quantity > 0)
			.sort((left, right) => {
				if (!left.variantName && right.variantName) {
					return -1;
				}

				if (left.variantName && !right.variantName) {
					return 1;
				}

				return (left.variantName ?? '').localeCompare(right.variantName ?? '');
			});

		return {
			totalQuantity: variants.reduce((sum, variant) => sum + variant.quantity, 0),
			variants,
		};
	}

	async getOwnedCountByTcg(): Promise<Record<InventoryTcg, number>> {
		const db = await getDatabase();
		const rows = await db.getAllAsync<{ tcg: InventoryTcg; total: number }>(
			`SELECT tcg, COALESCE(SUM(quantity), 0) AS total
			 FROM inventory_items
			 WHERE kind = 'catalog-tcg-card' AND tcg IS NOT NULL
			 GROUP BY tcg`
		);

		const counts = emptyCounts();
		for (const row of rows) {
			counts[row.tcg] = row.total;
		}

		return counts;
	}

	async getOwnedUniqueCountBySet(input: { tcg: InventoryTcg; language?: string }): Promise<Record<string, number>> {
		const db = await getDatabase();
		const rows = input.language
			? await db.getAllAsync<{ catalog_tcg_card_id: string; language: string | null }>(
				`SELECT DISTINCT catalog_tcg_card_id, language
				 FROM inventory_items
				 WHERE kind = 'catalog-tcg-card'
				   AND tcg = ?
				   AND catalog_tcg_card_id IS NOT NULL
				   AND COALESCE(language, '') = COALESCE(?, '')`,
				[input.tcg, input.language]
			)
			: await db.getAllAsync<{ catalog_tcg_card_id: string; language: string | null }>(
				`SELECT DISTINCT catalog_tcg_card_id, language
				 FROM inventory_items
				 WHERE kind = 'catalog-tcg-card'
				   AND tcg = ?
				   AND catalog_tcg_card_id IS NOT NULL`,
				[input.tcg]
			);

		const counts: Record<string, number> = {};
		for (const row of rows) {
			const language = (row.language ?? undefined) as CatalogLanguage | undefined;
			const card = getCatalogTcgCardById(input.tcg, row.catalog_tcg_card_id, language);
			if (!card?.setId) {
				continue;
			}

			counts[card.setId] = (counts[card.setId] ?? 0) + 1;
		}

		return counts;
	}

	async getResolvedOwnedTcgCards(limit = 20): Promise<InventoryResolvedTcgCard[]> {
		const db = await getDatabase();
		const rows = await db.getAllAsync<InventoryItemRow>(
			`SELECT id, kind, quantity, tcg, catalog_tcg_card_id, custom_tcg_card_id,
			        asset_id, set_id, language, condition, notes
			 FROM inventory_items
			 WHERE kind = 'catalog-tcg-card' AND tcg IS NOT NULL AND catalog_tcg_card_id IS NOT NULL
			 ORDER BY updated_at DESC
			 LIMIT ?`,
			[limit]
		);

		const resolved: InventoryResolvedTcgCard[] = [];

		for (const row of rows) {
			if (!row.tcg || !row.catalog_tcg_card_id) {
				continue;
			}

			const language = (row.language ?? undefined) as "en" | "ja" | undefined;
			const card = getCatalogTcgCardById(row.tcg, row.catalog_tcg_card_id, language);
			const set = (card?.setId ?? row.set_id)
				? getCatalogSetById(row.tcg, card?.setId ?? row.set_id ?? "", language)
				: null;

			resolved.push({
				id: row.id,
				tcg: row.tcg,
				catalogTcgCardId: row.catalog_tcg_card_id,
				title: card?.name ?? row.catalog_tcg_card_id,
				setId: card?.setId ?? row.set_id ?? undefined,
				setName: set?.name ?? card?.setName,
				setSymbolImage: set?.symbolImage,
				rarity: card?.rarity,
				quantity: row.quantity,
				language: row.language ?? undefined,
				condition: row.condition ?? undefined,
				imageSmall: card?.imageSmall,
				imageMedium: card?.imageMedium,
				imageLarge: card?.imageLarge,
				imageSmallLocal: card?.imageSmallLocal,
				imageMediumLocal: card?.imageMediumLocal,
				imageLargeLocal: card?.imageLargeLocal,
			});
		}

		return resolved;
	}

	async getOverviewStats(): Promise<InventoryOverviewStats> {
		const db = await getDatabase();
		const totalOwnedRow = await db.getFirstAsync<{ total_owned: number }>(
			`SELECT COALESCE(SUM(quantity), 0) AS total_owned
			 FROM inventory_items
			 WHERE kind = 'catalog-tcg-card'`
		);

		const totalUniqueRow = await db.getFirstAsync<{ total_unique: number }>(
			`SELECT COUNT(DISTINCT (COALESCE(tcg, '') || ':' || COALESCE(catalog_tcg_card_id, '') || ':' || COALESCE(language, '')))
			 AS total_unique
			 FROM inventory_items
			 WHERE kind = 'catalog-tcg-card' AND catalog_tcg_card_id IS NOT NULL`
		);

		const totalSetsRow = await db.getFirstAsync<{ total_sets: number }>(
			`SELECT COUNT(DISTINCT (COALESCE(tcg, '') || ':' || COALESCE(set_id, '')))
			 AS total_sets
			 FROM inventory_items
			 WHERE kind = 'catalog-tcg-card' AND set_id IS NOT NULL`
		);

		return {
			totalOwned: totalOwnedRow?.total_owned ?? 0,
			totalUnique: totalUniqueRow?.total_unique ?? 0,
			totalSets: totalSetsRow?.total_sets ?? 0,
		};
	}

	async getTcgSummaries(): Promise<TcgSummary[]> {
		const counts = await this.getOwnedCountByTcg();

		return [
			{
				id: "pokemon",
				title: TCG_META.pokemon.title,
				totalOwned: counts.pokemon,
				logoImage: TCG_META.pokemon.logoImage,
			},
			{
				id: "mtg",
				title: TCG_META.mtg.title,
				totalOwned: counts.mtg,
				logoImage: TCG_META.mtg.logoImage,
			},
			{
				id: "lorcana",
				title: TCG_META.lorcana.title,
				totalOwned: counts.lorcana,
				logoImage: TCG_META.lorcana.logoImage,
			},
			{
				id: "one-piece",
				title: TCG_META["one-piece"].title,
				totalOwned: counts["one-piece"],
				logoImage: TCG_META["one-piece"].logoImage,
			},
		];
	}
}