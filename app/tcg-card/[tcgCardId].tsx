import { useLocalSearchParams } from "expo-router";

import { TcgCardDetailScreen } from "@/src/features/tcgCards/screens/TcgCardDetailScreen";
import type { CatalogTcg, CatalogLanguage } from "@/src/domain/catalog/catalog.types";

const VALID_TCGS: readonly string[] = ["pokemon", "lorcana", "mtg", "one-piece"];

export default function TcgCardDetailRoute() {
	const { tcgCardId, tcg, language } = useLocalSearchParams<{
		tcgCardId: string;
		tcg: string;
		language?: string;
	}>();

	if (!tcgCardId || !tcg || !VALID_TCGS.includes(tcg)) {
		return null;
	}

	return (
		<TcgCardDetailScreen
			tcgCardId={tcgCardId}
			tcg={tcg as CatalogTcg}
			language={language as CatalogLanguage | undefined}
		/>
	);
}
