import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

// Import theme
import { useAppTheme } from "@/src/theme/useAppTheme";

// Import components
import {
	CatalogScreenFilters,
	toCatalogCardFilters
} from "@/src/features/catalog/catalog.filters";
import {
	matchesGameSpecificSelections,
} from '@/src/features/catalog/catalog.gameSpecific';
import { sortCatalogTcgCards } from "@/src/features/catalog/catalog.sort";
import { CatalogBrowseToolbar } from '@/src/features/catalog/components/CatalogBrowseToolbar';
import { matchesSearchValue, normalizeSearchQuery } from "@/src/features/search/search.utils";
import { resolveTcgCardImageSource } from "@/src/lib/catalog/resolveTcgCardImageSource";
import {
	AppText,
	Button,
	Divider,
	FadeInView,
	Grid,
	Header,
	Screen,
	Section,
	SkeletonBlock,
	TcgCard,
} from "@/src/shared/ui";

// Import repositories
import { catalogRepository, downloadsRepository, homeRepository, inventoryRepository } from "@/src/lib/repositories";

// Import types
import type { CatalogLanguage, CatalogTcg, CatalogTcgCardAttributes } from "@/src/domain/catalog/catalog.types";
import type { CatalogTcgCardSortDirection } from "@/src/features/catalog/catalog.types";
import {
	type CatalogBrowseContext,
	clearCatalogTemporaryContextAndRestoreBrowse,
	getCatalogBrowseToolbarSnapshot,
	updateActiveCatalogFilters,
	updateActiveCatalogSearchQuery,
	updateActiveCatalogSort,
	useCatalogBrowseToolbarState,
} from '@/src/features/catalog/catalogBrowseToolbar.state';
import type { HomeTcgCardRailItem } from '@/src/features/home/home.types';
import type { TcgCardItem } from "@/src/shared/ui/TcgCard";

type Row = {
	id: string;
	rowKey: string;
	tcg: CatalogTcg;
	catalogTcgCardId: string;
	activityAt: string | undefined;
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
	specialMode?: 'recentlyViewed' | 'wishlist' | 'missingCards';
	hideChrome?: boolean;
	hideToolbar?: boolean;
};

const DEFAULT_PAGE_SIZE = 99;
const DEFAULT_SORT_DIRECTION: CatalogTcgCardSortDirection = 'asc';

function toCatalogContextFromSpecialMode(
	specialMode?: 'recentlyViewed' | 'wishlist' | 'missingCards'
): CatalogBrowseContext | null {
	if (specialMode === 'recentlyViewed') {
		return 'recent';
	}

	if (specialMode === 'wishlist') {
		return 'wishlist';
	}

	if (specialMode === 'missingCards') {
		return 'missing';
	}

	return null;
}

export function CatalogTcgCardListScreen({
	searchPlaceholder,
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
	const loadRequestIdRef = useRef(0);
// All state now comes from the catalog browse store
	const currentContext = toolbarState.context;
	const currentFilters = toolbarState.filters;
	const searchQuery = toolbarState.searchQuery;
	const selectedSort = toolbarState.selectedSort;
	const isSpecialCollectionContext = currentContext === 'recent' || currentContext === 'wishlist' || currentContext === 'missing';
	const activeToolbarContext = currentContext === 'recent' || currentContext === 'wishlist' || currentContext === 'missing'
		? currentContext
		: null;

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
				activityAt: item.viewedAt,
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

	const sortRowsWithSelectedSort = useCallback((rows: Row[]): Row[] => {
		if (!sortBy) {
			return rows;
		}

		const sortedRows = sortCatalogTcgCards(
			rows.map((row) => ({
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
			sortBy,
			sortDirection,
		);

		const sortedRowsByKey = new Map(
			rows.map((row) => [`${row.tcg}:${row.catalogTcgCardId}:${row.title}`, row]),
		);

		return sortedRows
			.map((item) => sortedRowsByKey.get(`${item.tcg}:${item.id}:${item.name}`))
			.filter((row): row is NonNullable<typeof row> => Boolean(row));
	}, [sortBy, sortDirection]);

	const sortRowsByActivityDesc = useCallback((rows: Row[]): Row[] => (
		[...rows].sort((left, right) => (right.activityAt ?? '').localeCompare(left.activityAt ?? ''))
	), []);

	const paginateRows = useCallback((rows: Row[]) => {
		const nextTotalItems = rows.length;
		const nextTotalPages = Math.max(1, Math.ceil(nextTotalItems / pageSize));
		const currentPage = Math.min(page, nextTotalPages);
		const startIndex = (currentPage - 1) * pageSize;

		if (currentPage !== page) {
			setPage(currentPage);
		}

		return {
			pageRows: rows.slice(startIndex, startIndex + pageSize),
			totalItems: nextTotalItems,
			totalPages: nextTotalPages,
		};
	}, [page, pageSize]);

	useEffect(() => {
		const isPokemonOnly = currentFilters.tcgs.length === 1 && currentFilters.tcgs[0] === 'pokemon';
		if (selectedSort?.key === 'pokedex' && !isPokemonOnly) {
			updateActiveCatalogSort({ key: 'name', direction: selectedSort.direction });
			setPage(1);
		}
	}, [currentFilters.tcgs, selectedSort]);

	const sortBy = selectedSort?.key;
	const sortDirection = selectedSort?.direction ?? DEFAULT_SORT_DIRECTION;

	const load = useCallback(async () => {
		const requestId = ++loadRequestIdRef.current;
		const revisionAtStart = toolbarState.revision;
		const hasStaleRevision = () => revisionAtStart !== getCatalogBrowseToolbarSnapshot().revision;

		try {
			if (hasLoadedOnce) {
				setIsRefreshing(true);
			} else {
				setIsLoading(true);
			}
			setError(null);

			if (currentContext === 'recent') {
				let specialRows: Row[] = [];
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
								activityAt: r.viewedAt,
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

				const pagedRecentRows = paginateRows(filteredRecentRows);
				const recentRowsWithLocalImages = await hydrateRowsWithLocalImages(pagedRecentRows.pageRows);

				if (requestId !== loadRequestIdRef.current || hasStaleRevision()) {
					return;
				}

				setItems(recentRowsWithLocalImages);
				setTotalPages(pagedRecentRows.totalPages);
				setTotalItems(pagedRecentRows.totalItems);
				return;
			}

			if (isSpecialCollectionContext) {
				let specialRows: Row[] = [];

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

				const specialItems = currentContext === 'wishlist'
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

				const orderedSpecialRows = sortBy
					? sortRowsWithSelectedSort(filteredSpecialRows)
					: sortRowsByActivityDesc(filteredSpecialRows);
				const pagedSpecialRows = paginateRows(orderedSpecialRows);
				const specialRowsWithLocalImages = await hydrateRowsWithLocalImages(pagedSpecialRows.pageRows);

				if (requestId !== loadRequestIdRef.current || hasStaleRevision()) {
					return;
				}

				setItems(specialRowsWithLocalImages);
				setTotalPages(pagedSpecialRows.totalPages);
				setTotalItems(pagedSpecialRows.totalItems);
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

			if (requestId !== loadRequestIdRef.current || hasStaleRevision()) {
				return;
			}

			setItems(pagedRowsWithLocalImages);
			setTotalPages(cardPage.totalPages);
			setTotalItems(cardPage.total);
		} catch {
			if (requestId === loadRequestIdRef.current && !hasStaleRevision()) {
				setError("Failed to load cards.");
			}
		} finally {
			if (requestId === loadRequestIdRef.current && !hasStaleRevision()) {
				setIsLoading(false);
				setIsRefreshing(false);
				setHasLoadedOnce(true);
			}
		}
	}, [
		currentFilters,
		currentContext,
		hasLoadedOnce,
		mapHomeRailItemsToRows,
		hydrateRowsWithLocalImages,
		isSpecialCollectionContext,
		page,
		pageSize,
		paginateRows,
		searchQuery,
		sortBy,
		sortRowsByActivityDesc,
		sortRowsWithSelectedSort,
		sortDirection,
		toolbarState.revision,
	]);

	useFocusEffect(
		useCallback(() => {
			void load();
		}, [load])
	);

	const onSearchQueryChange = (query: string) => {
		setPage(1);
		updateActiveCatalogSearchQuery(query);
	};

	const onApplyFilters = (filters: CatalogScreenFilters) => {
		updateActiveCatalogFilters(filters);
		setPage(1);
	};

	const onClearActiveContext = useCallback(() => {
		if (!activeToolbarContext) {
			return;
		}

		clearCatalogTemporaryContextAndRestoreBrowse({ level: 'cards' });
		setPage(1);
		router.replace('/catalog?level=cards');
	}, [activeToolbarContext, router]);

	const topResultCountText = isLoading
		? 'Loading cards...'
		: `Showing ${totalItems} ${totalItems === 1 ? 'card' : 'cards'}`;

	const paginationControls = (
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
	);

	const topPaginationControls = (
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
	);

	const cardsContent = (
		<>
			{hideChrome ? null : <Header hasBackBtn />}
			{error ? <AppText muted>{error}</AppText> : null}
			{!isLoading && !isRefreshing && !error && items.length === 0 ? (
				<AppText muted>{
					currentContext === 'recent'
						? 'No recently viewed cards match these filters.'
						: currentContext === 'wishlist'
							? 'No wishlist cards match these filters.'
							: currentContext === 'missing'
								? 'No missing cards match these filters.'
								: 'No cards match these filters.'
				}</AppText>
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
							updateActiveCatalogSort(sort);
							setPage(1);
						}}
						activeContext={activeToolbarContext}
						onClearActiveContext={onClearActiveContext}
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