import { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

// Import theme
import { useAppTheme } from '@/src/theme/useAppTheme';
import { fontSize } from '@/src/theme/tokens';

// Import components
import { Icon, IconName } from '@/src/shared/ui/Icon';
import { AppText } from '@/src/shared/ui/AppText';

type ButtonProps = {
	borderRadius?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
	type?: 'primary' | 'secondary' | 'tertiary';
	iconName?: IconName;
	onPress?: () => void;
	text?: string;
	disabled?: boolean,
	layout?: 'horizontal' | 'vertical';
	active?: boolean;
	iconColor?: string;
	activeIconColor?: string;
	textColor?: string;
	textSize?: keyof typeof fontSize;
};

export function Button({
	borderRadius = 'md',
	type = 'tertiary',
	iconName,
	onPress,
	text,
	disabled,
	layout = 'horizontal',
	active = false,
	iconColor,
	activeIconColor,
	textColor,
	textSize = 'md',
}: ButtonProps) {
	const theme = useAppTheme();
	const styles = useMemo(() => createStyles(theme), [theme]);

	// 🎯 Variant styles
	const backgroundMap = {
		primary: theme.colors.primary,
		secondary: theme.colors.surfaceAlt,
		tertiary: 'transparent',
	};

	const textColorMap = {
		primary: theme.colors.background,
		secondary: theme.colors.primary,
		tertiary: theme.colors.secondary,
	};

	const backgroundColor = backgroundMap[type];
	const defaultTextColor = textColorMap[type];
	const resolvedTextColor = textColor ?? defaultTextColor;
	const resolvedIconColor = active
		? (activeIconColor ?? theme.colors.primary)
		: (iconColor ?? resolvedTextColor);

	return (
		<Pressable
			onPress={onPress}
			style={[
				styles.button,
				layout === 'vertical' ? styles.verticalButton : styles.horizontalButton,
				{
					borderRadius: theme.radius[borderRadius],
					backgroundColor,
					padding: theme.spacing.md,
					opacity: disabled ? 0.5 : 1,
				},
			]}
		>
			{iconName && (
				<Icon iconName={iconName} color={resolvedIconColor} />
			)}

			{text && (
				<AppText
					numberOfLines={1}
					adjustsFontSizeToFit
					style={[
						styles.text,
						{ color: resolvedTextColor, fontSize: theme.fontSize[textSize] },
					]}
				>
					{text}
				</AppText>
			)}
		</Pressable>
	);
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
	StyleSheet.create({
		button: {
			alignItems: 'center',
			justifyContent: 'center',
			gap: theme.spacing.sm,
		},
		horizontalButton: {
			flexDirection: 'row',
		},
		verticalButton: {
			flexDirection: 'column',
			gap: theme.spacing.xs,
		},
		text: {},
	});