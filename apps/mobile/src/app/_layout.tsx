import React from 'react';
import { View } from 'react-native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import { AgeGate } from '@/components/AgeGate';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/* Transparent so the all-over-print backdrop (app/+html.tsx) shows through. */}
      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
        <AppHeader />
        <Slot />
      </View>
      <AgeGate />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
