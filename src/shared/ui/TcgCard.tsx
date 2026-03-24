import React, { useEffect, useMemo, useState } from "react";
import {
	StyleSheet,
	Image,
	View,
	type ImageSourcePropType,
} from "react-native";

// Import theme
import { useAppTheme } from "@/src/theme/useAppTheme";
import { useUserSettingsState } from "@/src/features/settings/settings.store";

// Import components
import { AppText } from "@/src/shared/ui/AppText";

// Import config
import { TCG_CARD_ASPECT_RATIO } from "@/src/shared/config/tcg";

// Import components
import { Card } from "./Card"; // Updated import to avoid require cycle

export type TcgCardItem = {
	id: string;
	title: string;
	imageSource?: ImageSourcePropType;
};

type TcgCardProps = {
	tcgCard: TcgCardItem;
	resizeMode?: "cover" | "contain" | "stretch" | "center";
	borderRadius?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
};

export function TcgCard({
	tcgCard,
	resizeMode = "cover",
	borderRadius = 'none'
}: TcgCardProps) {
	const theme = useAppTheme();
	const { preferences } = useUserSettingsState();
	const styles = useMemo(() => createStyles(theme), [theme]);
	const [hasImageError, setHasImageError] = useState(false);

	useEffect(() => {
		setHasImageError(false);
	}, [tcgCard.imageSource]);

	const imageUri = isUriSource(tcgCard.imageSource) ? tcgCard.imageSource.uri : undefined;
	const shouldBlockForOffline = Boolean(preferences.forceOfflineMode && imageUri && /^https?:\/\//i.test(imageUri));
	const shouldShowFallback = !tcgCard.imageSource || hasImageError || shouldBlockForOffline;

	return (
		<Card padding="none" borderRadius={borderRadius}>
			<View style={styles.imageContainer}>
				{!shouldShowFallback ? (
					<Image
						source={tcgCard.imageSource}
						style={styles.image}
						resizeMode={resizeMode}
						onError={() => setHasImageError(true)}
					/>
				) : (
					<View style={styles.imageFallback}>
						<AppText muted style={styles.imageFallbackText}>No image</AppText>
					</View>
				)}
			</View>

		</Card>
	);
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
	StyleSheet.create({
		imageContainer: {
			width: "100%",
			aspectRatio: TCG_CARD_ASPECT_RATIO,
			overflow: "hidden",
		},
		image: {
			width: "100%",
			height: "100%",
		},
		imageFallback: {
			width: "100%",
			height: "100%",
			backgroundColor: theme.colors.surfaceAlt,
			alignItems: 'center',
			justifyContent: 'center',
			borderWidth: theme.border.width.default,
			borderColor: theme.colors.borderSubtle,
		},
		imageFallbackText: {
			fontSize: theme.fontSize.sm,
		},
	});

function isUriSource(source?: ImageSourcePropType): source is { uri: string } {
	return Boolean(source && typeof source === 'object' && 'uri' in source && typeof source.uri === 'string');
}