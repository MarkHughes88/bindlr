import type { ImageSourcePropType } from "react-native";

import type { CatalogResolvedTcgCard } from "@/src/domain/catalog/catalog.types";

export function resolveTcgCardImageSource(
	tcgCard?: Pick<
		CatalogResolvedTcgCard,
		"imageSmall" | "imageMedium" | "imageLarge" | "imageSmallLocal" | "imageMediumLocal" | "imageLargeLocal"
	> | null
): ImageSourcePropType | undefined {
	if (!tcgCard) return undefined;

	const preferredUri =
		tcgCard.imageLargeLocal ??
		tcgCard.imageMediumLocal ??
		tcgCard.imageSmallLocal ??
		tcgCard.imageLarge ??
		tcgCard.imageMedium ??
		tcgCard.imageSmall;

	if (preferredUri) {
		return { uri: preferredUri };
	}

	return undefined;
}