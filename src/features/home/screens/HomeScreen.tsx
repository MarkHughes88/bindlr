import { useCallback, useMemo } from "react";
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from "expo-router";

import { Screen, Section, SkeletonBlock, FadeInView } from "@/src/shared/ui";
import { HomeHeader } from "../components/HomeHeader";
import { OverviewSection } from "../components/OverviewSection";
import { BindersSection } from "../components/BindersSection";
import { TcgsSection } from "../components/TcgsSection";
import { SearchSection } from "../components/SearchSection";
import { useHomeData } from "../hooks/useHomeData";
import { RecentlyViewedSection } from "../components/RecentlyViewedSection";
import { useAppTheme } from '@/src/theme/useAppTheme';

export function HomeScreen() {
	const { data, isLoading, error, reload } = useHomeData();
	const router = useRouter();
	const theme = useAppTheme();
	const styles = useMemo(() => createStyles(theme), [theme]);

	useFocusEffect(
		useCallback(() => {
			void reload();
		}, [reload])
	);

	if (isLoading || !data) {
		return (
			<Screen edges={['left', 'right']}>
				<Section>
					<SkeletonBlock width="56%" height={34} borderRadius={theme.radius.md} />
					<SkeletonBlock width="32%" height={16} borderRadius={theme.radius.xs} style={styles.loadingGapSmall} />
				</Section>

				<Section>
					<View style={styles.loadingOverviewGrid}>
						{Array.from({ length: 3 }).map((_, index) => (
							<SkeletonBlock key={`home-overview-${index}`} width="31%" height={88} borderRadius={theme.radius.md} />
						))}
					</View>
				</Section>

				<Section>
					<SkeletonBlock width="100%" height={48} borderRadius={theme.radius.md} />
				</Section>

				<Section>
					<View style={styles.loadingRail}>
						{Array.from({ length: 3 }).map((_, index) => (
							<View key={`home-rail-${index}`} style={styles.loadingRailItem}>
								<SkeletonBlock width="100%" height={140} borderRadius={theme.radius.md} />
								<SkeletonBlock width="76%" height={14} borderRadius={theme.radius.xs} style={styles.loadingGapTiny} />
							</View>
						))}
					</View>
				</Section>
			</Screen>
		);
	}

	if (error) {
		return <Screen />;
	}

	return (
		<Screen edges={['left', 'right']}>
			<FadeInView>
				<HomeHeader />
			</FadeInView>

			<FadeInView delay={60} style={styles.normalLayer}>
				<Section>
					<OverviewSection overview={data.overview} />
				</Section>
			</FadeInView>

			<FadeInView delay={120} style={styles.searchLayer}>
				<Section>
					<SearchSection />
				</Section>
			</FadeInView>

			<FadeInView delay={180} style={styles.normalLayer}>
				<Section hasHeading title="Binders" seeAll={data.binders.length > 0}>
					<BindersSection binders={data.binders} />
				</Section>
			</FadeInView>

			<FadeInView delay={240} style={styles.normalLayer}>
				<Section hasHeading title="TCGs">
					<TcgsSection tcgs={data.tcgs} />
				</Section>
			</FadeInView>

			<FadeInView delay={300} style={styles.normalLayer}>
				<Section
					hasHeading
					title="Recently Viewed"
					seeAll
					onPressSeeAll={() => router.push('/catalog?level=cards&mode=recentlyViewed')}
				>
					<RecentlyViewedSection tcgCards={data.recentlyViewed} />
				</Section>
			</FadeInView>

			{data.wishlist.length > 0 ? (
				<Section
					hasHeading
					title="Wishlist"
					seeAll
					onPressSeeAll={() => router.push('/catalog?level=cards&mode=wishlist')}
				>
					<RecentlyViewedSection tcgCards={data.wishlist} />
				</Section>
			) : null}

			{data.missingCards.length > 0 ? (
				<Section
					hasHeading
					title="Missing Cards"
					seeAll
					onPressSeeAll={() => router.push('/catalog?level=cards&mode=missingCards')}
				>
					<RecentlyViewedSection tcgCards={data.missingCards} />
				</Section>
			) : null}
		</Screen>
	);
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
	StyleSheet.create({
		loadingGapSmall: {
			marginTop: theme.spacing.xs,
		},
		loadingGapTiny: {
			marginTop: theme.spacing.xs,
		},
		loadingOverviewGrid: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			gap: theme.spacing.sm,
		},
		loadingRail: {
			flexDirection: 'row',
			gap: theme.spacing.sm,
		},
		loadingRailItem: {
			flex: 1,
		},
		searchLayer: {
			zIndex: 50,
			elevation: 50,
		},
		normalLayer: {
			zIndex: 1,
			elevation: 1,
		},
	});