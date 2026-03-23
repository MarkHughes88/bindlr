import React, { useMemo } from 'react';
import { StyleSheet, TextInput, View, Pressable } from 'react-native';

// Import theme
import { useAppTheme } from '@/src/theme/useAppTheme';

// Import components
import { Icon, IconName } from '@/src/shared/ui/Icon';

type InputProps = {
    value: string;
    onChange: (text: string) => void;
    placeholder?: string;
    leftIconName?: IconName;
    iconBtnName?: IconName;
    iconBtnOnPress?: () => void;
    onFocus?: () => void;
    onBlur?: () => void;
    onSubmitEditing?: () => void;
    returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send';
};

export function Input({
    value,
    onChange,
    placeholder,
    leftIconName,
    iconBtnName,
    iconBtnOnPress,
    onFocus,
    onBlur,
    onSubmitEditing,
    returnKeyType,
}: InputProps) {
    const theme = useAppTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const hasValue = value.length > 0;

    return (
        <View style={styles.container}>
            {leftIconName && <Icon iconName={leftIconName} />}

            <TextInput
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.textMuted}
                style={styles.input}
                onFocus={onFocus}
                onBlur={onBlur}
                onSubmitEditing={onSubmitEditing}
                returnKeyType={returnKeyType}
            />

            {iconBtnName && iconBtnOnPress && (
                <Pressable onPress={iconBtnOnPress}>
                    <Icon iconName={iconBtnName} />
                </Pressable>
            )}

            {hasValue && (
                <Pressable onPress={() => onChange('')}>
                    <Icon iconName="x" color={theme.colors.textMuted} />
                </Pressable>
            )}
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
    StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',

            backgroundColor: theme.colors.surfaceAlt,
            borderRadius: theme.radius.md,
            borderWidth: theme.border.width.default,
            borderColor: theme.colors.borderSubtle,

            padding: theme.spacing.md,
            gap: theme.spacing.md,
        },
        input: {
            flex: 1,
            color: theme.colors.text,
        },
    });