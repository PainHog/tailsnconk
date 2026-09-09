import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import type { Cocktail } from '@tailsnconk/core';
import { SPIRIT_LABELS, ABV_LABELS, ingredientName } from '@tailsnconk/core';
import { spacing, radius, useTheme, font } from '@/constants/theme';

export function CocktailCard({ cocktail, missing }: { cocktail: Cocktail; missing?: string[] }) {
  const t = useTheme();
  const required = cocktail.ingredients.filter((i) => !i.optional).length;
  return (
    <Link href={`/cocktail/${cocktail.slug}`} asChild>
      <Pressable
        style={({ pressed }) => ({
          backgroundColor: t.surface,
          borderColor: t.border,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: radius.lg,
          padding: spacing.lg,
          marginBottom: spacing.md,
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <Text style={{ color: t.text, fontFamily: font.family.display, fontSize: font.size.lg, fontWeight: '600', letterSpacing: -0.2 }}>{cocktail.name}</Text>
        <Text style={{ color: t.textMuted, fontFamily: font.family.body, fontSize: font.size.sm, marginTop: 3 }}>
          {SPIRIT_LABELS[cocktail.spiritBase]} · {ABV_LABELS[cocktail.abvBand]} · {required} ingredients
        </Text>
        <Text numberOfLines={2} style={{ color: t.text, fontSize: font.size.sm, marginTop: spacing.sm, lineHeight: 20 }}>
          {cocktail.description}
        </Text>
        {missing && missing.length > 0 ? (
          <View style={{ marginTop: spacing.sm, backgroundColor: t.surfaceAlt, borderRadius: radius.sm, padding: spacing.sm }}>
            <Text style={{ color: t.amber, fontSize: font.size.xs, fontWeight: '700' }}>
              One away: add {missing.map(ingredientName).join(', ')}
            </Text>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm }}>
          {cocktail.tags.slice(0, 3).map((tag) => (
            <View
              key={tag}
              style={{ backgroundColor: t.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2, marginRight: spacing.xs }}
            >
              <Text style={{ color: t.textMuted, fontSize: font.size.xs }}>{tag}</Text>
            </View>
          ))}
        </View>
      </Pressable>
    </Link>
  );
}
