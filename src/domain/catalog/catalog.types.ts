export type CatalogTcg = "pokemon" | "lorcana" | "mtg" | "one-piece";

export type CatalogLanguage = "en" | "ja";

// ---------------------------------------------------------------------------
// Shared attribute sub-types
// ---------------------------------------------------------------------------

export type CatalogLegality = {
	format: string;
	status: string;
};

export type CatalogVariant = {
	name: string;
	prices: unknown[];
};

// ---------------------------------------------------------------------------
// Per-TCG attribute types (discriminated on tcg)
// ---------------------------------------------------------------------------

export type PokemonAttack = {
	name: string;
	cost: string[];
	converted_energy_cost: number;
	damage: string;
	text: string;
};

export type PokemonWeakness = {
	type: string;
	value: string;
};

export type PokemonCardAttributes = {
	tcg: "pokemon";
	hp?: string | null;
	nationalPokedexNumbers?: number[];
	regulationMark?: string | null;
	weaknesses?: PokemonWeakness[];
	retreatCost?: string[];
	convertedRetreatCost?: number;
	attacks?: PokemonAttack[];
	flavorText?: string | null;
	legalities?: CatalogLegality[];
	variants?: CatalogVariant[];
};

export type MtgCardAttributes = {
	tcg: "mtg";
	manaCost?: string | null;
	manaValue?: number | null;
	text?: string | null;
	power?: string | null;
	toughness?: string | null;
	loyalty?: string | null;
	colors?: string[];
	colorIdentity?: string[];
	keywords?: string[];
	layout?: string | null;
	legalities?: CatalogLegality[] | null;
	finishes?: string[];
};

export type LorcanaAbility = {
	name: string;
	text: string;
};

export type LorcanaCardAttributes = {
	tcg: "lorcana";
	version?: string | null;
	cost?: number | null;
	loreValue?: number | null;
	strength?: number | null;
	willpower?: number | null;
	inkwell?: boolean;
	source?: string | null;
	rules?: string[];
	abilities?: LorcanaAbility[];
	keywords?: string[];
	legalities?: CatalogLegality[];
	variants?: CatalogVariant[];
};

export type OnePieceCardAttributes = {
	tcg: "one-piece";
	version?: string | null;
	cost?: number | null;
	power?: string | null;
	counter?: string | null;
	colors?: string[];
	attribute?: string | null;
	tags?: string[];
	effect?: string | null;
	trigger?: string | null;
	source?: string | null;
	legalities?: CatalogLegality[] | null;
};

export type CatalogTcgCardAttributes =
	| PokemonCardAttributes
	| MtgCardAttributes
	| LorcanaCardAttributes
	| OnePieceCardAttributes;

// ---------------------------------------------------------------------------
// Resolved card (full data available to the app)
// ---------------------------------------------------------------------------

export type CatalogResolvedTcgCard = {
	id: string;
	tcg: CatalogTcg;
	language?: CatalogLanguage;
	name: string;
	localId?: string;
	number?: string;
	rarity?: string;
	supertype?: string | null;
	subtypes?: string[];
	types?: string[];
	artist?: string | null;
	imageSmall?: string;
	imageMedium?: string;
	imageLarge?: string;
	imageSmallLocal?: string;
	imageMediumLocal?: string;
	imageLargeLocal?: string;
	setId?: string;
	setName?: string;
	setSymbolImage?: string;
	setLogoImage?: string;
	attributes?: CatalogTcgCardAttributes;
};

export type CatalogResolvedSet = {
	id: string;
	tcg: CatalogTcg;
	language?: CatalogLanguage;
	name: string;
	series?: string;
	releaseDate?: string;
	code?: string;
	totalTcgCards?: number;
	tcgCardCount?: number;
	symbolImage?: string;
	logoImage?: string;
	symbolImageLocal?: string;
	logoImageLocal?: string;
};