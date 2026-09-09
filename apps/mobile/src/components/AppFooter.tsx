import React from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { SITE_NAME } from '@tailsnconk/core';
import { Divider } from './ui';
import { spacing, useTheme, font } from '@/constants/theme';

const LINKS: Array<{ href: string; label: string }> = [
  { href: '/about', label: 'About' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];

export function AppFooter() {
  const t = useTheme();
  return (
    <View style={{ marginTop: spacing.xl }}>
      <Divider />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href as never} style={{ color: t.textMuted, fontSize: font.size.sm, marginRight: spacing.lg }}>
            {l.label}
          </Link>
        ))}
      </View>
      <Text style={{ color: t.textMuted, fontSize: font.size.xs, marginTop: spacing.md }}>
        © {new Date().getFullYear()} {SITE_NAME}. Please drink responsibly. You must be of legal drinking age.
      </Text>
    </View>
  );
}
