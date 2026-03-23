import { View } from "react-native";

// Import theme
import { useAppTheme } from "@/src/theme/useAppTheme";

export function Divider() {
    const theme = useAppTheme();

    return (
        <View style={{
            height: 1,
            backgroundColor: theme.colors.border,
            width: '100%',
            marginVertical: theme.spacing.lg,
        }} />
    );
}