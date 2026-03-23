import React, { useState } from 'react';
import { View } from 'react-native';

// Import components
import { Input } from '@/src/shared/ui/Input';

type SearchInputProps = {
    placeholder: string;
    value?: string;
    onChange?: (text: string) => void;
    onFilterPress?: () => void;
};

export function SearchInput({ placeholder, value, onChange, onFilterPress }: SearchInputProps) {
    const [internalValue, setInternalValue] = useState('');
    const searchValue = value ?? internalValue;
    const handleChange = onChange ?? setInternalValue;

    return (
        <View>
            <Input
                value={searchValue}
                onChange={handleChange}
                placeholder={placeholder}
                leftIconName="search"
                iconBtnName="slidersHorizontal"
                iconBtnOnPress={onFilterPress}
            />
        </View>
    )
}