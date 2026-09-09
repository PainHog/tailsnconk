import React from 'react';
import { ScrollView, View } from 'react-native';
import { Link } from 'expo-router';
import { SITE_NAME } from '@tailsnconk/core';
import { spacing, useTheme, font } from '@/constants/theme';

const NAV: Array<{ href: string; label: string }> = [
  { href: '/', label: 'My Bar' },
  { href: '/spin', label: 'Spin' },
  { href: '/catalog', label: 'Catalog' },
  { href: '/collections', label: 'Collections' },
  { href: '/account', label: 'Account' },
];

export function AppHeader() {
  const t = useTheme();
  return (
    <View style={{ borderBottomColor: t.border, borderBottomWidth: 1, backgroundColor: t.surface }}>
      <View style={{ width: '100%', maxWidth: 960, marginHorizontal: 'auto', paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
        <Link href="/" style={{ color: t.accent, fontSize: font.size.lg, fontWeight: '800', marginBottom: spacing.sm }}>
          {SITE_NAME}
        </Link>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href as never} style={{ color: t.text, fontSize: font.size.sm, fontWeight: '600', marginRight: spacing.lg }}>
              {n.label}
            </Link>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
