import { View, StyleSheet } from 'react-native';
import { useMemo } from 'react';

// Import theme
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { SpacingToken } from '@/src/theme/types';

// Import copy
import { UI_COPY } from '@/src/lib/copy';

// Import components
import { AppText } from './AppText';

type SectionSpacing = SpacingToken | 'none';

type SectionProps = {
	children?: React.ReactNode;
	hasHeading?: boolean;
	title?: string;
	seeAll?: boolean;
	onPressSeeAll?: () => void;
	spacing?: SectionSpacing;
};

export function Section({
	children,
	hasHeading = false,
	title,
	seeAll = false,
	onPressSeeAll,
	spacing = 'lg',
}: SectionProps) {
	const theme = useAppTheme();
	const styles = useMemo(() => createStyles(theme, spacing), [theme, spacing]);

	return (
		<View style={styles.container}>
			{hasHeading && (
				<View style={styles.headingContainer}>
					<View style={styles.headingLeft}>
						{title && (
							<AppText style={styles.title}>
								{title}
							</AppText>
						)}
					</View>

					<View style={styles.headingRight}>
						{seeAll && (
							<AppText style={styles.seeAll} onPress={onPressSeeAll}>
								{UI_COPY.actions.seeAll}
							</AppText>
						)}
					</View>
				</View>
			)}

			{children}
		</View>
	);
}

const createStyles = (
	theme: ReturnType<typeof useAppTheme>,
	spacing: SectionSpacing,
) =>
	StyleSheet.create({
		container: {
			marginBottom: spacing === 'none' ? 0 : theme.spacing[spacing],
		},
		headingContainer: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			marginBottom: theme.spacing.lg,
		},
		headingLeft: {
			flexDirection: 'row',
			alignItems: 'center',
		},
		headingRight: {
			flexDirection: 'row',
			alignItems: 'center',
		},
		title: {
			fontSize: theme.fontSize.lg,
		},
		seeAll: {
			color: theme.colors.secondary,
		},
	});