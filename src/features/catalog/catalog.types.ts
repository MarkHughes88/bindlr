import type {
	CatalogTcgCardAttributes,
	CatalogLanguage,
	CatalogResolvedSet,
	CatalogResolvedTcgCard,
	CatalogTcg,
} from "@/src/domain/catalog/catalog.types";
import type {
	CatalogGameSpecificFilterKey,
	CatalogGameSpecificFilterSelections,
} from '@/src/features/catalog/catalog.gameSpecific';

export type {
	CatalogLanguage,
	CatalogResolvedSet,
	CatalogResolvedTcgCard,
	CatalogTcg,
};

export type CatalogTcgCardSummary = {
	id: string;
	tcg: CatalogTcg;
	language?: CatalogLanguage;
	name: string;
	number?: string;
	rarity?: string;
	types?: string[];
	setReleaseDate?: string;
	pokemonNationalPokedexNumber?: number;
	subtypes?: string[];
	attributes?: CatalogTcgCardAttributes;
	imageSmall?: string;
	imageMedium?: string;
	imageLarge?: string;
	imageSmallLocal?: string;
	imageMediumLocal?: string;
	imageLargeLocal?: string;
	setId: string;
	setName?: string;
};

export type CatalogTcgCardSortKey =
	| 'name'
	| 'cardNumber'
	| 'tcg'
	| 'set'
	| 'rarity'
	| 'newest'
	| 'pokedex';

export type CatalogTcgCardSortDirection = 'asc' | 'desc';

export type CatalogOwnershipMode = 'all' | 'owned' | 'missing';

export type CatalogCardFilters = {
	tcgs?: CatalogTcg[];
	setIds?: string[];
	languages?: CatalogLanguage[];
	rarityKeys?: string[];
	cardTypeKeys?: string[];
	gameSpecificSelections?: CatalogGameSpecificFilterSelections;
	ownershipMode?: CatalogOwnershipMode;
	setScope?: 'all' | 'favorites';
};

export type CatalogSetSummary = {
	id: string;
	tcg: CatalogTcg;
	language?: CatalogLanguage;
	name: string;
	series?: string;
	releaseDate?: string;
	code?: string;
	totalTcgCards?: number;
	symbolImage?: string;
	logoImage?: string;
	symbolImageLocal?: string;
	logoImageLocal?: string;
};

export type CatalogTcgCardPage = {
	items: CatalogTcgCardSummary[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
};

export type CatalogFacetOption<TKey extends string = string> = {
	key: TKey;
	label: string;
	count: number;
};

export type CatalogSetFacetOption = CatalogFacetOption<string> & {
	tcg: CatalogTcg;
};

export type CatalogScopedFacetOption = CatalogFacetOption<string> & {
	tcg: CatalogTcg;
	value: string;
};

export type CatalogCardFacets = {
	total: number;
	tcgs: CatalogFacetOption<CatalogTcg>[];
	languages: CatalogFacetOption<CatalogLanguage>[];
	sets: CatalogSetFacetOption[];
	rarities: CatalogScopedFacetOption[];
	cardTypes: CatalogScopedFacetOption[];
	gameSpecific: Record<CatalogGameSpecificFilterKey, CatalogScopedFacetOption[]>;
	ownershipModes: CatalogFacetOption<CatalogOwnershipMode>[];
};

export interface CatalogRepository {
	getTcgCardsBySet(
		tcg: CatalogTcg,
		setId: string,
		language?: CatalogLanguage
	): Promise<CatalogTcgCardSummary[]>;

	getCatalogTcgCardById(
		tcg: CatalogTcg,
		catalogTcgCardId: string,
		language?: CatalogLanguage
	): Promise<CatalogResolvedTcgCard | null>;

	getSetsByTcg(
		tcg: CatalogTcg,
		language?: CatalogLanguage
	): Promise<CatalogSetSummary[]>;

	getCatalogSetById(
		tcg: CatalogTcg,
		setId: string,
		language?: CatalogLanguage
	): Promise<CatalogResolvedSet | null>;

	getTotalTcgCardsByTcg(
		tcg: CatalogTcg,
		language?: CatalogLanguage
	): Promise<number>;

	getCatalogTcgCardsPage(input: {
		page: number;
		pageSize: number;
		query?: string;
		filters?: CatalogCardFilters;
		sortBy?: CatalogTcgCardSortKey;
		sortDirection?: CatalogTcgCardSortDirection;
	}): Promise<CatalogTcgCardPage>;

	getCatalogCardFacets(input: {
		query?: string;
		filters?: CatalogCardFilters;
	}): Promise<CatalogCardFacets>;

	toggleSetFavorite(tcg: CatalogTcg, setId: string, isFavorite: boolean): Promise<void>;

	isSetFavorite(tcg: CatalogTcg, setId: string): Promise<boolean>;

	getFavoriteSetIds(tcg: CatalogTcg): Promise<string[]>;

	getSetsByTcgFiltered(
		tcg: CatalogTcg,
		language?: CatalogLanguage,
		setScope?: 'all' | 'favorites'
	): Promise<CatalogSetSummary[]>;
}