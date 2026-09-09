import React, { useState } from 'react';
import { View } from 'react-native';
import { Link } from 'expo-router';
import {
  COCKTAILS,
  trySpin,
  rememberBase,
  eligibleItems,
  type SpinFilters,
  type SpiritBase,
  type SpinResult,
} from '@tailsnconk/core';
import { Screen } from '@/components/Screen';
import { Seo } from '@/components/Seo';
import { AppFooter } from '@/components/AppFooter';
import { FacetBar } from '@/components/FacetBar';
import { CocktailCard } from '@/components/CocktailCard';
import { AdSlot } from '@/components/AdSlot';
import { Body, Button, Card, Chip, Muted, SectionTitle } from '@/components/ui';
import { useOwnedBar } from '@/hooks/useOwnedBar';
import { spacing, font, useTheme } from '@/constants/theme';

export default function Spin() {
  const t = useTheme();
  const { owned } = useOwnedBar();
  const [filters, setFilters] = useState<SpinFilters>({});
  const [useMyBar, setUseMyBar] = useState(true);
  const [history, setHistory] = useState<SpiritBase[]>([]);
  const [result, setResult] = useState<SpinResult | undefined>(undefined);
  const [spun, setSpun] = useState(false);

  const effective: SpinFilters = { ...filters, owned: useMyBar ? owned : undefined };
  const poolSize = eligibleItems(COCKTAILS, effective).length;

  const doSpin = () => {
    const r = trySpin(COCKTAILS, effective, Math.random, history);
    setResult(r);
    setSpun(true);
    if (r) setHistory((h) => rememberBase(h, r.spiritBase));
  };

  return (
    <Screen>
      <Seo path="/spin" title="Spin a random cocktail" description="One tap, one cocktail you can actually make." />

      <SectionTitle style={{ fontSize: font.size.xl, marginTop: spacing.md }}>Spin me a cocktail</SectionTitle>
      <Body style={{ color: t.textMuted, marginBottom: spacing.lg }}>
        One random pick from what you can make right now. Not feeling it? Spin again.
      </Body>

      <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
        <Chip label="From my bar" active={useMyBar} onPress={() => setUseMyBar(true)} />
        <Chip label="From everything" active={!useMyBar} onPress={() => setUseMyBar(false)} />
      </View>

      <FacetBar filters={filters} onChange={setFilters} />

      <Muted style={{ marginBottom: spacing.sm }}>
        {useMyBar ? `${poolSize} in reach with your current bar` : `${poolSize} in the catalog`}
      </Muted>
      <Button label="🎲 Spin" onPress={doSpin} style={{ marginBottom: spacing.lg }} />

      {spun && result ? (
        <>
          <SectionTitle>Tonight you’re making…</SectionTitle>
          <CocktailCard cocktail={result.cocktail} />
          <Button variant="ghost" label="Spin again" onPress={doSpin} />
        </>
      ) : null}

      {spun && !result ? (
        <Card>
          <Body>
            Nothing matches those filters{useMyBar ? ' with your current bar' : ''}. Try “From everything”, loosen a
            filter, or{' '}
            <Link href="/" asChild>
              <Body style={{ color: t.accent }}>add a few ingredients</Body>
            </Link>
            .
          </Body>
        </Card>
      ) : null}

      <AdSlot placement="in-feed" />
      <AppFooter />
    </Screen>
  );
}
