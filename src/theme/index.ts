import { colors, border, spacing, radius, fontSize } from './tokens';
import { hexToRgba } from './colorUtils';

export const theme = {
	dark: {
		colors: {
			...colors.dark,
			borderSubtle: hexToRgba(colors.dark.border, border.opacity.subtle),
			borderMedium: hexToRgba(colors.dark.border, border.opacity.medium),
			borderStrong: hexToRgba(colors.dark.border, border.opacity.strong),
		},
		border: {
			width: border.width,
		},
		spacing,
		radius,
		fontSize,
	},

	light: {
		colors: {
			...colors.light,
			borderSubtle: hexToRgba(colors.light.border, border.opacity.subtle),
			borderMedium: hexToRgba(colors.light.border, border.opacity.medium),
			borderStrong: hexToRgba(colors.light.border, border.opacity.strong),
		},
		border: {
			width: border.width,
		},
		spacing,
		radius,
		fontSize,
	},
} as const;