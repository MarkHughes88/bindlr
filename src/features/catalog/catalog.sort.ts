import type { CatalogTcgCardSummary, CatalogTcgCardSortDirection, CatalogTcgCardSortKey } from './catalog.types';

const TCG_ORDER: Record<CatalogTcgCardSummary['tcg'], number> = {
  pokemon: 0,
  mtg: 1,
  lorcana: 2,
  'one-piece': 3,
};

const RARITY_BUCKETS = [
  { rank: 0, patterns: ['common'] },
  { rank: 1, patterns: ['uncommon'] },
  { rank: 2, patterns: ['rare'] },
  { rank: 3, patterns: ['double rare', 'ultra rare', 'super rare', 'legendary'] },
  { rank: 4, patterns: ['secret', 'special illustration', 'illustration', 'mythic'] },
  { rank: 5, patterns: ['promo'] },
] as const;

function normalize(input: string | undefined): string {
  return (input ?? '').trim().toLowerCase();
}

function compareString(a: string | undefined, b: string | undefined): number {
  return normalize(a).localeCompare(normalize(b));
}

function toNumericPrefix(value: string | undefined): number | null {
  const raw = (value ?? '').trim();
  const match = raw.match(/\d+/);
  if (!match) {
    return null;
  }

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function compareCardNumber(a: string | undefined, b: string | undefined): number {
  const aNumber = toNumericPrefix(a);
  const bNumber = toNumericPrefix(b);

  if (aNumber != null && bNumber != null && aNumber !== bNumber) {
    return aNumber - bNumber;
  }

  if (aNumber != null && bNumber == null) {
    return -1;
  }

  if (aNumber == null && bNumber != null) {
    return 1;
  }

  return compareString(a, b);
}

function rarityRank(rarity: string | undefined): number {
  const normalized = normalize(rarity);
  if (!normalized) {
    return Number.MAX_SAFE_INTEGER;
  }

  for (const bucket of RARITY_BUCKETS) {
    if (bucket.patterns.some((pattern) => normalized.includes(pattern))) {
      return bucket.rank;
    }
  }

  return 999;
}

function compareRarity(a: string | undefined, b: string | undefined): number {
  const rankDelta = rarityRank(a) - rarityRank(b);
  if (rankDelta !== 0) {
    return rankDelta;
  }

  return compareString(a, b);
}

function compareNewest(a: string | undefined, b: string | undefined): number {
  const aTime = a ? Date.parse(a) : Number.NaN;
  const bTime = b ? Date.parse(b) : Number.NaN;

  const aValid = Number.isFinite(aTime);
  const bValid = Number.isFinite(bTime);

  if (aValid && bValid && aTime !== bTime) {
    return bTime - aTime;
  }

  if (aValid && !bValid) {
    return -1;
  }

  if (!aValid && bValid) {
    return 1;
  }

  return 0;
}

export function sortCatalogTcgCards(
  items: CatalogTcgCardSummary[],
  sortBy: CatalogTcgCardSortKey,
  sortDirection: CatalogTcgCardSortDirection,
): CatalogTcgCardSummary[] {
  const sorted = [...items].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return compareString(a.name, b.name);
      case 'cardNumber':
        return compareCardNumber(a.number, b.number);
      case 'tcg':
        return TCG_ORDER[a.tcg] - TCG_ORDER[b.tcg] || compareString(a.name, b.name);
      case 'set':
        return compareString(a.setName, b.setName) || compareString(a.name, b.name);
      case 'rarity':
        return compareRarity(a.rarity, b.rarity) || compareString(a.name, b.name);
      case 'newest':
        return compareNewest(a.setReleaseDate, b.setReleaseDate) || compareString(a.name, b.name);
      case 'pokedex':
        if (a.pokemonNationalPokedexNumber != null && b.pokemonNationalPokedexNumber != null) {
          return a.pokemonNationalPokedexNumber - b.pokemonNationalPokedexNumber;
        }
        if (a.pokemonNationalPokedexNumber != null) {
          return -1;
        }
        if (b.pokemonNationalPokedexNumber != null) {
          return 1;
        }
        return compareString(a.name, b.name);
      default:
        return compareString(a.name, b.name);
    }
  });

  return sortDirection === 'asc' ? sorted : sorted.reverse();
}
