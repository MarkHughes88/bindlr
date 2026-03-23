import type { CatalogLanguage, CatalogTcg } from '@/src/domain/catalog/catalog.types';
import type { CatalogCardFilters, CatalogOwnershipMode } from '@/src/features/catalog/catalog.types';
import {
	createEmptyGameSpecificSelections,
	type CatalogGameSpecificFilterSelections,
} from '@/src/features/catalog/catalog.gameSpecific';

export type CatalogFilterSectionKey =
	| 'myData'
	| 'tcg'
	| 'set'
	| 'language'
	| 'setScope'
	| 'gameSpecific';

export type CatalogScreenFilters = {
	tcgs: CatalogTcg[];
	setIds: string[];
	setNamesById: Record<string, string>;
	languages: CatalogLanguage[];
	rarityKeys: string[];
	cardTypeKeys: string[];
	gameSpecificSelections: CatalogGameSpecificFilterSelections;
	ownershipMode: CatalogOwnershipMode;
	setScope: 'all' | 'favorites';
	recentlyViewed: boolean;
};

export const DEFAULT_CATALOG_FILTERS: CatalogScreenFilters = {
	tcgs: [],
	setIds: [],
	setNamesById: {},
	languages: [],
	rarityKeys: [],
	cardTypeKeys: [],
	gameSpecificSelections: createEmptyGameSpecificSelections(),
	ownershipMode: 'all',
	setScope: 'all',
	recentlyViewed: false,
};

export const CATALOG_LANGUAGE_LABELS: Record<CatalogLanguage, string> = {
	en: 'English',
	ja: 'Japanese',
};

export function toCatalogCardFilters(
	filters: CatalogScreenFilters
): CatalogCardFilters {
	return {
		tcgs: filters.tcgs.length > 0 ? filters.tcgs : undefined,
		setIds: filters.setIds.length > 0 ? filters.setIds : undefined,
		languages: filters.languages.length > 0 ? filters.languages : undefined,
		rarityKeys: filters.rarityKeys.length > 0 ? filters.rarityKeys : undefined,
		cardTypeKeys: filters.cardTypeKeys.length > 0 ? filters.cardTypeKeys : undefined,
		gameSpecificSelections: filters.gameSpecificSelections,
		ownershipMode: filters.ownershipMode,
		setScope: filters.setScope !== 'all' ? filters.setScope : undefined,
	};
}

export function formatCatalogCount(count: number): string {
	return count > 99999 ? '99999+' : `${count}`;
}