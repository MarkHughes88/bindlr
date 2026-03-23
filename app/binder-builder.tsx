import { useLocalSearchParams } from 'expo-router';

import { BinderBuilderScreen } from '@/src/features/binders/screens/BinderBuilderScreen';

export default function BinderBuilderRoute() {
	const params = useLocalSearchParams<{ binderId?: string }>();

	return <BinderBuilderScreen binderId={typeof params.binderId === 'string' ? params.binderId : undefined} />;
}
