import type { CatalogTcgCardAttributes, CatalogTcg } from '@/src/domain/catalog/catalog.types';

export type CatalogGameSpecificFilterKey =
	| 'pokemonAttacks'
	| 'pokemonEnergyType'
	| 'pokemonStage'
	| 'pokemonWeaknessType'
	| 'pokemonRetreatCost'
	| 'mtgManaValue'
	| 'mtgManaCost'
	| 'mtgColors'
	| 'mtgColorIdentity'
	| 'mtgKeywords'
	| 'mtgPower'
	| 'mtgToughness'
	| 'mtgLoyalty'
	| 'mtgSubtype'
	| 'lorcanaCost'
	| 'lorcanaInkable'
	| 'lorcanaLoreValue'
	| 'lorcanaStrength'
	| 'lorcanaWillpower'
	| 'lorcanaKeywords'
	| 'lorcanaSource'
	| 'lorcanaSubtype'
	| 'onePieceColor'
	| 'onePieceCardType'
	| 'onePieceCost'
	| 'onePieceAttribute'
	| 'onePiecePower'
	| 'onePieceCounter'
	| 'onePieceTagsEffect';

export type CatalogGameSpecificFilterSelections = Record<CatalogGameSpecificFilterKey, string[]>;

export type CatalogGameSpecificFilterDescriptor = {
	key: CatalogGameSpecificFilterKey;
	tcg: CatalogTcg;
	label: string;
	extractValues: (card: CatalogGameSpecificCardInput) => string[];
};

export type CatalogGameSpecificCardInput = {
	tcg: CatalogTcg;
	subtypes?: string[];
	attributes?: CatalogTcgCardAttributes;
};

const POKEMON_STAGES = new Set(['Basic', 'Stage 1', 'Stage 2', 'V-UNION']);

function normalizeAttributes(card: CatalogGameSpecificCardInput): CatalogTcgCardAttributes | undefined {
	const attributes = card.attributes;
	if (!attributes) {
		return undefined;
	}

	if ('tcg' in attributes) {
		return attributes;
	}

	return {
		...(attributes as object),
		tcg: card.tcg,
	} as CatalogTcgCardAttributes;
}

function uniqueSorted(values: string[]): string[] {
	return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export const GAME_SPECIFIC_FILTER_DESCRIPTORS: CatalogGameSpecificFilterDescriptor[] = [
	{
		key: 'pokemonAttacks',
		tcg: 'pokemon',
		label: 'Attacks',
		extractValues: (card) => {
			const attributes = normalizeAttributes(card);
			if (!attributes || attributes.tcg !== 'pokemon') {
				return [];
			}

			return [(attributes.attacks?.length ?? 0) > 0 ? 'Has attacks' : 'No attacks'];
		},
	},
	{
		key: 'pokemonEnergyType',
		tcg: 'pokemon',
		label: 'Energy type',
		extractValues: (card) => {
			const attributes = normalizeAttributes(card);
			if (!attributes || attributes.tcg !== 'pokemon') {
				return [];
			}

			const energyTypes = (attributes.attacks ?? []).flatMap((attack) => attack.cost ?? []);
			return uniqueSorted(energyTypes);
		},
	},
	{
		key: 'pokemonStage',
		tcg: 'pokemon',
		label: 'Stage',
		extractValues: (card) => uniqueSorted((card.subtypes ?? []).filter((subtype) => POKEMON_STAGES.has(subtype))),
	},
	{
		key: 'pokemonWeaknessType',
		tcg: 'pokemon',
		label: 'Weakness / Resistance',
		extractValues: (card) => {
			const attributes = normalizeAttributes(card);
			if (!attributes || attributes.tcg !== 'pokemon') {
				return [];
			}

			return uniqueSorted((attributes.weaknesses ?? []).map((weakness) => weakness.type));
		},
	},
	{
		key: 'pokemonRetreatCost',
		tcg: 'pokemon',
		label: 'Retreat cost',
		extractValues: (card) => {
			const attributes = normalizeAttributes(card);
			if (!attributes || attributes.tcg !== 'pokemon') {
				return [];
			}

			if (typeof attributes.convertedRetreatCost === 'number') {
				return [String(attributes.convertedRetreatCost)];
			}

			if (Array.isArray(attributes.retreatCost)) {
				return [String(attributes.retreatCost.length)];
			}

			return [];
		},
	},
	{
		key: 'mtgManaValue',
		tcg: 'mtg',
		label: 'Mana value',
		extractValues: (card) => {
			const attributes = normalizeAttributes(card);
			if (!attributes || attributes.tcg !== 'mtg' || attributes.manaValue == null) {
				return [];
			}

			return [String(attributes.manaValue)];
		},
	},
	{
		key: 'mtgManaCost',
		tcg: 'mtg',
		label: 'Mana cost',
		extractValues: (card) => {
			const attributes = normalizeAttributes(card);
			if (!attributes || attributes.tcg !== 'mtg' || !attributes.manaCost) {
				return [];
			}

			return [attributes.manaCost];
		},
	},
	{
		key: 'mtgColors',
		tcg: 'mtg',
		label: 'Colours',
		extractValues: (card) => {
			const attributes = normalizeAttributes(card);
			if (!attributes || attributes.tcg !== 'mtg') {
				return [];
			}

			return uniqueSorted(attributes.colors ?? []);
		},
	},
	{
		key: 'mtgColorIdentity',
		tcg: 'mtg',
		label: 'Color identity',
		extractValues: (card) => {
			const attributes = normalizeAttributes(card);
			if (!attributes || attributes.tcg !== 'mtg') {
				return [];
			}

			return uniqueSorted(attributes.colorIdentity ?? []);
		},
	},
	{
		key: 'mtgKeywords',
		tcg: 'mtg',
		label: 'Keywords',
		extractValues: (card) => {
			const attributes = normalizeAttributes(card);
			if (!attributes || attributes.tcg !== 'mtg') {
				return [];
			}

			return uniqueSorted(attributes.keywords ?? []);
		},
	},
	{
		key: 'mtgPower',
		tcg: 'mtg',
		label: 'Power',
		extractValues: (card) => {
			const attributes = normalizeAttributes(card);
			if (!attributes || attributes.tcg !== 'mtg' || !attributes.power) {
				return [];
			}

			return [attributes.power];
		},
	},
	{
		key: 'mtgToughness',
		tcg: 'mtg',
		label: 'Toughness',
		extractValues: (card) => {
			const attributes = normalizeAttributes(card);
			if (!attributes || attributes.tcg !== 'mtg' || !attributes.toughness) {
				return [];
			}

			return [attributes.toughness];
		},
	},
	{
		key: 'mtgLoyalty',
		tcg: 'mtg',
		label: 'Loyalty',
		extractValues: (card) => {
			const attributes = normalizeAttributes(card);
			if (!attributes || attributes.tcg !== 'mtg' || !attributes.loyalty) {
				return [];
			}

			return [attributes.loyalty];
		},
	},
	{
		key: 'mtgSubtype',
		tcg: 'mtg',
		label: 'Subtype',
		extractValues: (card) => uniqueSorted(card.subtypes ?? []),
	},
	{
		key: 'lorcanaCost',
		tcg: 'lorcana',
		label: 'Cost',
		extractValues: (card) => {
			const attributes = normalizeAttributes(card);
			if (!attributes || attributes.tcg !== 'lorcana' || attributes.cost == null) {
				return [];
			}

			return [String(attributes.cost)];
		},
	},
	{
		key: 'lorcanaLoreValue',
		tcg: 'lorcana',
		label: 'Lore value',
		extractValues: (card) => {
			const attributes = normalizeAttributes(card);
			if (!attributes || attributes.tcg !== 'lorcana' || attributes.loreValue == null) {
				return [];
			}

			return [String(attributes.loreValue)];
		},
	},
	{
		key: 'lorcanaStrength',
		tcg: 'lorcana',
		label: 'Strength',
		extractValues: (card) => {
			const attributes = normalizeAttributes(card);
			if (!attributes || attributes.tcg !== 'lorcana' || attributes.strength == null) {
				return [];
			}

			return [String(attributes.strength)];
		},
	},
	{
		key: 'lorcanaWillpower',
		tcg: 'lorcana',
		label: 'Willpower',
		extractValues: (card) => {
			const attributes = normalizeAttributes(card);
			if (!attributes || attributes.tcg !== 'lorcana' || attributes.willpower == null) {
				return [];
			}

			return [String(attributes.willpower)];
		},
	},
	{
		key: 'lorcanaInkable',
		tcg: 'lorcana',
		label: 'Inkable',
		extractValues: (card) => {
			const attributes = normalizeAttributes(card);
			if (!attributes || attributes.tcg !== 'lorcana' || typeof attributes.inkwell !== 'boolean') {
				return [];
			}

			return [attributes.inkwell ? 'Inkable' : 'Not inkable'];
		},
	},
	{
		key: 'lorcanaKeywords',
		tcg: 'lorcana',
		label: 'Keywords',
		extractValues: (card) => {
			const attributes = normalizeAttributes(card);
			if (!attributes || attributes.tcg !== 'lorcana') {
				return [];
			}

			return uniqueSorted(attributes.keywords ?? []);
		},
	},
	{
		key: 'lorcanaSource',
		tcg: 'lorcana',
		label: 'Source / Franchise',
		extractValues: (card) => {
			const attributes = normalizeAttributes(card);
			if (!attributes || attributes.tcg !== 'lorcana' || !attributes.source) {
				return [];
			}

			return [attributes.source];
		},
	},
	{
		key: 'lorcanaSubtype',
		tcg: 'lorcana',
		label: 'Subtype',
		extractValues: (card) => uniqueSorted(card.subtypes ?? []),
	},
	{
		key: 'onePieceColor',
		tcg: 'one-piece',
		label: 'Color',
		extractValues: (card) => {
			const attributes = normalizeAttributes(card);
			if (!attributes || attributes.tcg !== 'one-piece') {
				return [];
			}

			return uniqueSorted(attributes.colors ?? []);
		},
	},
	{
		key: 'onePieceCardType',
		tcg: 'one-piece',
		label: 'Card type',
		extractValues: (card) => uniqueSorted(card.types ?? []),
	},
	{
		key: 'onePieceCost',
		tcg: 'one-piece',
		label: 'Cost',
		extractValues: (card) => {
			const attributes = normalizeAttributes(card);
			if (!attributes || attributes.tcg !== 'one-piece' || attributes.cost == null) {
				return [];
			}

			return [String(attributes.cost)];
		},
	},
	{
		key: 'onePieceAttribute',
		tcg: 'one-piece',
		label: 'Attribute',
		extractValues: (card) => {
			const attributes = normalizeAttributes(card);
			if (!attributes || attributes.tcg !== 'one-piece' || !attributes.attribute) {
				return [];
			}

			return [attributes.attribute];
		},
	},
	{
		key: 'onePiecePower',
		tcg: 'one-piece',
		label: 'Power',
		extractValues: (card) => {
			const attributes = normalizeAttributes(card);
			if (!attributes || attributes.tcg !== 'one-piece' || !attributes.power) {
				return [];
			}

			return [attributes.power];
		},
	},
	{
		key: 'onePieceCounter',
		tcg: 'one-piece',
		label: 'Counter',
		extractValues: (card) => {
			const attributes = normalizeAttributes(card);
			if (!attributes || attributes.tcg !== 'one-piece' || !attributes.counter) {
				return [];
			}

			return [attributes.counter];
		},
	},
	{
		key: 'onePieceTagsEffect',
		tcg: 'one-piece',
		label: 'Tags / Effect',
		extractValues: (card) => {
			const attributes = normalizeAttributes(card);
			if (!attributes || attributes.tcg !== 'one-piece') {
				return [];
			}

			const tags = attributes.tags ?? [];
			const effectLabel = attributes.effect ? ['Has effect'] : [];
			return uniqueSorted([...tags, ...effectLabel]);
		},
	},
];

export const GAME_SPECIFIC_FILTERS_BY_KEY = Object.fromEntries(
	GAME_SPECIFIC_FILTER_DESCRIPTORS.map((descriptor) => [descriptor.key, descriptor])
) as Record<CatalogGameSpecificFilterKey, CatalogGameSpecificFilterDescriptor>;

export function createEmptyGameSpecificSelections(): CatalogGameSpecificFilterSelections {
	return GAME_SPECIFIC_FILTER_DESCRIPTORS.reduce((acc, descriptor) => ({
		...acc,
		[descriptor.key]: [],
	}), {} as CatalogGameSpecificFilterSelections);
}

export function toScopedGameSpecificValue(tcg: CatalogTcg, value: string): string {
	return `${tcg}:${value}`;
}

export function fromScopedGameSpecificValue(scopedValue: string): { tcg: CatalogTcg; value: string } {
	const [tcg, ...valueParts] = scopedValue.split(':');
	return {
		tcg: tcg as CatalogTcg,
		value: valueParts.join(':'),
	};
}

export function getDescriptorSelectionCount(
	selections: CatalogGameSpecificFilterSelections,
	descriptor: CatalogGameSpecificFilterDescriptor
): number {
	return selections[descriptor.key]?.length ?? 0;
}

export function getTotalGameSpecificSelectionCount(selections: CatalogGameSpecificFilterSelections): number {
	return GAME_SPECIFIC_FILTER_DESCRIPTORS.reduce((total, descriptor) => (
		total + (selections[descriptor.key]?.length ?? 0)
	), 0);
}

export function matchesGameSpecificSelections(
	card: CatalogGameSpecificCardInput,
	selections: CatalogGameSpecificFilterSelections | undefined
): boolean {
	if (!selections) {
		return true;
	}

	for (const descriptor of GAME_SPECIFIC_FILTER_DESCRIPTORS) {
		const selected = selections[descriptor.key] ?? [];
		if (selected.length === 0) {
			continue;
		}

		if (card.tcg !== descriptor.tcg) {
			return false;
		}

		const cardValues = descriptor.extractValues(card).map((value) => toScopedGameSpecificValue(descriptor.tcg, value));
		if (!cardValues.some((value) => selected.includes(value))) {
			return false;
		}
	}

	return true;
}

export function clearGameSpecificSelectionKey(
	selections: CatalogGameSpecificFilterSelections,
	filterKey: CatalogGameSpecificFilterKey
): CatalogGameSpecificFilterSelections {
	return {
		...selections,
		[filterKey]: [],
	};
}
