export type SearchResultItem = {
	id: string;
	title: string;
	subtitle?: string;
	imageUri?: string;
	type: "tcg-card" | "set" | "binder" | "tcg";
};

export type SearchData = {
	query: string;
	results: SearchResultItem[];
};