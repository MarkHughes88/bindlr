export type BinderListItem = {
	id: string;
	title: string;
	current: number;
	total: number;
	coverImageUri?: string;
};

export type BindersData = {
	binders: BinderListItem[];
};