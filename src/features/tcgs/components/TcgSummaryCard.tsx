import React, { useMemo } from 'react';
import {
    View,
    StyleSheet,
    Image,
    ImageSourcePropType,
    Pressable,
} from 'react-native';

// Import theme
import { useAppTheme } from '@/src/theme/useAppTheme';

// Import components
import { Card, AppText } from "@/src/shared/ui";

type TcgSummaryCardProps = {
    title: string;
    totalOwned: number;
    logoImage?: string | ImageSourcePropType,
    onPress?: () => void;
};

export function TcgSummaryCard({
    title,
    totalOwned,
    logoImage,
    onPress,
}: TcgSummaryCardProps) {
    const theme = useAppTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    return (
        <Pressable onPress={onPress} disabled={!onPress}>
        <Card padding="none">
            <View style={styles.row}>
                <View style={styles.logoContainer}>
                    {logoImage ? (
                        <Image source={typeof logoImage === 'string' ? { uri: logoImage } : logoImage} style={styles.logo} resizeMode="contain" />
                    ) : null}
                </View>

                <View style={styles.title}>
                    <AppText weight="semibold" numberOfLines={1} ellipsizeMode="tail">
                        {title}
                    </AppText>
                </View>

                <View style={styles.count}>
                    <AppText>{totalOwned}</AppText>
                </View>
            </View>
        </Card>
        </Pressable>
    );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
    StyleSheet.create({
        row: {
            paddingVertical: theme.spacing.md,
            paddingHorizontal: theme.spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
        },
        logoContainer: {
            width: 64,
            height: 32,
            justifyContent: 'center',
        },
        logo: {
            width: '100%',
            height: '100%',
        },
        title: {
            flex: 1,
            minWidth: 0,
            justifyContent: 'center',
        },
        count: {
            marginLeft: theme.spacing.xs,
            justifyContent: 'center',
        },
    });
