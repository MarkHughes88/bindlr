import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, CloudDownload } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, View } from 'react-native';

import type { CatalogTcg } from '@/src/domain/catalog/catalog.types';
import type { CatalogScreenFilters } from '@/src/features/catalog/catalog.filters';
import {
  clearCatalogTemporaryContextAndRestoreBrowse,
  enterBrowseContext,
  enterMissingContext,
  enterRecentContext,
  enterSearchContext,
  enterWishlistContext,
  updateActiveCatalogFilters,
  updateActiveCatalogSearchQuery,
  updateActiveCatalogSort,
  useCatalogBrowseToolbarState,
} from '@/src/features/catalog/catalogBrowseToolbar.state';
import { CatalogBrowseToolbar } from '@/src/features/catalog/components/CatalogBrowseToolbar';
import { CatalogTcgCardListScreen } from '@/src/features/catalog/screens/CatalogTcgCardListScreen';
import { TcgSetsScreen } from '@/src/features/collections/screens/TcgSetsScreen';
import type { DownloadScopeStatus } from '@/src/features/downloads/downloads.types';
import { useUserSettingsState } from '@/src/features/settings/settings.store';
import { getSupportedCatalogLanguages } from '@/src/lib/catalog/catalog.lookup';
import { SEARCH_COPY } from '@/src/lib/copy';
import { catalogRepository, downloadsRepository, inventoryRepository } from '@/src/lib/repositories';
import { TCG_META } from '@/src/shared/config/tcg';
import { AppText, FadeInView, Header, Screen, useTopBanner } from '@/src/shared/ui';
import { useAppTheme } from '@/src/theme/useAppTheme';

const TCGS: CatalogTcg[] = ['pokemon', 'lorcana', 'mtg', 'one-piece'];

export default function CatalogRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ level?: string; tcg?: string; mode?: string; q?: string }>();
  const { showBanner } = useTopBanner();
  const settings = useUserSettingsState();
  const toolbarState = useCatalogBrowseToolbarState();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [downloadedCountByTcg, setDownloadedCountByTcg] = useState<Record<CatalogTcg, number>>({
    pokemon: 0,
    mtg: 0,
    lorcana: 0,
    'one-piece': 0,
  });
  const [downloadedBreakdownByTcg, setDownloadedBreakdownByTcg] = useState<Record<CatalogTcg, {
    total: number;
    small: number;
    medium: number;
    large: number;
  }>>({
    pokemon: { total: 0, small: 0, medium: 0, large: 0 },
    mtg: { total: 0, small: 0, medium: 0, large: 0 },
    lorcana: { total: 0, small: 0, medium: 0, large: 0 },
    'one-piece': { total: 0, small: 0, medium: 0, large: 0 },
  });
  const [ownedCountByTcg, setOwnedCountByTcg] = useState<Record<CatalogTcg, number>>({
    pokemon: 0,
    mtg: 0,
    lorcana: 0,
    'one-piece': 0,
  });
  const [totalCountByTcg, setTotalCountByTcg] = useState<Record<CatalogTcg, number>>({
    pokemon: 0,
    mtg: 0,
    lorcana: 0,
    'one-piece': 0,
  });
  const [setsResultCount, setSetsResultCount] = useState(0);
  const [isSetsLoading, setIsSetsLoading] = useState(false);
  const [tcgDownloadStatusByTcg, setTcgDownloadStatusByTcg] = useState<Record<CatalogTcg, DownloadScopeStatus>>({
    pokemon: {
      scopeType: 'tcg',
      tcg: 'pokemon',
      status: 'idle',
      requestedTotal: 0,
      downloadedTotal: 0,
      failedTotal: 0,
    },
    mtg: {
      scopeType: 'tcg',
      tcg: 'mtg',
      status: 'idle',
      requestedTotal: 0,
      downloadedTotal: 0,
      failedTotal: 0,
    },
    lorcana: {
      scopeType: 'tcg',
      tcg: 'lorcana',
      status: 'idle',
      requestedTotal: 0,
      downloadedTotal: 0,
      failedTotal: 0,
    },
    'one-piece': {
      scopeType: 'tcg',
      tcg: 'one-piece',
      status: 'idle',
      requestedTotal: 0,
      downloadedTotal: 0,
      failedTotal: 0,
    },
  });

  const level = params.level === 'sets' || params.level === 'cards' ? params.level : 'tcgs';
  const paramTcg = params.tcg && TCGS.includes(params.tcg as CatalogTcg) ? (params.tcg as CatalogTcg) : undefined;
  const routeSearchQuery = typeof params.q === 'string' && params.q.trim().length > 0
    ? params.q.trim()
    : undefined;
  const filteredTcg = toolbarState.filters.tcgs[0];
  const activeTcg = filteredTcg ?? paramTcg;
  const specialMode = params.mode === 'recentlyViewed' || params.mode === 'wishlist' || params.mode === 'missingCards'
    ? params.mode
    : undefined;
  const activeToolbarContext = specialMode === 'recentlyViewed'
    ? 'recent'
    : specialMode === 'wishlist'
    ? 'wishlist'
    : specialMode === 'missingCards'
    ? 'missing'
    : toolbarState.context === 'recent' || toolbarState.context === 'wishlist' || toolbarState.context === 'missing'
    ? toolbarState.context
    : null;
  const cardSearchPlaceholder = specialMode === 'recentlyViewed'
    ? SEARCH_COPY.placeholders.recentlyViewed
    : specialMode === 'wishlist'
    ? SEARCH_COPY.placeholders.wishlist
    : specialMode === 'missingCards'
    ? SEARCH_COPY.placeholders.missingCards
    : 'Find a card';
  const cardListScreenKey = `${specialMode ?? 'catalog'}:${routeSearchQuery ?? ''}:${paramTcg ?? 'all'}`;
  const contentAnimationKey = `${level}:${activeTcg ?? 'none'}:${toolbarState.filters.setIds.join('|')}:${specialMode ?? 'catalog'}:${typeof params.q === 'string' ? params.q : ''}`;
  const previousLevelRef = useRef(level);
  const isSetsCardsTransition = (
    (previousLevelRef.current === 'sets' && level === 'cards') ||
    (previousLevelRef.current === 'cards' && level === 'sets')
  );
  const contentAnimationDuration = isSetsCardsTransition ? 260 : 180;
  const contentAnimationTranslateYFrom = isSetsCardsTransition ? 10 : 0;

  useEffect(() => {
    previousLevelRef.current = level;
  }, [level]);

  useEffect(() => {
    if (!toolbarState.isHydrated) {
      return;
    }

    if (specialMode === 'recentlyViewed') {
      enterRecentContext({
        level,
        routeTcg: paramTcg,
      });
      return;
    }

    if (specialMode === 'wishlist') {
      enterWishlistContext({
        level,
        routeTcg: paramTcg,
      });
      return;
    }

    if (specialMode === 'missingCards') {
      enterMissingContext({
        level,
        routeTcg: paramTcg,
      });
      return;
    }

    if (routeSearchQuery) {
      enterSearchContext({
        level,
        query: routeSearchQuery,
        routeTcg: paramTcg,
      });
      return;
    }

    enterBrowseContext({
      level,
      routeTcg: paramTcg,
    });
  }, [level, paramTcg, routeSearchQuery, specialMode, toolbarState.isHydrated]);

  useEffect(() => {
    let cancelled = false;

    const language = toolbarState.filters.languages[0] ?? settings.filters.preferredLanguage;

    void Promise.all([
      inventoryRepository.getOwnedCountByTcg(),
      Promise.all(TCGS.map(async (tcg) => ([
        tcg,
        await catalogRepository.getTotalTcgCardsByTcg(tcg, language),
      ] as const))),
    ]).then(([ownedCounts, totals]) => {
      if (cancelled) {
        return;
      }

      setOwnedCountByTcg(ownedCounts);
      setTotalCountByTcg({
        pokemon: 0,
        mtg: 0,
        lorcana: 0,
        'one-piece': 0,
        ...Object.fromEntries(totals),
      });
    });

    return () => {
      cancelled = true;
    };
  }, [settings.downloads.imageQuality, settings.filters.preferredLanguage, toolbarState.filters.languages]);

  const refreshDownloadedCounts = useCallback(async () => {
    const language = toolbarState.filters.languages[0] ?? settings.filters.preferredLanguage;
    const entries = await Promise.all(
      TCGS.map(async (tcg) => {
        const [count, breakdown] = await Promise.all([
          downloadsRepository.getDownloadedCardCountByTcg({
            tcg,
            language,
            imageQuality: settings.downloads.imageQuality,
          }),
          downloadsRepository.getDownloadedCardBreakdownByTcg({
            tcg,
            language,
          }),
        ]);
        return [tcg, { count, breakdown }] as const;
      })
    );

    setDownloadedCountByTcg({
      pokemon: 0,
      mtg: 0,
      lorcana: 0,
      'one-piece': 0,
      ...Object.fromEntries(entries.map(([tcg, value]) => [tcg, value.count])),
    });

    setDownloadedBreakdownByTcg({
      pokemon: { total: 0, small: 0, medium: 0, large: 0 },
      mtg: { total: 0, small: 0, medium: 0, large: 0 },
      lorcana: { total: 0, small: 0, medium: 0, large: 0 },
      'one-piece': { total: 0, small: 0, medium: 0, large: 0 },
      ...Object.fromEntries(entries.map(([tcg, value]) => [tcg, value.breakdown])),
    });
  }, [settings.downloads.imageQuality, settings.filters.preferredLanguage, toolbarState.filters.languages]);

  const queueTcgDownload = async (tcg: CatalogTcg, forceRedownload: boolean): Promise<void> => {
    const language = toolbarState.filters.languages[0] ?? settings.filters.preferredLanguage;
    await downloadsRepository.enqueueTcgImageDownloads({
      tcg,
      language,
      imageQuality: settings.downloads.imageQuality,
      forceRedownload,
    });
    await Promise.all([refreshDownloadedCounts(), refreshTcgDownloadStatuses()]);
  };

  const refreshTcgDownloadStatuses = useCallback(async () => {
    const language = toolbarState.filters.languages[0] ?? settings.filters.preferredLanguage;
    const entries = await Promise.all(
      TCGS.map(async (tcg) => {
        const status = await downloadsRepository.getScopeStatus({
          scopeType: 'tcg',
          tcg,
          language,
          imageQuality: settings.downloads.imageQuality,
        });
        return [tcg, status] as const;
      })
    );

    setTcgDownloadStatusByTcg({
      pokemon: {
        scopeType: 'tcg',
        tcg: 'pokemon',
        status: 'idle',
        requestedTotal: 0,
        downloadedTotal: 0,
        failedTotal: 0,
      },
      mtg: {
        scopeType: 'tcg',
        tcg: 'mtg',
        status: 'idle',
        requestedTotal: 0,
        downloadedTotal: 0,
        failedTotal: 0,
      },
      lorcana: {
        scopeType: 'tcg',
        tcg: 'lorcana',
        status: 'idle',
        requestedTotal: 0,
        downloadedTotal: 0,
        failedTotal: 0,
      },
      'one-piece': {
        scopeType: 'tcg',
        tcg: 'one-piece',
        status: 'idle',
        requestedTotal: 0,
        downloadedTotal: 0,
        failedTotal: 0,
      },
      ...Object.fromEntries(entries),
    });
  }, [settings.downloads.imageQuality, settings.filters.preferredLanguage, toolbarState.filters.languages]);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      if (cancelled) {
        return;
      }

      await Promise.all([refreshDownloadedCounts(), refreshTcgDownloadStatuses()]);
    };

    void refresh();
    const intervalId = setInterval(() => {
      void refresh();
    }, 1500);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [refreshDownloadedCounts, refreshTcgDownloadStatuses]);

  const normalizedQuery = toolbarState.searchQuery.trim().toLowerCase();
  const visibleTcgs = TCGS.filter((tcg) => (
    (toolbarState.filters.tcgs.length === 0 || toolbarState.filters.tcgs.includes(tcg)) &&
    (toolbarState.filters.languages.length === 0 || toolbarState.filters.languages.some((language) => getSupportedCatalogLanguages(tcg).includes(language))) &&
    (toolbarState.filters.setIds.length === 0 || toolbarState.filters.setIds.some((setId) => setId.startsWith(`${tcg}:`))) &&
    (
      toolbarState.filters.ownershipMode === 'all' ||
      (toolbarState.filters.ownershipMode === 'owned' && (ownedCountByTcg[tcg] ?? 0) > 0) ||
      (toolbarState.filters.ownershipMode === 'missing' && (totalCountByTcg[tcg] ?? 0) > (ownedCountByTcg[tcg] ?? 0))
    ) &&
    (normalizedQuery.length === 0 || TCG_META[tcg].title.toLowerCase().includes(normalizedQuery))
  )).sort((left, right) => {
    const direction = toolbarState.selectedSort?.direction === 'desc' ? -1 : 1;
    return TCG_META[left].title.localeCompare(TCG_META[right].title) * direction;
  });

  useEffect(() => {
    if (!toolbarState.isHydrated) {
      return;
    }

    if (level !== 'sets') {
      return;
    }

    if (activeTcg) {
      return;
    }

    router.push('/(tabs)/catalog?level=tcgs');
    showBanner({
      message: 'Select a TCG to browse sets.',
      tone: 'info',
      durationMs: 2000,
    });
  }, [activeTcg, level, router, showBanner, toolbarState.isHydrated]);

  const onClearActiveContext = useCallback(() => {
    if (!activeToolbarContext) {
      return;
    }

    clearCatalogTemporaryContextAndRestoreBrowse({ level: 'cards' });
    router.replace('/catalog?level=cards');
  }, [activeToolbarContext, router]);

  return (
    <Screen edges={['left', 'right']}>
      <Header />
      <CatalogBrowseToolbar
        isBusy={isSetsLoading}
        searchPlaceholder={
          level === 'tcgs' ? 'Find a TCG' : level === 'sets' ? 'Find a set' : 'Find a card'
        }
        searchQuery={toolbarState.searchQuery}
        onSearchQueryChange={updateActiveCatalogSearchQuery}
        currentFilters={toolbarState.filters}
        onApplyFilters={(nextFilters: CatalogScreenFilters) => {
          updateActiveCatalogFilters(nextFilters);

          if (level === 'sets' && nextFilters.tcgs.length === 0) {
            router.push('/(tabs)/catalog?level=tcgs');
          }
        }}
        selectedSort={toolbarState.selectedSort}
        onSortChange={updateActiveCatalogSort}
        activeContext={activeToolbarContext}
        onClearActiveContext={onClearActiveContext}
        visibleControls={['tcg', 'set', 'language', 'inventory', 'sort']}
        resultCountText={
          level === 'tcgs'
            ? `Showing ${visibleTcgs.length} ${visibleTcgs.length === 1 ? 'TCG' : 'TCGs'}`
            : level === 'sets'
            ? (isSetsLoading ? 'Loading sets...' : `Showing ${setsResultCount} ${setsResultCount === 1 ? 'set' : 'sets'}`)
            : undefined
        }
      />

      <FadeInView
        key={contentAnimationKey}
        duration={contentAnimationDuration}
        translateYFrom={contentAnimationTranslateYFrom}
      >
      {level === 'tcgs' ? (
        <View style={styles.tcgList}>
          {visibleTcgs.map((tcg, index) => {
            const meta = TCG_META[tcg];
            const total = totalCountByTcg[tcg] ?? 0;
            const downloadedAtSelectedQuality = Math.min(downloadedCountByTcg[tcg] ?? 0, total);
            const downloadedBreakdown = downloadedBreakdownByTcg[tcg] ?? { total: 0, small: 0, medium: 0, large: 0 };
            const downloadedTotal = Math.min(downloadedBreakdown.total, total);
            const isDownloaded = total > 0 && downloadedAtSelectedQuality >= total;
            const notDownloaded = Math.max(total - downloadedAtSelectedQuality, 0);
            const hasMixedQualityDownloads = (
              Number(downloadedBreakdown.small > 0) +
              Number(downloadedBreakdown.medium > 0) +
              Number(downloadedBreakdown.large > 0)
            ) > 1;
            const scopeStatus = tcgDownloadStatusByTcg[tcg];
            const isDownloading = scopeStatus?.status === 'queued' || scopeStatus?.status === 'running';
            const qualityMismatchFrom = scopeStatus?.qualityMismatchFrom;
            return (
              <FadeInView key={tcg} delay={Math.min(index * 60, 300)} style={styles.tcgCard}>
                <Pressable
                  style={styles.tcgCardMain}
                  onPress={() => {
                    router.replace(`/catalog?level=sets&tcg=${tcg}`);
                  }}
                >
                  <View style={styles.tcgLogoContainer}>
                    {meta.logoImage ? (
                      <Image source={meta.logoImage} style={styles.tcgLogo} resizeMode="contain" />
                    ) : (
                      <AppText weight="semibold">{meta.title}</AppText>
                    )}
                  </View>

                  <View style={styles.tcgInfo}>
                    <AppText weight="semibold">{meta.title}</AppText>
                    <AppText muted style={styles.tcgTotalText}>{total.toLocaleString()} cards total</AppText>
                    <View style={styles.tcgStatRow}>
                      <AppText style={styles.tcgStatText}>{downloadedTotal.toLocaleString()} total downloaded</AppText>
                      <AppText style={styles.tcgStatSep}>·</AppText>
                      <AppText style={styles.tcgStatText}>{notDownloaded.toLocaleString()} missing</AppText>
                    </View>
                    {downloadedTotal > 0 ? (
                      <AppText style={styles.tcgQualityBreakdownText}>
                        small {downloadedBreakdown.small.toLocaleString()} · medium {downloadedBreakdown.medium.toLocaleString()} · large {downloadedBreakdown.large.toLocaleString()}
                        {hasMixedQualityDownloads ? ' (mixed sizes saved)' : ''}
                      </AppText>
                    ) : null}
                    {isDownloading ? (
                      <AppText style={styles.tcgStatusText}>
                        Downloading {downloadedAtSelectedQuality.toLocaleString()} / {total.toLocaleString()}
                      </AppText>
                    ) : null}
                    {!isDownloading && qualityMismatchFrom ? (
                      <AppText style={styles.tcgStatusText}>
                        Downloaded at {qualityMismatchFrom}. Tap to download {settings.downloads.imageQuality}.
                      </AppText>
                    ) : null}
                  </View>
                </Pressable>

                <Pressable
                  style={styles.tcgDownloadBtn}
                  onPress={() => {
                    if (isDownloaded) {
                      Alert.alert(
                        'Re-download cards?',
                        'This TCG is already fully downloaded. Re-download using your current image quality setting?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Re-download',
                            onPress: () => {
                              void queueTcgDownload(tcg, true);
                            },
                          },
                        ]
                      );
                      return;
                    }

                    void queueTcgDownload(tcg, false);
                  }}
                >
                  {isDownloading
                    ? <ActivityIndicator size="small" color={theme.colors.secondary} />
                    : isDownloaded
                    ? <Check size={22} color={theme.colors.secondary} />
                    : <CloudDownload size={22} color={theme.colors.secondary} />
                  }
                </Pressable>
              </FadeInView>
            );
          })}
          {visibleTcgs.length === 0 ? (
            <AppText muted>No TCG matches your current filters.</AppText>
          ) : null}
        </View>
      ) : null}

      {toolbarState.isHydrated && level === 'sets' && activeTcg ? (
        <TcgSetsScreen
          initialTcg={activeTcg}
          hideChrome
          onFilteredCountChange={(count, isLoading) => {
            setSetsResultCount(count);
            setIsSetsLoading(isLoading);
          }}
        />
      ) : null}

      {toolbarState.isHydrated && level === 'sets' && !activeTcg && visibleTcgs.length === 0 ? (
        <View style={styles.emptyStateWrap}>
          <AppText muted>No TCG matches your current filters.</AppText>
        </View>
      ) : null}

      {toolbarState.isHydrated && level === 'cards' ? (
        <CatalogTcgCardListScreen
          key={cardListScreenKey}
          searchPlaceholder={cardSearchPlaceholder}
          specialMode={specialMode}
          hideChrome
          hideToolbar
        />
      ) : null}
      </FadeInView>
    </Screen>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    tcgList: {
      gap: theme.spacing.sm,
    },
    tcgCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      borderWidth: theme.border.width.default,
      borderColor: theme.colors.borderSubtle,
      overflow: 'hidden',
    },
    tcgCardMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    tcgLogoContainer: {
      width: 88,
      height: 50,
      padding: theme.spacing.sm,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: theme.radius.sm,
    },
    tcgLogo: {
      width: '100%',
      height: '100%',
    },
    tcgInfo: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    tcgTotalText: {
      fontSize: theme.fontSize.sm,
    },
    tcgStatRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    tcgStatText: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textHighlighted,
    },
    tcgStatSep: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textHighlighted,
    },
    tcgStatusText: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textHighlighted,
    },
    tcgQualityBreakdownText: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textHighlighted,
    },
    tcgDownloadBtn: {
      padding: theme.spacing.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyStateWrap: {
      marginTop: theme.spacing.sm,
    },
  });
