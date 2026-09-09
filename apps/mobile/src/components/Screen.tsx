import React from 'react';
import { ScrollView } from 'react-native';
import { Container } from './ui';
import { spacing } from '@/constants/theme';

export function Screen({ children }: { children: React.ReactNode }) {
  // Transparent so the all-over-print backdrop (app/+html.tsx) shows behind content.
  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'transparent' }} contentContainerStyle={{ paddingBottom: spacing.xxl * 2 }}>
      <Container>{children}</Container>
    </ScrollView>
  );
}
