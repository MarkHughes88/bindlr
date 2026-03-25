// LEGACY REDIRECT ROUTE: This file exists only to redirect to the canonical catalog route for Cards. Remove when all usages are migrated.
import { Redirect, useLocalSearchParams } from 'expo-router';

import { CatalogTcgCardListScreen } from '@/src/features/catalog/screens/CatalogTcgCardListScreen';
import { getCatalogBrowseToolbarSnapshot } from '@/src/features/catalog/catalogBrowseToolbar.state';
import { SEARCH_COPY } from '@/src/lib/copy';
import { useUserSettingsState } from '@/src/features/settings/settings.store';
import type { CatalogTcg } from '@/src/domain/catalog/catalog.types';

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
	const initialSearchQuery = typeof q === 'string'
		? q
		: shouldResetSearchFromRoute
			? ''
			: !specialMode
				? toolbarState.searchQuery
				: undefined;

	return (
		<CatalogTcgCardListScreen
			key={`${validTcg ?? 'all'}:${specialMode ?? 'catalog'}:${initialSearchQuery ?? ''}:${JSON.stringify(baseFilters ?? null)}:${settings.filters.defaultTcg}:${settings.filters.preferredLanguage}:${settings.filters.ownershipMode}:${settings.filters.setScope}`}
			searchPlaceholder={placeholder}
			specialMode={specialMode}
			initialSearchQuery={initialSearchQuery}
			initialFilters={{
				...baseFilters,
				...(validTcg
					? { tcgs: [validTcg] }
					: (!specialMode && !(baseFilters?.tcgs.length) && settings.filters.defaultTcg ? { tcgs: [settings.filters.defaultTcg] } : {})),
				...(isRecentlyViewed ? { recentlyViewed: true } : {}),
				...(specialMode
					? {}
					: {
						...(baseFilters?.languages.length
							? { languages: baseFilters.languages }
							: settings.filters.preferredLanguage
							? { languages: [settings.filters.preferredLanguage] }
							: {}),
					}),
				ownershipMode: baseFilters?.ownershipMode
					? baseFilters.ownershipMode
					: (settings.filters.ownershipMode
						? (settings.filters.ownershipMode === 'binder-needed' ? 'all' : settings.filters.ownershipMode)
						: 'all'),
				setScope: baseFilters?.setScope ?? settings.filters.setScope ?? 'all',
			}}
		/>
	);
}
