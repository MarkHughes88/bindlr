export type CatalogSetRow = {
	id: string;
	tcg: string;
	name: string;
};

export type CatalogTcgCardRow = {
	id: string;
	tcg: string;
	set_id: string;
	name: string;
};

export type CollectionRow = {
	id: string;
	owner_user_id?: string | null;
	template_id?: string | null;
	name: string;
	visibility?: "private" | "shared" | "public";
};