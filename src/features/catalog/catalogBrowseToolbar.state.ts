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
export type CatalogBrowseContext = 'browse' | 'search' | 'recent' | 'wishlist' | 'missing';

type CatalogBrowseToolbarState = {
  context: CatalogBrowseContext;
  level: CatalogBrowseLevel;
  searchQuery: string;
  filters: CatalogScreenFilters;
  selectedSort: CatalogToolbarSort;
  browseFilters: CatalogScreenFilters;
  browseSearchQuery: string;
  browseSelectedSort: CatalogToolbarSort;
  isHydrated: boolean;
  revision: number;
};

type CatalogBrowseToolbarPersistenceRow = {
  remember_catalog_filters: number | null;
  last_catalog_state: string | null;
  default_tcg: string;
  preferred_language: string;
  ownership_mode: string;
  set_scope: string;
};

type CatalogBrowseContextInput = {
  level?: CatalogBrowseLevel;
  routeTcg?: CatalogTcg;
  routeSearchQuery?: string;
};

type CatalogSearchContextInput = {
  level?: CatalogBrowseLevel;
  query: string;
  routeTcg?: CatalogTcg;
};

type PersistedCatalogBrowseToolbarState = {
  context?: unknown;
  level?: unknown;
  searchQuery?: unknown;
  selectedSort?: unknown;
  filters?: unknown;
  browseSearchQuery?: unknown;
  browseSelectedSort?: unknown;
  browseFilters?: unknown;
};

let state: CatalogBrowseToolbarState = createInitialCatalogBrowseToolbarState();

let hasStartedHydration = false;
let hydrationPromise: Promise<void> | null = null;
let persistTimeout: ReturnType<typeof setTimeout> | null = null;

const listeners = new Set<() => void>();

function areFiltersEqual(left: CatalogScreenFilters, right: CatalogScreenFilters): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function areSortsEqual(left: CatalogToolbarSort, right: CatalogToolbarSort): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function areToolbarStatesEqual(left: CatalogBrowseToolbarState, right: CatalogBrowseToolbarState): boolean {
  return left.context === right.context
    && left.level === right.level
    && left.searchQuery === right.searchQuery
    && areFiltersEqual(left.filters, right.filters)
    && areSortsEqual(left.selectedSort, right.selectedSort)
    && left.browseSearchQuery === right.browseSearchQuery
    && areFiltersEqual(left.browseFilters, right.browseFilters)
    && areSortsEqual(left.browseSelectedSort, right.browseSelectedSort)
    && left.isHydrated === right.isHydrated
    && left.revision === right.revision;
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
  const hasActiveReplacement = hasOwnProperty(next, 'context')
    || hasOwnProperty(next, 'filters')
    || hasOwnProperty(next, 'searchQuery')
    || hasOwnProperty(next, 'selectedSort');
  const nextContext = next.context ?? state.context;
  const mergedState: CatalogBrowseToolbarState = {
    ...state,
    ...next,
    context: nextContext,
    filters: hasOwnProperty(next, 'filters') && next.filters ? cloneCatalogFilters(next.filters) : state.filters,
    selectedSort: hasOwnProperty(next, 'selectedSort') ? (next.selectedSort ?? null) : state.selectedSort,
    browseFilters: hasOwnProperty(next, 'browseFilters') && next.browseFilters
      ? cloneCatalogFilters(next.browseFilters)
      : nextContext === 'browse' && hasOwnProperty(next, 'filters') && next.filters
        ? cloneCatalogFilters(next.filters)
        : state.browseFilters,
    browseSearchQuery: hasOwnProperty(next, 'browseSearchQuery')
      ? (next.browseSearchQuery ?? '')
      : nextContext === 'browse' && hasOwnProperty(next, 'searchQuery')
        ? (next.searchQuery ?? '')
        : state.browseSearchQuery,
    browseSelectedSort: hasOwnProperty(next, 'browseSelectedSort')
      ? (next.browseSelectedSort ?? null)
      : nextContext === 'browse' && hasOwnProperty(next, 'selectedSort')
        ? (next.selectedSort ?? null)
        : state.browseSelectedSort,
    revision: hasOwnProperty(next, 'revision')
      ? (next.revision ?? state.revision)
      : hasActiveReplacement
        ? state.revision + 1
        : state.revision,
  };

  applyCatalogBrowseToolbarState(mergedState);
}

export async function hydrateCatalogBrowseState() {
  if (state.isHydrated) {
    return;
  }

  if (hydrationPromise) {
    return hydrationPromise;
  }

  hydrationPromise = (async () => {
    try {
      const row = await getCatalogBrowseToolbarPersistenceRow();
      const defaultsFilters = row ? buildFiltersFromUserDefaults(row) : createEmptyCatalogFilters();
      const defaultState = createCatalogBrowseToolbarStateFromBrowseSnapshot({
        context: 'browse',
        level: state.level,
        browseFilters: defaultsFilters,
        browseSearchQuery: '',
        browseSelectedSort: null,
        isHydrated: true,
        revision: state.revision,
      });

      if (row?.remember_catalog_filters === 1 && row.last_catalog_state) {
        const restoredState = parsePersistedCatalogBrowseToolbarState(row.last_catalog_state);
        if (restoredState && hasActiveCatalogBrowseState(restoredState)) {
          applyCatalogBrowseToolbarState(buildHydratedCatalogBrowseToolbarState(defaultState, restoredState));
          return;
        }
      }

      applyCatalogBrowseToolbarState(defaultState);
    } catch {
      applyCatalogBrowseToolbarState({
        ...state,
        isHydrated: true,
      });
    } finally {
      hydrationPromise = null;
    }
  })();

  return hydrationPromise;
}

export function enterBrowseContext(input: CatalogBrowseContextInput = {}) {
  const nextFilters = cloneCatalogFilters(state.browseFilters);
  const nextSearchQuery = input.routeSearchQuery ?? state.browseSearchQuery;

  if (input.routeTcg) {
    nextFilters.tcgs = [input.routeTcg];
  }

  replaceCatalogContextState({
    context: 'browse',
    level: input.level ?? state.level,
    filters: nextFilters,
    searchQuery: nextSearchQuery,
    selectedSort: state.browseSelectedSort,
    browseFilters: nextFilters,
    browseSearchQuery: nextSearchQuery,
    browseSelectedSort: state.browseSelectedSort,
  });
}

export function enterSearchContext(input: CatalogSearchContextInput) {
  replaceCatalogContextState({
    context: 'search',
    level: input.level ?? 'cards',
    filters: createTemporaryContextFilters('search', input.routeTcg),
    searchQuery: input.query,
    selectedSort: state.browseSelectedSort,
  });
}

export function enterRecentContext(input: CatalogBrowseContextInput = {}) {
  replaceCatalogContextState({
    context: 'recent',
    level: input.level ?? 'cards',
    filters: createTemporaryContextFilters('recent', input.routeTcg),
    searchQuery: input.routeSearchQuery ?? '',
    selectedSort: state.browseSelectedSort,
  });
}

export function enterWishlistContext(input: CatalogBrowseContextInput = {}) {
  replaceCatalogContextState({
    context: 'wishlist',
    level: input.level ?? 'cards',
    filters: createTemporaryContextFilters('wishlist', input.routeTcg),
    searchQuery: input.routeSearchQuery ?? '',
    selectedSort: null,
  });
}

export function enterMissingContext(input: CatalogBrowseContextInput = {}) {
  replaceCatalogContextState({
    context: 'missing',
    level: input.level ?? 'cards',
    filters: createTemporaryContextFilters('missing', input.routeTcg),
    searchQuery: input.routeSearchQuery ?? '',
    selectedSort: state.browseSelectedSort,
  });
}

export function updateActiveCatalogFilters(next: CatalogScreenFilters) {
  if (areFiltersEqual(state.filters, next) && (state.context !== 'browse' || areFiltersEqual(state.browseFilters, next))) {
    return;
  }

  updateCatalogBrowseToolbarState({
    filters: next,
    ...(state.context === 'browse' ? { browseFilters: next } : {}),
    revision: state.revision,
  });
}

export function updateActiveCatalogSearchQuery(searchQuery: string) {
  if (state.searchQuery === searchQuery && (state.context !== 'browse' || state.browseSearchQuery === searchQuery)) {
    return;
  }

  updateCatalogBrowseToolbarState({
    searchQuery,
    ...(state.context === 'browse' ? { browseSearchQuery: searchQuery } : {}),
    revision: state.revision,
  });
}

export function updateActiveCatalogSort(selectedSort: CatalogToolbarSort) {
  if (areSortsEqual(state.selectedSort, selectedSort) && (state.context !== 'browse' || areSortsEqual(state.browseSelectedSort, selectedSort))) {
    return;
  }

  updateCatalogBrowseToolbarState({
    selectedSort,
    ...(state.context === 'browse' ? { browseSelectedSort: selectedSort } : {}),
    revision: state.revision,
  });
}

export function updateCatalogLevel(level: CatalogBrowseLevel) {
  if (state.level === level) {
    return;
  }

  updateCatalogBrowseToolbarState({
    level,
    revision: state.revision,
  });
}

export async function resetActiveCatalogFiltersToDefault(input: CatalogBrowseContextInput = {}) {
  const defaultsFilters = await getCatalogBrowseDefaultFilters();

  if (state.context === 'browse') {
    const nextFilters = cloneCatalogFilters(defaultsFilters);
    if (input.routeTcg) {
      nextFilters.tcgs = [input.routeTcg];
    }

    replaceCatalogContextState({
      context: 'browse',
      level: input.level ?? state.level,
      filters: nextFilters,
      searchQuery: input.routeSearchQuery ?? '',
      selectedSort: null,
      browseFilters: nextFilters,
      browseSearchQuery: input.routeSearchQuery ?? '',
      browseSelectedSort: null,
    });
    return;
  }

  const routeTcg = input.routeTcg ?? getSingleSelectedTcg(state.filters);
  const nextSearchQuery = state.context === 'search'
    ? (input.routeSearchQuery ?? state.searchQuery)
    : (input.routeSearchQuery ?? '');

  replaceCatalogContextState({
    context: state.context,
    level: input.level ?? state.level,
    filters: createTemporaryContextFilters(state.context, routeTcg),
    searchQuery: nextSearchQuery,
    selectedSort: state.browseSelectedSort,
  });
}

export function clearCatalogTemporaryContextAndRestoreBrowse(input: CatalogBrowseContextInput = {}) {
  if (state.context === 'browse'
    && input.level === undefined
    && input.routeTcg === undefined
    && input.routeSearchQuery === undefined) {
    return;
  }

  enterBrowseContext(input);
}

function ensureCatalogBrowseToolbarHydrated() {
  if (hasStartedHydration) {
    return;
  }

  hasStartedHydration = true;
  void hydrateCatalogBrowseState();
}

async function getCatalogBrowseToolbarPersistenceRow() {
  const db = await getDatabase();
  return db.getFirstAsync<CatalogBrowseToolbarPersistenceRow>(
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
}

async function getCatalogBrowseDefaultFilters(): Promise<CatalogScreenFilters> {
  try {
    const row = await getCatalogBrowseToolbarPersistenceRow();
    return row ? buildFiltersFromUserDefaults(row) : createEmptyCatalogFilters();
  } catch {
    return createEmptyCatalogFilters();
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
    context: 'browse',
    level: snapshot.level,
    searchQuery: snapshot.browseSearchQuery,
    selectedSort: snapshot.browseSelectedSort,
    filters: cloneCatalogFilters(snapshot.browseFilters),
    browseSearchQuery: snapshot.browseSearchQuery,
    browseSelectedSort: snapshot.browseSelectedSort,
    browseFilters: cloneCatalogFilters(snapshot.browseFilters),
    isHydrated: snapshot.isHydrated,
    revision: snapshot.revision,
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

  const context = toCatalogBrowseContext(input.context);
  if (context) {
    next.context = context;
  }

  if (input.level === 'tcgs' || input.level === 'sets' || input.level === 'cards') {
    next.level = input.level;
  }

  if (typeof input.searchQuery === 'string') {
    next.searchQuery = input.searchQuery;
  }

  const selectedSort = normalizePersistedSort(input.selectedSort);
  if (selectedSort !== undefined) {
    next.selectedSort = selectedSort;
  }

  if (isRecord(input.filters)) {
    next.filters = normalizePersistedFilters(input.filters);
  }

  if (typeof input.browseSearchQuery === 'string') {
    next.browseSearchQuery = input.browseSearchQuery;
  }

  const browseSelectedSort = normalizePersistedSort(input.browseSelectedSort);
  if (browseSelectedSort !== undefined) {
    next.browseSelectedSort = browseSelectedSort;
  }

  if (isRecord(input.browseFilters)) {
    next.browseFilters = normalizePersistedFilters(input.browseFilters);
  }

  return next;
}

function hasActiveCatalogBrowseState(nextState: Partial<CatalogBrowseToolbarState>): boolean {
  const searchQuery = nextState.browseSearchQuery ?? nextState.searchQuery;
  const selectedSort = hasOwnProperty(nextState, 'browseSelectedSort')
    ? nextState.browseSelectedSort
    : nextState.selectedSort;
  const filters = nextState.browseFilters ?? nextState.filters;

  if (typeof searchQuery === 'string' && searchQuery.trim().length > 0) {
    return true;
  }

  if (selectedSort) {
    return true;
  }

  if (!filters) {
    return false;
  }

  return !areFiltersEqual(filters, createEmptyCatalogFilters());
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

function createInitialCatalogBrowseToolbarState(): CatalogBrowseToolbarState {
  const filters = createEmptyCatalogFilters();

  return {
    context: 'browse',
    level: 'tcgs',
    searchQuery: '',
    filters,
    selectedSort: null,
    browseFilters: createEmptyCatalogFilters(),
    browseSearchQuery: '',
    browseSelectedSort: null,
    isHydrated: false,
    revision: 0,
  };
}

function createCatalogBrowseToolbarStateFromBrowseSnapshot(input: {
  context: CatalogBrowseContext;
  level: CatalogBrowseLevel;
  browseFilters: CatalogScreenFilters;
  browseSearchQuery: string;
  browseSelectedSort: CatalogToolbarSort;
  isHydrated: boolean;
  revision: number;
}): CatalogBrowseToolbarState {
  return {
    context: input.context,
    level: input.level,
    searchQuery: input.browseSearchQuery,
    filters: cloneCatalogFilters(input.browseFilters),
    selectedSort: input.browseSelectedSort,
    browseFilters: cloneCatalogFilters(input.browseFilters),
    browseSearchQuery: input.browseSearchQuery,
    browseSelectedSort: input.browseSelectedSort,
    isHydrated: input.isHydrated,
    revision: input.revision,
  };
}

function buildHydratedCatalogBrowseToolbarState(
  baseState: CatalogBrowseToolbarState,
  restoredState: Partial<CatalogBrowseToolbarState>
): CatalogBrowseToolbarState {
  const browseFilters = restoredState.browseFilters
    ? cloneCatalogFilters(restoredState.browseFilters)
    : restoredState.filters
      ? cloneCatalogFilters(restoredState.filters)
      : cloneCatalogFilters(baseState.browseFilters);
  const browseSearchQuery = restoredState.browseSearchQuery ?? restoredState.searchQuery ?? baseState.browseSearchQuery;
  const browseSelectedSort = hasOwnProperty(restoredState, 'browseSelectedSort')
    ? (restoredState.browseSelectedSort ?? null)
    : hasOwnProperty(restoredState, 'selectedSort')
      ? (restoredState.selectedSort ?? null)
      : baseState.browseSelectedSort;

  return {
    context: 'browse',
    level: restoredState.level ?? baseState.level,
    searchQuery: browseSearchQuery,
    filters: browseFilters,
    selectedSort: browseSelectedSort,
    browseFilters,
    browseSearchQuery,
    browseSelectedSort,
    isHydrated: true,
    revision: baseState.revision,
  };
}

function applyCatalogBrowseToolbarState(nextState: CatalogBrowseToolbarState) {
  if (areToolbarStatesEqual(nextState, state)) {
    return;
  }

  state = nextState;
  emitChange();
  schedulePersistCatalogBrowseToolbarState();
}

function replaceCatalogContextState(input: {
  context: CatalogBrowseContext;
  level: CatalogBrowseLevel;
  filters: CatalogScreenFilters;
  searchQuery: string;
  selectedSort: CatalogToolbarSort;
  browseFilters?: CatalogScreenFilters;
  browseSearchQuery?: string;
  browseSelectedSort?: CatalogToolbarSort;
}) {
  updateCatalogBrowseToolbarState({
    context: input.context,
    level: input.level,
    filters: input.filters,
    searchQuery: input.searchQuery,
    selectedSort: input.selectedSort,
    ...(input.browseFilters ? { browseFilters: input.browseFilters } : {}),
    ...(input.browseSearchQuery !== undefined ? { browseSearchQuery: input.browseSearchQuery } : {}),
    ...(input.browseSelectedSort !== undefined ? { browseSelectedSort: input.browseSelectedSort } : {}),
  });
}

function normalizePersistedFilters(value: Record<string, unknown>): CatalogScreenFilters {
  const filters = createEmptyCatalogFilters();
  filters.tcgs = toCatalogTcgArray(value.tcgs);
  filters.setIds = toStringArray(value.setIds);
  filters.setNamesById = toStringMap(value.setNamesById);
  filters.languages = toCatalogLanguageArray(value.languages);
  filters.rarityKeys = toStringArray(value.rarityKeys);
  filters.cardTypeKeys = toStringArray(value.cardTypeKeys);
  const ownershipMode = toOwnershipMode(value.ownershipMode);
  if (ownershipMode) {
    filters.ownershipMode = ownershipMode;
  }

  const setScope = toSetScope(value.setScope);
  if (setScope) {
    filters.setScope = setScope;
  }
  filters.recentlyViewed = value.recentlyViewed === true;

  if (isRecord(value.gameSpecificSelections)) {
    filters.gameSpecificSelections = {
      ...filters.gameSpecificSelections,
      ...value.gameSpecificSelections,
    };
  }

  return filters;
}

function normalizePersistedSort(value: unknown): CatalogToolbarSort | undefined {
  if (value === null) {
    return null;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const key = typeof value.key === 'string' ? value.key : null;
  const direction = value.direction === 'asc' || value.direction === 'desc'
    ? value.direction
    : null;

  if (isSortKey(key) && direction) {
    return { key, direction };
  }

  return undefined;
}

function createTemporaryContextFilters(context: CatalogBrowseContext, routeTcg?: CatalogTcg): CatalogScreenFilters {
  const filters = createEmptyCatalogFilters();

  if (routeTcg) {
    filters.tcgs = [routeTcg];
  }

  if (context === 'recent') {
    filters.recentlyViewed = true;
  }

  return filters;
}

function getSingleSelectedTcg(filters: CatalogScreenFilters): CatalogTcg | undefined {
  return filters.tcgs.length === 1 ? filters.tcgs[0] : undefined;
}

function hasOwnProperty<T extends object, K extends PropertyKey>(
  value: T,
  key: K
): value is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function toCatalogBrowseContext(value: unknown): CatalogBrowseContext | null {
  if (value === 'browse' || value === 'search' || value === 'recent' || value === 'wishlist' || value === 'missing') {
    return value;
  }

  return null;
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
