// LEGACY REDIRECT ROUTE: This file exists only to redirect to the canonical catalog route for Cards. Remove when all usages are migrated.
import { Redirect, useLocalSearchParams } from 'expo-router';

import type { CatalogTcg } from '@/src/domain/catalog/catalog.types';
import { getCatalogBrowseToolbarSnapshot } from '@/src/features/catalog/catalogBrowseToolbar.state';
import { CatalogTcgCardListScreen } from '@/src/features/catalog/screens/CatalogTcgCardListScreen';
import { useUserSettingsState } from '@/src/features/settings/settings.store';
import { SEARCH_COPY } from '@/src/lib/copy';

const ALL_TCGS: CatalogTcg[] = ['pokemon', 'mtg', 'lorcana', 'one-piece'];

export default function CardsScreenRoute() {
	const { tcg, mode, q } = useLocalSearchParams<{ tcg?: string; mode?: string; q?: string }>();
	const settings = useUserSettingsState();
	const toolbarState = getCatalogBrowseToolbarSnapshot();

	const validTcg =
		typeof tcg === 'string' && ALL_TCGS.includes(tcg as CatalogTcg)
			? (tcg as CatalogTcg)
			: undefined;

	const specialMode = mode === 'recentlyViewed' || mode === 'wishlist' || mode === 'missingCards'
		? mode
		: undefined;

	if (!specialMode) {
		const tcgQuery = validTcg ? `&tcg=${validTcg}` : '';
		return <Redirect href={`/(tabs)/catalog?level=cards${tcgQuery}`} />;
	}
	const isRecentlyViewed = specialMode === 'recentlyViewed';
	const shouldResetSearchFromRoute = Boolean(specialMode) || Boolean(validTcg);

	const placeholder = specialMode === 'recentlyViewed'
		? SEARCH_COPY.placeholders.recentlyViewed
		: specialMode === 'wishlist'
			? SEARCH_COPY.placeholders.wishlist
			: specialMode === 'missingCards'
				? SEARCH_COPY.placeholders.missingCards
				: SEARCH_COPY.placeholders.homeSearch;
	const baseFilters = !specialMode ? toolbarState.filters : undefined;

	return (
		<CatalogTcgCardListScreen
			key={`${validTcg ?? 'all'}:${specialMode ?? 'catalog'}:${settings.filters.defaultTcg}:${settings.filters.preferredLanguage}:${settings.filters.ownershipMode}:${settings.filters.setScope}`}
			searchPlaceholder={placeholder}
			specialMode={specialMode}
		/>
	);
}
