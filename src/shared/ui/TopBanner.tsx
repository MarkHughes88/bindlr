import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, SafeAreaView, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/src/theme/useAppTheme';

import { AppText } from './AppText';

type BannerTone = 'success' | 'error' | 'info';

type ShowBannerInput = {
	message: string;
	tone?: BannerTone;
	durationMs?: number;
};

type ActiveBanner = Required<ShowBannerInput> & {
	id: number;
};

type TopBannerContextValue = {
	showBanner: (input: ShowBannerInput) => void;
	hideBanner: () => void;
};

const DEFAULT_DURATION_MS = 2600;

const TopBannerContext = createContext<TopBannerContextValue | null>(null);

export function TopBannerProvider({ children }: { children: ReactNode }) {
	const theme = useAppTheme();
	const styles = useMemo(() => createStyles(theme), [theme]);
	const [banner, setBanner] = useState<ActiveBanner | null>(null);
	const translateY = useRef(new Animated.Value(-24)).current;
	const opacity = useRef(new Animated.Value(0)).current;
	const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearHideTimeout = useCallback(() => {
		if (hideTimeoutRef.current) {
			clearTimeout(hideTimeoutRef.current);
			hideTimeoutRef.current = null;
		}
	}, []);

	const hideBanner = useCallback(() => {
		clearHideTimeout();
		Animated.parallel([
			Animated.timing(opacity, {
				toValue: 0,
				duration: 160,
				easing: Easing.in(Easing.cubic),
				useNativeDriver: true,
			}),
			Animated.timing(translateY, {
				toValue: -24,
				duration: 160,
				easing: Easing.in(Easing.cubic),
				useNativeDriver: true,
			}),
		]).start(({ finished }) => {
			if (finished) {
				setBanner(null);
			}
		});
	}, [clearHideTimeout, opacity, translateY]);

	const showBanner = useCallback(({ message, tone = 'success', durationMs = DEFAULT_DURATION_MS }: ShowBannerInput) => {
		clearHideTimeout();
		setBanner({
			id: Date.now(),
			message,
			tone,
			durationMs,
		});
	}, [clearHideTimeout]);

	useEffect(() => {
		if (!banner) {
			return;
		}

		opacity.setValue(0);
		translateY.setValue(-24);

		Animated.parallel([
			Animated.timing(opacity, {
				toValue: 1,
				duration: 180,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: true,
			}),
			Animated.timing(translateY, {
				toValue: 0,
				duration: 180,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: true,
			}),
		]).start();

		hideTimeoutRef.current = setTimeout(() => {
			hideBanner();
		}, banner.durationMs);

		return clearHideTimeout;
	}, [banner, clearHideTimeout, hideBanner, opacity, translateY]);

	useEffect(() => () => clearHideTimeout(), [clearHideTimeout]);

	const contextValue = useMemo(() => ({ showBanner, hideBanner }), [hideBanner, showBanner]);
	const toneStyle = banner ? stylesByTone(theme, banner.tone) : null;

	return (
		<TopBannerContext.Provider value={contextValue}>
			{children}
			<View pointerEvents="box-none" style={styles.overlay}>
				{banner ? (
					<SafeAreaView pointerEvents="box-none">
						<Animated.View
							style={[
								styles.bannerWrap,
								{
									opacity,
									transform: [{ translateY }],
								},
							]}
						>
							<Pressable onPress={hideBanner} style={[styles.banner, toneStyle]}>
								<AppText weight="semibold" style={styles.bannerText}>
									{banner.message}
								</AppText>
							</Pressable>
						</Animated.View>
					</SafeAreaView>
				) : null}
			</View>
		</TopBannerContext.Provider>
	);
}

export function useTopBanner(): TopBannerContextValue {
	const context = useContext(TopBannerContext);

	if (!context) {
		throw new Error('useTopBanner must be used within TopBannerProvider.');
	}

	return context;
}

function stylesByTone(theme: ReturnType<typeof useAppTheme>, tone: BannerTone) {
	if (tone === 'error') {
		return {
			backgroundColor: '#8B1E1E',
			borderColor: 'rgba(255,255,255,0.18)',
		};
	}

	if (tone === 'info') {
		return {
			backgroundColor: theme.colors.surface,
			borderColor: theme.colors.borderSubtle,
		};
	}

	return {
		backgroundColor: theme.colors.secondary,
		borderColor: theme.colors.borderSubtle,
	};
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
	StyleSheet.create({
		overlay: {
			...StyleSheet.absoluteFillObject,
			justifyContent: 'flex-start',
		},
		bannerWrap: {
			paddingHorizontal: theme.spacing.md,
			paddingTop: theme.spacing.sm,
		},
		banner: {
			borderWidth: theme.border.width.default,
			borderRadius: theme.radius.md,
			paddingHorizontal: theme.spacing.md,
			paddingVertical: theme.spacing.sm,
			shadowColor: '#000000',
			shadowOpacity: 0.12,
			shadowRadius: 16,
			shadowOffset: { width: 0, height: 10 },
			elevation: 6,
		},
		bannerText: {
			color: theme.isDark ? theme.colors.text : '#111111',
			fontSize: theme.fontSize.lg,
		},
	});