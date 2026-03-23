import type { CatalogLanguage, CatalogTcg } from "@/src/domain/catalog/catalog.types";

export const IMAGE_CACHE_RETRY_DAYS = 7;

export const IMAGE_STATUSES = ["placeholder", "loading", "loaded", "failed"] as const;
export type ImageStatus = (typeof IMAGE_STATUSES)[number];

export const PLACEHOLDER_IMAGE_SOURCES: Record<
	CatalogTcg,
	Partial<Record<CatalogLanguage, unknown>>
> = {
	pokemon: {
		en: "pokemon/en/placeholder",
	},
	mtg: {
		en: "mtg/en/placeholder",
	},
	lorcana: {
		en: "lorcana/en/placeholder",
	},
	"one-piece": {
		en: "one-piece/en/placeholder",
	},
};
