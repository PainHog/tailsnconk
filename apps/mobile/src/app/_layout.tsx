import React from 'react';
import { View } from 'react-native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import { useTheme } from '@/constants/theme';

export default function RootLayout() {
  const t = useTheme();
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <AppHeader />
        <Slot />
      </View>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
