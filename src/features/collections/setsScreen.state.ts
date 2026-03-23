import type { CatalogLanguage, CatalogTcg } from '@/src/domain/catalog/catalog.types';

export type SetsScope = 'all' | 'favorites';
export type SetsSortKey = 'favorites' | 'name' | 'releaseDate';
export type SetsSortDirection = 'asc' | 'desc';

type SetsScreenState = {
	searchQuery: string;
	language?: CatalogLanguage;
	setScope: SetsScope;
	sortKey: SetsSortKey;
	sortDirection: SetsSortDirection;
};

const DEFAULT_STATE: SetsScreenState = {
	searchQuery: '',
	setScope: 'all',
	sortKey: 'name',
	sortDirection: 'asc',
};

let lastSelectedTcg: CatalogTcg | null = null;

const stateByTcg: Partial<Record<CatalogTcg, SetsScreenState>> = {};

export function getLastSelectedSetsTcg(): CatalogTcg | null {
	return lastSelectedTcg;
}

export function setLastSelectedSetsTcg(tcg: CatalogTcg) {
	lastSelectedTcg = tcg;
}

export function getSetsScreenState(tcg: CatalogTcg): SetsScreenState {
	return {
		...DEFAULT_STATE,
		...stateByTcg[tcg],
	};
}

export function updateSetsScreenState(tcg: CatalogTcg, next: Partial<SetsScreenState>) {
	stateByTcg[tcg] = {
		...getSetsScreenState(tcg),
		...next,
	};
}