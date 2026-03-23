import type { SearchData } from "./search.types";

export interface SearchRepository {
	search(query: string): Promise<SearchData>;
}