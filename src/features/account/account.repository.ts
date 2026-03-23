import type { LocalUserProfile, UpdateLocalProfileInput } from "./account.types";

export interface AccountRepository {
	getLocalProfile(): Promise<LocalUserProfile>;
	updateLocalProfile(input: UpdateLocalProfileInput): Promise<void>;
	clearAllLocalData(): Promise<void>;
}
