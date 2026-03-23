import type { ImageSourcePropType } from "react-native";
import type { InventoryTcg } from "@/src/features/inventory/inventory.types";

export type TcgMeta = {
	title: string;
	language?: "en" | "ja";
	logoImage?: ImageSourcePropType;
};

export const TCG_META: Record<InventoryTcg, TcgMeta> = {
	pokemon: {
		title: "Pokémon",
		language: "en",
		logoImage: require("@/assets/images/tcg-logos/tcg-logo-pokemon.png"),
	},
	mtg: {
		title: "Magic: The Gathering",
		language: "en",
		logoImage: require("@/assets/images/tcg-logos/tcg-logo-mtg-white.png"),
	},
	lorcana: {
		title: "Lorcana",
		language: "en",
		logoImage: require("@/assets/images/tcg-logos/tcg-logo-lorcana.png"),
	},
	"one-piece": {
		title: "One Piece",
		language: "en",
		logoImage: require("@/assets/images/tcg-logos/tcg-logo-one-piece.png"),
	},
};

export function getTcgTitle(tcg: InventoryTcg): string {
	return TCG_META[tcg].title;
}

// Standard poker card dimensions (2.5" × 3.5")
export const TCG_CARD_ASPECT_RATIO = 2.5 / 3.5;