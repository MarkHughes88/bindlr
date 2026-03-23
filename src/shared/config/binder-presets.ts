export type BinderPreset = {
	id: string;
	label: string;
	rows: number;
	cols: number;
	capacity: number;
};

// 4x3 has two popular vault formats with different page counts.
export const BINDER_PRESETS: BinderPreset[] = [
	{ id: "pocket-4", label: "4 pocket", rows: 2, cols: 2, capacity: 160 },
	{ id: "pocket-9", label: "9 pocket", rows: 3, cols: 3, capacity: 360 },
	{ id: "pocket-9-xl", label: "9 pocket XL", rows: 4, cols: 3, capacity: 480 },
	{ id: "pocket-12", label: "12 pocket", rows: 4, cols: 3, capacity: 624 },
	{ id: "pocket-16-xxl", label: "16 pocket XXL", rows: 4, cols: 4, capacity: 1088 },
	{ id: "pocket-20-xxxl", label: "20 pocket XXXL", rows: 5, cols: 4, capacity: 1280 },
];
