import React from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { useEffect, useState } from "react";
import { View, useColorScheme } from "react-native";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Outfit_400Regular, Outfit_600SemiBold, Outfit_700Bold } from "@expo-google-fonts/outfit";
import { initDatabase } from "@/src/lib/db";
import { theme } from "@/src/theme";
import { GlobalBottomNav } from "@/src/shared/ui/GlobalBottomNav";
import { TopBannerProvider } from "@/src/shared/ui";
import { useDownloadsQueueCoordinator } from "@/src/features/downloads/downloads.coordinator";
import { lockPortrait } from '@/src/lib/orientation';
import { useFocusEffect } from 'expo-router';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const appTheme = colorScheme === "light" ? theme.light : theme.dark;

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });
  const [dbReady, setDbReady] = useState(false);

  useDownloadsQueueCoordinator({ enabled: dbReady });

  useEffect(() => {
    let isMounted = true;

    void initDatabase()
      .then(() => {
        if (isMounted) {
          setDbReady(true);
        }
      })
      .catch((error) => {
        console.error("Failed to initialize local database", error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    lockPortrait();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      lockPortrait();
    }, [])
  );

  if (!fontsLoaded || !dbReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TopBannerProvider>
        <View style={{ flex: 1, backgroundColor: appTheme.colors.background }}>
          <Stack
            screenOptions={{
              headerShown: false,
              gestureEnabled: true,
              fullScreenGestureEnabled: true,
              animation: 'slide_from_right',
              contentStyle: {
                backgroundColor: 'transparent',
              },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
            <Stack.Screen name="tcg-sets" options={{ fullScreenGestureEnabled: true }} />
            <Stack.Screen name="card-list" options={{ fullScreenGestureEnabled: true }} />
            <Stack.Screen name="tcg-card/[tcgCardId]" options={{ fullScreenGestureEnabled: true }} />
            <Stack.Screen name="binder-builder" options={{ fullScreenGestureEnabled: true }} />
          </Stack>
          <GlobalBottomNav />
        </View>
      </TopBannerProvider>
    </GestureHandlerRootView>
  );
}