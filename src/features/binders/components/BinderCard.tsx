import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

// Import theme
import { useAppTheme } from '@/src/theme/useAppTheme';

// Import components
import { Card } from '@/src/shared/ui/Card';
import { AppText } from '@/src/shared/ui/AppText';
import { APP_ICON_NAMES, Icon } from '@/src/shared/ui/Icon';
import { ProgressBar } from '@/src/shared/ui/ProgressBar';

type BinderCardProps = {
    title: string;
    current: number;
    total: number;
    onPress?: () => void;
};

export function BinderCard({
    title,
    current,
    total,
    onPress,
}: BinderCardProps) {
    const theme = useAppTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const calcPercentage = (current: number, total: number) => {
        if (total === 0) return '0.00%';
        return `${((current / total) * 100).toFixed(2)}%`;
    };

    const percentComplete = calcPercentage(current, total);
    const progressValue = total === 0 ? 0 : (current / total) * 100;

    return (
        <Card onPress={onPress}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Icon iconName={APP_ICON_NAMES.binder} color={theme.colors.secondary} />
                    <AppText
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={styles.title}
                    >
                        {title}
                    </AppText>
                </View>

                <View style={styles.countRow}>
                    <AppText weight="bold" style={styles.countText}>
                        {current}
                    </AppText>
                    <AppText style={styles.countText}>
                        {' '} / {total}
                    </AppText>
                </View>

                <View style={styles.progressSection}>
                    <ProgressBar progress={progressValue} />
                    <AppText style={styles.progressText}>
                        {percentComplete} complete
                    </AppText>
                </View>
            </View>
        </Card>
    );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
    StyleSheet.create({
        container: {
            flexDirection: 'column',
            gap: theme.spacing.md,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
        },
        title: {
            flex: 1,
            minWidth: 0,
            fontSize: theme.fontSize.lg,
        },
        countRow: {
            flexDirection: 'row',
        },
        countText: {
            fontSize: theme.fontSize.lg,
        },
        progressSection: {
            flexDirection: 'column',
            gap: theme.spacing.sm,
        },
        progressText: {
            color: theme.colors.textMuted,
        },
    });