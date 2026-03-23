export const colors = {
	dark: {
		background: '#1F1E1C',
		surface: '#2E2E2D',
		surfaceAlt: '#171716',

		text: '#F5F4F2',
		textDark: '#2E2E2D',
		textMuted: '#B3B3B3',
		textHighlighted: '#2EC4B6',

		border: '#F5F4F2',

		primary: '#f4b81a',
		secondary: '#2EC4B6',
		danger: '#E5484D',
	},

	light: {
		background: '#FFFFFF',
		surface: '#F5F5F5',
		surfaceAlt: '#EBEBEB',

		text: '#111111',
		textMuted: '#666666',
		textHighlighted: '#2EC4B6',

		border: '#D9D9D9',

		primary: '#D9A400',
		secondary: '#2EC4B6',
		danger: '#D32F2F',
  },
} as const;

export const border = {
  	width: {
		default: 1,
		strong: 2,
	},
	opacity: {
		subtle: 0.1,
		medium: 0.2,
		strong: 0.4,
	},
} as const;

export const spacing = {
	xs: 4,
	sm: 8,
	md: 12,
	lg: 16,
	xl: 32,
	xxl: 64,
} as const;

export const radius = {
	xs: 4,
	sm: 8,
	md: 12,
	lg: 16,
	xl: 24,
	xxl: 32,
} as const;

export const fontSize = {
	xs: 8,
	sm: 10,
	md: 12,
	lg: 16,
	xl: 24,
	xxl: 32,
} as const;
