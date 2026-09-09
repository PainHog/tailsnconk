import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Link } from 'expo-router';
import {
  COCKTAILS,
  eligibleItems,
  almostMakeable,
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
import { ENV } from '@/lib/env';
import { spacing, useTheme, font } from '@/constants/theme';

export default function Home() {
  const t = useTheme();
  const { owned, ready, has, toggle, clear } = useOwnedBar();
  const [filters, setFilters] = useState<SpinFilters>({});

  const hasBar = owned.length > 0;
  const resultFilters = useMemo<SpinFilters>(() => ({ ...filters, owned }), [filters, owned]);

  const makeable = useMemo(() => (hasBar ? eligibleItems(COCKTAILS, resultFilters) : []), [hasBar, resultFilters]);
  const oneAway = useMemo(() => (hasBar ? almostMakeable(COCKTAILS, resultFilters).slice(0, 6) : []), [hasBar, resultFilters]);
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

      <Card style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
          <SectionTitle style={{ marginBottom: 0 }}>Your shelf</SectionTitle>
          {hasBar ? <Button variant="ghost" label="Clear" onPress={clear} /> : null}
        </View>
        {ready ? <BarChecklist has={has} toggle={toggle} /> : <Muted>Loading…</Muted>}
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

          {oneAway.length > 0 ? (
            <>
              <Divider />
              <SectionTitle>One ingredient away</SectionTitle>
              <Muted style={{ marginBottom: spacing.md }}>Grab one more bottle and these open up.</Muted>
              {oneAway.map((a) => (
                <CocktailCard key={a.cocktail.slug} cocktail={a.cocktail} missing={[a.missing]} />
              ))}
            </>
          ) : null}
        </>
      ) : (
        <Card>
          <Body>Start by checking off what you have above. Even three or four bottles is usually enough to make something.</Body>
        </Card>
      )}

      <Divider />
      <EmailCapture source="home" />
      <AppFooter />
    </Screen>
  );
}
