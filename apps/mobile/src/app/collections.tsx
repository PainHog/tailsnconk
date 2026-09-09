import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Link } from 'expo-router';
import { COCKTAILS, indexableCollections } from '@tailsnconk/core';
import { Screen } from '@/components/Screen';
import { Seo } from '@/components/Seo';
import { AppFooter } from '@/components/AppFooter';
import { Body, Muted, SectionTitle } from '@/components/ui';
import { spacing, font, radius, useTheme } from '@/constants/theme';

export default function Collections() {
  const t = useTheme();
  const hubs = indexableCollections(COCKTAILS);
  return (
    <Screen>
      <Seo path="/collections" title="Cocktail collections" description="Curated hubs by base spirit, strength, and style." />
      <SectionTitle style={{ fontSize: font.size.xl, marginTop: spacing.md }}>Collections</SectionTitle>
      <Body style={{ color: t.textMuted, marginBottom: spacing.lg }}>Jump into a curated group of cocktails.</Body>
      {hubs.map((h) => (
        <Link key={h.slug} href={`/collection/${h.slug}`} asChild>
          <Pressable
            style={{
              backgroundColor: t.surface,
              borderColor: t.border,
              borderWidth: StyleSheet.hairlineWidth,
              borderRadius: radius.lg,
              padding: spacing.lg,
              marginBottom: spacing.md,
            }}
          >
            <Text style={{ color: t.text, fontSize: font.size.lg, fontWeight: '800' }}>{h.title}</Text>
            <Muted>{h.memberSlugs.length} cocktails</Muted>
          </Pressable>
        </Link>
      ))}
      <AppFooter />
    </Screen>
  );
}
