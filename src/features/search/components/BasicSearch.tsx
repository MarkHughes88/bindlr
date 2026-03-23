import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";

// Import components
import { SearchInput } from "./SearchInput";

type BasicSearchProps = {
    placeholder: string;
    value?: string;
    onChange?: (text: string) => void;
    onFilterPress?: () => void;
};

export function BasicSearch({ placeholder, value, onChange, onFilterPress }: BasicSearchProps) {
    const styles = useMemo(() => createStyles(), []);

    return (
        <View style={styles.container}>
            <SearchInput placeholder={placeholder} value={value} onChange={onChange} onFilterPress={onFilterPress} />
        </View>
    );
}

const createStyles = () =>
    StyleSheet.create({
        container: {},
    });