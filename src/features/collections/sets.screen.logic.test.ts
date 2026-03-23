import { describe, expect, it } from 'vitest';

import { DEFAULT_CATALOG_FILTERS } from '@/src/features/catalog/catalog.filters';
import {
	buildSetNavigationFilters,
	resolveActiveSetsLanguage,
} from '@/src/features/collections/sets.screen.logic';

describe('resolveActiveSetsLanguage', () => {
	it('returns selected language when supported by active tcg', () => {
		const result = resolveActiveSetsLanguage({
			selectedLanguages: ['ja'],
			supportedLanguages: ['en', 'ja'],
		});

		expect(result).toBe('ja');
	});

	it('returns undefined when no language is selected', () => {
		const result = resolveActiveSetsLanguage({
			selectedLanguages: [],
			supportedLanguages: ['en', 'ja'],
		});

		expect(result).toBeUndefined();
	});
});

describe('buildSetNavigationFilters', () => {
	it('pins cards navigation language to selected sets language', () => {
		const filters = buildSetNavigationFilters({
			currentFilters: {
				...DEFAULT_CATALOG_FILTERS,
				tcgs: ['pokemon'],
				languages: ['ja'],
			},
			activeTcg: 'pokemon',
			activeLanguage: 'ja',
			scopedSetId: 'pokemon:sv8',
			setName: 'Super Electric Breaker',
		});

		expect(filters.languages).toEqual(['ja']);
		expect(filters.setIds).toEqual(['pokemon:sv8']);
		expect(filters.setNamesById['pokemon:sv8']).toBe('Super Electric Breaker');
	});

	it('clears language filter when no explicit language is active', () => {
		const filters = buildSetNavigationFilters({
			currentFilters: {
				...DEFAULT_CATALOG_FILTERS,
				tcgs: ['pokemon'],
				languages: ['en'],
			},
			activeTcg: 'pokemon',
			activeLanguage: undefined,
			scopedSetId: 'pokemon:base1',
			setName: 'Base Set',
		});

		expect(filters.languages).toEqual([]);
	});
});
