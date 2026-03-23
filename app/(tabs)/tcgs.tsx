import { Redirect } from 'expo-router';

export default function TcgsTabRoute() {
	return <Redirect href="/(tabs)/catalog?level=tcgs" />;
}
