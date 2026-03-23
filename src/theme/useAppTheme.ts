import { useColorScheme } from 'react-native';
import { theme } from '@/src/theme';

export function useAppTheme() {
	const colorScheme = useColorScheme();
	const isDark = colorScheme !== 'light';

	return {
		isDark,
		...(isDark ? theme.dark : theme.light),
	};
}