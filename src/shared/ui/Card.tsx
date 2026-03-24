import { View } from 'react-native';
import { useAppTheme } from '@/src/theme/useAppTheme';

type PaddingSize = 'none' | 'sm' | 'md' | 'lg' | 'xl';

type CardProps = {
    children: React.ReactNode;
    borderRadius?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
    backgroundColor?: 'background' | 'surface' | 'surfaceAlt';
    padding?: PaddingSize;
    onPress?: () => void;
};

export function Card({
    children,
    borderRadius = 'md',
    backgroundColor = 'surface',
    padding = 'md',
}: CardProps) {
    const theme = useAppTheme();

    const resolvedPadding =
        padding === 'none'
            ? 0
            : padding
            ? theme.spacing[padding]
            : theme.spacing.md;

    return (
        <View
            style={{
                borderRadius: theme.radius[borderRadius],
                backgroundColor: theme.colors[backgroundColor],
                padding: resolvedPadding,
                overflow: "hidden",
            }}
        >
            {children}
        </View>
    );
}