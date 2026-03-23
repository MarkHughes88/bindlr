import React from 'react';
import { View, StyleSheet } from 'react-native';

import { useAppTheme } from '@/src/theme/useAppTheme';

type GridProps = {
	children: React.ReactNode;
	columns?: number;
	gap?: number;
	rowGap?: number;
	columnGap?: number;
};

export function Grid({
	children,
	columns = 2,
	gap,
	rowGap,
	columnGap,
}: GridProps) {
	const theme = useAppTheme();

	const resolvedColumnGap = columnGap ?? gap ?? theme.spacing.md;
	const resolvedRowGap = rowGap ?? gap ?? theme.spacing.md;
	const allChildren = React.Children.toArray(children);
	const rowCount = Math.ceil(allChildren.length / columns);

	const rows = Array.from({ length: rowCount }, (_, rowIndex) =>
		allChildren.slice(rowIndex * columns, rowIndex * columns + columns)
	);

	return (
		<View style={styles.container}>
			{rows.map((row, rowIndex) => {
				const missingColumns = columns - row.length;

				return (
					<View
						key={rowIndex}
						style={[
							styles.row,
							rowIndex < rows.length - 1
								? { marginBottom: resolvedRowGap }
								: null,
						]}
					>
						{row.map((child, columnIndex) => (
							<View
								key={columnIndex}
								style={[
									styles.cell,
									columnIndex < columns - 1
										? { marginRight: resolvedColumnGap }
										: null,
								]}
							>
								{child}
							</View>
						))}

						{Array.from({ length: missingColumns }, (_, i) => {
							const spacerColumnIndex = row.length + i;

							return (
								<View
									key={`spacer-${spacerColumnIndex}`}
									style={[
										styles.cell,
										spacerColumnIndex < columns - 1
											? { marginRight: resolvedColumnGap }
											: null,
									]}
								/>
							);
						})}
					</View>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		width: '100%',
	},
	row: {
		width: '100%',
		flexDirection: 'row',
	},
	cell: {
		flex: 1,
		minWidth: 0,
	},
});