import type { ImageSourcePropType } from "react-native";

import type {
	CatalogLanguage,
	CatalogTcg,
} from "@/src/domain/catalog/catalog.types";

export type HomeOverviewStats = {
	totalOwned: number;
	totalUnique: number;
	totalSets: number;
	wishlistCount: number;
};

export type HomeBinderSummary = {
	id: string;
	title: string;
	current: number;
	total: number;
	coverImageUri?: string;
};

export type HomeTcgSummary = {
	id: string;
	title: string;
	totalOwned: number;
	logoImage?: string | ImageSourcePropType;
};

export type HomeRecentViewRecord =
	| {
			id: string;
			kind: "catalog-tcg-card";
			tcg: CatalogTcg;
			catalogTcgCardId: string;
			language?: CatalogLanguage;
			viewedAt: string;
	  }
	| {
			id: string;
			kind: "custom-tcg-card";
			tcg: CatalogTcg;
			customTcgCardId: string;
			viewedAt: string;
	  };

export type RecordRecentViewInput =
	| {
			kind: "catalog-tcg-card";
			tcg: CatalogTcg;
			catalogTcgCardId: string;
			language?: CatalogLanguage;
	  }
	| {
			kind: "custom-tcg-card";
			tcg: CatalogTcg;
			customTcgCardId: string;
	  };

export type HomeTcgCardRailItem = {
	id: string;
	kind: "catalog-tcg-card" | "custom-tcg-card";
	tcg: CatalogTcg;
	catalogTcgCardId?: string;
	customTcgCardId?: string;
	language?: CatalogLanguage;
	viewedAt?: string;
	title: string;
	setName?: string;
	number?: string;
	imageSource?: ImageSourcePropType;
};

export type HomeRecentTcgCardItem = HomeTcgCardRailItem;

export type HomeData = {
	overview: HomeOverviewStats;
	binders: HomeBinderSummary[];
	tcgs: HomeTcgSummary[];
	recentlyViewed: HomeRecentTcgCardItem[];
	wishlist: HomeTcgCardRailItem[];
	missingCards: HomeTcgCardRailItem[];
};

export type HomeMockData = Omit<HomeData, "recentlyViewed"> & {
	recentlyViewed: HomeRecentViewRecord[];
};