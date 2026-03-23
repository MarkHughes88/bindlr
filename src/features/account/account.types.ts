export type LocalUserProfile = {
	id: "local";
	name: string;
	email?: string | null;
	avatarUrl?: string | null;
	createdAt: string;
	updatedAt: string;
};

export type UpdateLocalProfileInput = {
	name?: string;
	email?: string | null;
	avatarUrl?: string | null;
};
