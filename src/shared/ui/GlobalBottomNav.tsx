import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { usePathname, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/src/theme/useAppTheme';
import { useUserSettingsState } from '@/src/features/settings/settings.store';
import {
	useCatalogBrowseToolbarState,
	updateCatalogBrowseToolbarLevel,
} from '@/src/features/catalog/catalogBrowseToolbar.state';
import { AppText } from '@/src/shared/ui/AppText';
import { APP_ICON_NAMES, Icon, type IconName } from '@/src/shared/ui/Icon';

type NavRoute = {
	key: 'home' | 'tcgs' | 'sets' | 'cards' | 'binders' | 'settings';
	path: Href;
	icon: IconName;
};

const NAV_ROUTES: NavRoute[] = [
	{ key: 'home', path: '/(tabs)', icon: APP_ICON_NAMES.home },
	{ key: 'tcgs', path: '/(tabs)/catalog?level=tcgs', icon: APP_ICON_NAMES.tcg },
	{ key: 'sets', path: '/(tabs)/catalog?level=sets', icon: APP_ICON_NAMES.set },
	{ key: 'cards', path: '/(tabs)/catalog?level=cards', icon: APP_ICON_NAMES.card },
	{ key: 'binders', path: '/(tabs)/binders', icon: APP_ICON_NAMES.binder },
	{ key: 'settings', path: '/(tabs)/settings', icon: APP_ICON_NAMES.settings },
];

const BINDER_BUILDER_ROUTE = '/binder-builder';

function getActiveRouteKey(pathname: string, catalogLevel: 'tcgs' | 'sets' | 'cards'): NavRoute['key'] {
	if (pathname === '/' || pathname === '/index') {
		return 'home';
	}

	if (pathname.startsWith('/catalog')) {
		return catalogLevel;
	}

	if (pathname.startsWith('/tcg-card')) {
		return 'sets';
	}

	if (pathname.startsWith('/binders')) {
		return 'binders';
	}

	if (pathname.startsWith('/card-list')) {
		return 'cards';
	}

	if (pathname.startsWith('/settings')) {
		return 'settings';
	}

	return 'settings';
}

export function shouldHideGlobalBottomNav(pathname: string): boolean {
	// Binder builder is the only route that should hide the global menu.
	return pathname === BINDER_BUILDER_ROUTE || pathname.startsWith(`${BINDER_BUILDER_ROUTE}/`);
}

export function GlobalBottomNav() {
	const router = useRouter();
	const pathname = usePathname();
	const theme = useAppTheme();
	const { profile } = useUserSettingsState();
	const toolbarState = useCatalogBrowseToolbarState();
	const insets = useSafeAreaInsets();
	const styles = useMemo(() => createStyles(theme), [theme]);

	const activeRouteKey = getActiveRouteKey(pathname, toolbarState.level);
	const bottomInset = Math.max(insets.bottom, theme.spacing.sm);
	const backplateHeight = 33 + bottomInset;

	if (shouldHideGlobalBottomNav(pathname)) {
		return null;
	}

	return (
		<View style={[styles.outerWrap, { paddingBottom: bottomInset }]}>
			<View pointerEvents="none" style={[styles.backplate, { height: backplateHeight }]} />
			<View style={styles.tabBar}>
				{NAV_ROUTES.map((route) => {
					const focused = activeRouteKey === route.key;
					const showProfileAvatar = route.key === 'settings';

					return (
						<Pressable
							key={route.key}
							onPress={() => {
								if (focused) {
									return;
								}

								if (route.key === 'tcgs' || route.key === 'sets' || route.key === 'cards') {
									updateCatalogBrowseToolbarLevel(route.key);
								}

								router.navigate(route.path);
							}}
							accessibilityRole="button"
							style={styles.tabButton}
						>
							<View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
								{showProfileAvatar ? (
									<View style={[styles.profileBadge, { backgroundColor: profile.avatarColor }]}>
										{profile.avatarImageUri ? (
											<Image source={{ uri: profile.avatarImageUri }} style={styles.profileBadgeImage} />
										) : (
											<AppText weight="bold" style={styles.profileBadgeText}>{profile.avatarInitials}</AppText>
										)}
									</View>
								) : (
									<Icon
										iconName={route.icon}
										size={24}
										color={focused ? theme.colors.primary : theme.colors.text}
									/>
								)}
							</View>
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
	StyleSheet.create({
		outerWrap: {
			backgroundColor: 'transparent',
			position: 'absolute',
			left: 0,
			right: 0,
			bottom: 0,
			zIndex: 20,
			paddingHorizontal: theme.spacing.lg,
			paddingTop: 0,
			alignItems: 'center',
			justifyContent: 'flex-end',
		},
		backplate: {
			position: 'absolute',
			left: 0,
			right: 0,
			bottom: 0,
			backgroundColor: theme.colors.surfaceAlt,
			borderTopWidth: theme.border.width.default,
			borderTopColor: theme.colors.borderSubtle,
		},
		tabBar: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: theme.spacing.sm,
			backgroundColor: 'transparent',
		},
		tabButton: {
			flex: 0,
			alignItems: 'center',
			justifyContent: 'center',
			paddingVertical: theme.spacing.xs,
		},
		iconWrap: {
			width: 58,
			height: 58,
			borderRadius: 19,
			alignItems: 'center',
			justifyContent: 'center',
			borderWidth: theme.border.width.default,
			borderColor: theme.colors.borderSubtle,
			backgroundColor: theme.colors.surfaceAlt,
		},
		iconWrapActive: {
			borderWidth: theme.border.width.strong,
			borderColor: theme.colors.primary,
			backgroundColor: theme.colors.surface,
		},
		profileBadge: {
			width: 34,
			height: 34,
			borderRadius: 17,
			alignItems: 'center',
			justifyContent: 'center',
			overflow: 'hidden',
		},
		profileBadgeText: {
			fontSize: theme.fontSize.md,
			color: '#1F1E1C',
		},
		profileBadgeImage: {
			width: '100%',
			height: '100%',
		},
	});
