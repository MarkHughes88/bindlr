import type {
	CatalogCardFacets,
	CatalogCardFilters,
	CatalogLanguage,
	CatalogOwnershipMode,
	CatalogTcgCardPage,
	CatalogRepository,
	CatalogResolvedTcgCard,
	CatalogResolvedSet,
	CatalogTcgCardSortDirection,
	CatalogTcgCardSortKey,
	CatalogSetSummary,
	CatalogTcgCardSummary,
	CatalogTcg,
} from "./catalog.types";
import {
	getCatalogSetById,
	getCatalogTcgCardById,
	getSetIndex,
	getTcgCardIndex,
} from "@/src/lib/catalog/catalog.lookup";
import { normalizeSearchQuery, matchesSearchValue } from "@/src/features/search/search.utils";
import { sortCatalogTcgCards } from "./catalog.sort";
import { getTcgTitle } from '@/src/shared/config/tcg';
import { getDatabase } from '@/src/lib/db/client';
import {
	GAME_SPECIFIC_FILTER_DESCRIPTORS,
	type CatalogGameSpecificFilterKey,
	toScopedGameSpecificValue,
	matchesGameSpecificSelections,
} from './catalog.gameSpecific';
import { compareFacetLabels } from './catalog.facetSort';

const ENABLE_CATALOG_PROFILING = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

function nowMs(): number {
	if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
		return performance.now();
	}

	return Date.now();
}

function logCatalogProfile(label: string, startTime: number, details?: Record<string, string | number | boolean>) {
	if (!ENABLE_CATALOG_PROFILING) {
		return;
	}

	const durationMs = Math.round((nowMs() - startTime) * 100) / 100;
	if (!details) {
		console.info(`[catalog-profile] ${label}: ${durationMs}ms`);
		return;
	}

	const detailText = Object.entries(details)
		.map(([key, value]) => `${key}=${String(value)}`)
		.join(' ');
	console.info(`[catalog-profile] ${label}: ${durationMs}ms ${detailText}`);
}

function mapSetToSummary(
	tcg: CatalogTcg,
	set: any
): CatalogSetSummary {
	return {
		id: set.id,
		tcg,
		language: set.language,
		name: set.name ?? set.id,
		series: set.series,
		releaseDate: set.releaseDate,
		totalTcgCards: set.tcgCardCount ?? set.cardCount ?? 0,
		logoImage: set.logoImage,
		symbolImage: set.symbolImage,
		logoImageLocal: set.logoImageLocal,
		symbolImageLocal: set.symbolImageLocal,
	};
}

function mapTcgCardToSummary(
	tcg: CatalogTcg,
	tcgCard: any,
	setName?: string,
	setReleaseDate?: string,
): CatalogTcgCardSummary {
	const pokemonNationalPokedexNumber =
		tcg === 'pokemon' && Array.isArray(tcgCard.attributes?.nationalPokedexNumbers)
			? tcgCard.attributes.nationalPokedexNumbers[0]
			: undefined;

	return {
		id: tcgCard.id,
		tcg,
		language: tcgCard.language,
		name: tcgCard.name ?? tcgCard.id,
		number: tcgCard.number ?? tcgCard.localId,
		rarity: tcgCard.rarity,
		subtypes: Array.isArray(tcgCard.subtypes) ? tcgCard.subtypes : undefined,
		attributes: tcgCard.attributes
			? ({ tcg, ...tcgCard.attributes } as CatalogTcgCardSummary['attributes'])
			: undefined,
		types: Array.isArray(tcgCard.types) ? tcgCard.types : undefined,
		setReleaseDate,
		pokemonNationalPokedexNumber,
		imageSmall: tcgCard.imageSmall,
		imageMedium: tcgCard.imageMedium,
		imageLarge: tcgCard.imageLarge,
		imageSmallLocal: tcgCard.imageSmallLocal,
		imageMediumLocal: tcgCard.imageMediumLocal,
		imageLargeLocal: tcgCard.imageLargeLocal,
		setId: tcgCard.setId,
		setName,
	};
}

const ALL_TCGS: CatalogTcg[] = ["pokemon", "mtg", "lorcana", "one-piece"];
const ALL_LANGUAGES: CatalogLanguage[] = ['en', 'ja'];

type OwnedCatalogRow = {
	tcg: CatalogTcg;
	catalog_tcg_card_id: string;
	language: string;
	total: number;
};

type OwnedCatalogLookup = {
	exact: Set<string>;
	anyLanguage: Set<string>;
};

type TcgLanguageCatalogIndex = {
	cardsByScopedId: Map<string, CatalogTcgCardSummary>;
	allScopedIds: Set<string>;
	bySetId: Map<string, Set<string>>;
	byRarityKey: Map<string, Set<string>>;
	byCardTypeKey: Map<string, Set<string>>;
	byGameSpecificKey: Record<CatalogGameSpecificFilterKey, Map<string, Set<string>>>;
};

const tcgLanguageIndexCache = new Map<string, TcgLanguageCatalogIndex>();

const FILTERED_CARDS_CACHE_LIMIT = 48;
const FILTERED_CARDS_CACHE_TTL_MS = 2500;
type FilteredCardsCacheEntry = {
	promise: Promise<CatalogTcgCardSummary[]>;
	createdAt: number;
};
const filteredCardsCache = new Map<string, FilteredCardsCacheEntry>();

function normalizeFilterArray(values?: string[]): string[] | undefined {
	if (!values || values.length === 0) {
		return undefined;
	}

	return [...values].sort((a, b) => a.localeCompare(b));
}

function serializeCatalogFilters(filters: CatalogCardFilters): string {
	const normalizedGameSpecificSelections = filters.gameSpecificSelections
		? Object.fromEntries(
			Object.entries(filters.gameSpecificSelections)
				.map(([key, values]) => [key, normalizeFilterArray(values)])
				.sort(([a], [b]) => a.localeCompare(b))
		)
		: undefined;

	return JSON.stringify({
		tcgs: normalizeFilterArray(filters.tcgs),
		setIds: normalizeFilterArray(filters.setIds),
		languages: normalizeFilterArray(filters.languages),
		rarityKeys: normalizeFilterArray(filters.rarityKeys),
		cardTypeKeys: normalizeFilterArray(filters.cardTypeKeys),
		ownershipMode: filters.ownershipMode ?? 'all',
		setScope: filters.setScope ?? 'all',
		gameSpecificSelections: normalizedGameSpecificSelections,
	});
}

function toFilteredCardsCacheKey(input: { query?: string; filters?: CatalogCardFilters }): string {
	return `${input.query ?? ''}::${serializeCatalogFilters(input.filters ?? {})}`;
}

function getFilteredCardsCacheEntry(key: string): Promise<CatalogTcgCardSummary[]> | undefined {
	const entry = filteredCardsCache.get(key);
	if (!entry) {
		return undefined;
	}

	if (Date.now() - entry.createdAt > FILTERED_CARDS_CACHE_TTL_MS) {
		filteredCardsCache.delete(key);
		return undefined;
	}

	return entry.promise;
}

function setFilteredCardsCache(key: string, promise: Promise<CatalogTcgCardSummary[]>) {
	if (!filteredCardsCache.has(key) && filteredCardsCache.size >= FILTERED_CARDS_CACHE_LIMIT) {
		const firstKey = filteredCardsCache.keys().next().value;
		if (typeof firstKey === 'string') {
			filteredCardsCache.delete(firstKey);
		}
	}

	filteredCardsCache.set(key, {
		promise,
		createdAt: Date.now(),
	});
}

function getTcgLanguageIndexCacheKey(tcg: CatalogTcg, language?: CatalogLanguage): string {
	return `${tcg}:${language ?? 'default'}`;
}

function addToSetMap(map: Map<string, Set<string>>, key: string, value: string) {
	const bucket = map.get(key);
	if (bucket) {
		bucket.add(value);
		return;
	}

	map.set(key, new Set([value]));
}

function getOrBuildTcgLanguageIndex(
	tcg: CatalogTcg,
	language?: CatalogLanguage,
): TcgLanguageCatalogIndex {
	const cacheKey = getTcgLanguageIndexCacheKey(tcg, language);
	const cached = tcgLanguageIndexCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	const start = nowMs();
	const tcgCards = getTcgCardIndex(tcg, language) ?? {};
	const sets = getSetIndex(tcg, language) ?? {};

	const byGameSpecificKey = Object.fromEntries(
		GAME_SPECIFIC_FILTER_DESCRIPTORS
			.filter((descriptor) => descriptor.tcg === tcg)
			.map((descriptor) => [descriptor.key, new Map<string, Set<string>>()])
	) as Record<CatalogGameSpecificFilterKey, Map<string, Set<string>>>;

	const nextIndex: TcgLanguageCatalogIndex = {
		cardsByScopedId: new Map<string, CatalogTcgCardSummary>(),
		allScopedIds: new Set<string>(),
		bySetId: new Map<string, Set<string>>(),
		byRarityKey: new Map<string, Set<string>>(),
		byCardTypeKey: new Map<string, Set<string>>(),
		byGameSpecificKey,
	};

	Object.values(tcgCards).forEach((tcgCard: any) => {
		const setName = sets[tcgCard.setId]?.name;
		const setReleaseDate = sets[tcgCard.setId]?.releaseDate;
		const summary = mapTcgCardToSummary(tcg, tcgCard, setName, setReleaseDate);
		const scopedId = `${tcg}:${summary.id}:${summary.language ?? ''}`;

		nextIndex.cardsByScopedId.set(scopedId, summary);
		nextIndex.allScopedIds.add(scopedId);

		if (summary.setId) {
			addToSetMap(nextIndex.bySetId, `${tcg}:${summary.setId}`, scopedId);
		}

		if (summary.rarity) {
			addToSetMap(nextIndex.byRarityKey, `${tcg}:${summary.rarity}`, scopedId);
		}

		(summary.types ?? []).forEach((cardType) => {
			addToSetMap(nextIndex.byCardTypeKey, `${tcg}:${cardType}`, scopedId);
		});

		GAME_SPECIFIC_FILTER_DESCRIPTORS
			.filter((descriptor) => descriptor.tcg === tcg)
			.forEach((descriptor) => {
				descriptor.extractValues(summary).forEach((value) => {
					const scopedValue = toScopedGameSpecificValue(tcg, value);
					addToSetMap(nextIndex.byGameSpecificKey[descriptor.key], scopedValue, scopedId);
				});
			});
	});

	tcgLanguageIndexCache.set(cacheKey, nextIndex);
	logCatalogProfile('index.build', start, {
		tcg,
		language: language ?? 'default',
		cards: nextIndex.allScopedIds.size,
	});
	return nextIndex;
}

function unionSets(sets: (Set<string> | undefined)[]): Set<string> {
	const output = new Set<string>();
	sets.forEach((source) => {
		source?.forEach((value) => {
			output.add(value);
		});
	});
	return output;
}

function intersectSets(left: Set<string>, right: Set<string>): Set<string> {
	const output = new Set<string>();
	const [small, large] = left.size <= right.size ? [left, right] : [right, left];
	small.forEach((value) => {
		if (large.has(value)) {
			output.add(value);
		}
	});
	return output;
}

function toOwnedExactKey(tcg: CatalogTcg, catalogTcgCardId: string, language?: string): string {
	return `${tcg}:${catalogTcgCardId}:${language ?? ''}`;
}

function toOwnedAnyLanguageKey(tcg: CatalogTcg, catalogTcgCardId: string): string {
	return `${tcg}:${catalogTcgCardId}`;
}

async function loadOwnedCatalogLookup(): Promise<OwnedCatalogLookup> {
	const db = await getDatabase();
	const rows = await db.getAllAsync<OwnedCatalogRow>(
		`SELECT tcg, catalog_tcg_card_id, COALESCE(language, '') AS language, COALESCE(SUM(quantity), 0) AS total
		 FROM inventory_items
		 WHERE kind = 'catalog-tcg-card'
		   AND tcg IS NOT NULL
		   AND catalog_tcg_card_id IS NOT NULL
		 GROUP BY tcg, catalog_tcg_card_id, COALESCE(language, '')`
	);

	const exact = new Set<string>();
	const anyLanguage = new Set<string>();

	for (const row of rows) {
		if (row.total <= 0) {
			continue;
		}

		exact.add(toOwnedExactKey(row.tcg, row.catalog_tcg_card_id, row.language));
		anyLanguage.add(toOwnedAnyLanguageKey(row.tcg, row.catalog_tcg_card_id));
	}

	return {
		exact,
		anyLanguage,
	};
}

function matchesOwnershipMode(
	tcgCard: CatalogTcgCardSummary,
	mode: CatalogOwnershipMode,
	ownedLookup: OwnedCatalogLookup
): boolean {
	if (mode === 'all') {
		return true;
	}

	const isOwned =
		ownedLookup.exact.has(toOwnedExactKey(tcgCard.tcg, tcgCard.id, tcgCard.language)) ||
		ownedLookup.anyLanguage.has(toOwnedAnyLanguageKey(tcgCard.tcg, tcgCard.id));

	if (mode === 'owned') {
		return isOwned;
	}

	return !isOwned;
}

function createCatalogCards(
	filters: CatalogCardFilters = {}
): CatalogTcgCardSummary[] {
	const tcgs = filters.tcgs && filters.tcgs.length > 0 ? filters.tcgs : ALL_TCGS;
	const languages = filters.languages && filters.languages.length > 0
		? filters.languages
		: [undefined];

	const indexStart = nowMs();
	const indexes = tcgs.flatMap((tcg) => (
		languages.map((language) => getOrBuildTcgLanguageIndex(tcg, language))
	));

	const cardsByScopedId = new Map<string, CatalogTcgCardSummary>();
	let candidateScopedIds = unionSets(indexes.map((index) => index.allScopedIds));

	indexes.forEach((index) => {
		index.cardsByScopedId.forEach((card, scopedId) => {
			cardsByScopedId.set(scopedId, card);
		});
	});

	if (filters.setIds && filters.setIds.length > 0) {
		const allowed = unionSets(indexes.flatMap((index) => filters.setIds?.map((key) => index.bySetId.get(key)) ?? []));
		candidateScopedIds = intersectSets(candidateScopedIds, allowed);
	}

	if (filters.rarityKeys && filters.rarityKeys.length > 0) {
		const allowed = unionSets(indexes.flatMap((index) => filters.rarityKeys?.map((key) => index.byRarityKey.get(key)) ?? []));
		candidateScopedIds = intersectSets(candidateScopedIds, allowed);
	}

	if (filters.cardTypeKeys && filters.cardTypeKeys.length > 0) {
		const allowed = unionSets(indexes.flatMap((index) => filters.cardTypeKeys?.map((key) => index.byCardTypeKey.get(key)) ?? []));
		candidateScopedIds = intersectSets(candidateScopedIds, allowed);
	}

	if (filters.gameSpecificSelections) {
		Object.entries(filters.gameSpecificSelections).forEach(([rawDescriptorKey, selectedValues]) => {
			if (!selectedValues || selectedValues.length === 0) {
				return;
			}

			const descriptorKey = rawDescriptorKey as CatalogGameSpecificFilterKey;
			const allowed = unionSets(
				indexes.flatMap((index) => {
					const descriptorMap = index.byGameSpecificKey[descriptorKey];
					if (!descriptorMap) {
						return [];
					}
					return selectedValues.map((value) => descriptorMap.get(value));
				})
			);
			candidateScopedIds = intersectSets(candidateScopedIds, allowed);
		});
	}

	const indexedCards = Array.from(candidateScopedIds)
		.map((scopedId) => cardsByScopedId.get(scopedId))
		.filter((card): card is CatalogTcgCardSummary => Boolean(card));

	if (!filters.gameSpecificSelections) {
		logCatalogProfile('createCatalogCards.indexed', indexStart, {
			tcgs: tcgs.length,
			languages: languages.length,
			result: indexedCards.length,
		});
		return indexedCards;
	}

	const gameSpecificVerified = indexedCards.filter((card) => (
		matchesGameSpecificSelections({
			tcg: card.tcg,
			subtypes: card.subtypes,
			attributes: card.attributes,
		}, filters.gameSpecificSelections)
	));

	logCatalogProfile('createCatalogCards.indexed', indexStart, {
		tcgs: tcgs.length,
		languages: languages.length,
		result: gameSpecificVerified.length,
	});

	return gameSpecificVerified;
}

function filterCatalogCardsByQuery(
	tcgCards: CatalogTcgCardSummary[],
	query?: string
): CatalogTcgCardSummary[] {
	const normalizedQuery = normalizeSearchQuery(query ?? '');

	if (!normalizedQuery) {
		return tcgCards;
	}

	return tcgCards.filter((tcgCard) => (
		matchesSearchValue(tcgCard.name, normalizedQuery) ||
		matchesSearchValue(tcgCard.setName, normalizedQuery) ||
		matchesSearchValue(tcgCard.number, normalizedQuery) ||
		matchesSearchValue(tcgCard.id, normalizedQuery)
	));
}

async function getFilteredCatalogCardsUncached(input: {
	query?: string;
	filters?: CatalogCardFilters;
}
): Promise<CatalogTcgCardSummary[]> {
	const start = nowMs();
	let filteredByQuery = filterCatalogCardsByQuery(
		createCatalogCards(input.filters),
		input.query,
	);

	if (input.filters?.setScope === 'favorites') {
		const db = await getDatabase();
		const tcgFilter = input.filters.tcgs ?? ALL_TCGS;
		const placeholders = tcgFilter.map(() => '?').join(', ');
		const rows = await db.getAllAsync<{ tcg: CatalogTcg; set_id: string }>(
			`SELECT tcg, set_id FROM favorite_sets WHERE is_favorite = 1 AND tcg IN (${placeholders})`,
			tcgFilter,
		);
		const favoriteScopedSetIds = new Set(rows.map((row) => `${row.tcg}:${row.set_id}`));
		filteredByQuery = filteredByQuery.filter((tcgCard) => (
			Boolean(tcgCard.setId) && favoriteScopedSetIds.has(`${tcgCard.tcg}:${tcgCard.setId}`)
		));
	}

	const ownershipMode = input.filters?.ownershipMode ?? 'all';
	if (ownershipMode === 'all') {
		logCatalogProfile('filters.uncached', start, {
			query: Boolean(input.query),
			ownership: ownershipMode,
			result: filteredByQuery.length,
		});
		return filteredByQuery;
	}

	const ownedLookup = await loadOwnedCatalogLookup();
	const ownershipFiltered = filteredByQuery.filter((tcgCard) => (
		matchesOwnershipMode(tcgCard, ownershipMode, ownedLookup)
	));

	logCatalogProfile('filters.uncached', start, {
		query: Boolean(input.query),
		ownership: ownershipMode,
		result: ownershipFiltered.length,
	});

	return ownershipFiltered;
}

async function getFilteredCatalogCards(input: {
	query?: string;
	filters?: CatalogCardFilters;
}
): Promise<CatalogTcgCardSummary[]> {
	const cacheKey = toFilteredCardsCacheKey(input);
	const cached = getFilteredCardsCacheEntry(cacheKey);
	if (cached) {
		return cached;
	}

	const nextPromise = getFilteredCatalogCardsUncached(input).catch((error) => {
		filteredCardsCache.delete(cacheKey);
		throw error;
	});
	setFilteredCardsCache(cacheKey, nextPromise);
	return nextPromise;
}

export class SqliteCatalogRepository implements CatalogRepository {
	async getSetsByTcg(
		tcg: CatalogTcg,
		language?: CatalogLanguage
	): Promise<CatalogSetSummary[]> {
		const sets = getSetIndex(tcg, language);
		if (!sets) return [];

		return Object.values(sets)
			.map((set) => mapSetToSummary(tcg, set))
			.sort((a, b) => {
				const aDate = a.releaseDate ?? "";
				const bDate = b.releaseDate ?? "";
				return aDate.localeCompare(bDate);
			});
	}

	async getTcgCardsBySet(
		tcg: CatalogTcg,
		setId: string,
		language?: CatalogLanguage
	): Promise<CatalogTcgCardSummary[]> {
		const tcgCards = getTcgCardIndex(tcg, language);
		if (!tcgCards) return [];

		const set = await this.getCatalogSetById(tcg, setId, language);
		const setName = set?.name;

		return Object.values(tcgCards)
			.filter((tcgCard: any) => tcgCard.setId === setId)
			.map((tcgCard: any) => mapTcgCardToSummary(tcg, tcgCard, setName))
			.sort((a, b) => a.name.localeCompare(b.name));
	}

	async getCatalogSetById(
		tcg: CatalogTcg,
		setId: string,
		language?: CatalogLanguage
	): Promise<CatalogResolvedSet | null> {
		return getCatalogSetById(tcg, setId, language);
	}

	async getCatalogTcgCardById(
		tcg: CatalogTcg,
		catalogTcgCardId: string,
		language?: CatalogLanguage
	): Promise<CatalogResolvedTcgCard | null> {
		return getCatalogTcgCardById(tcg, catalogTcgCardId, language);
	}

	async getTotalTcgCardsByTcg(
		tcg: CatalogTcg,
		language?: CatalogLanguage
	): Promise<number> {
		const tcgCards = getTcgCardIndex(tcg, language);
		if (!tcgCards) return 0;

		return Object.keys(tcgCards).length;
	}

	async getCatalogTcgCardsPage(input: {
		page: number;
		pageSize: number;
		query?: string;
		filters?: CatalogCardFilters;
		sortBy?: CatalogTcgCardSortKey;
		sortDirection?: CatalogTcgCardSortDirection;
	}): Promise<CatalogTcgCardPage> {
		const start = nowMs();
		const page = Math.max(1, input.page);
		const pageSize = Math.max(1, input.pageSize);
		const sortBy = input.sortBy ?? 'name';
		const sortDirection = input.sortDirection ?? 'asc';

		const allTcgCards = await getFilteredCatalogCards({
			query: input.query,
			filters: input.filters,
		});

		const sortedCards = sortCatalogTcgCards(allTcgCards, sortBy, sortDirection);

		const total = sortedCards.length;
		const totalPages = Math.max(1, Math.ceil(total / pageSize));
		const boundedPage = Math.min(page, totalPages);
		const offset = (boundedPage - 1) * pageSize;
		const items = sortedCards.slice(offset, offset + pageSize);

		logCatalogProfile('page.fetch', start, {
			page: boundedPage,
			pageSize,
			total,
			sortBy,
			sortDirection,
		});

		return {
			items,
			total,
			page: boundedPage,
			pageSize,
			totalPages,
		};
	}

	async getCatalogCardFacets(input: {
		query?: string;
		filters?: CatalogCardFilters;
	}): Promise<CatalogCardFacets> {
		const start = nowMs();
		const filters: CatalogCardFilters = input.filters ?? {};
		const hasSelectedTcgs = Boolean(filters.tcgs?.length);

		const facetFilteredCardsCache = new Map<string, Promise<CatalogTcgCardSummary[]>>();
		const getCachedFilteredCards = (facetFilters: CatalogCardFilters): Promise<CatalogTcgCardSummary[]> => {
			const cacheKey = `${input.query ?? ''}::${serializeCatalogFilters(facetFilters)}`;
			const cached = facetFilteredCardsCache.get(cacheKey);
			if (cached) {
				return cached;
			}

			const globalCached = getFilteredCardsCacheEntry(cacheKey);
			if (globalCached) {
				facetFilteredCardsCache.set(cacheKey, globalCached);
				return globalCached;
			}

			const next = getFilteredCatalogCards({
				query: input.query,
				filters: facetFilters,
			});
			facetFilteredCardsCache.set(cacheKey, next);
			return next;
		};

		const total = (await getCachedFilteredCards(filters)).length;

		const tcgs = ALL_TCGS.map((tcg) => ({
			key: tcg,
			label: getTcgTitle(tcg),
			count: 0,
		}));

		const languages = ALL_LANGUAGES.map((language) => ({
			key: language,
			label: language === 'ja' ? 'Japanese' : 'English',
			count: 0,
		}));

		let sets: { key: string; label: string; tcg: CatalogTcg; count: number }[] = [];
		if (hasSelectedTcgs) {
			const cardsWithoutSetFilter = await getCachedFilteredCards({
				...filters,
				setIds: undefined,
			});

			const setCountMap = new Map<string, { key: string; label: string; tcg: CatalogTcg; count: number }>();
			cardsWithoutSetFilter.forEach((card) => {
				if (!card.setId) {
					return;
				}

				const mapKey = `${card.tcg}:${card.setId}`;
				const existing = setCountMap.get(mapKey);
				if (existing) {
					existing.count += 1;
					return;
				}

				setCountMap.set(mapKey, {
					key: mapKey,
					label: card.setName ?? card.setId,
					tcg: card.tcg,
					count: 1,
				});
			});

			let allSets = Array.from(setCountMap.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

			// Apply setScope filtering if specified
			if (filters.setScope === 'favorites') {
				const db = await getDatabase();
				const favorites = await db.getAllAsync<{ set_id: string }>(
					'SELECT set_id FROM favorite_sets WHERE is_favorite = 1'
				);
				const favoriteSetIds = favorites.map(f => f.set_id);
				allSets = allSets.filter(set => favoriteSetIds.includes(set.key.split(':')[1]));
			}

			sets = allSets;
		}

		const rarityCounts = new Map<string, number>();
		const cardTypeCounts = new Map<string, number>();

		let cardsWithoutAdvancedTypeOrRarity: CatalogTcgCardSummary[] = [];
		if (hasSelectedTcgs) {
			const cardsWithoutRarityFilter = await getCachedFilteredCards({
				...filters,
				rarityKeys: undefined,
			});

			cardsWithoutRarityFilter.forEach((card) => {
				if (!card.rarity) {
					return;
				}

				const key = `${card.tcg}:${card.rarity}`;
				rarityCounts.set(key, (rarityCounts.get(key) ?? 0) + 1);
			});

			const cardsWithoutTypeFilter = await getCachedFilteredCards({
				...filters,
				cardTypeKeys: undefined,
			});

			cardsWithoutTypeFilter.forEach((card) => {
				(card.types ?? []).forEach((cardType) => {
					const key = `${card.tcg}:${cardType}`;
					cardTypeCounts.set(key, (cardTypeCounts.get(key) ?? 0) + 1);
				});
			});

			// Build a stable option universe so list rows don't disappear while users tap filters.
			cardsWithoutAdvancedTypeOrRarity = await getCachedFilteredCards({
				...filters,
				rarityKeys: undefined,
				cardTypeKeys: undefined,
			});
		}

		const rarityUniverse = new Set<string>();
		const cardTypeUniverse = new Set<string>();

		cardsWithoutAdvancedTypeOrRarity.forEach((card) => {
			if (card.rarity) {
				rarityUniverse.add(`${card.tcg}:${card.rarity}`);
			}

			(card.types ?? []).forEach((cardType) => {
				cardTypeUniverse.add(`${card.tcg}:${cardType}`);
			});
		});

		const cardsWithAllOwnership = await getCachedFilteredCards({
			...filters,
			ownershipMode: 'all',
		});
		const ownershipLookup = await loadOwnedCatalogLookup();
		const ownedCount = cardsWithAllOwnership.reduce((count, card) => (
			matchesOwnershipMode(card, 'owned', ownershipLookup) ? count + 1 : count
		), 0);
		const ownershipModes: { key: CatalogOwnershipMode; label: string; count: number }[] = [
			{
				key: 'all',
				label: 'All cards',
				count: cardsWithAllOwnership.length,
			},
			{
				key: 'owned',
				label: 'Owned only',
				count: ownedCount,
			},
			{
				key: 'missing',
				label: 'Missing only',
				count: cardsWithAllOwnership.length - ownedCount,
			},
		];

		const rarities = Array.from(rarityUniverse.values())
			.map((key) => {
				const [tcg, ...valueParts] = key.split(':');
				const value = valueParts.join(':');
				return {
					key,
					label: value,
					tcg: tcg as CatalogTcg,
					value,
					count: rarityCounts.get(key) ?? 0,
				};
			})
			.sort((a, b) => compareFacetLabels(a.label, b.label));

		const cardTypes = Array.from(cardTypeUniverse.values())
			.map((key) => {
				const [tcg, ...valueParts] = key.split(':');
				const value = valueParts.join(':');
				return {
					key,
					label: value,
					tcg: tcg as CatalogTcg,
					value,
					count: cardTypeCounts.get(key) ?? 0,
				};
			})
			.sort((a, b) => compareFacetLabels(a.label, b.label));

		const gameSpecific = Object.fromEntries(
			GAME_SPECIFIC_FILTER_DESCRIPTORS.map((descriptor) => [descriptor.key, []])
		) as Record<CatalogGameSpecificFilterKey, { key: string; label: string; tcg: CatalogTcg; value: string; count: number }[]>;

		if (hasSelectedTcgs) {
			const selectedDescriptors = GAME_SPECIFIC_FILTER_DESCRIPTORS
				.filter((descriptor) => filters.tcgs?.includes(descriptor.tcg));

			const gameSpecificWithoutFilters = await getCachedFilteredCards({
				...filters,
				gameSpecificSelections: undefined,
			});

			selectedDescriptors.forEach((descriptor) => {
				const universe = new Set<string>();
				const counts = new Map<string, number>();

				gameSpecificWithoutFilters.forEach((card) => {
					if (card.tcg !== descriptor.tcg) {
						return;
					}

					descriptor.extractValues(card).forEach((value) => {
						const scoped = toScopedGameSpecificValue(descriptor.tcg, value);
						universe.add(scoped);
						counts.set(scoped, (counts.get(scoped) ?? 0) + 1);
					});
				});

				gameSpecific[descriptor.key] = Array.from(universe.values())
					.map((scopedKey) => {
						const [tcg, ...valueParts] = scopedKey.split(':');
						const value = valueParts.join(':');
						return {
							key: scopedKey,
							label: value,
							tcg: tcg as CatalogTcg,
							value,
							count: counts.get(scopedKey) ?? 0,
						};
					})
					.sort((a, b) => compareFacetLabels(a.label, b.label));
			});
		}

		const tcgCounts = new Map<CatalogTcg, number>();
		const cardsWithoutTcgFilter = await getCachedFilteredCards({
			...filters,
			tcgs: undefined,
		});
		cardsWithoutTcgFilter.forEach((card) => {
			tcgCounts.set(card.tcg, (tcgCounts.get(card.tcg) ?? 0) + 1);
		});

		const languageCounts = new Map<CatalogLanguage, number>();
		const cardsWithoutLanguageFilter = await getCachedFilteredCards({
			...filters,
			// For facet counts, include every supported language explicitly so counts
			// are not biased by the default-language fallback when no language filter is set.
			languages: ALL_LANGUAGES,
		});
		cardsWithoutLanguageFilter.forEach((card) => {
			if (!card.language) {
				return;
			}
			languageCounts.set(card.language, (languageCounts.get(card.language) ?? 0) + 1);
		});

		const result: CatalogCardFacets = {
			total,
			tcgs: tcgs.map((option) => ({
				...option,
				count: filters.tcgs?.includes(option.key)
					? total
					: (tcgCounts.get(option.key) ?? 0),
			})),
			languages: languages.map((option) => ({
				...option,
				count: filters.languages?.includes(option.key)
					? total
					: (languageCounts.get(option.key) ?? 0),
			})),
			sets,
			rarities,
			cardTypes,
			gameSpecific,
			ownershipModes,
		};

		logCatalogProfile('facets.fetch', start, {
			total,
			tcgs: filters.tcgs?.length ?? 0,
			languages: filters.languages?.length ?? 0,
			query: Boolean(input.query),
		});

		return result;
	}

	async toggleSetFavorite(tcg: CatalogTcg, setId: string, isFavorite: boolean): Promise<void> {
		const db = await getDatabase();
		const now = new Date().toISOString();
		await db.runAsync(
			`INSERT OR REPLACE INTO favorite_sets (tcg, set_id, is_favorite, updated_at)
			 VALUES (?, ?, ?, ?)`,
			[tcg, setId, isFavorite ? 1 : 0, now]
		);
	}

	async isSetFavorite(tcg: CatalogTcg, setId: string): Promise<boolean> {
		const db = await getDatabase();
		const result = await db.getFirstAsync<{ is_favorite: number }>(
			'SELECT is_favorite FROM favorite_sets WHERE tcg = ? AND set_id = ?',
			[tcg, setId]
		);

		return result?.is_favorite === 1;
	}

	async getFavoriteSetIds(tcg: CatalogTcg): Promise<string[]> {
		const db = await getDatabase();
		const rows = await db.getAllAsync<{ set_id: string }>(
			'SELECT set_id FROM favorite_sets WHERE tcg = ? AND is_favorite = 1',
			[tcg]
		);

		return rows.map((row) => row.set_id);
	}

	async getSetsByTcgFiltered(
		tcg: CatalogTcg,
		language?: CatalogLanguage,
		setScope?: 'all' | 'favorites'
	): Promise<CatalogSetSummary[]> {
		const sets = await this.getSetsByTcg(tcg, language);

		if (setScope === 'favorites') {
			const favoriteIds = new Set(await this.getFavoriteSetIds(tcg));
			return sets.filter(set => favoriteIds.has(set.id));
		}

		// 'all' or undefined
		return sets;
	}
}