import { useRouter } from "expo-router";

// Import components
import { Button } from "@/src/shared/ui/Button";
import { APP_ICON_NAMES } from '@/src/shared/ui/Icon';

type BackButtonProps = {
	onPress?: () => void;
};

export function BackButton({ onPress }: BackButtonProps) {
	const router = useRouter();

	return (
		<Button
			type="tertiary"
			iconName={APP_ICON_NAMES.back}
			text="Back"
			onPress={onPress ?? (() => router.back())}
		/>
	);
}
