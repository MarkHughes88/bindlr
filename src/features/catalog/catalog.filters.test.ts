import { describe, expect, it } from 'vitest';

import { compareFacetLabels } from '@/src/features/catalog/catalog.facetSort';
import {
	createEmptyGameSpecificSelections,
	matchesGameSpecificSelections,
	toScopedGameSpecificValue,
} from '@/src/features/catalog/catalog.gameSpecific';

describe('compareFacetLabels', () => {
	it('sorts numeric-looking labels naturally', () => {
		const values = ['10', '2', '1', '11'];
		const sorted = [...values].sort(compareFacetLabels);

		expect(sorted).toEqual(['1', '2', '10', '11']);
	});
});

describe('matchesGameSpecificSelections', () => {
	it('matches when a selected scoped value exists on card attributes', () => {
		const selections = createEmptyGameSpecificSelections();
		selections.lorcanaKeywords = [toScopedGameSpecificValue('lorcana', 'Bodyguard')];

		const result = matchesGameSpecificSelections(
			{
				tcg: 'lorcana',
				attributes: {
					tcg: 'lorcana',
					keywords: ['Bodyguard', 'Shift'],
				},
			},
			selections,
		);

		expect(result).toBe(true);
	});

	it('fails when selected filter belongs to a different TCG', () => {
		const selections = createEmptyGameSpecificSelections();
		selections.mtgManaValue = [toScopedGameSpecificValue('mtg', '3')];

		const result = matchesGameSpecificSelections(
			{
				tcg: 'lorcana',
				attributes: {
					tcg: 'lorcana',
					cost: 3,
				},
			},
			selections,
		);

		expect(result).toBe(false);
	});

	it('fails when card does not include selected value', () => {
		const selections = createEmptyGameSpecificSelections();
		selections.lorcanaSource = [toScopedGameSpecificValue('lorcana', 'Frozen')];

		const result = matchesGameSpecificSelections(
			{
				tcg: 'lorcana',
				attributes: {
					tcg: 'lorcana',
					source: 'TaleSpin',
				},
			},
			selections,
		);

		expect(result).toBe(false);
	});
});
