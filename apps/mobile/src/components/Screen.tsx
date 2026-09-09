import React from 'react';
import { ScrollView } from 'react-native';
import { Container } from './ui';
import { spacing, useTheme } from '@/constants/theme';

export function Screen({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingBottom: spacing.xxl * 2 }}>
      <Container>{children}</Container>
    </ScrollView>
  );
}
