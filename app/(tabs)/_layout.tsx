import { Tabs } from 'expo-router';

export default function TabsLayout() {
	return (
		<Tabs
			tabBar={() => null}
			screenOptions={{
				headerShown: false,
				sceneStyle: {
					backgroundColor: 'transparent',
				},
			}}
		>
			<Tabs.Screen name="index" options={{ title: 'Home' }} />
			<Tabs.Screen name="catalog" options={{ title: 'Catalog', href: null }} />
			<Tabs.Screen name="tcgs" options={{ title: 'TCGs' }} />
			<Tabs.Screen name="binders" options={{ title: 'Binders' }} />
			<Tabs.Screen name="cards" options={{ title: 'Cards' }} />
			<Tabs.Screen name="search" options={{ title: 'Search' }} />
			<Tabs.Screen name="settings" options={{ title: 'Settings' }} />
		</Tabs>
	);
}
