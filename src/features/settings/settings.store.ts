import { useSyncExternalStore } from 'react';

import type { CatalogLanguage, CatalogTcg } from '@/src/domain/catalog/catalog.types';
import { getDatabase } from '@/src/lib/db/client';

export type DefaultOwnershipMode = 'all' | 'owned' | 'missing' | 'binder-needed';
export type DefaultSetScope = 'all' | 'favorites';
export type DownloadImageQuality = 'small' | 'medium' | 'large';

export type UserFilterDefaults = {
	defaultTcg?: CatalogTcg;
	preferredLanguage?: CatalogLanguage;
	ownershipMode?: DefaultOwnershipMode;
	setScope?: DefaultSetScope;
};

export type UserDownloadSettings = {
	imageQuality: DownloadImageQuality;
};

export type UserProfileSettings = {
	displayName: string;
	handle: string;
	email: string;
	avatarInitials: string;
	avatarColor: string;
	avatarImageUri?: string;
};

export type UserPreferenceSettings = {
	rememberCatalogFilters: boolean;
	forceOfflineMode: boolean;
};

type UserSettingsState = {
	profile: UserProfileSettings;
	filters: UserFilterDefaults;
	downloads: UserDownloadSettings;
	preferences: UserPreferenceSettings;
	isLoaded: boolean;
};

const DEFAULT_STATE: Omit<UserSettingsState, 'isLoaded'> = {
	profile: {
		displayName: 'Anonymous User',
		handle: '@collector',
		email: 'user@bindlr.local',
		avatarInitials: 'AU',
		avatarColor: '#2EC4B6',
	},
	filters: {
		defaultTcg: undefined,
		preferredLanguage: undefined,
		ownershipMode: undefined,
		setScope: undefined,
	},
	downloads: {
		imageQuality: 'small',
	},
	preferences: {
		rememberCatalogFilters: false,
		forceOfflineMode: false,
	},
};

let state: UserSettingsState = {
	...DEFAULT_STATE,
	isLoaded: false,
};

type UserSettingsRow = {
	display_name: string;
	handle: string;
	email: string;
	avatar_initials: string;
	avatar_color: string;
	avatar_image_uri: string | null;
	default_tcg: string;
	preferred_language: string;
	ownership_mode: string;
	set_scope: string;
	download_image_quality: string;
	remember_catalog_filters: number | null;
	force_offline_mode: number | null;
};

let hasStartedLoad = false;

const listeners = new Set<() => void>();

function emitChange() {
	listeners.forEach((listener) => listener());
}

export function useUserSettingsState(): UserSettingsState {
	ensureUserSettingsLoaded();
	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function ensureUserSettingsLoaded() {
	if (hasStartedLoad) {
		return;
	}

	hasStartedLoad = true;
	void hydrateUserSettings();
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function getSnapshot(): UserSettingsState {
	return state;
}

export function updateUserProfile(next: Partial<UserProfileSettings>) {
	state = {
		...state,
		profile: {
			...state.profile,
			...next,
		},
	};
	emitChange();
	void persistUserSettings();
}

export function updateUserFilterDefaults(next: Partial<UserFilterDefaults>) {
	state = {
		...state,
		filters: {
			...state.filters,
			...next,
		},
	};
	emitChange();
	void persistUserSettings();
}

export function updateUserDownloadSettings(next: Partial<UserDownloadSettings>) {
	state = {
		...state,
		downloads: {
			...state.downloads,
			...next,
		},
	};
	emitChange();
	void persistUserSettings();
}

export function updateUserPreferences(next: Partial<UserPreferenceSettings>) {
	state = {
		...state,
		preferences: {
			...state.preferences,
			...next,
		},
	};
	emitChange();
	void persistUserSettings();
}

async function hydrateUserSettings() {
	try {
		const db = await getDatabase();
		const row = await db.getFirstAsync<UserSettingsRow>(
			`SELECT display_name, handle, email, avatar_initials, avatar_color, avatar_image_uri,
					default_tcg, preferred_language, ownership_mode, set_scope, download_image_quality, remember_catalog_filters, force_offline_mode
			 FROM user_settings
			 WHERE id = 'local'
			 LIMIT 1`
		);

		if (row) {
			state = {
				profile: {
					displayName: row.display_name || DEFAULT_STATE.profile.displayName,
					handle: row.handle || DEFAULT_STATE.profile.handle,
					email: row.email || DEFAULT_STATE.profile.email,
					avatarInitials: row.avatar_initials || DEFAULT_STATE.profile.avatarInitials,
					avatarColor: row.avatar_color || DEFAULT_STATE.profile.avatarColor,
					avatarImageUri: row.avatar_image_uri ?? undefined,
				},
				filters: {
					defaultTcg: toCatalogTcg(row.default_tcg),
					preferredLanguage: toCatalogLanguage(row.preferred_language),
					ownershipMode: toOwnershipMode(row.ownership_mode),
					setScope: toSetScope(row.set_scope),
				},
				downloads: {
					imageQuality: toDownloadImageQuality(row.download_image_quality),
				},
				preferences: {
					rememberCatalogFilters: row.remember_catalog_filters === 1,
					forceOfflineMode: row.force_offline_mode === 1,
				},
				isLoaded: true,
			};
			emitChange();
			return;
		}

		state = {
			...state,
			isLoaded: true,
		};
		emitChange();
		void persistUserSettings();
	} catch {
		state = {
			...state,
			isLoaded: true,
		};
		emitChange();
	}
}

async function persistUserSettings() {
	if (!state.isLoaded) {
		return;
	}

	try {
		const db = await getDatabase();
		await db.runAsync(
			`INSERT INTO user_settings (
				id,
				display_name,
				handle,
				email,
				avatar_initials,
				avatar_color,
				avatar_image_uri,
				default_tcg,
				preferred_language,
				ownership_mode,
				set_scope,
				download_image_quality,
				remember_catalog_filters,
				force_offline_mode,
				updated_at
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(id) DO UPDATE SET
				display_name = excluded.display_name,
				handle = excluded.handle,
				email = excluded.email,
				avatar_initials = excluded.avatar_initials,
				avatar_color = excluded.avatar_color,
				avatar_image_uri = excluded.avatar_image_uri,
				default_tcg = excluded.default_tcg,
				preferred_language = excluded.preferred_language,
				ownership_mode = excluded.ownership_mode,
				set_scope = excluded.set_scope,
				download_image_quality = excluded.download_image_quality,
				remember_catalog_filters = excluded.remember_catalog_filters,
				force_offline_mode = excluded.force_offline_mode,
				updated_at = excluded.updated_at`,
			[
				'local',
				state.profile.displayName,
				state.profile.handle,
				state.profile.email,
				state.profile.avatarInitials,
				state.profile.avatarColor,
				state.profile.avatarImageUri ?? null,
				state.filters.defaultTcg ?? '',
				state.filters.preferredLanguage ?? '',
				state.filters.ownershipMode ?? '',
				state.filters.setScope ?? '',
				state.downloads.imageQuality,
				state.preferences.rememberCatalogFilters ? 1 : 0,
				state.preferences.forceOfflineMode ? 1 : 0,
				new Date().toISOString(),
			]
		);

		if (!state.preferences.rememberCatalogFilters) {
			await db.runAsync(
				`UPDATE user_settings
				 SET last_catalog_state = NULL,
				     updated_at = ?
				 WHERE id = 'local'`,
				[new Date().toISOString()]
			);
		}
	} catch {
		// Best-effort persistence for local scaffolding.
	}
}

function toCatalogTcg(value: string): CatalogTcg | undefined {
	if (value === 'pokemon' || value === 'mtg' || value === 'lorcana' || value === 'one-piece') {
		return value;
	}

	return undefined;
}

function toCatalogLanguage(value: string): CatalogLanguage | undefined {
	if (value === 'en' || value === 'ja') {
		return value;
	}

	return undefined;
}

function toOwnershipMode(value: string): DefaultOwnershipMode | undefined {
	if (value === 'all' || value === 'owned' || value === 'missing' || value === 'binder-needed') {
		return value;
	}

	return undefined;
}

function toSetScope(value: string): DefaultSetScope | undefined {
	if (value === 'all' || value === 'favorites') {
		return value;
	}

	return undefined;
}

function toDownloadImageQuality(value: string): DownloadImageQuality {
	if (value === 'small' || value === 'medium' || value === 'large') {
		return value;
	}

	return DEFAULT_STATE.downloads.imageQuality;
}
