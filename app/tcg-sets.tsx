import { Redirect, useLocalSearchParams } from 'expo-router';

export default function TcgSetsRoute() {
	const { tcg } = useLocalSearchParams<{ tcg?: string }>();
	const tcgQuery = tcg ? `&tcg=${tcg}` : '';
	return <Redirect href={`/(tabs)/catalog?level=sets${tcgQuery}`} />;
}
