import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import {
  COCKTAILS,
  eligibleItems,
  almostMakeable,
  eligibleWithSubstitutions,
  eligibleSpiritBases,
  eligibleAbvBands,
  organizationJsonLd,
  SITE_DESCRIPTION,
  type AbvBand,
  type SpinFilters,
} from '@tailsnconk/core';
import { Screen } from '@/components/Screen';
import { Seo } from '@/components/Seo';
import { AppFooter } from '@/components/AppFooter';
import { BarChecklist } from '@/components/BarChecklist';
import { FacetBar } from '@/components/FacetBar';
import { CocktailCard } from '@/components/CocktailCard';
import { AdSlot } from '@/components/AdSlot';
import { EmailCapture } from '@/components/EmailCapture';
import { Body, Button, Card, Divider, Muted, SectionTitle } from '@/components/ui';
import { useOwnedBar } from '@/hooks/useOwnedBar';
import { useShoppingList } from '@/hooks/useShoppingList';
import { ENV } from '@/lib/env';
import { spacing, useTheme, font } from '@/constants/theme';

/** A sensible first shelf — the bottles that unlock the most classics. */
const STARTER_BAR = [
  'vodka', 'gin', 'white-rum', 'bourbon', 'tequila-blanco',
  'sweet-vermouth', 'dry-vermouth', 'orange-liqueur', 'angostura-bitters',
  'lime-juice', 'lemon-juice', 'simple-syrup', 'soda-water',
];

export default function Home() {
  const t = useTheme();
  const { owned, ready, has, toggle, clear, addMany } = useOwnedBar();
  const shop = useShoppingList();
  const [filters, setFilters] = useState<SpinFilters>({});

  const hasBar = owned.length > 0;
  const resultFilters = useMemo<SpinFilters>(() => ({ ...filters, owned }), [filters, owned]);

  const makeable = useMemo(() => (hasBar ? eligibleItems(COCKTAILS, resultFilters) : []), [hasBar, resultFilters]);
  const withSwap = useMemo(() => (hasBar ? eligibleWithSubstitutions(COCKTAILS, resultFilters) : []), [hasBar, resultFilters]);
  const swapSlugs = useMemo(() => new Set(withSwap.map((m) => m.cocktail.slug)), [withSwap]);
  // "One away" = truly missing one buyable ingredient — exclude drinks already
  // makeable via a swap (their "missing" spirit is one you can substitute).
  const oneAwayAll = useMemo(
    () => (hasBar ? almostMakeable(COCKTAILS, resultFilters).filter((a) => !swapSlugs.has(a.cocktail.slug)) : []),
    [hasBar, resultFilters, swapSlugs],
  );
  const oneAway = oneAwayAll.slice(0, 6);
  const availableBases = useMemo(() => (hasBar ? eligibleSpiritBases(COCKTAILS, { owned }) : undefined), [hasBar, owned]);
  const availableBands = useMemo(
    () => (hasBar ? (eligibleAbvBands(COCKTAILS, { owned }) as AbvBand[]) : undefined),
    [hasBar, owned],
  );

  return (
    <Screen>
      <Seo path="/" title="What's in your bar?" description={SITE_DESCRIPTION} jsonLd={[organizationJsonLd(ENV.siteUrl)]} />

      <SectionTitle style={{ fontSize: font.size.xxl, marginTop: spacing.md }}>What's in your bar?</SectionTitle>
      <Body style={{ color: t.textMuted, marginBottom: spacing.lg }}>
        Check off the bottles and mixers you own — see every cocktail you can make right now.
      </Body>

      {hasBar ? (
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: t.accent, fontFamily: font.family.display, fontSize: font.size.xl, fontWeight: '900' }}>{makeable.length}</Text>
              <Muted>you can make</Muted>
            </View>
            <View>
              <Text style={{ color: t.lime, fontFamily: font.family.display, fontSize: font.size.xl, fontWeight: '900' }}>{withSwap.length}</Text>
              <Muted>with a swap</Muted>
            </View>
            <View>
              <Text style={{ color: t.text, fontFamily: font.family.display, fontSize: font.size.xl, fontWeight: '900' }}>{oneAwayAll.length}</Text>
              <Muted>one away</Muted>
            </View>
            <View>
              <Text style={{ color: t.text, fontFamily: font.family.display, fontSize: font.size.xl, fontWeight: '900' }}>{owned.length}</Text>
              <Muted>on your shelf</Muted>
            </View>
            <Link href="/shopping" asChild>
              <Button variant="ghost" label="Shopping →" />
            </Link>
          </View>
        </Card>
      ) : null}

      <Card style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
          <SectionTitle style={{ marginBottom: 0 }}>Your shelf</SectionTitle>
          {hasBar ? <Button variant="ghost" label="Clear" onPress={clear} /> : null}
        </View>
        {ready ? <BarChecklist has={has} toggle={toggle} owned={owned} /> : <Muted>Loading…</Muted>}
      </Card>

      {hasBar ? (
        <>
          <FacetBar filters={filters} onChange={setFilters} availableBases={availableBases} availableBands={availableBands} />

          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.md }}>
            <SectionTitle style={{ marginBottom: 0 }}>
              You can make {makeable.length} {makeable.length === 1 ? 'cocktail' : 'cocktails'}
            </SectionTitle>
            <Link href="/spin" asChild>
              <Button variant="ghost" label="Spin one →" />
            </Link>
          </View>

          {makeable.length === 0 ? (
            <Card>
              <Body>Nothing matches yet with those filters. Try clearing a filter or adding a few more staples (a base spirit, citrus, and a sweetener unlock a lot).</Body>
            </Card>
          ) : (
            makeable.map((c) => <CocktailCard key={c.slug} cocktail={c} />)
          )}

          <AdSlot placement="in-feed" />

          {withSwap.length > 0 ? (
            <>
              <Divider />
              <SectionTitle>Make it with a swap</SectionTitle>
              <Muted style={{ marginBottom: spacing.md }}>
                You have a stand-in for a called-for spirit — bartenders do this all the time.
              </Muted>
              {withSwap.map((m) => (
                <CocktailCard key={m.cocktail.slug} cocktail={m.cocktail} substitutions={m.substitutions} />
              ))}
            </>
          ) : null}

          {oneAway.length > 0 ? (
            <>
              <Divider />
              <SectionTitle>One ingredient away</SectionTitle>
              <Muted style={{ marginBottom: spacing.md }}>Grab one more bottle and these open up.</Muted>
              {oneAway.map((a) => (
                <CocktailCard
                  key={a.cocktail.slug}
                  cocktail={a.cocktail}
                  missing={[a.missing]}
                  action={
                    shop.has(a.missing)
                      ? { label: '✓ On your list', onPress: () => shop.remove(a.missing) }
                      : { label: '+ Add to shopping list', onPress: () => shop.addMany([a.missing]) }
                  }
                />
              ))}
            </>
          ) : null}
        </>
      ) : (
        <Card>
          <Body style={{ marginBottom: spacing.md }}>Start by checking off what you have above. Even three or four bottles is usually enough to make something.</Body>
          <Button label="Add a starter bar" onPress={() => addMany(STARTER_BAR)} />
          <Muted style={{ marginTop: spacing.sm }}>Adds the common bottles that unlock the most classics — edit anytime.</Muted>
        </Card>
      )}

      <Divider />
      <EmailCapture source="home" />
      <AppFooter />
    </Screen>
  );
}
