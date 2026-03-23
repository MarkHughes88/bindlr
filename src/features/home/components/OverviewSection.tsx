import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

// Import theme
import { useAppTheme } from '@/src/theme/useAppTheme';

// Import components
import { AppText } from '@/src/shared/ui/AppText';
import { Card } from '@/src/shared/ui/Card';

type OverviewSectionProps = {
    overview: {
        totalOwned: number;
        totalUnique: number;
        totalSets: number;
        wishlistCount: number;
    };
};

export function OverviewSection({ overview }: OverviewSectionProps) {
    const theme = useAppTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    return (
        <View style={styles.container}>
            <AppText style={styles.subtitle}>
                Your collection at a glance
            </AppText>

            <Card>
                <View style={styles.overviewCard}>
                    <View style={styles.statistic}>
                        <AppText weight="bold" style={styles.statValue}>
                            {overview.totalOwned}
                        </AppText>
                        <AppText>Owned</AppText>
                    </View>

                    <View style={styles.statistic}>
                        <AppText weight="bold" style={styles.statValue}>
                            {overview.totalUnique}
                        </AppText>
                        <AppText>Unique</AppText>
                    </View>

                    <View style={styles.statistic}>
                        <AppText weight="bold" style={styles.statValue}>
                            {overview.totalSets}
                        </AppText>
                        <AppText>Sets</AppText>
                    </View>

                    <View style={styles.statistic}>
                        <AppText weight="bold" style={styles.statValue}>
                            {overview.wishlistCount}
                        </AppText>
                        <AppText>Wishlist</AppText>
                    </View>
                </View>
            </Card>
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
    StyleSheet.create({
        container: {
            flexDirection: 'column',
            gap: theme.spacing.md,
        },
        subtitle: {
            color: theme.colors.textMuted,
        },
        overviewCard: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        statistic: {
            flex: 1,
            flexDirection: 'column',
            alignItems: 'center',
        },
        statValue: {
            fontSize: theme.fontSize.lg,

        },
    });