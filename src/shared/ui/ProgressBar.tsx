import { View, StyleSheet } from 'react-native';
import { useMemo } from 'react';

// Import theme
import { useAppTheme } from '@/src/theme/useAppTheme';

type ProgressBarProps = {
	progress: number; // 0 → 100
	color?: keyof ReturnType<typeof useAppTheme>['colors'];
	borderRadius?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
	height?: number;
};

export function ProgressBar({
	progress,
	color = 'primary',
	borderRadius = 'md',
	height = 6,
}: ProgressBarProps) {
	const theme = useAppTheme();
	const styles = useMemo(() => createStyles(theme), [theme]);

	// Clamp to safe values
	const safeProgress = Math.max(0, Math.min(progress, 100));

	return (
		<View
			style={[
				styles.track,
				{
					height,
					borderRadius: theme.radius[borderRadius],
				},
			]}
		>
			<View
				style={[
					styles.fill,
					{
						width: `${safeProgress}%`,
						borderRadius: theme.radius[borderRadius],
						backgroundColor: theme.colors[color],
					},
				]}
			/>
		</View>
	);
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
	StyleSheet.create({
		track: {
			width: '100%',
			overflow: 'hidden',
			backgroundColor: theme.colors.borderSubtle,
		},
		fill: {
			height: '100%',
		},
	});