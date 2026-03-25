// LEGACY REDIRECT ROUTE: This file exists only to redirect to the canonical catalog route for TCGs. Remove when all usages are migrated.
import { Redirect } from 'expo-router';

export default function TcgsTabRoute() {
	return <Redirect href="/(tabs)/catalog?level=tcgs" />;
}
