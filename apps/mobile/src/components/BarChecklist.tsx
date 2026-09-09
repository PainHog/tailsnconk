import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { INGREDIENTS, type Ingredient, type IngredientType } from '@tailsnconk/core';
import { Muted } from './ui';
import { radius, spacing, useTheme, font } from '@/constants/theme';

const TYPE_ORDER: IngredientType[] = ['spirit', 'liqueur', 'wine', 'bitters', 'juice', 'syrup', 'mixer', 'other', 'garnish'];
const TYPE_LABEL: Record<IngredientType, string> = {
  spirit: 'Spirits',
  liqueur: 'Liqueurs',
  wine: 'Wine & fortified',
  bitters: 'Bitters',
  juice: 'Juices',
  syrup: 'Syrups',
  mixer: 'Mixers',
  other: 'Other',
  garnish: 'Garnishes',
};

/** The PRIMARY tool's input: check off the bottles/ingredients you own. */
export function BarChecklist({ has, toggle }: { has: (slug: string) => boolean; toggle: (slug: string) => void }) {
  const t = useTheme();
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<IngredientType, Ingredient[]>();
    for (const ing of INGREDIENTS) {
      if (q && !ing.name.toLowerCase().includes(q)) continue;
      if (!map.has(ing.type)) map.set(ing.type, []);
      map.get(ing.type)!.push(ing);
    }
    return TYPE_ORDER.filter((ty) => map.has(ty)).map((ty) => ({ type: ty, items: map.get(ty)!.sort((a, b) => a.name.localeCompare(b.name)) }));
  }, [query]);

  return (
    <View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search ingredients…"
        placeholderTextColor={t.textMuted}
        style={{
          backgroundColor: t.surface,
          borderColor: t.border,
          borderWidth: 1,
          borderRadius: radius.md,
          color: t.text,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          marginBottom: spacing.md,
        }}
      />
      {grouped.map(({ type, items }) => (
        <View key={type} style={{ marginBottom: spacing.lg }}>
          <Muted style={{ marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 1 }}>{TYPE_LABEL[type]}</Muted>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {items.map((ing) => {
              const on = has(ing.slug);
              return (
                <Pressable
                  key={ing.slug}
                  onPress={() => toggle(ing.slug)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: on ? t.accent : t.surfaceAlt,
                    borderColor: on ? t.accent : t.border,
                    borderWidth: 1,
                    borderRadius: radius.pill,
                    paddingVertical: spacing.xs + 2,
                    paddingHorizontal: spacing.md,
                    marginRight: spacing.sm,
                    marginBottom: spacing.sm,
                  }}
                >
                  <Text style={{ color: on ? t.accentText : t.text, fontWeight: '700', marginRight: 6 }}>{on ? '✓' : '+'}</Text>
                  <Text style={{ color: on ? t.accentText : t.text, fontSize: font.size.sm }}>{ing.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
