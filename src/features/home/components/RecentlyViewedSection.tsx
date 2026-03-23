import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";

// Import components
import { CardRail, TcgCard } from "@/src/shared/ui";

// Import types
import type { HomeTcgCardRailItem } from "../home.types";

type Props = {
	tcgCards: HomeTcgCardRailItem[];
};

export function RecentlyViewedSection({ tcgCards }: Props) {
	const router = useRouter();

	return (
		<View>
			<CardRail
				items={tcgCards}
				itemsPerView={4}
				keyExtractor={(tcgCard) => tcgCard.id}
				renderItem={(tcgCard) => (
					<Pressable
						onPress={() => {
							if (tcgCard.kind !== "catalog-tcg-card" || !tcgCard.catalogTcgCardId) return;

							router.push({
								pathname: "/tcg-card/[tcgCardId]",
								params: {
									tcgCardId: tcgCard.catalogTcgCardId,
									tcg: tcgCard.tcg,
									...(tcgCard.language ? { language: tcgCard.language } : {}),
								},
							});
						}}
					>
						<TcgCard tcgCard={tcgCard} resizeMode="cover" />
					</Pressable>
				)}
			/>
		</View>
	);
}