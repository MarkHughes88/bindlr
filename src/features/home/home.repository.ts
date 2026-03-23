import type { HomeData, HomeRecentViewRecord, HomeTcgCardRailItem, RecordRecentViewInput } from "./home.types";

export interface HomeRepository {
	getHomeData(): Promise<HomeData>;
	getRecentViews(limit?: number): Promise<HomeRecentViewRecord[]>;
	getWishlistCards(limit?: number): Promise<HomeTcgCardRailItem[]>;
	getMissingBinderCards(limit?: number): Promise<HomeTcgCardRailItem[]>;
	recordRecentView(input: RecordRecentViewInput): Promise<void>;
}