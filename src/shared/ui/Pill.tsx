import React, { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

// Import theme
import { useAppTheme } from '@/src/theme/useAppTheme';

// Import components
import { AppText, Icon } from '@/src/shared/ui';

type PillProps = {
    text: string;
    deletable?: boolean;
    onPress?: () => void;
    textColor?: string;
};

export function Pill({ text, deletable, onPress, textColor }: PillProps) {
    const theme = useAppTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    return (
        <Pressable onPress={onPress} style={styles.container} disabled={!onPress}>
            <AppText style={textColor ? { color: textColor } : undefined}>{text}</AppText>
            {deletable ? ( <Icon iconName="x" size={8} /> ) : null}
        </Pressable>
    );
}


const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
    StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.xs,
            padding: theme.spacing.sm,
            backgroundColor: theme.colors.surfaceAlt,
            borderRadius: theme.radius.sm,
        },
    });