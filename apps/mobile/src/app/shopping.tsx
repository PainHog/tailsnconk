import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import {
  COCKTAILS,
  topUnlocks,
  ingredientFrequency,
  ingredientName,
  makeableAfterShopping,
  eligibleItems,
} from '@tailsnconk/core';
import { Screen } from '@/components/Screen';
import { Seo } from '@/components/Seo';
import { AppFooter } from '@/components/AppFooter';
import { Body, Card, Divider, Muted, Row, SectionTitle } from '@/components/ui';
import { useOwnedBar } from '@/hooks/useOwnedBar';
import { useShoppingList } from '@/hooks/useShoppingList';
import { radius, spacing, useTheme, font } from '@/constants/theme';

export default function Shopping() {
  const t = useTheme();
  const bar = useOwnedBar();
  const shop = useShoppingList();

  const makeNow = useMemo(
    () => (bar.owned.length ? eligibleItems(COCKTAILS, { owned: bar.owned }).length : 0),
    [bar.owned],
  );
  const makeAfter = useMemo(
    () => makeableAfterShopping(COCKTAILS, bar.owned, shop.list),
    [bar.owned, shop.list],
  );

  // Best next bottles: sole-missing unlocks, else frequency for an empty shelf.
  const unlocks = useMemo(() => topUnlocks(COCKTAILS, bar.owned, 10), [bar.owned]);
  const starters = useMemo(
    () => (unlocks.length === 0 ? ingredientFrequency(COCKTAILS, bar.owned).slice(0, 10) : []),
    [unlocks.length, bar.owned],
  );

  const markOwned = (slug: string) => {
    if (!bar.has(slug)) bar.toggle(slug);
    shop.remove(slug);
  };

  const SmallBtn = ({ label, onPress, filled }: { label: string; onPress: () => void; filled?: boolean }) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        backgroundColor: filled ? t.accent : 'transparent',
        borderColor: t.accent,
        borderWidth: 1,
        borderRadius: radius.pill,
        paddingVertical: spacing.xs + 1,
        paddingHorizontal: spacing.md,
        marginLeft: spacing.sm,
      }}
    >
      <Text style={{ color: filled ? t.accentText : t.accent, fontFamily: font.family.body, fontWeight: '700', fontSize: font.size.xs }}>{label}</Text>
    </Pressable>
  );

  const SuggestRow = ({ slug, subtitle }: { slug: string; subtitle: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomColor: t.border, borderBottomWidth: 1 }}>
      <View style={{ flex: 1, paddingRight: spacing.sm }}>
        <Text style={{ color: t.text, fontFamily: font.family.body, fontSize: font.size.md, fontWeight: '600' }}>{ingredientName(slug)}</Text>
        <Muted style={{ fontSize: font.size.xs, marginTop: 1 }}>{subtitle}</Muted>
      </View>
      <Row>
        <SmallBtn label={shop.has(slug) ? 'On list ✓' : '+ List'} onPress={() => shop.toggle(slug)} filled={shop.has(slug)} />
        <SmallBtn label="I have it" onPress={() => markOwned(slug)} />
      </Row>
    </View>
  );

  return (
    <Screen>
      <Seo path="/shopping" title="Shopping list" noindex />
      <SectionTitle style={{ fontSize: font.size.xl, marginTop: spacing.md }}>Shopping list</SectionTitle>
      <Body style={{ color: t.textMuted, marginBottom: spacing.lg }}>
        The smartest bottles to buy next — ranked by how many new cocktails each one unlocks with what’s already on your shelf.
      </Body>

      <Card style={{ marginBottom: spacing.lg }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: t.accent, fontFamily: font.family.display, fontSize: font.size.xl, fontWeight: '900' }}>{makeNow}</Text>
            <Muted>you can make now</Muted>
          </View>
          <View>
            <Text style={{ color: t.text, fontFamily: font.family.display, fontSize: font.size.xl, fontWeight: '900' }}>{makeAfter}</Text>
            <Muted>after your list</Muted>
          </View>
          <View>
            <Text style={{ color: t.text, fontFamily: font.family.display, fontSize: font.size.xl, fontWeight: '900' }}>{shop.list.length}</Text>
            <Muted>on your list</Muted>
          </View>
        </Row>
      </Card>

      <SectionTitle>{unlocks.length ? 'Buy next — biggest unlocks' : 'Great bottles to start with'}</SectionTitle>
      <Card style={{ marginBottom: spacing.lg }}>
        {unlocks.length ? (
          unlocks.map((u) => (
            <SuggestRow key={u.ingredientSlug} slug={u.ingredientSlug} subtitle={`unlocks ${u.unlocks} cocktail${u.unlocks === 1 ? '' : 's'}`} />
          ))
        ) : starters.length ? (
          starters.map((f) => <SuggestRow key={f.ingredientSlug} slug={f.ingredientSlug} subtitle={`used in ${f.count} cocktails`} />)
        ) : (
          <Muted>Add a few bottles to your bar and we’ll show what unlocks the most next.</Muted>
        )}
      </Card>

      <SectionTitle>Your list {shop.list.length ? `· ${shop.list.length}` : ''}</SectionTitle>
      <Card>
        {shop.list.length === 0 ? (
          <Muted>Nothing here yet. Tap “+ List” on a suggestion above, or add a missing ingredient from any cocktail.</Muted>
        ) : (
          shop.list
            .slice()
            .sort((a, b) => ingredientName(a).localeCompare(ingredientName(b)))
            .map((slug) => (
              <View key={slug} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomColor: t.border, borderBottomWidth: 1 }}>
                <Text style={{ color: t.text, fontFamily: font.family.body, fontSize: font.size.md }}>{ingredientName(slug)}</Text>
                <Row>
                  <SmallBtn label="Got it" onPress={() => markOwned(slug)} filled />
                  <SmallBtn label="Remove" onPress={() => shop.remove(slug)} />
                </Row>
              </View>
            ))
        )}
      </Card>

      <Divider />
      <Muted>
        Your bar and list are saved on this device.{' '}
        <Link href="/" style={{ color: t.accent }}>Edit your bar →</Link>
      </Muted>
      <AppFooter />
    </Screen>
  );
}
