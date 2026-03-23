import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/src/theme/useAppTheme';
import { AppText, Button, Grid, Pill, Section, SlideUpMenu } from '@/src/shared/ui';
import { BasicSearch } from '@/src/features/search/components/BasicSearch';
import { CatalogFiltersSheet } from '@/src/features/catalog/components/CatalogFiltersSheet';
import {
  CATALOG_LANGUAGE_LABELS,
  type CatalogFilterSectionKey,
  type CatalogScreenFilters,
  DEFAULT_CATALOG_FILTERS,
} from '@/src/features/catalog/catalog.filters';
import type { CatalogTcgCardSortDirection, CatalogTcgCardSortKey } from '@/src/features/catalog/catalog.types';
import {
  GAME_SPECIFIC_FILTERS_BY_KEY,
  GAME_SPECIFIC_FILTER_DESCRIPTORS,
  fromScopedGameSpecificValue,
  type CatalogGameSpecificFilterKey,
} from '@/src/features/catalog/catalog.gameSpecific';
import { getTcgTitle } from '@/src/shared/config/tcg';
import type { CatalogTcg } from '@/src/domain/catalog/catalog.types';

type ActiveFilterPill = {
  id: string;
  key: 'tcg' | 'setId' | 'language' | 'rarity' | 'cardType' | 'gameSpecific' | 'ownershipMode' | 'setScope' | 'recentlyViewed' | 'sort' | 'clearAll';
  text: string;
  value?: string;
};

type VisibleControl = 'tcg' | 'set' | 'language' | 'inventory' | 'sort';

type Props = {
  searchPlaceholder: string;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  currentFilters: CatalogScreenFilters;
  onApplyFilters: (filters: CatalogScreenFilters) => void;
  selectedSort: { key: CatalogTcgCardSortKey; direction: CatalogTcgCardSortDirection } | null;
  onSortChange: (sort: { key: CatalogTcgCardSortKey; direction: CatalogTcgCardSortDirection } | null) => void;
  visibleControls: VisibleControl[];
  resultCountText?: string;
  sortMenuTitle?: string;
  customSortMenuSections?: {
    title: string;
    options: {
      key: string;
      label: string;
      selected?: boolean;
      disabled?: boolean;
      onPress: () => void;
    }[];
  }[];
};

const SORT_OPTIONS: CatalogTcgCardSortKey[] = ['name', 'cardNumber', 'tcg', 'set', 'rarity', 'newest', 'pokedex'];
const SORT_LABELS: Record<CatalogTcgCardSortKey, string> = {
  name: 'Name',
  cardNumber: 'Card Number',
  tcg: 'TCG',
  set: 'Set',
  rarity: 'Rarity',
  newest: 'Release Date',
  pokedex: 'Dex Number',
};
const TOOLBAR_BUTTON_TEXT_COLOR = '#FFFFFF';

function parseScopedFilterKey(scopedKey: string): { tcg: CatalogTcg; value: string } {
  const [tcg, ...valueParts] = scopedKey.split(':');
  return {
    tcg: tcg as CatalogTcg,
    value: valueParts.join(':'),
  };
}

function createClearedFiltersKeepingMode(currentFilters: CatalogScreenFilters): CatalogScreenFilters {
  return {
    ...DEFAULT_CATALOG_FILTERS,
    tcgs: [],
    setIds: [],
    setNamesById: {},
    languages: [],
    rarityKeys: [],
    cardTypeKeys: [],
    gameSpecificSelections: { ...DEFAULT_CATALOG_FILTERS.gameSpecificSelections },
    setScope: 'all',
    recentlyViewed: currentFilters.recentlyViewed,
  };
}

export function CatalogBrowseToolbar({
  searchPlaceholder,
  searchQuery,
  onSearchQueryChange,
  currentFilters,
  onApplyFilters,
  selectedSort,
  onSortChange,
  visibleControls,
  resultCountText,
  sortMenuTitle = 'Sort Options',
  customSortMenuSections,
}: Props) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isSortMenuVisible, setIsSortMenuVisible] = useState(false);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [initialExpandedFilterSection, setInitialExpandedFilterSection] = useState<CatalogFilterSectionKey | undefined>(undefined);

  const openFilters = (section?: CatalogFilterSectionKey) => {
    setInitialExpandedFilterSection(section);
    setIsFiltersVisible(true);
  };

  const activeFilterPills = useMemo<ActiveFilterPill[]>(() => {
    const filterPills: ActiveFilterPill[] = [];

    currentFilters.tcgs.forEach((tcg) => {
      filterPills.push({
        id: `tcg:${tcg}`,
        key: 'tcg',
        text: `TCG: ${getTcgTitle(tcg)}`,
        value: tcg,
      });
    });

    currentFilters.setIds.forEach((setId) => {
      filterPills.push({
        id: `setId:${setId}`,
        key: 'setId',
        text: `Set: ${currentFilters.setNamesById[setId] ?? setId}`,
        value: setId,
      });
    });

    currentFilters.languages.forEach((language) => {
      filterPills.push({
        id: `language:${language}`,
        key: 'language',
        text: `Language: ${CATALOG_LANGUAGE_LABELS[language]}`,
        value: language,
      });
    });

    if (currentFilters.recentlyViewed) {
      filterPills.push({
        id: 'recentlyViewed',
        key: 'recentlyViewed',
        text: 'Recently Viewed',
      });
    }

    currentFilters.rarityKeys.forEach((scopedKey) => {
      const parsed = parseScopedFilterKey(scopedKey);
      filterPills.push({
        id: `rarity:${scopedKey}`,
        key: 'rarity',
        text: `Rarity: ${getTcgTitle(parsed.tcg)} · ${parsed.value}`,
        value: scopedKey,
      });
    });

    currentFilters.cardTypeKeys.forEach((scopedKey) => {
      const parsed = parseScopedFilterKey(scopedKey);
      filterPills.push({
        id: `cardType:${scopedKey}`,
        key: 'cardType',
        text: `Type: ${getTcgTitle(parsed.tcg)} · ${parsed.value}`,
        value: scopedKey,
      });
    });

    GAME_SPECIFIC_FILTER_DESCRIPTORS.forEach((descriptor) => {
      const selected = currentFilters.gameSpecificSelections[descriptor.key] ?? [];
      selected.forEach((scopedValue) => {
        const parsed = fromScopedGameSpecificValue(scopedValue);
        filterPills.push({
          id: `${descriptor.key}:${scopedValue}`,
          key: 'gameSpecific',
          text: `${descriptor.label}: ${getTcgTitle(parsed.tcg)} · ${parsed.value}`,
          value: `${descriptor.key}:${scopedValue}`,
        });
      });
    });

    if (currentFilters.ownershipMode === 'owned') {
      filterPills.push({ id: 'ownershipMode:owned', key: 'ownershipMode', text: 'My data: Owned only' });
    }

    if (currentFilters.ownershipMode === 'missing') {
      filterPills.push({ id: 'ownershipMode:missing', key: 'ownershipMode', text: 'My data: Missing only' });
    }

    if (currentFilters.setScope === 'favorites') {
      filterPills.push({ id: 'setScope:favorites', key: 'setScope', text: 'Set scope: Favorites' });
    }

    if (!selectedSort) {
      if (filterPills.length > 0) {
        return [{ id: 'clear-all', key: 'clearAll', text: 'Clear all' }, ...filterPills];
      }

      return filterPills;
    }

    const pillsWithSort: ActiveFilterPill[] = [
      ...filterPills,
      {
        id: 'sort',
        key: 'sort',
        text: `Sort: ${SORT_LABELS[selectedSort.key]} (${selectedSort.direction === 'asc' ? 'Ascending' : 'Descending'})`,
      },
    ];

    return pillsWithSort.length > 0
      ? [{ id: 'clear-all', key: 'clearAll', text: 'Clear all' }, ...pillsWithSort]
      : pillsWithSort;
  }, [currentFilters, selectedSort]);

  const clearPill = (pill: ActiveFilterPill) => {
    if (pill.key === 'clearAll') {
      onApplyFilters(createClearedFiltersKeepingMode(currentFilters));
      onSortChange(null);
      return;
    }

    if (pill.key === 'sort') {
      onSortChange(null);
      return;
    }

    if (pill.key === 'tcg' && pill.value) {
      onApplyFilters({
        ...currentFilters,
        tcgs: currentFilters.tcgs.filter((tcg) => tcg !== pill.value),
        setIds: [],
        setNamesById: {},
      });
      return;
    }

    if (pill.key === 'setId' && pill.value) {
      const setId = pill.value;
      const nextSetIds = currentFilters.setIds.filter((value) => value !== setId);
      const nextSetNamesById = { ...currentFilters.setNamesById };
      delete nextSetNamesById[setId];
      onApplyFilters({
        ...currentFilters,
        setIds: nextSetIds,
        setNamesById: nextSetNamesById,
      });
      return;
    }

    if (pill.key === 'language' && pill.value) {
      onApplyFilters({
        ...currentFilters,
        languages: currentFilters.languages.filter((language) => language !== pill.value),
      });
      return;
    }

    if (pill.key === 'rarity' && pill.value) {
      onApplyFilters({
        ...currentFilters,
        rarityKeys: currentFilters.rarityKeys.filter((rarity) => rarity !== pill.value),
      });
      return;
    }

    if (pill.key === 'cardType' && pill.value) {
      onApplyFilters({
        ...currentFilters,
        cardTypeKeys: currentFilters.cardTypeKeys.filter((cardType) => cardType !== pill.value),
      });
      return;
    }

    if (pill.key === 'gameSpecific' && pill.value) {
      const [filterKey, ...scopedParts] = pill.value.split(':');
      const scopedValue = scopedParts.join(':');
      if (filterKey in GAME_SPECIFIC_FILTERS_BY_KEY) {
        const typedFilterKey = filterKey as CatalogGameSpecificFilterKey;
        onApplyFilters({
          ...currentFilters,
          gameSpecificSelections: {
            ...currentFilters.gameSpecificSelections,
            [typedFilterKey]: (currentFilters.gameSpecificSelections[typedFilterKey] ?? []).filter((value) => value !== scopedValue),
          },
        });
      }
      return;
    }

    if (pill.key === 'ownershipMode') {
      onApplyFilters({
        ...currentFilters,
        ownershipMode: 'all',
      });
      return;
    }

    if (pill.key === 'setScope') {
      onApplyFilters({
        ...currentFilters,
        setScope: 'all',
      });
      return;
    }

    if (pill.key === 'recentlyViewed') {
      onApplyFilters({
        ...currentFilters,
        recentlyViewed: false,
      });
    }
  };

  const sortSections = useMemo(() => {
    if (customSortMenuSections) {
      return customSortMenuSections.map((section) => ({
        ...section,
        options: section.options.map((option) => ({
          ...option,
          onPress: () => {
            option.onPress();
            setIsSortMenuVisible(false);
          },
        })),
      }));
    }

    const effectiveSortKey = selectedSort?.key ?? 'name';
    const effectiveSortDirection = selectedSort?.direction ?? 'asc';
    const isPokemonOnly = currentFilters.tcgs.length === 1 && currentFilters.tcgs[0] === 'pokemon';

    return [
      {
        title: 'Sort cards by',
        options: SORT_OPTIONS.map((option) => ({
          key: option,
          label: SORT_LABELS[option],
          selected: effectiveSortKey === option,
          disabled: option === 'pokedex' && !isPokemonOnly,
          onPress: () => {
            onSortChange({
              key: option,
              direction: selectedSort?.direction ?? 'asc',
            });
            setIsSortMenuVisible(false);
          },
        })),
      },
      {
        title: 'Order',
        options: [
          {
            key: 'asc',
            label: 'Ascending',
            selected: effectiveSortDirection === 'asc',
            onPress: () => {
              onSortChange({ key: selectedSort?.key ?? 'name', direction: 'asc' });
              setIsSortMenuVisible(false);
            },
          },
          {
            key: 'desc',
            label: 'Descending',
            selected: effectiveSortDirection === 'desc',
            onPress: () => {
              onSortChange({ key: selectedSort?.key ?? 'name', direction: 'desc' });
              setIsSortMenuVisible(false);
            },
          },
        ],
      },
    ];
  }, [currentFilters.tcgs, customSortMenuSections, onSortChange, selectedSort]);

  return (
    <>
      <Section>
        <View style={styles.container}>
          <BasicSearch
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={onSearchQueryChange}
            onFilterPress={() => openFilters()}
          />

          <Grid columns={Math.max(visibleControls.length, 1)} gap={theme.spacing.md}>
            {visibleControls.includes('tcg') ? (
              <Button
                type="secondary"
                text="TCG"
                iconName="rectangleVertical"
                layout="vertical"
                textSize="sm"
                textColor={TOOLBAR_BUTTON_TEXT_COLOR}
                iconColor={TOOLBAR_BUTTON_TEXT_COLOR}
                active={currentFilters.tcgs.length > 0}
                onPress={() => openFilters('tcg')}
              />
            ) : null}
            {visibleControls.includes('set') ? (
              <Button
                type="secondary"
                text="Sets"
                iconName="layers"
                layout="vertical"
                textSize="sm"
                textColor={TOOLBAR_BUTTON_TEXT_COLOR}
                iconColor={TOOLBAR_BUTTON_TEXT_COLOR}
                active={currentFilters.setIds.length > 0}
                onPress={() => openFilters('set')}
              />
            ) : null}
            {visibleControls.includes('language') ? (
              <Button
                type="secondary"
                text="Lang"
                iconName="languages"
                layout="vertical"
                textSize="sm"
                textColor={TOOLBAR_BUTTON_TEXT_COLOR}
                iconColor={TOOLBAR_BUTTON_TEXT_COLOR}
                active={currentFilters.languages.length > 0}
                onPress={() => openFilters('language')}
              />
            ) : null}
            {visibleControls.includes('inventory') ? (
              <Button
                type="secondary"
                text="Inv"
                iconName="library"
                layout="vertical"
                textSize="sm"
                textColor={TOOLBAR_BUTTON_TEXT_COLOR}
                iconColor={TOOLBAR_BUTTON_TEXT_COLOR}
                active={currentFilters.ownershipMode !== 'all'}
                onPress={() => openFilters('myData')}
              />
            ) : null}
            {visibleControls.includes('sort') ? (
              <Button
                type="secondary"
                text="Sort"
                iconName="arrowDownWideNarrow"
                layout="vertical"
                textSize="sm"
                textColor={TOOLBAR_BUTTON_TEXT_COLOR}
                iconColor={TOOLBAR_BUTTON_TEXT_COLOR}
                active={Boolean(selectedSort)}
                onPress={() => setIsSortMenuVisible(true)}
              />
            ) : null}
          </Grid>

          {resultCountText ? <AppText muted>{resultCountText}</AppText> : null}
        </View>
      </Section>

      {activeFilterPills.length > 0 ? (
        <Section>
          <View style={styles.filterPillsSection}>
            {activeFilterPills.map((filter) => (
              <Pill
                key={filter.id}
                text={filter.text}
                deletable={filter.key !== 'clearAll'}
                textColor={filter.key === 'clearAll' ? theme.colors.primary : undefined}
                onPress={() => clearPill(filter)}
              />
            ))}
          </View>
        </Section>
      ) : null}

      <SlideUpMenu
        visible={isSortMenuVisible}
        title={sortMenuTitle}
        onClose={() => setIsSortMenuVisible(false)}
        sections={sortSections}
      />

      <CatalogFiltersSheet
        visible={isFiltersVisible}
        query={searchQuery}
        appliedFilters={currentFilters}
        initialExpandedSection={initialExpandedFilterSection}
        onClose={() => setIsFiltersVisible(false)}
        onApply={(filters) => {
          onApplyFilters(filters);
          setIsFiltersVisible(false);
        }}
      />
    </>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    container: {
      flexDirection: 'column',
      gap: theme.spacing.md,
    },
    filterPillsSection: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      flexWrap: 'wrap',
    },
  });
