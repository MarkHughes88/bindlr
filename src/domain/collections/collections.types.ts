export type Collection = {
	id: string;
	name: string;
	ownerUserId?: string;
	templateId?: string;
	visibility: "private" | "shared" | "public";
	createdAt: string;
	updatedAt: string;
};

export type CollectionSlot = {
	id: string;
	collectionId: string;
	position: number;
	kind: "catalog-tcg-card" | "custom-tcg-card" | "empty";
	catalogTcgCardId?: string;
	customTcgCardId?: string;
	quantity?: number;
	condition?: string;
	notes?: string;
};

export type CollectionSummary = {
	id: string;
	name: string;
	totalSlots: number;
	filledSlots: number;
	visibility: "private" | "shared" | "public";
};