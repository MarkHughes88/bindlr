import { PropsWithChildren, useMemo } from 'react';
import { StyleProp, StyleSheet, Text, TextProps, TextStyle } from 'react-native';

// Import theme
import { useAppTheme } from '@/src/theme/useAppTheme';

type AppTextProps = PropsWithChildren<
	TextProps & {
		muted?: boolean;
		style?: StyleProp<TextStyle>;
		weight?: 'regular' | 'semibold' | 'bold';
	}
>;

export function AppText({
	children,
	muted = false,
	style,
	weight = 'regular',
	...props
}: AppTextProps) {
	const theme = useAppTheme();
	const styles = useMemo(() => createStyles(theme), [theme]);

	const fontMap = {
		regular: 'Outfit_400Regular',
		semibold: 'Outfit_600SemiBold',
		bold: 'Outfit_700Bold',
	};

	return (
		<Text
			{...props}
			style={[
				styles.base,
				muted && styles.muted,
				{
					fontFamily: fontMap[weight],
				},
				style,
			]}
		>
			{children}
		</Text>
	);
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
	StyleSheet.create({
		base: {
			color: theme.colors.text,
			fontSize: theme.fontSize.md,
		},
		muted: {
			color: theme.colors.textMuted,
		},
	});