export function normalizeSearchQuery(input: string): string {
  return input.trim().toLowerCase();
}

export function hasSearchQuery(input: string): boolean {
  return normalizeSearchQuery(input).length > 0;
}

export function matchesSearchValue(
  value: string | null | undefined,
  normalizedQuery: string,
): boolean {
  if (!normalizedQuery) {
    return true;
  }

  return normalizeSearchQuery(value ?? '').includes(normalizedQuery);
}
