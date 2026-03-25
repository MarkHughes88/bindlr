import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

// Import theme
import { useAppTheme } from "@/src/theme/useAppTheme";

// Import components
import {
	Screen,
	Header,
	AppText,
	Grid,
	TcgCard,
	Section,
	Button,
	Divider,
	SkeletonBlock,
	FadeInView,
} from "@/src/shared/ui";
import { resolveTcgCardImageSource } from "@/src/lib/catalog/resolveTcgCardImageSource";
import { normalizeSearchQuery, matchesSearchValue } from "@/src/features/search/search.utils";
import { sortCatalogTcgCards } from "@/src/features/catalog/catalog.sort";
import { CatalogBrowseToolbar } from '@/src/features/catalog/components/CatalogBrowseToolbar';
import {
	CatalogScreenFilters,
	DEFAULT_CATALOG_FILTERS,
	toCatalogCardFilters,
} from "@/src/features/catalog/catalog.filters";
import {
	matchesGameSpecificSelections,
} from '@/src/features/catalog/catalog.gameSpecific';

// Import repositories
import { homeRepository, catalogRepository, inventoryRepository, downloadsRepository } from "@/src/lib/repositories";

// Import types
import type { CatalogLanguage, CatalogTcg, CatalogTcgCardAttributes } from "@/src/domain/catalog/catalog.types";
import type { CatalogTcgCardSortDirection, CatalogTcgCardSortKey } from "@/src/features/catalog/catalog.types";
import type { TcgCardItem } from "@/src/shared/ui/TcgCard";
import type { HomeTcgCardRailItem } from '@/src/features/home/home.types';
import {
	updateCatalogBrowseToolbarFilters,
	updateCatalogBrowseToolbarSearchQuery,
	updateCatalogBrowseToolbarSort,
	useCatalogBrowseToolbarState,
} from '@/src/features/catalog/catalogBrowseToolbar.state';

type Row = {
	id: string;
	rowKey: string;
	tcg: CatalogTcg;
	catalogTcgCardId: string;
	language: CatalogLanguage | undefined;
	title: string;
	setId: string | undefined;
	setName: string | undefined;
	rarity: string | undefined;
	cardTypes: string[] | undefined;
	subtypes: string[] | undefined;
	attributes: CatalogTcgCardAttributes | undefined;
	tcgCard: TcgCardItem;
};

type CatalogTcgCardListScreenProps = {
	searchPlaceholder: string;
	initialFilters?: Partial<CatalogScreenFilters>;
	initialSearchQuery?: string;
	specialMode?: 'recentlyViewed' | 'wishlist' | 'missingCards';
	hideChrome?: boolean;
	hideToolbar?: boolean;
};

const DEFAULT_PAGE_SIZE = 99;
const DEFAULT_SORT_DIRECTION: CatalogTcgCardSortDirection = 'asc';

const PERSISTED_SEARCH_QUERY_BY_MODE: Record<'catalog' | 'recentlyViewed' | 'wishlist' | 'missingCards', string> = {
	catalog: '',
	recentlyViewed: '',
	wishlist: '',
	missingCards: '',
};

export function CatalogTcgCardListScreen({
	searchPlaceholder,
	initialFilters,
	initialSearchQuery,
	specialMode,
	hideChrome = false,
	hideToolbar = false,
}: CatalogTcgCardListScreenProps) {
	const router = useRouter();
	const theme = useAppTheme();
	const styles = useMemo(() => createStyles(theme), [theme]);
	const toolbarState = useCatalogBrowseToolbarState();

	// Set States
	const [items, setItems] = useState<Row[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [pageSize] = useState(DEFAULT_PAGE_SIZE);
	const [totalPages, setTotalPages] = useState(1);
	const [totalItems, setTotalItems] = useState(0);
	const initialModeKey = (specialMode ?? (initialFilters?.recentlyViewed ? 'recentlyViewed' : 'catalog')) as 'catalog' | 'recentlyViewed' | 'wishlist' | 'missingCards';
	const [searchQuery, setSearchQuery] = useState(() => (
		typeof initialSearchQuery === 'string'
			? initialSearchQuery
			: PERSISTED_SEARCH_QUERY_BY_MODE[initialModeKey]
	));
	const savedSearchByModeRef = useRef<Record<'catalog' | 'recentlyViewed' | 'wishlist' | 'missingCards', string>>({
		...PERSISTED_SEARCH_QUERY_BY_MODE,
	});
	const loadRequestIdRef = useRef(0);
	const [selectedSort, setSelectedSort] = useState<{
		key: CatalogTcgCardSortKey;
		direction: CatalogTcgCardSortDirection;
	} | null>(null);
	const [currentFilters, setCurrentFilters] = useState<CatalogScreenFilters>(() => ({
		...DEFAULT_CATALOG_FILTERS,
		...initialFilters,
	}));
	const savedFiltersByModeRef = useRef<{
		catalog: CatalogScreenFilters;
		recentlyViewed: CatalogScreenFilters;
		wishlist: CatalogScreenFilters;
		missingCards: CatalogScreenFilters;
	}>((() => {
		const mergedInitial = {
			...DEFAULT_CATALOG_FILTERS,
			...initialFilters,
		};

		return {
			catalog: {
				...mergedInitial,
				recentlyViewed: false,
			},
			recentlyViewed: {
				...mergedInitial,
				recentlyViewed: true,
			},
			wishlist: {
				...mergedInitial,
				recentlyViewed: false,
			},
			missingCards: {
				...mergedInitial,
				recentlyViewed: false,
			},
		};
	})());

	const currentModeKey = specialMode ?? (currentFilters.recentlyViewed ? 'recentlyViewed' : 'catalog');

	const mapHomeRailItemsToRows = useCallback((itemsToMap: HomeTcgCardRailItem[]): Row[] => (
		itemsToMap
			.filter((item): item is HomeTcgCardRailItem & { kind: 'catalog-tcg-card'; catalogTcgCardId: string } => (
				item.kind === 'catalog-tcg-card' && Boolean(item.catalogTcgCardId)
			))
			.map((item) => ({
				id: item.id,
				rowKey: `${item.tcg}:${item.catalogTcgCardId}:${item.language ?? 'en'}:${item.id}`,
				tcg: item.tcg,
				catalogTcgCardId: item.catalogTcgCardId,
				language: item.language,
				title: item.title,
				setId: undefined,
				setName: item.setName,
				rarity: undefined,
				cardTypes: undefined,
				subtypes: undefined,
				attributes: undefined,
				tcgCard: {
					id: item.id,
					title: item.title,
					imageSource: item.imageSource,
				},
			}))
	), []);

	const hydrateRowsWithLocalImages = useCallback(async (rows: Row[]): Promise<Row[]> => {
		const uniqueKeys = new Set<string>();
		const byKey = new Map<string, string | null>();

		await Promise.all(rows.map(async (row) => {
			const key = `${row.tcg}:${row.catalogTcgCardId}:${row.language ?? ''}:${row.setId ?? ''}`;
			if (uniqueKeys.has(key)) {
				return;
			}

			uniqueKeys.add(key);
			const localUri = await downloadsRepository.getCardImageLocalUri({
				tcg: row.tcg,
				catalogTcgCardId: row.catalogTcgCardId,
				setId: row.setId,
				language: row.language,
			});
			byKey.set(key, localUri);
		}));

		return rows.map((row) => {
			const key = `${row.tcg}:${row.catalogTcgCardId}:${row.language ?? ''}:${row.setId ?? ''}`;
			const localUri = byKey.get(key);
			if (!localUri) {
				return row;
			}

			return {
				...row,
				tcgCard: {
					...row.tcgCard,
					imageSource: { uri: localUri },
				},
			};
		});
	}, []);

	useEffect(() => {
		savedFiltersByModeRef.current[currentModeKey] = currentFilters;
	}, [currentFilters, currentModeKey]);

	useEffect(() => {
		const routeQuery = typeof initialSearchQuery === 'string' ? initialSearchQuery : undefined;
		const nextSearch = routeQuery ?? (savedSearchByModeRef.current[currentModeKey] ?? '');
		setSearchQuery((prev) => (prev === nextSearch ? prev : nextSearch));

		if (routeQuery !== undefined) {
			savedSearchByModeRef.current[currentModeKey] = routeQuery;
			PERSISTED_SEARCH_QUERY_BY_MODE[currentModeKey] = routeQuery;
			setPage((prev) => (prev === 1 ? prev : 1));
		}
	}, [currentModeKey, initialSearchQuery]);

	useEffect(() => {
		savedSearchByModeRef.current[currentModeKey] = searchQuery;
		PERSISTED_SEARCH_QUERY_BY_MODE[currentModeKey] = searchQuery;
	}, [currentModeKey, searchQuery]);

	useEffect(() => {
		if (specialMode || hideChrome) {
			return;
		}

		updateCatalogBrowseToolbarSearchQuery(searchQuery);
		updateCatalogBrowseToolbarFilters(currentFilters);
		updateCatalogBrowseToolbarSort(selectedSort);
	}, [currentFilters, hideChrome, searchQuery, selectedSort, specialMode]);

	useEffect(() => {
		if (specialMode || !hideChrome) {
			return;
		}

		if (searchQuery !== toolbarState.searchQuery) {
			setSearchQuery(toolbarState.searchQuery);
			setPage(1);
		}

		const filtersChanged = JSON.stringify(currentFilters) !== JSON.stringify(toolbarState.filters);
		if (filtersChanged) {
			setCurrentFilters(toolbarState.filters);
			setPage(1);
		}

		const sortChanged = JSON.stringify(selectedSort) !== JSON.stringify(toolbarState.selectedSort);
		if (sortChanged) {
			setSelectedSort(toolbarState.selectedSort);
			setPage(1);
		}
	}, [currentFilters, hideChrome, searchQuery, selectedSort, specialMode, toolbarState.filters, toolbarState.searchQuery, toolbarState.selectedSort]);

	useEffect(() => {
		const isPokemonOnly = currentFilters.tcgs.length === 1 && currentFilters.tcgs[0] === 'pokemon';
		if (selectedSort?.key === 'pokedex' && !isPokemonOnly) {
			setSelectedSort({ key: 'name', direction: selectedSort.direction });
			setPage(1);
		}
	}, [currentFilters.tcgs, selectedSort]);

	const sortBy = selectedSort?.key;
	const sortDirection = selectedSort?.direction ?? DEFAULT_SORT_DIRECTION;

	const load = useCallback(async () => {
		const requestId = ++loadRequestIdRef.current;

		try {
			if (hasLoadedOnce) {
				setIsRefreshing(true);
			} else {
				setIsLoading(true);
			}
			setError(null);

			if (currentModeKey !== 'catalog') {
				let specialRows: Row[] = [];

				if (currentModeKey === 'recentlyViewed') {
					const recents = await homeRepository.getRecentViews(pageSize);
					const normalizedQuery = normalizeSearchQuery(searchQuery);
					const ownedExact = new Set<string>();
					const ownedAnyLanguage = new Set<string>();

					if (currentFilters.ownershipMode !== 'all') {
						const ownedItems = await inventoryRepository.getOwnedItems();
						ownedItems
							.filter((item) => (
								item.kind === 'catalog-tcg-card' &&
								item.tcg &&
								item.catalogTcgCardId &&
								item.quantity > 0
							))
							.forEach((item) => {
								const tcg = item.tcg as CatalogTcg;
								const cardId = item.catalogTcgCardId as string;
								ownedExact.add(`${tcg}:${cardId}:${item.language ?? ''}`);
								ownedAnyLanguage.add(`${tcg}:${cardId}`);
							});
					}

					const recentRows = await Promise.all(
						recents
							.filter(
								(r): r is Extract<typeof r, { kind: "catalog-tcg-card" }> =>
									r.kind === "catalog-tcg-card"
							)
							.map(async (r) => {
								const catalogTcgCard = await catalogRepository.getCatalogTcgCardById(
									r.tcg,
									r.catalogTcgCardId,
									r.language
								);

								return {
									id: r.id,
									rowKey: `${r.tcg}:${r.catalogTcgCardId}:${r.language ?? 'en'}:${r.id}`,
									tcg: r.tcg,
									catalogTcgCardId: r.catalogTcgCardId,
									language: r.language,
									title: catalogTcgCard?.name ?? r.catalogTcgCardId,
									setId: catalogTcgCard?.setId,
									setName: catalogTcgCard?.setName,
									rarity: catalogTcgCard?.rarity,
									cardTypes: catalogTcgCard?.types,
									subtypes: catalogTcgCard?.subtypes,
									attributes: catalogTcgCard?.attributes,
									tcgCard: {
										id: r.id,
										title: catalogTcgCard?.name ?? r.catalogTcgCardId,
										imageSource: resolveTcgCardImageSource({
											imageSmall:
												catalogTcgCard?.imageSmall ??
												catalogTcgCard?.imageMedium ??
												catalogTcgCard?.imageLarge,
										}),
									},
								} satisfies Row;
							})
					);

					specialRows = recentRows;

					const filteredRecentRows = specialRows.filter((row) => {
						const isOwned =
							ownedExact.has(`${row.tcg}:${row.catalogTcgCardId}:${row.language ?? ''}`) ||
							ownedAnyLanguage.has(`${row.tcg}:${row.catalogTcgCardId}`);

						const matchesOwnership =
							currentFilters.ownershipMode === 'all' ||
							(currentFilters.ownershipMode === 'owned' && isOwned) ||
							(currentFilters.ownershipMode === 'missing' && !isOwned);

						const matchesFilters = (
							(currentFilters.tcgs.length === 0 || currentFilters.tcgs.includes(row.tcg)) &&
							(currentFilters.languages.length === 0 || currentFilters.languages.includes(row.language ?? 'en')) &&
							(currentFilters.setIds.length === 0 || currentFilters.setIds.includes(row.setId ?? '')) &&
							(
								currentFilters.rarityKeys.length === 0 ||
								currentFilters.rarityKeys.includes(`${row.tcg}:${row.rarity ?? ''}`)
							) &&
							(
								currentFilters.cardTypeKeys.length === 0 ||
								(row.cardTypes ?? []).some((cardType) => currentFilters.cardTypeKeys.includes(`${row.tcg}:${cardType}`))
							) &&
							matchesGameSpecificSelections({
								tcg: row.tcg,
								subtypes: row.subtypes,
								attributes: row.attributes,
							}, currentFilters.gameSpecificSelections) &&
							matchesOwnership
						);

						if (!matchesFilters) {
							return false;
						}

						return (
							matchesSearchValue(row.title, normalizedQuery) ||
							matchesSearchValue(row.setName, normalizedQuery) ||
							matchesSearchValue(row.catalogTcgCardId, normalizedQuery)
						);
					});

					const sortedRecentRows = sortCatalogTcgCards(
						filteredRecentRows.map((row) => ({
							id: row.catalogTcgCardId,
							tcg: row.tcg,
							language: row.language,
							name: row.title,
							number: undefined,
							setReleaseDate: undefined,
							pokemonNationalPokedexNumber: undefined,
							imageSmall: undefined,
							imageMedium: undefined,
							imageLarge: undefined,
							imageSmallLocal: undefined,
							imageMediumLocal: undefined,
							imageLargeLocal: undefined,
							setId: '',
							setName: row.setName,
							rarity: row.rarity,
							types: row.cardTypes,
						})),
						sortBy ?? 'name',
						sortDirection,
					);

					const sortedRowsByKey = new Map(
						filteredRecentRows.map((row) => [`${row.tcg}:${row.catalogTcgCardId}:${row.title}`, row]),
					);

					const sortedRecentUiRows = sortedRecentRows
						.map((item) => sortedRowsByKey.get(`${item.tcg}:${item.id}:${item.name}`))
						.filter((row): row is NonNullable<typeof row> => Boolean(row));

					const recentRowsWithLocalImages = await hydrateRowsWithLocalImages(sortedRecentUiRows);

					if (requestId !== loadRequestIdRef.current) {
						return;
					}

					setItems(recentRowsWithLocalImages);
					setTotalPages(1);
					setTotalItems(recentRowsWithLocalImages.length);
					return;
				}

				const normalizedQuery = normalizeSearchQuery(searchQuery);
				const ownedExact = new Set<string>();
				const ownedAnyLanguage = new Set<string>();

				if (currentFilters.ownershipMode !== 'all') {
					const ownedItems = await inventoryRepository.getOwnedItems();
					ownedItems
						.filter((item) => (
							item.kind === 'catalog-tcg-card' &&
							item.tcg &&
							item.catalogTcgCardId &&
							item.quantity > 0
						))
						.forEach((item) => {
							const tcg = item.tcg as CatalogTcg;
							const cardId = item.catalogTcgCardId as string;
							ownedExact.add(`${tcg}:${cardId}:${item.language ?? ''}`);
							ownedAnyLanguage.add(`${tcg}:${cardId}`);
						});
				}

				const specialItems = currentModeKey === 'wishlist'
					? await homeRepository.getWishlistCards()
					: await homeRepository.getMissingBinderCards();

				specialRows = mapHomeRailItemsToRows(specialItems);

				const filteredSpecialRows = specialRows.filter((row) => {
					const isOwned =
						ownedExact.has(`${row.tcg}:${row.catalogTcgCardId}:${row.language ?? ''}`) ||
						ownedAnyLanguage.has(`${row.tcg}:${row.catalogTcgCardId}`);

					const matchesOwnership =
						currentFilters.ownershipMode === 'all' ||
						(currentFilters.ownershipMode === 'owned' && isOwned) ||
						(currentFilters.ownershipMode === 'missing' && !isOwned);

					const matchesFilters = (
						(currentFilters.tcgs.length === 0 || currentFilters.tcgs.includes(row.tcg)) &&
						(currentFilters.languages.length === 0 || currentFilters.languages.includes(row.language ?? 'en')) &&
						(currentFilters.setIds.length === 0 || currentFilters.setIds.includes(row.setId ?? '')) &&
						matchesOwnership
					);

					if (!matchesFilters) {
						return false;
					}

					return (
						matchesSearchValue(row.title, normalizedQuery) ||
						matchesSearchValue(row.setName, normalizedQuery) ||
						matchesSearchValue(row.catalogTcgCardId, normalizedQuery)
					);
				});

				const sortedSpecialRows = sortCatalogTcgCards(
					filteredSpecialRows.map((row) => ({
						id: row.catalogTcgCardId,
						tcg: row.tcg,
						language: row.language,
						name: row.title,
						number: undefined,
						setReleaseDate: undefined,
						pokemonNationalPokedexNumber: undefined,
						imageSmall: undefined,
						imageMedium: undefined,
						imageLarge: undefined,
						imageSmallLocal: undefined,
						imageMediumLocal: undefined,
						imageLargeLocal: undefined,
						setId: '',
						setName: row.setName,
						rarity: row.rarity,
						types: row.cardTypes,
					})),
					sortBy ?? 'name',
					sortDirection,
				);

				const sortedRowsByKey = new Map(
					filteredSpecialRows.map((row) => [`${row.tcg}:${row.catalogTcgCardId}:${row.title}`, row]),
				);

				const sortedSpecialUiRows = sortedSpecialRows
					.map((item) => sortedRowsByKey.get(`${item.tcg}:${item.id}:${item.name}`))
					.filter((row): row is NonNullable<typeof row> => Boolean(row));

				const specialRowsWithLocalImages = await hydrateRowsWithLocalImages(sortedSpecialUiRows);

				if (requestId !== loadRequestIdRef.current) {
					return;
				}

				setItems(specialRowsWithLocalImages);
				setTotalPages(1);
				setTotalItems(specialRowsWithLocalImages.length);
				return;
			}

			const cardPage = await catalogRepository.getCatalogTcgCardsPage({
				page,
				pageSize,
				query: searchQuery,
				filters: toCatalogCardFilters(currentFilters),
				sortBy,
				sortDirection,
			});

			const pagedRows: Row[] = cardPage.items.map((catalogTcgCard) => ({
				id: catalogTcgCard.id,
				rowKey: `${catalogTcgCard.tcg}:${catalogTcgCard.id}:${catalogTcgCard.language ?? 'en'}`,
				tcg: catalogTcgCard.tcg,
				catalogTcgCardId: catalogTcgCard.id,
				language: catalogTcgCard.language,
				title: catalogTcgCard.name,
				setId: catalogTcgCard.setId,
				setName: catalogTcgCard.setName,
				rarity: catalogTcgCard.rarity,
				cardTypes: catalogTcgCard.types,
				subtypes: catalogTcgCard.subtypes,
				attributes: catalogTcgCard.attributes,
				tcgCard: {
					id: `${catalogTcgCard.tcg}:${catalogTcgCard.id}`,
					title: catalogTcgCard.name,
					imageSource: resolveTcgCardImageSource({
						imageSmall: catalogTcgCard.imageSmall,
						imageMedium: catalogTcgCard.imageMedium,
						imageLarge: catalogTcgCard.imageLarge,
						imageSmallLocal: catalogTcgCard.imageSmallLocal,
						imageMediumLocal: catalogTcgCard.imageMediumLocal,
						imageLargeLocal: catalogTcgCard.imageLargeLocal,
					}),
				},
			}));

			const pagedRowsWithLocalImages = await hydrateRowsWithLocalImages(pagedRows);

			if (requestId !== loadRequestIdRef.current) {
				return;
			}

			setItems(pagedRowsWithLocalImages);
			setTotalPages(cardPage.totalPages);
			setTotalItems(cardPage.total);
		} catch {
			if (requestId === loadRequestIdRef.current) {
				setError("Failed to load cards.");
			}
		} finally {
			if (requestId === loadRequestIdRef.current) {
				setIsLoading(false);
				setIsRefreshing(false);
				setHasLoadedOnce(true);
			}
		}
	}, [
		currentFilters,
		hasLoadedOnce,
		currentModeKey,
		mapHomeRailItemsToRows,
		hydrateRowsWithLocalImages,
		page,
		pageSize,
		searchQuery,
		sortBy,
		sortDirection,
	]);

	useFocusEffect(
		useCallback(() => {
			void load();
		}, [load])
	);

	const onSearchQueryChange = (query: string) => {
		setPage(1);
		setSearchQuery(query);
	};

	const onApplyFilters = (filters: CatalogScreenFilters) => {
		setCurrentFilters(filters);
		setPage(1);
	};

	const topResultCountText = isLoading
		? 'Loading cards...'
		: `Showing ${totalItems} ${totalItems === 1 ? 'card' : 'cards'}`;

	const paginationControls = !currentFilters.recentlyViewed ? (
		<Section spacing="none">
			<View style={styles.paginationContainer}>
				<Button
					type="secondary"
					text="Prev"
					onPress={() => setPage((prev) => Math.max(1, prev - 1))}
					disabled={page <= 1}
				/>
				<AppText muted>{`Page ${page} of ${totalPages} (${totalItems} total)`}</AppText>
				<Button
					type="secondary"
					text="Next"
					onPress={() => setPage((prev) => Math.min(totalPages, prev + 1))}
					disabled={page >= totalPages}
				/>
			</View>
		</Section>
	) : null;

	const topPaginationControls = !currentFilters.recentlyViewed ? (
		<Section spacing="none">
			<View style={[styles.paginationContainer, styles.topPaginationContainer]}>
				<Button
					type="secondary"
					text="Prev"
					onPress={() => setPage((prev) => Math.max(1, prev - 1))}
					disabled={page <= 1}
				/>
				<AppText muted>{`Page ${page} of ${totalPages} (${totalItems} total)`}</AppText>
				<Button
					type="secondary"
					text="Next"
					onPress={() => setPage((prev) => Math.min(totalPages, prev + 1))}
					disabled={page >= totalPages}
				/>
			</View>
		</Section>
	) : null;

	const cardsContent = (
		<>
			{hideChrome ? null : <Header hasBackBtn />}
			{error ? <AppText muted>{error}</AppText> : null}
			{!isLoading && !isRefreshing && !error && items.length === 0 ? (
				<AppText muted>{currentFilters.recentlyViewed ? 'No recently viewed cards match these filters.' : 'No cards match these filters.'}</AppText>
			) : null}

			{!error ? (
				<>
					{hideToolbar ? null : <CatalogBrowseToolbar
						isBusy={isLoading || isRefreshing}
						searchPlaceholder={searchPlaceholder}
						searchQuery={searchQuery}
						onSearchQueryChange={onSearchQueryChange}
						currentFilters={currentFilters}
						onApplyFilters={onApplyFilters}
						selectedSort={selectedSort}
						onSortChange={(sort) => {
							setSelectedSort(sort);
							setPage(1);
						}}
						visibleControls={['tcg', 'set', 'language', 'inventory', 'sort']}
						resultCountText={topResultCountText}
					/>}
					<Divider />

					{topPaginationControls}

					<Section>
						{isLoading ? (
							<Grid columns={3} gap={theme.spacing.lg}>
								{Array.from({ length: 9 }).map((_, index) => (
									<View key={`cards-skeleton-${index}`} style={styles.gridItem}>
										<SkeletonBlock
											width="100%"
											height={168}
											borderRadius={theme.radius.md}
										/>
										<SkeletonBlock
											style={styles.skeletonTitle}
											width="78%"
											height={16}
											borderRadius={theme.radius.xs}
										/>
										<SkeletonBlock
											style={styles.skeletonSubtitle}
											width="64%"
											height={14}
											borderRadius={theme.radius.xs}
										/>
									</View>
								))}
							</Grid>
						) : (
							<Grid columns={3} gap={theme.spacing.lg}>
								{items.map((item) => (
									<FadeInView key={item.rowKey} style={styles.gridItem}>
										<Pressable
											style={styles.cardPressable}
											onPress={() => {
												router.push({
													pathname: '/tcg-card/[tcgCardId]',
													params: {
														tcgCardId: item.catalogTcgCardId,
														tcg: item.tcg,
														...(item.language ? { language: item.language } : {}),
													},
												});
											}}
										>
											<TcgCard tcgCard={item.tcgCard} />
										</Pressable>
										<AppText numberOfLines={1} style={styles.titleText}>{item.title}</AppText>
										{item.setName ? <AppText muted numberOfLines={1} style={styles.subtitleText}>{item.setName}</AppText> : null}
									</FadeInView>
								))}
							</Grid>
						)}
					</Section>

					{isRefreshing ? (
						<Section spacing="none">
							<AppText muted>Updating results...</AppText>
						</Section>
					) : null}

					{paginationControls}
				</>
			) : null}
		</>
	);

	if (hideChrome) {
		return cardsContent;
	}

	return <Screen edges={['left', 'right']}>{cardsContent}</Screen>;
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
	StyleSheet.create({
		toolbarsContainer: {
			flexDirection: "column",
			gap: theme.spacing.md,
		},
		filterPillsSection: {
			flexDirection: "row",
			gap: theme.spacing.sm,
			flexWrap: "wrap",
		},
		sortContainer: {},
		paginationContainer: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			gap: theme.spacing.sm,
		},
		topPaginationContainer: {
			marginBottom: theme.spacing.lg,
		},
		gridItem: {
			width: "100%",
			minWidth: 0,
		},
		cardPressable: {
			width: "100%",
		},
		titleText: {
			marginTop: theme.spacing.xs,
		},
		subtitleText: {
			marginTop: theme.spacing.xs,
		},
		skeletonTitle: {
			marginTop: theme.spacing.sm,
		},
		skeletonSubtitle: {
			marginTop: theme.spacing.xs,
		},
	});