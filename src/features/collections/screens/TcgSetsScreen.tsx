import { useRouter } from 'expo-router';
import { Check, CloudDownload, Heart } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, View } from 'react-native';

import type { CatalogLanguage, CatalogTcg } from '@/src/domain/catalog/catalog.types';
import type { CatalogScreenFilters } from '@/src/features/catalog/catalog.filters';
import type { CatalogSetSummary } from '@/src/features/catalog/catalog.types';
import {
	updateCatalogBrowseToolbarFilters,
	updateCatalogBrowseToolbarLevel,
	updateCatalogBrowseToolbarSearchQuery,
	updateCatalogBrowseToolbarSort,
	useCatalogBrowseToolbarState,
} from '@/src/features/catalog/catalogBrowseToolbar.state';
import { CatalogBrowseToolbar } from '@/src/features/catalog/components/CatalogBrowseToolbar';
import {
	buildSetNavigationFilters,
	resolveActiveSetsLanguage,
} from '@/src/features/collections/sets.screen.logic';
import {
	setLastSelectedSetsTcg,
	updateSetsScreenState,
} from '@/src/features/collections/setsScreen.state';
import type { DownloadScopeStatus } from '@/src/features/downloads/downloads.types';
import { useUserSettingsState } from '@/src/features/settings/settings.store';
import { getSupportedCatalogLanguages } from '@/src/lib/catalog/catalog.lookup';
import { catalogRepository, downloadsRepository, inventoryRepository } from '@/src/lib/repositories';
import { AppText, FadeInView, Header, ProgressBar, Screen, SkeletonBlock } from '@/src/shared/ui';
import { useAppTheme } from '@/src/theme/useAppTheme';

type Props = {
	initialTcg: CatalogTcg;
	hideChrome?: boolean;
	onFilteredCountChange?: (count: number, isLoading: boolean) => void;
};

function toSetsSortKey(key?: string): 'favorites' | 'name' | 'releaseDate' {
	if (key === 'newest') {
		return 'releaseDate';
	}

	return 'name';
}

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function TcgSetsScreen({ initialTcg, hideChrome = false, onFilteredCountChange }: Props) {
	const router = useRouter();
	const theme = useAppTheme();
	const styles = useMemo(() => createStyles(theme), [theme]);
	const toolbarState = useCatalogBrowseToolbarState();
	const { downloads: userDownloads } = useUserSettingsState();
	const activeTcg = toolbarState.filters.tcgs[0] ?? initialTcg;

	const supportedLanguages = getSupportedCatalogLanguages(activeTcg);
	const activeLanguage = resolveActiveSetsLanguage({
		selectedLanguages: toolbarState.filters.languages,
		supportedLanguages: [...supportedLanguages],
	});

	const [sets, setSets] = useState<CatalogSetSummary[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [favoriteSetIds, setFavoriteSetIds] = useState<Set<string>>(new Set());
	const [downloadStatusBySetId, setDownloadStatusBySetId] = useState<Record<string, DownloadScopeStatus>>({});
	const [ownedCountBySetId, setOwnedCountBySetId] = useState<Record<string, number>>({});

	const previousLanguageRef = useRef<CatalogLanguage | undefined>(activeLanguage);
	const loadRequestIdRef = useRef(0);
	const statusRequestIdRef = useRef(0);

	const effectiveSortKey = toolbarState.selectedSort?.key === 'newest' ? 'newest' : 'name';
	const effectiveSortDirection = toolbarState.selectedSort?.direction ?? 'asc';

	const setsSortMenuSections = useMemo(() => ([
		{
			title: 'Sort sets by',
			options: [
				{
					key: 'name',
					label: 'Name',
					selected: effectiveSortKey === 'name',
					onPress: () => {
						updateCatalogBrowseToolbarSort({ key: 'name', direction: effectiveSortDirection });
					},
				},
				{
					key: 'newest',
					label: 'Release Date',
					selected: effectiveSortKey === 'newest',
					onPress: () => {
						updateCatalogBrowseToolbarSort({ key: 'newest', direction: effectiveSortDirection });
					},
				},
			],
		},
		{
			title: 'Order',
			options: [
				{
					key: 'asc',
					label: 'Ascending',
					selected: effectiveSortDirection === 'asc',
					onPress: () => {
						updateCatalogBrowseToolbarSort({ key: effectiveSortKey, direction: 'asc' });
					},
				},
				{
					key: 'desc',
					label: 'Descending',
					selected: effectiveSortDirection === 'desc',
					onPress: () => {
						updateCatalogBrowseToolbarSort({ key: effectiveSortKey, direction: 'desc' });
					},
				},
			],
		},
	]), [effectiveSortDirection, effectiveSortKey]);

	useEffect(() => {
		setLastSelectedSetsTcg(activeTcg);
	}, [activeTcg]);

	useEffect(() => {
		const sortKey = toSetsSortKey(toolbarState.selectedSort?.key);
		const sortDirection = toolbarState.selectedSort?.direction ?? 'asc';
		const setScope = toolbarState.filters.setScope;

		updateSetsScreenState(activeTcg, {
			searchQuery: toolbarState.searchQuery,
			language: activeLanguage,
			setScope,
			sortKey,
			sortDirection,
		});
	}, [activeLanguage, activeTcg, toolbarState.filters.setScope, toolbarState.searchQuery, toolbarState.selectedSort]);

	useEffect(() => {
		let cancelled = false;

		void catalogRepository.getFavoriteSetIds(activeTcg).then((favoriteIds) => {
			if (!cancelled) {
				setFavoriteSetIds(new Set(favoriteIds));
			}
		});

		return () => {
			cancelled = true;
		};
	}, [activeTcg]);

	useEffect(() => {
		const requestId = ++loadRequestIdRef.current;
		let cancelled = false;

		setIsLoading(true);
		setSets([]);
		setOwnedCountBySetId({});
		setDownloadStatusBySetId({});

		void Promise.all([
			catalogRepository.getSetsByTcg(activeTcg, activeLanguage),
			inventoryRepository.getOwnedUniqueCountBySet({ tcg: activeTcg, language: activeLanguage }),
		]).then(([nextSets, nextOwnedCounts]) => {
			if (cancelled || requestId !== loadRequestIdRef.current) {
				return;
			}

			setSets(nextSets);
			setOwnedCountBySetId(nextOwnedCounts);
		}).finally(() => {
			if (!cancelled && requestId === loadRequestIdRef.current) {
				setIsLoading(false);
			}
		});

		return () => {
			cancelled = true;
		};
	}, [activeLanguage, activeTcg]);

	const filteredSets = useMemo(() => {
		const normalizedQuery = toolbarState.searchQuery.toLowerCase().trim();
		let nextSets = toolbarState.filters.setScope === 'favorites'
			? sets.filter((set) => favoriteSetIds.has(set.id))
			: sets;

		if (toolbarState.filters.setIds.length > 0) {
			nextSets = nextSets.filter((set) => toolbarState.filters.setIds.includes(`${activeTcg}:${set.id}`));
		}

		if (normalizedQuery) {
			nextSets = nextSets.filter((set) => set.name.toLowerCase().includes(normalizedQuery));
		}

		nextSets = nextSets.filter((set) => {
			const total = set.totalTcgCards ?? 0;
			const owned = ownedCountBySetId[set.id] ?? 0;

			if (toolbarState.filters.ownershipMode === 'owned') {
				return owned > 0;
			}

			if (toolbarState.filters.ownershipMode === 'missing') {
				return total > owned;
			}

			return true;
		});

		const sortKey = toolbarState.selectedSort?.key ?? 'name';
		const direction = toolbarState.selectedSort?.direction === 'desc' ? -1 : 1;

		return [...nextSets].sort((left, right) => {
			if (sortKey === 'newest') {
				const leftDate = left.releaseDate ?? '';
				const rightDate = right.releaseDate ?? '';
				if (leftDate !== rightDate) {
					return leftDate.localeCompare(rightDate) * direction;
				}
				return left.name.localeCompare(right.name);
			}

			return left.name.localeCompare(right.name) * direction;
		});
	}, [
		activeTcg,
		favoriteSetIds,
		ownedCountBySetId,
		sets,
		toolbarState.filters.ownershipMode,
		toolbarState.filters.setIds,
		toolbarState.filters.setScope,
		toolbarState.searchQuery,
		toolbarState.selectedSort,
	]);

	useEffect(() => {
		onFilteredCountChange?.(filteredSets.length, isLoading);
	}, [filteredSets.length, isLoading, onFilteredCountChange]);

	const refreshSetDownloadStatuses = useCallback(async (setIds: string[]) => {
		const requestId = ++statusRequestIdRef.current;

		if (setIds.length === 0) {
			setDownloadStatusBySetId({});
			return;
		}

		// Reset first so stale statuses from the previous TCG/language don't hang around.
		setDownloadStatusBySetId({});

		const chunkSize = 24;
		const nextStatusMap: Record<string, DownloadScopeStatus> = {};

		for (let index = 0; index < setIds.length; index += chunkSize) {
			const chunk = setIds.slice(index, index + chunkSize);

			const chunkStatuses = await Promise.all(
				chunk.map(async (setId) => {
					const status = await downloadsRepository.getScopeStatus({
						scopeType: 'set',
						tcg: activeTcg,
						setId,
						language: activeLanguage,
						imageQuality: userDownloads.imageQuality,
					});
					return [setId, status] as const;
				}),
			);

			if (requestId !== statusRequestIdRef.current) {
				return;
			}

			for (const [setId, status] of chunkStatuses) {
				nextStatusMap[setId] = status;
			}

			// Progressive update so the UI can breathe on very large TCGs like Pokémon.
			setDownloadStatusBySetId((prev) => ({
				...prev,
				...Object.fromEntries(chunkStatuses),
			}));

			if (index + chunkSize < setIds.length) {
				await delay(0);
			}
		}

		if (requestId === statusRequestIdRef.current) {
			setDownloadStatusBySetId(nextStatusMap);
		}
	}, [activeLanguage, activeTcg, userDownloads.imageQuality]);

	useEffect(() => {
		const previousLanguage = previousLanguageRef.current;
		previousLanguageRef.current = activeLanguage;

		if (previousLanguage === activeLanguage) {
			return;
		}

		if (toolbarState.filters.setIds.length === 0) {
			return;
		}

		updateCatalogBrowseToolbarFilters({
			...toolbarState.filters,
			setIds: [],
			setNamesById: {},
		});
	}, [activeLanguage, toolbarState.filters]);

	useEffect(() => {
		// One refresh after the sets are loaded.
		if (sets.length === 0) {
			setDownloadStatusBySetId({});
			return;
		}

		void refreshSetDownloadStatuses(sets.map((set) => set.id));
	}, [refreshSetDownloadStatuses, sets]);

	const navigateToSet = (set: CatalogSetSummary) => {
		const scopedSetId = `${activeTcg}:${set.id}`;
		updateCatalogBrowseToolbarFilters(buildSetNavigationFilters({
			currentFilters: toolbarState.filters,
			activeTcg,
			activeLanguage,
			scopedSetId,
			setName: set.name,
		}));
		updateCatalogBrowseToolbarLevel('cards');
		router.replace(`/(tabs)/catalog?level=cards&tcg=${activeTcg}`);
	};

	const queueSetDownload = (setId: string, forceRedownload = false) => {
		void downloadsRepository.enqueueSetImageDownloads({
			tcg: activeTcg,
			setId,
			language: activeLanguage,
			imageQuality: userDownloads.imageQuality,
			forceRedownload,
		}).then(async () => {
			await refreshSetDownloadStatuses(sets.map((set) => set.id));
		});
	};

	const toggleFavorite = async (setId: string, currentlyFavorited: boolean) => {
		await catalogRepository.toggleSetFavorite(activeTcg, setId, !currentlyFavorited);
		setFavoriteSetIds((prev) => {
			const next = new Set(prev);
			if (!currentlyFavorited) {
				next.add(setId);
			} else {
				next.delete(setId);
			}
			return next;
		});
	};

	const setsContent = (
		<>
			{hideChrome ? null : (
				<Header
					hasBackBtn
					onBackPress={() => router.replace('/(tabs)/catalog?level=tcgs')}
				/>
			)}

			{hideChrome ? null : (
				<CatalogBrowseToolbar
					searchPlaceholder="Find a set"
					searchQuery={toolbarState.searchQuery}
					onSearchQueryChange={updateCatalogBrowseToolbarSearchQuery}
					currentFilters={toolbarState.filters}
					onApplyFilters={(nextFilters: CatalogScreenFilters) => {
						updateCatalogBrowseToolbarFilters(nextFilters);
					}}
					selectedSort={toolbarState.selectedSort}
					onSortChange={updateCatalogBrowseToolbarSort}
					visibleControls={['tcg', 'set', 'language', 'inventory', 'sort']}
					sortMenuTitle="Sort Sets"
					customSortMenuSections={setsSortMenuSections}
					resultCountText={isLoading ? 'Loading sets...' : `Showing ${filteredSets.length} ${filteredSets.length === 1 ? 'set' : 'sets'}`}
					isBusy={isLoading}
				/>
			)}

			{isLoading ? (
				<View style={styles.list}>
					{Array.from({ length: 6 }).map((_, index) => (
						<View key={`sets-skeleton-${index}`} style={styles.setRowContainer}>
							<View style={styles.setRow}>
								<SkeletonBlock width={100} height={56} borderRadius={theme.radius.sm} />
								<View style={styles.setInfo}>
									<SkeletonBlock width="72%" height={16} borderRadius={theme.radius.xs} />
									<SkeletonBlock width="42%" height={14} borderRadius={theme.radius.xs} />
									<SkeletonBlock width="58%" height={14} borderRadius={theme.radius.xs} />
									<SkeletonBlock width="100%" height={8} borderRadius={theme.radius.xs} />
								</View>
							</View>
							<View style={styles.favoriteButton}>
								<SkeletonBlock width={24} height={24} borderRadius={12} />
							</View>
						</View>
					))}
				</View>
			) : (
				<View style={styles.list}>
					{filteredSets.length === 0 ? (
						<View style={styles.emptyState}>
							<AppText muted>
								{toolbarState.filters.setScope === 'favorites'
									? 'No favorite sets match this view yet.'
									: 'No sets match your current search.'}
							</AppText>
						</View>
					) : null}
					{filteredSets.map((set) => {
						const total = set.totalTcgCards ?? 0;
						const owned = ownedCountBySetId[set.id] ?? 0;
						const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
						const isFavorite = favoriteSetIds.has(set.id);
						const scopeStatus = downloadStatusBySetId[set.id];
						const isDownloaded = scopeStatus?.status === 'complete';
						const isDownloading = scopeStatus?.status === 'queued' || scopeStatus?.status === 'running';
						const requestedTotal = scopeStatus?.requestedTotal ?? 0;
						const downloadedTotal = scopeStatus?.downloadedTotal ?? 0;
						const failedTotal = scopeStatus?.failedTotal ?? 0;
						const hasAnyDownloadState = requestedTotal > 0;
						const qualityMismatchFrom = scopeStatus?.qualityMismatchFrom;

						const downloadStatusText = isDownloading
							? `Downloading ${downloadedTotal}/${requestedTotal}`
							: isDownloaded
								? `Downloaded ${downloadedTotal}/${requestedTotal}`
								: qualityMismatchFrom
									? `Downloaded at ${qualityMismatchFrom}. Tap to download ${userDownloads.imageQuality}.`
									: scopeStatus?.status === 'failed'
										? `Download failed (${failedTotal})`
										: scopeStatus?.status === 'partial'
											? `Partial ${downloadedTotal}/${requestedTotal} (${failedTotal} failed)`
											: hasAnyDownloadState
												? `Queued ${downloadedTotal}/${requestedTotal}`
												: 'Not downloaded';

						const logoUri =
							typeof set.logoImage === 'string' && set.logoImage.length > 0
								? set.logoImage
								: typeof set.logoImageLocal === 'string' && /^(https?:|file:|asset:|content:)/.test(set.logoImageLocal)
									? set.logoImageLocal
									: undefined;

						return (
							<FadeInView key={set.id} style={styles.setRowContainer}>
								<Pressable
									style={styles.setRow}
									onPress={() => navigateToSet(set)}
								>
									<View style={styles.setLogoContainer}>
										{logoUri ? (
											<Image
												source={{ uri: logoUri }}
												style={styles.setLogo}
												resizeMode="contain"
											/>
										) : (
											<View style={styles.setLogoPlaceholder} />
										)}
									</View>

									<View style={styles.setInfo}>
										<AppText weight="semibold">{set.name}</AppText>
										{set.releaseDate ? <AppText muted>{set.releaseDate}</AppText> : null}
										<View style={styles.setCountRow}>
											<AppText weight="bold" style={styles.setCountOwned}>{owned}</AppText>
											<AppText muted style={styles.setCountTotal}>/{total || 0}</AppText>
											<AppText muted style={styles.setPct}>  {pct}% complete</AppText>
										</View>
										<ProgressBar progress={pct / 100} />
										<AppText style={styles.downloadStatusText}>{downloadStatusText}</AppText>
									</View>
								</Pressable>

								<View style={styles.actionColumn}>
									<Pressable
										style={styles.actionButton}
										onPress={() => void toggleFavorite(set.id, isFavorite)}
									>
										<Heart
											size={22}
											color={theme.colors.secondary}
											fill={isFavorite ? theme.colors.secondary : 'none'}
										/>
									</Pressable>
									<Pressable
										style={styles.actionButton}
										onPress={() => {
											if (isDownloaded) {
												Alert.alert(
													'Re-download set?',
													'This set is already fully downloaded. Re-download with your current image quality setting?',
													[
														{ text: 'Cancel', style: 'cancel' },
														{ text: 'Re-download', onPress: () => queueSetDownload(set.id, true) },
													],
												);
												return;
											}

											queueSetDownload(set.id, false);
										}}
									>
										{isDownloading
											? <ActivityIndicator size="small" color={theme.colors.secondary} />
											: isDownloaded
												? <Check size={20} color={theme.colors.secondary} />
												: <CloudDownload size={20} color={theme.colors.secondary} />
										}
									</Pressable>
								</View>
							</FadeInView>
						);
					})}
				</View>
			)}
		</>
	);

	if (hideChrome) {
		return setsContent;
	}

	return <Screen edges={['left', 'right']}>{setsContent}</Screen>;
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
	StyleSheet.create({
		searchRow: {
			marginBottom: theme.spacing.md,
		},
		controlsSection: {
			gap: theme.spacing.md,
			marginBottom: theme.spacing.md,
		},
		resultCountText: {
			fontSize: theme.fontSize.sm,
		},
		list: {
			gap: theme.spacing.sm,
		},
		emptyState: {
			paddingVertical: theme.spacing.md,
		},
		setRowContainer: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: theme.spacing.sm,
			backgroundColor: theme.colors.surface,
			borderRadius: theme.radius.md,
			borderWidth: theme.border.width.default,
			borderColor: theme.colors.borderSubtle,
			padding: theme.spacing.md,
		},
		setRow: {
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center',
			gap: theme.spacing.md,
		},
		setLogoContainer: {
			width: 100,
			height: 56,
			borderRadius: theme.radius.sm,
			backgroundColor: theme.colors.surfaceAlt,
			alignItems: 'center',
			justifyContent: 'center',
			overflow: 'hidden',
		},
		setLogo: {
			width: '100%',
			height: '100%',
		},
		setLogoPlaceholder: {
			width: 56,
			height: 24,
			borderRadius: theme.radius.xs,
			backgroundColor: theme.colors.borderSubtle,
		},
		setInfo: {
			flex: 1,
			gap: theme.spacing.xs,
		},
		setCountRow: {
			flexDirection: 'row',
			alignItems: 'baseline',
		},
		setCountOwned: {
			fontSize: theme.fontSize.sm,
		},
		setCountTotal: {
			fontSize: theme.fontSize.sm,
			marginLeft: 2,
		},
		setPct: {
			fontSize: theme.fontSize.xs,
			marginLeft: theme.spacing.xs,
		},
		downloadStatusText: {
			fontSize: theme.fontSize.xs,
			color: theme.colors.textMuted,
		},
		actionColumn: {
			alignItems: 'center',
			gap: theme.spacing.sm,
		},
		actionButton: {
			width: 36,
			height: 36,
			borderRadius: 18,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: theme.colors.surfaceAlt,
		},
		favoriteButton: {
			width: 36,
			height: 36,
			borderRadius: 18,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: theme.colors.surfaceAlt,
		},
	});