import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/src/theme/useAppTheme';

type SkeletonBlockProps = {
	width?: ViewStyle['width'];
	height: number;
	borderRadius?: number;
	style?: StyleProp<ViewStyle>;
};

export function SkeletonBlock({ width = '100%', height, borderRadius, style }: SkeletonBlockProps) {
	const theme = useAppTheme();
	const shimmer = useRef(new Animated.Value(0.55)).current;

	useEffect(() => {
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(shimmer, {
					toValue: 0.92,
					duration: 760,
					easing: Easing.inOut(Easing.cubic),
					useNativeDriver: true,
				}),
				Animated.timing(shimmer, {
					toValue: 0.55,
					duration: 760,
					easing: Easing.inOut(Easing.cubic),
					useNativeDriver: true,
				}),
			])
		);

		loop.start();
		return () => loop.stop();
	}, [shimmer]);

	const styles = useMemo(() => createStyles(theme), [theme]);

	return (
		<Animated.View
			style={[
				styles.block,
				{
					width,
					height,
					borderRadius: borderRadius ?? theme.radius.sm,
					opacity: shimmer,
				},
				style,
			]}
		/>
	);
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
	StyleSheet.create({
		block: {
			backgroundColor: theme.colors.surfaceAlt,
			borderWidth: theme.border.width.default,
			borderColor: theme.colors.borderSubtle,
		},
	});

// ---------------------------------------------------------------------------
// FadeInView — mounts at opacity 0 and fades to 1; supports a stagger delay.
// ---------------------------------------------------------------------------

type FadeInViewProps = {
	delay?: number;
	duration?: number;
	translateYFrom?: number;
	children: ReactNode;
	style?: StyleProp<ViewStyle>;
};

export function FadeInView({ delay = 0, duration = 220, translateYFrom = 0, children, style }: FadeInViewProps) {
	const opacity = useRef(new Animated.Value(0)).current;
	const translateY = useRef(new Animated.Value(translateYFrom)).current;

	useEffect(() => {
		opacity.setValue(0);
		translateY.setValue(translateYFrom);

		const anim = Animated.parallel([
			Animated.timing(opacity, {
				toValue: 1,
				duration,
				delay,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: true,
			}),
			Animated.timing(translateY, {
				toValue: 0,
				duration,
				delay,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: true,
			}),
		]);

		anim.start();
		return () => anim.stop();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
}
