import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import type { Cocktail, Substitution } from '@tailsnconk/core';
import { SPIRIT_LABELS, ABV_LABELS, ingredientName } from '@tailsnconk/core';
import { spacing, radius, useTheme, font } from '@/constants/theme';

export function CocktailCard({
  cocktail,
  missing,
  substitutions,
  action,
}: {
  cocktail: Cocktail;
  /** Non-optional slugs the user is missing (drives the "one away" note). */
  missing?: string[];
  /** Accepted spirit swaps that make this drink possible from the current bar. */
  substitutions?: Substitution[];
  /** Optional button rendered below the card (e.g. "Add to shopping list"). */
  action?: { label: string; onPress: () => void };
}) {
  const t = useTheme();
  const required = cocktail.ingredients.filter((i) => !i.optional).length;
  return (
    // Wrapper so an action button can be a SIBLING of the link (never an
    // interactive control nested inside an anchor).
    <View style={{ marginBottom: spacing.md }}>
      <Link href={`/cocktail/${cocktail.slug}`} asChild>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${cocktail.name} — ${SPIRIT_LABELS[cocktail.spiritBase]}, ${required} ingredients`}
          style={({ pressed }) => ({
            backgroundColor: t.surface,
            borderColor: t.border,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: radius.lg,
            padding: spacing.lg,
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
          {substitutions && substitutions.length > 0 ? (
            <View style={{ marginTop: spacing.sm, backgroundColor: t.surfaceAlt, borderRadius: radius.sm, padding: spacing.sm }}>
              <Text style={{ color: t.lime, fontSize: font.size.xs, fontWeight: '700' }}>
                Make it with a swap: {substitutions.map((s) => `${ingredientName(s.use)} for ${ingredientName(s.required)}`).join(', ')}
              </Text>
            </View>
          ) : null}
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
      {action ? (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            marginTop: spacing.xs,
            borderColor: t.accent,
            borderWidth: 1,
            borderRadius: radius.pill,
            paddingVertical: spacing.xs + 1,
            paddingHorizontal: spacing.md,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ color: t.accent, fontFamily: font.family.body, fontWeight: '700', fontSize: font.size.xs }}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
