import { Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/src/theme/useAppTheme';
import { Icon, type IconName } from '@/src/shared/ui/Icon';

const TAB_ICON_BY_ROUTE: Record<string, IconName> = {
	index: 'home',
	tcgs: 'layoutGrid',
	binders: 'book-open',
	cards: 'rectangleVertical',
	search: 'search',
	filter: 'slidersHorizontal',
};

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
	const theme = useAppTheme();
	const insets = useSafeAreaInsets();
	const styles = createStyles(theme);
	const bottomInset = Math.max(insets.bottom, theme.spacing.sm);
	const backplateHeight = 33 + bottomInset;

	return (
		<View style={[styles.outerWrap, { paddingBottom: bottomInset }]}> 
			<View
				pointerEvents="none"
				style={[styles.backplate, { height: backplateHeight }]}
			/>
			<View style={styles.tabBar}>
				{state.routes.map((route, index) => {
					const focused = state.index === index;
					const { options } = descriptors[route.key];
					const iconName = TAB_ICON_BY_ROUTE[route.name] ?? 'layoutGrid';

					const onPress = () => {
						const event = navigation.emit({
							type: 'tabPress',
							target: route.key,
							canPreventDefault: true,
						});

						if (!focused && !event.defaultPrevented) {
							navigation.navigate(route.name);
						}
					};

					return (
						<Pressable
							key={route.key}
							onPress={onPress}
							accessibilityRole="button"
							accessibilityLabel={options.tabBarAccessibilityLabel}
							style={styles.tabButton}
						>
							<View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
								<Icon
									iconName={iconName}
									size={24}
									color={focused ? theme.colors.primary : theme.colors.text}
								/>
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
	});
