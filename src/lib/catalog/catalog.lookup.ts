import pokemonTcgCardsEn from "@/data/pokemon/app/en/cards-by-id.json";
import pokemonTcgCardsJa from "@/data/pokemon/app/ja/cards-by-id.json";
import pokemonSetsEn from "@/data/pokemon/app/en/sets-by-id.json";
import pokemonSetsJa from "@/data/pokemon/app/ja/sets-by-id.json";

import mtgTcgCardsEn from "@/data/mtg/app/en/cards-by-id.json";
import mtgSetsEn from "@/data/mtg/app/en/sets-by-id.json";

import lorcanaTcgCardsEn from "@/data/lorcana/app/en/cards-by-id.json";
import lorcanaSetsEn from "@/data/lorcana/app/en/sets-by-id.json";

import onePieceTcgCardsEn from "@/data/one-piece/app/en/cards-by-id.json";
import onePieceSetsEn from "@/data/one-piece/app/en/sets-by-id.json";

import type {
	CatalogLanguage,
	CatalogResolvedSet,
	CatalogResolvedTcgCard,
	CatalogTcg,
	CatalogTcgCardAttributes,
} from "@/src/domain/catalog/catalog.types";

export type TcgCardIndex = Record<string, any>;
export type SetIndex = Record<string, any>;

const SUPPORTED_CATALOG_LANGUAGES: Record<CatalogTcg, readonly CatalogLanguage[]> = {
	pokemon: ['en', 'ja'],
	mtg: ['en'],
	lorcana: ['en'],
	'one-piece': ['en'],
};

export function getSupportedCatalogLanguages(
	tcg: CatalogTcg
): readonly CatalogLanguage[] {
	return SUPPORTED_CATALOG_LANGUAGES[tcg];
}

export function getTcgCardIndex(
	tcg: CatalogTcg,
	language?: CatalogLanguage
): TcgCardIndex | null {
	if (language && !getSupportedCatalogLanguages(tcg).includes(language)) {
		return null;
	}

	switch (tcg) {
		case "pokemon":
			return language === "ja"
				? (pokemonTcgCardsJa as TcgCardIndex)
				: (pokemonTcgCardsEn as TcgCardIndex);
		case "mtg":
			return mtgTcgCardsEn as TcgCardIndex;
		case "lorcana":
			return lorcanaTcgCardsEn as TcgCardIndex;
		case "one-piece":
			return onePieceTcgCardsEn as TcgCardIndex;
		default:
			return null;
	}
}

export function getSetIndex(
	tcg: CatalogTcg,
	language?: CatalogLanguage
): SetIndex | null {
	if (language && !getSupportedCatalogLanguages(tcg).includes(language)) {
		return null;
	}

	switch (tcg) {
		case "pokemon":
			return language === "ja"
				? (pokemonSetsJa as SetIndex)
				: (pokemonSetsEn as SetIndex);
		case "mtg":
			return mtgSetsEn as SetIndex;
		case "lorcana":
			return lorcanaSetsEn as SetIndex;
		case "one-piece":
			return onePieceSetsEn as SetIndex;
		default:
			return null;
	}
}

export function getCatalogSetById(
	tcg: CatalogTcg,
	setId: string,
	language?: CatalogLanguage
): CatalogResolvedSet | null {
	const sets = getSetIndex(tcg, language);
	if (!sets) return null;

	const set = sets[setId];
	if (!set) return null;

	return {
		id: set.id,
		tcg,
		language: set.language,
		name: set.name ?? set.id,
		series: set.series,
		releaseDate: set.releaseDate,
		code: set.code,
		totalTcgCards: set.tcgCardCount,
		tcgCardCount: set.tcgCardCount,
		symbolImage: set.symbolImage,
		logoImage: set.logoImage,
		symbolImageLocal: set.symbolImageLocal,
		logoImageLocal: set.logoImageLocal,
	};
}

export function getCatalogTcgCardById(
	tcg: CatalogTcg,
	catalogTcgCardId: string,
	language?: CatalogLanguage
): CatalogResolvedTcgCard | null {
	const tcgCards = getTcgCardIndex(tcg, language);
	if (!tcgCards) return null;

	const tcgCard = tcgCards[catalogTcgCardId];
	if (!tcgCard) return null;

	const set = tcgCard.setId
		? getCatalogSetById(tcg, tcgCard.setId, language)
		: null;

	return {
		id: tcgCard.id,
		tcg,
		language: tcgCard.language,
		name: tcgCard.name ?? tcgCard.id,
		localId: tcgCard.localId,
		number: tcgCard.localId,
		rarity: tcgCard.rarity,
		supertype: tcgCard.supertype,
		subtypes: tcgCard.subtypes,
		types: tcgCard.types,
		artist: tcgCard.artist,
		imageSmall: tcgCard.imageSmall,
		imageMedium: tcgCard.imageMedium,
		imageLarge: tcgCard.imageLarge,
		imageSmallLocal: tcgCard.imageSmallLocal,
		imageMediumLocal: tcgCard.imageMediumLocal,
		imageLargeLocal: tcgCard.imageLargeLocal,
		setId: tcgCard.setId,
		setName: set?.name,
		setSymbolImage: set?.symbolImage,
		setLogoImage: set?.logoImage,
		attributes: tcgCard.attributes
			? ({ tcg, ...tcgCard.attributes } as CatalogTcgCardAttributes)
			: undefined,
	};
}