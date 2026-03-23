import { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { catalogRepository } from '@/src/lib/repositories';
import { SEARCH_COPY } from '@/src/lib/copy';
import { AppText, Input } from '@/src/shared/ui';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { CatalogTcgCardSummary } from '@/src/features/catalog/catalog.types';

const HOME_SEARCH_DROPDOWN_LIMIT = 4;
const HOME_SEARCH_DEBOUNCE_MS = 160;

export function SearchSection() {
    const router = useRouter();
    const theme = useAppTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<CatalogTcgCardSummary[]>([]);
    const [totalHits, setTotalHits] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const normalizedQuery = query.trim();
    const shouldShowDropdown = isInputFocused && normalizedQuery.length > 0;

    useEffect(() => {
        if (normalizedQuery.length < 2) {
            setResults([]);
            setTotalHits(0);
            setIsLoading(false);
            return;
        }

        let cancelled = false;
        const timer = setTimeout(() => {
            void (async () => {
                setIsLoading(true);

                const page = await catalogRepository.getCatalogTcgCardsPage({
                    page: 1,
                    pageSize: HOME_SEARCH_DROPDOWN_LIMIT,
                    query: normalizedQuery,
                    sortBy: 'name',
                    sortDirection: 'asc',
                });

                if (cancelled) {
                    return;
                }

                setResults(page.items);
                setTotalHits(page.total);
                setIsLoading(false);
            })();
        }, HOME_SEARCH_DEBOUNCE_MS);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [normalizedQuery]);

    useEffect(() => {
        return () => {
            if (blurTimeoutRef.current) {
                clearTimeout(blurTimeoutRef.current);
            }
        };
    }, []);

    const cancelPendingBlurClose = () => {
        if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current);
            blurTimeoutRef.current = null;
        }
    };

    const onShowAllPress = () => {
        if (!normalizedQuery) {
            return;
        }

        Keyboard.dismiss();
        setQuery('');
        setIsInputFocused(false);
        router.push({
            pathname: '/(tabs)/catalog',
            params: { level: 'cards', q: normalizedQuery },
        });
    };

    return (
        <View style={styles.root}>
            <Input
                value={query}
                onChange={setQuery}
                placeholder={SEARCH_COPY.placeholders.homeSearch}
                leftIconName="search"
                returnKeyType="search"
                onFocus={() => {
                    cancelPendingBlurClose();
                    setIsInputFocused(true);
                }}
                onBlur={() => {
                    blurTimeoutRef.current = setTimeout(() => {
                        setIsInputFocused(false);
                    }, 220);
                }}
                onSubmitEditing={onShowAllPress}
            />

            {shouldShowDropdown ? (
                <View style={styles.dropdown} onTouchStart={cancelPendingBlurClose}>
                    {isLoading ? (
                        <View style={styles.dropdownRow}>
                            <AppText muted>Searching...</AppText>
                        </View>
                    ) : results.length === 0 ? (
                        <View style={styles.dropdownRow}>
                            <AppText muted>No matching cards</AppText>
                        </View>
                    ) : (
                        <>
                            {results.map((card) => (
                                <Pressable
                                    key={`${card.tcg}:${card.id}:${card.language ?? ''}`}
                                    style={styles.resultRow}
                                    onPress={() => {
                                        Keyboard.dismiss();
                                        setQuery('');
                                        setIsInputFocused(false);
                                        router.push({
                                            pathname: '/tcg-card/[tcgCardId]',
                                            params: {
                                                tcgCardId: card.id,
                                                tcg: card.tcg,
                                                ...(card.language ? { language: card.language } : {}),
                                            },
                                        });
                                    }}
                                >
                                    <View style={styles.resultTextWrap}>
                                        <AppText weight="semibold" numberOfLines={1}>{card.name}</AppText>
                                        <AppText muted numberOfLines={1}>{`${card.setName ?? card.setId} · ${card.number ?? card.id}`}</AppText>
                                    </View>
                                </Pressable>
                            ))}

                            <Pressable
                                style={styles.showAllRow}
                                onPress={onShowAllPress}
                            >
                                <AppText weight="semibold">Show all ({totalHits} hits)</AppText>
                            </Pressable>
                        </>
                    )}
                </View>
            ) : null}
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
    StyleSheet.create({
        root: {
            position: 'relative',
            zIndex: 10,
        },
        dropdown: {
            position: 'absolute',
            top: 64,
            left: 0,
            right: 0,
            backgroundColor: theme.colors.surfaceAlt,
            borderWidth: theme.border.width.default,
            borderColor: theme.colors.borderSubtle,
            borderRadius: theme.radius.md,
            overflow: 'hidden',
            zIndex: 999,
            elevation: 12,
            shadowColor: '#000000',
            shadowOpacity: 0.25,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 6 },
        },
        dropdownRow: {
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.md,
        },
        resultRow: {
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.md,
            borderBottomWidth: theme.border.width.default,
            borderBottomColor: theme.colors.borderSubtle,
        },
        resultTextWrap: {
            gap: theme.spacing.xs,
        },
        showAllRow: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: theme.spacing.md,
        },
    });