import { useLocalSearchParams } from 'expo-router';

import { CatalogTcgCardListScreen } from '@/src/features/catalog/screens/CatalogTcgCardListScreen';
import { SEARCH_COPY } from '@/src/lib/copy';
import type { CatalogLanguage, CatalogTcg } from '@/src/domain/catalog/catalog.types';

const ALL_TCGS: CatalogTcg[] = ['pokemon', 'mtg', 'lorcana', 'one-piece'];
const ALL_LANGUAGES: CatalogLanguage[] = ['en', 'ja'];

export default function CardListScreenRoute() {
	const { tcg, mode, q, setId, setName, language } = useLocalSearchParams<{
		tcg?: string;
		mode?: string;
		q?: string;
		setId?: string;
		setName?: string;
		language?: string;
	}>();

	const validTcg =
		typeof tcg === 'string' && ALL_TCGS.includes(tcg as CatalogTcg)
			? (tcg as CatalogTcg)
			: undefined;

	const validLanguage =
		typeof language === 'string' && ALL_LANGUAGES.includes(language as CatalogLanguage)
			? (language as CatalogLanguage)
			: undefined;

	const validSetId = typeof setId === 'string' && setId.length > 0 ? setId : undefined;
	const validSetName = typeof setName === 'string' && setName.length > 0 ? setName : undefined;

	const specialMode = mode === 'recentlyViewed' || mode === 'wishlist' || mode === 'missingCards'
		? mode
		: undefined;
	const isRecentlyViewed = specialMode === 'recentlyViewed';
	const shouldResetSearchFromRoute = Boolean(specialMode) || Boolean(validTcg);

	const placeholder = specialMode === 'recentlyViewed'
		? SEARCH_COPY.placeholders.recentlyViewed
		: specialMode === 'wishlist'
			? SEARCH_COPY.placeholders.wishlist
			: specialMode === 'missingCards'
				? SEARCH_COPY.placeholders.missingCards
				: SEARCH_COPY.placeholders.homeSearch;

	return (
		<CatalogTcgCardListScreen
			key={`${validTcg ?? 'all'}:${specialMode ?? 'catalog'}:${validSetId ?? ''}:${typeof q === 'string' ? q : ''}`}
			searchPlaceholder={placeholder}
			specialMode={specialMode}
			initialSearchQuery={typeof q === 'string' ? q : (shouldResetSearchFromRoute ? '' : undefined)}
			initialFilters={{
				...(validTcg ? { tcgs: [validTcg] } : {}),
				...(validLanguage ? { languages: [validLanguage] } : {}),
				...(validSetId && validTcg
					? {
						setIds: [`${validTcg}:${validSetId}`],
						setNamesById: { [`${validTcg}:${validSetId}`]: validSetName ?? validSetId },
					}
					: {}),
				...(isRecentlyViewed ? { recentlyViewed: true } : {}),
			}}
		/>
	);
}
