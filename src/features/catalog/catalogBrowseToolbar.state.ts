import { useSyncExternalStore } from 'react';

import type { CatalogLanguage, CatalogTcg } from '@/src/domain/catalog/catalog.types';
import type { CatalogScreenFilters } from '@/src/features/catalog/catalog.filters';
import { DEFAULT_CATALOG_FILTERS } from '@/src/features/catalog/catalog.filters';
import type { CatalogTcgCardSortDirection, CatalogTcgCardSortKey } from '@/src/features/catalog/catalog.types';
import { getDatabase } from '@/src/lib/db/client';

type CatalogToolbarSort = {
  key: CatalogTcgCardSortKey;
  direction: CatalogTcgCardSortDirection;
} | null;

export type CatalogBrowseLevel = 'tcgs' | 'sets' | 'cards';

type CatalogBrowseToolbarState = {
  level: CatalogBrowseLevel;
  searchQuery: string;
  filters: CatalogScreenFilters;
  selectedSort: CatalogToolbarSort;
};

type CatalogBrowseToolbarPersistenceRow = {
  remember_catalog_filters: number | null;
  last_catalog_state: string | null;
  default_tcg: string;
  preferred_language: string;
  ownership_mode: string;
  set_scope: string;
};

type PersistedCatalogBrowseToolbarState = {
  level?: unknown;
  searchQuery?: unknown;
  selectedSort?: unknown;
  filters?: unknown;
};

let state: CatalogBrowseToolbarState = {
  level: 'tcgs',
  searchQuery: '',
  filters: createEmptyCatalogFilters(),
  selectedSort: null,
};

let hasStartedHydration = false;
let persistTimeout: ReturnType<typeof setTimeout> | null = null;

const listeners = new Set<() => void>();

function areFiltersEqual(left: CatalogScreenFilters, right: CatalogScreenFilters): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function areSortsEqual(left: CatalogToolbarSort, right: CatalogToolbarSort): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function useCatalogBrowseToolbarState() {
  ensureCatalogBrowseToolbarHydrated();
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getCatalogBrowseToolbarSnapshot() {
  return state;
}

export function updateCatalogBrowseToolbarState(next: Partial<CatalogBrowseToolbarState>) {
  const mergedState: CatalogBrowseToolbarState = {
    ...state,
    ...next,
    filters: next.filters ? cloneCatalogFilters(next.filters) : state.filters,
  };

  if (
    mergedState.level === state.level &&
    mergedState.searchQuery === state.searchQuery &&
    areFiltersEqual(mergedState.filters, state.filters) &&
    areSortsEqual(mergedState.selectedSort, state.selectedSort)
  ) {
    return;
  }

  state = mergedState;
  emitChange();
  schedulePersistCatalogBrowseToolbarState();
}

export function updateCatalogBrowseToolbarFilters(next: CatalogScreenFilters) {
  if (areFiltersEqual(state.filters, next)) {
    return;
  }

  state = {
    ...state,
    filters: cloneCatalogFilters(next),
  };
  emitChange();
  schedulePersistCatalogBrowseToolbarState();
}

export function updateCatalogBrowseToolbarSearchQuery(searchQuery: string) {
  if (state.searchQuery === searchQuery) {
    return;
  }

  state = {
    ...state,
    searchQuery,
  };
  emitChange();
  schedulePersistCatalogBrowseToolbarState();
}

export function updateCatalogBrowseToolbarSort(selectedSort: CatalogToolbarSort) {
  if (areSortsEqual(state.selectedSort, selectedSort)) {
    return;
  }

  state = {
    ...state,
    selectedSort,
  };
  emitChange();
  schedulePersistCatalogBrowseToolbarState();
}

export function updateCatalogBrowseToolbarLevel(level: CatalogBrowseLevel) {
  if (state.level === level) {
    return;
  }

  state = {
    ...state,
    level,
  };
  emitChange();
  schedulePersistCatalogBrowseToolbarState();
}

export function clearCatalogBrowseToolbarState() {
  updateCatalogBrowseToolbarState({
    searchQuery: '',
    filters: createEmptyCatalogFilters(),
    selectedSort: null,
  });
}

function ensureCatalogBrowseToolbarHydrated() {
  if (hasStartedHydration) {
    return;
  }

  hasStartedHydration = true;
  void hydrateCatalogBrowseToolbarState();
}

async function hydrateCatalogBrowseToolbarState() {
  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync<CatalogBrowseToolbarPersistenceRow>(
      `SELECT
          remember_catalog_filters,
          last_catalog_state,
          default_tcg,
          preferred_language,
          ownership_mode,
          set_scope
       FROM user_settings
       WHERE id = 'local'
       LIMIT 1`
    );

    if (!row) {
      return;
    }

    if (row.remember_catalog_filters === 1 && row.last_catalog_state) {
      const restoredState = parsePersistedCatalogBrowseToolbarState(row.last_catalog_state);
      if (restoredState && hasActiveCatalogBrowseState(restoredState)) {
        updateCatalogBrowseToolbarState(restoredState);
        return;
      }
    }

    const defaultsState: Partial<CatalogBrowseToolbarState> = {
      filters: buildFiltersFromUserDefaults(row),
      searchQuery: '',
      selectedSort: null,
    };
    updateCatalogBrowseToolbarState(defaultsState);
  } catch {
    // Keep defaults when hydration fails.
  }
}

function schedulePersistCatalogBrowseToolbarState() {
  if (persistTimeout) {
    clearTimeout(persistTimeout);
  }

  persistTimeout = setTimeout(() => {
    persistTimeout = null;
    void persistCatalogBrowseToolbarState();
  }, 220);
}

async function persistCatalogBrowseToolbarState() {
  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ remember_catalog_filters: number | null }>(
      `SELECT remember_catalog_filters
       FROM user_settings
       WHERE id = 'local'
       LIMIT 1`
    );

    if (row?.remember_catalog_filters !== 1) {
      return;
    }

    await db.runAsync(
      `UPDATE user_settings
       SET last_catalog_state = ?,
           updated_at = ?
       WHERE id = 'local'`,
      [JSON.stringify(serializeCatalogBrowseToolbarState(state)), new Date().toISOString()]
    );
  } catch {
    // Best effort only.
  }
}

function serializeCatalogBrowseToolbarState(snapshot: CatalogBrowseToolbarState): CatalogBrowseToolbarState {
  return {
    level: snapshot.level,
    searchQuery: snapshot.searchQuery,
    selectedSort: snapshot.selectedSort,
    filters: cloneCatalogFilters(snapshot.filters),
  };
}

function parsePersistedCatalogBrowseToolbarState(
  rawValue: string
): Partial<CatalogBrowseToolbarState> | null {
  try {
    const parsed = JSON.parse(rawValue) as PersistedCatalogBrowseToolbarState;
    return normalizePersistedCatalogBrowseToolbarState(parsed);
  } catch {
    return null;
  }
}

function normalizePersistedCatalogBrowseToolbarState(
  input: PersistedCatalogBrowseToolbarState
): Partial<CatalogBrowseToolbarState> {
  const next: Partial<CatalogBrowseToolbarState> = {};

  if (input.level === 'tcgs' || input.level === 'sets' || input.level === 'cards') {
    next.level = input.level;
  }

  if (typeof input.searchQuery === 'string') {
    next.searchQuery = input.searchQuery;
  }

  if (input.selectedSort === null) {
    next.selectedSort = null;
  } else if (isRecord(input.selectedSort)) {
    const key = typeof input.selectedSort.key === 'string' ? input.selectedSort.key : null;
    const direction = input.selectedSort.direction === 'asc' || input.selectedSort.direction === 'desc'
      ? input.selectedSort.direction
      : null;

    if (isSortKey(key) && direction) {
      next.selectedSort = { key, direction };
    }
  }

  if (isRecord(input.filters)) {
    const filters = createEmptyCatalogFilters();
    filters.tcgs = toCatalogTcgArray(input.filters.tcgs);
    filters.setIds = toStringArray(input.filters.setIds);
    filters.setNamesById = toStringMap(input.filters.setNamesById);
    filters.languages = toCatalogLanguageArray(input.filters.languages);
    filters.rarityKeys = toStringArray(input.filters.rarityKeys);
    filters.cardTypeKeys = toStringArray(input.filters.cardTypeKeys);
    const ownershipMode = toOwnershipMode(input.filters.ownershipMode);
    if (ownershipMode) {
      filters.ownershipMode = ownershipMode;
    }

    const setScope = toSetScope(input.filters.setScope);
    if (setScope) {
      filters.setScope = setScope;
    }
    filters.recentlyViewed = input.filters.recentlyViewed === true;

    if (isRecord(input.filters.gameSpecificSelections)) {
      filters.gameSpecificSelections = {
        ...filters.gameSpecificSelections,
        ...input.filters.gameSpecificSelections,
      };
    }

    next.filters = filters;
  }

  return next;
}

function hasActiveCatalogBrowseState(nextState: Partial<CatalogBrowseToolbarState>): boolean {
  if (typeof nextState.searchQuery === 'string' && nextState.searchQuery.trim().length > 0) {
    return true;
  }

  if (nextState.selectedSort) {
    return true;
  }

  if (!nextState.filters) {
    return false;
  }

  return !areFiltersEqual(nextState.filters, createEmptyCatalogFilters());
}

function buildFiltersFromUserDefaults(row: CatalogBrowseToolbarPersistenceRow): CatalogScreenFilters {
  const filters = createEmptyCatalogFilters();
  const defaultTcg = toCatalogTcg(row.default_tcg);
  if (defaultTcg) {
    filters.tcgs = [defaultTcg];
  }

  const preferredLanguage = toCatalogLanguage(row.preferred_language);
  if (preferredLanguage) {
    filters.languages = [preferredLanguage];
  }

  const ownershipMode = toOwnershipMode(row.ownership_mode);
  if (ownershipMode) {
    filters.ownershipMode = ownershipMode;
  }

  const setScope = toSetScope(row.set_scope);
  if (setScope) {
    filters.setScope = setScope;
  }

  return filters;
}

function createEmptyCatalogFilters(): CatalogScreenFilters {
  return {
    ...DEFAULT_CATALOG_FILTERS,
    tcgs: [...DEFAULT_CATALOG_FILTERS.tcgs],
    setIds: [...DEFAULT_CATALOG_FILTERS.setIds],
    setNamesById: { ...DEFAULT_CATALOG_FILTERS.setNamesById },
    languages: [...DEFAULT_CATALOG_FILTERS.languages],
    rarityKeys: [...DEFAULT_CATALOG_FILTERS.rarityKeys],
    cardTypeKeys: [...DEFAULT_CATALOG_FILTERS.cardTypeKeys],
    gameSpecificSelections: { ...DEFAULT_CATALOG_FILTERS.gameSpecificSelections },
  };
}

function cloneCatalogFilters(filters: CatalogScreenFilters): CatalogScreenFilters {
  return {
    ...filters,
    tcgs: [...filters.tcgs],
    setIds: [...filters.setIds],
    setNamesById: { ...filters.setNamesById },
    languages: [...filters.languages],
    rarityKeys: [...filters.rarityKeys],
    cardTypeKeys: [...filters.cardTypeKeys],
    gameSpecificSelections: { ...filters.gameSpecificSelections },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function toCatalogTcg(value: unknown): CatalogTcg | null {
  if (value === 'pokemon' || value === 'mtg' || value === 'lorcana' || value === 'one-piece') {
    return value;
  }

  return null;
}

function toCatalogLanguage(value: unknown): CatalogLanguage | null {
  if (value === 'en' || value === 'ja') {
    return value;
  }

  return null;
}

function toOwnershipMode(value: unknown): CatalogScreenFilters['ownershipMode'] | null {
  if (value === 'owned' || value === 'missing') {
    return value;
  }

  if (value === 'all') {
    return value;
  }

  return null;
}

function toSetScope(value: unknown): CatalogScreenFilters['setScope'] | null {
  if (value === 'favorites') {
    return value;
  }

  if (value === 'all') {
    return value;
  }

  return null;
}

function toCatalogTcgArray(value: unknown): CatalogTcg[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => toCatalogTcg(entry))
    .filter((entry): entry is CatalogTcg => entry !== null);
}

function toCatalogLanguageArray(value: unknown): CatalogLanguage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => toCatalogLanguage(entry))
    .filter((entry): entry is CatalogLanguage => entry !== null);
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
}

function toStringMap(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {};
  }

  const result: Record<string, string> = {};
  for (const [entryKey, entryValue] of Object.entries(value)) {
    if (typeof entryValue === 'string') {
      result[entryKey] = entryValue;
    }
  }

  return result;
}

function isSortKey(value: string | null): value is CatalogTcgCardSortKey {
  return value === 'name'
    || value === 'cardNumber'
    || value === 'tcg'
    || value === 'set'
    || value === 'rarity'
    || value === 'newest'
    || value === 'pokedex';
}
