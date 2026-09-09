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
  syrup: 'Syrups & sweeteners',
  mixer: 'Mixers',
  other: 'Other',
  garnish: 'Garnishes',
};

/** The PRIMARY tool's input: a compact, modern accordion — open a category and
 *  tap to add. Search filters across everything; owned items also show as
 *  removable tokens up top. */
export function BarChecklist({
  has,
  toggle,
  owned,
}: {
  has: (slug: string) => boolean;
  toggle: (slug: string) => void;
  owned: string[];
}) {
  const t = useTheme();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Set<IngredientType>>(new Set());
  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  const ownedSet = useMemo(() => new Set(owned), [owned]);

  const groups = useMemo(
    () =>
      TYPE_ORDER.map((ty) => ({
        ty,
        items: INGREDIENTS.filter((i) => i.type === ty).sort((a, b) => a.name.localeCompare(b.name)),
      })).filter((g) => g.items.length > 0),
    [],
  );

  const matches = useMemo(
    () => (searching ? INGREDIENTS.filter((i) => i.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name)) : []),
    [searching, q],
  );

  const selected = useMemo(() => INGREDIENTS.filter((i) => ownedSet.has(i.slug)).sort((a, b) => a.name.localeCompare(b.name)), [ownedSet]);

  const toggleSection = (ty: IngredientType) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(ty) ? next.delete(ty) : next.add(ty);
      return next;
    });

  const AddChip = ({ ing }: { ing: Ingredient }) => {
    const on = has(ing.slug);
    return (
      <Pressable
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
        <Text style={{ color: on ? t.accentText : t.textMuted, fontWeight: '700', marginRight: 6, fontSize: font.size.sm }}>{on ? '✓' : '+'}</Text>
        <Text style={{ color: on ? t.accentText : t.text, fontFamily: font.family.body, fontSize: font.size.sm }}>{ing.name}</Text>
      </Pressable>
    );
  };

  return (
    <View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search your ingredients…"
        placeholderTextColor={t.textMuted}
        style={{
          backgroundColor: t.surfaceAlt,
          borderColor: t.border,
          borderWidth: 1,
          borderRadius: radius.md,
          color: t.text,
          fontFamily: font.family.body,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md - 2,
          marginBottom: spacing.md,
        }}
      />

      {/* Selected tokens — quick view + one-tap removal, no need to open a section. */}
      {selected.length > 0 && !searching ? (
        <View style={{ marginBottom: spacing.md }}>
          <Muted style={{ marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 1, fontSize: font.size.xs }}>
            In your bar · {selected.length}
          </Muted>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {selected.map((ing) => (
              <Pressable
                key={ing.slug}
                onPress={() => toggle(ing.slug)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'transparent',
                  borderColor: t.accent,
                  borderWidth: 1,
                  borderRadius: radius.pill,
                  paddingVertical: spacing.xs + 1,
                  paddingHorizontal: spacing.md,
                  marginRight: spacing.sm,
                  marginBottom: spacing.sm,
                }}
              >
                <Text style={{ color: t.accent, fontFamily: font.family.body, fontSize: font.size.sm }}>{ing.name}</Text>
                <Text style={{ color: t.accent, marginLeft: 6, fontWeight: '700' }}>×</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {searching ? (
        // Flat, filtered results across every category.
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {matches.length === 0 ? <Muted>No ingredients match “{query}”.</Muted> : matches.map((ing) => <AddChip key={ing.slug} ing={ing} />)}
        </View>
      ) : (
        // Collapsed category dropdowns.
        <View style={{ borderTopColor: t.border, borderTopWidth: 1 }}>
          {groups.map(({ ty, items }) => {
            const count = items.filter((i) => ownedSet.has(i.slug)).length;
            const isOpen = open.has(ty);
            return (
              <View key={ty} style={{ borderBottomColor: t.border, borderBottomWidth: 1 }}>
                <Pressable
                  onPress={() => toggleSection(ty)}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: t.text, fontFamily: font.family.body, fontWeight: '600', fontSize: font.size.md }}>{TYPE_LABEL[ty]}</Text>
                    {count > 0 ? (
                      <View style={{ backgroundColor: t.accent, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 1, marginLeft: spacing.sm }}>
                        <Text style={{ color: t.accentText, fontSize: font.size.xs, fontWeight: '800' }}>{count}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ color: t.textMuted, fontSize: font.size.md, transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}>›</Text>
                </Pressable>
                {isOpen ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingBottom: spacing.md }}>
                    {items.map((ing) => (
                      <AddChip key={ing.slug} ing={ing} />
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
