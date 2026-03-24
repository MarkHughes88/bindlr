
export type BinderListItem = {
	id: string;
	title: string;
	current: number;
	total: number;
	coverImageUri?: string;
	rows?: number;
	columns?: number;
};

export type BindersData = {
	binders: BinderListItem[];
};

export type BinderDetail = {
	id: string;
	name: string;
	currentCount: number;
	totalCapacity: number;
	color: string | null;
	coverImageUri: string | null;
	insideColor: string | null;
	pageColor: string | null;
	rows?: number;
	columns?: number;
};