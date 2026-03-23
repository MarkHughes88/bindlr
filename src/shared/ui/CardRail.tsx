import React from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';

// Import theme
import { useAppTheme } from '@/src/theme/useAppTheme';

type CardRailProps<T> = {
	items: T[];
	itemsPerView?: number;
	horizontalPadding?: number;
	itemSpacing?: number;
	keyExtractor: (item: T, index: number) => string;
	renderItem: (item: T, index: number, itemWidth: number) => React.ReactNode;
};

export function CardRail<T>({
	items,
	itemsPerView = 3,
	horizontalPadding,
	itemSpacing,
	keyExtractor,
	renderItem,
}: CardRailProps<T>) {
	const theme = useAppTheme();
	const { width: screenWidth } = useWindowDimensions();

	const spacing = itemSpacing ?? theme.spacing.md;
	const railPadding = horizontalPadding ?? 0;

	const totalGapWidth = spacing * (itemsPerView - 1);
	const availableWidth = screenWidth - railPadding * 2;
	const cardWidth = (availableWidth - totalGapWidth) / itemsPerView;
	const snapInterval = cardWidth + spacing;

	return (
		<FlatList
			horizontal
			data={items}
			keyExtractor={keyExtractor}
			showsHorizontalScrollIndicator={false}
			decelerationRate="fast"
			snapToInterval={snapInterval}
			snapToAlignment="start"
			contentContainerStyle={[
				styles.contentContainer,
				{ paddingHorizontal: railPadding },
			]}
			renderItem={({ item, index }) => {
				const isLast = index === items.length - 1;

				return (
					<View style={{ width: cardWidth, marginRight: isLast ? 0 : spacing }}>
						{renderItem(item, index, cardWidth)}
					</View>
				);
			}}
		/>
	);
}

const styles = StyleSheet.create({
	contentContainer: {},
});
