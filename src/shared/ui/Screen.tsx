import { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, ViewStyle } from 'react-native';

// Import theme
import { useAppTheme } from '@/src/theme/useAppTheme';

// Import components
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

type ScreenProps = PropsWithChildren<{
	contentContainerStyle?: ViewStyle;
	edges?: Edge[];
}>;

export function Screen({ children, contentContainerStyle, edges }: ScreenProps) {
	const theme = useAppTheme();

	return (
		<SafeAreaView
			edges={edges}
			style={[
				styles.safeArea,
				{
					backgroundColor: theme.colors.background,
					paddingHorizontal: theme.spacing.xl,
				},
			]}
		>
			<ScrollView
				contentContainerStyle={[
					styles.contentContainer,
					{ paddingTop: theme.spacing.xxl, paddingBottom: theme.spacing.xxl + 32 },
					contentContainerStyle,
				]}
				keyboardShouldPersistTaps="always"
				showsVerticalScrollIndicator={false}
			>
				{children}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
	},
	contentContainer: {
		flexGrow: 1,
	},
});