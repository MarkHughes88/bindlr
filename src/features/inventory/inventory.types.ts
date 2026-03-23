import type { ImageSourcePropType } from "react-native";

export type InventoryTcg = "pokemon" | "mtg" | "lorcana" | "one-piece";

export type OwnedItemKind =
	| "catalog-tcg-card"
	| "custom-tcg-card"
	| "placeholder"
	| "cover"
	| "insert"
	| "asset";

export type OwnedItem = {
	id: string;
	kind: OwnedItemKind;
	quantity: number;
	tcg?: InventoryTcg;
	catalogTcgCardId?: string;
	customTcgCardId?: string;
	assetId?: string;
	setId?: string;
	language?: string;
	condition?: string;
	notes?: string;
};

export type InventoryResolvedTcgCard = {
	id: string;
	tcg: InventoryTcg;
	catalogTcgCardId: string;
	title: string;
	setId?: string;
	setName?: string;
	setSymbolImage?: string;
	rarity?: string;
	quantity: number;
	language?: string;
	condition?: string;
	imageSmall?: string;
	imageMedium?: string;
	imageLarge?: string;
	imageSmallLocal?: string;
	imageMediumLocal?: string;
	imageLargeLocal?: string;
};

export type InventoryOverviewStats = {
	totalOwned: number;
	totalUnique: number;
	totalSets: number;
};

export type TcgSummary = {
	id: InventoryTcg;
	title: string;
	totalOwned: number;
	totalUnique?: number;
	totalCatalogTcgCards?: number;
	percentComplete?: number;
	logoImage?: ImageSourcePropType;
	symbolImage?: string;
	logoImageLocal?: string;
	symbolImageLocal?: string;
};