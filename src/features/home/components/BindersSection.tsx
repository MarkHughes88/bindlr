import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import type { HomeBinderSummary } from "../home.types";
import { BinderCard } from "@/src/features/binders/components/BinderCard";
import { AppText } from '@/src/shared/ui/AppText';
import { Button } from '@/src/shared/ui/Button';
import { Card } from '@/src/shared/ui/Card';
import { CardRail } from "@/src/shared/ui/CardRail";
import { useAppTheme } from '@/src/theme/useAppTheme';

type Props = {
	binders: HomeBinderSummary[];
};

export function BindersSection({ binders }: Props) {
	const router = useRouter();
	const theme = useAppTheme();
	const styles = useMemo(() => createStyles(theme), [theme]);

	if (binders.length === 0) {
		return (
			<Card>
				<View style={styles.emptyContainer}>
					<AppText style={styles.emptyCopy}>You&apos;ve not created any binders yet. Why not</AppText>
					<Button
						type="primary"
						iconName="hammer"
						text="build one now?"
						onPress={() => router.push('/binders')}
					/>
				</View>
			</Card>
		);
	}

	return (
		<CardRail
			items={binders}
			itemsPerView={2}
			keyExtractor={(binder) => binder.id}
			renderItem={(binder) => (
				<BinderCard
					title={binder.title}
					current={binder.current}
					total={binder.total}
				/>
			)}
		/>
	);
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
	StyleSheet.create({
		emptyContainer: {
			alignItems: 'center',
			justifyContent: 'center',
			gap: theme.spacing.md,
			paddingVertical: theme.spacing.md,
		},
		emptyCopy: {
			textAlign: 'center',
			fontSize: theme.fontSize.lg,
		},
	});