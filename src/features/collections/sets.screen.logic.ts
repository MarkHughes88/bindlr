import type { CatalogLanguage, CatalogTcg } from '@/src/domain/catalog/catalog.types';
import type { CatalogScreenFilters } from '@/src/features/catalog/catalog.filters';

export function resolveActiveSetsLanguage(input: {
	selectedLanguages: readonly CatalogLanguage[];
	supportedLanguages: readonly CatalogLanguage[];
}): CatalogLanguage | undefined {
	const selected = input.selectedLanguages.find((language) => (
		input.supportedLanguages.includes(language)
	));

	return selected;
}

export function buildSetNavigationFilters(input: {
	currentFilters: CatalogScreenFilters;
	activeTcg: CatalogTcg;
	activeLanguage?: CatalogLanguage;
	scopedSetId: string;
	setName: string;
}): CatalogScreenFilters {
	return {
		...input.currentFilters,
		tcgs: [input.activeTcg],
		languages: input.activeLanguage ? [input.activeLanguage] : [],
		setIds: [input.scopedSetId],
		setNamesById: {
			...input.currentFilters.setNamesById,
			[input.scopedSetId]: input.setName,
		},
	};
}
