import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

// Import theme
import { useAppTheme } from '@/src/theme/useAppTheme';

// Import components
import { AppText } from "./AppText";
import { BackButton } from "./BackButton";

type HeaderProps = {
	customIcon?: React.ReactNode;
	title?: string;
	hasBackBtn?: boolean;
	onBackPress?: () => void;
	rightAlignedContent?: React.ReactNode;
};

export function Header({
	customIcon,
	title,
	hasBackBtn = false,
	onBackPress,
	rightAlignedContent,
}: HeaderProps) {
	const theme = useAppTheme();
	const styles = useMemo(() => createStyles(theme), [theme]);

	return (
		<View style={styles.container}>
			<View style={styles.left}>
				{hasBackBtn && <BackButton onPress={onBackPress} />}
				{customIcon}
				{title ? (
					<AppText weight="bold" style={styles.title}>
						{title}
					</AppText>
				) : null}
			</View>

			<View style={styles.right}>
				{rightAlignedContent}
			</View>
		</View>
	);
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
	StyleSheet.create({
		container: {
			minHeight: 40,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			marginBottom: theme.spacing.lg,
		},
		left: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: theme.spacing.md,
		},
		right: {
			flexDirection: 'row',
			alignItems: 'center',
		},
		title: {
			fontSize: theme.fontSize.xl,
			color: theme.colors.text,
		},
	});