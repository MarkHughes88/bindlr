import type { SQLiteDatabase } from "expo-sqlite";
import { migration001Initial } from "./001_initial";
import { migration002CardDestinations } from './002_card_destinations';
import { migration003UserSettings } from './003_user_settings';
import { migration004FavoriteSets } from './004_favorite_sets';
import { migration005CardIdentity } from './005_card_identity';
import { migration006CatalogFilterPersistence } from './006_catalog_filter_persistence';
import { migration007DownloadsFoundation } from './007_downloads_foundation';
import { migration008DownloadAssetLocalPaths } from './008_download_asset_local_paths';
import { migration009DownloadQualitySetting } from './009_download_quality_setting';
import { migration010DownloadScopeQuality } from './010_download_scope_quality';
import { migration011ForceOfflineModeSetting } from './011_force_offline_mode_setting';

import { migration012BinderColor } from './012_binder_color';
import { migration013BinderInsideColor } from './013_binder_inside_color';
import { migration014BinderPageColor } from './014_binder_page_color';
import { migration015BinderRowsCols } from './015_binder_rows_cols';

export type Migration = {
	version: number;
	name: string;
	up: (db: SQLiteDatabase) => Promise<void>;
};

export const migrations: Migration[] = [
  migration001Initial,
  migration002CardDestinations,
  migration003UserSettings,
  migration004FavoriteSets,
  migration005CardIdentity,
  migration006CatalogFilterPersistence,
  migration007DownloadsFoundation,
  migration008DownloadAssetLocalPaths,
  migration009DownloadQualitySetting,
  migration010DownloadScopeQuality,
  migration011ForceOfflineModeSetting,
  migration012BinderColor,
  migration013BinderInsideColor,
  migration014BinderPageColor,
  migration015BinderRowsCols,
];
