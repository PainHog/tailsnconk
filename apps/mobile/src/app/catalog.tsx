import React, { useMemo, useState } from 'react';
import { COCKTAILS, eligibleItems, type SpinFilters } from '@tailsnconk/core';
import { Screen } from '@/components/Screen';
import { Seo } from '@/components/Seo';
import { AppFooter } from '@/components/AppFooter';
import { FacetBar } from '@/components/FacetBar';
import { CocktailCard } from '@/components/CocktailCard';
import { AdSlot } from '@/components/AdSlot';
import { Body, Muted, SectionTitle } from '@/components/ui';
import { spacing, font, useTheme } from '@/constants/theme';

export default function Catalog() {
  const t = useTheme();
  const [filters, setFilters] = useState<SpinFilters>({});
  // Browse mode: no `owned`, so availability is ignored and every cocktail
  // matching the facets is listed (fully crawlable).
  const list = useMemo(() => eligibleItems(COCKTAILS, filters), [filters]);

  return (
    <Screen>
      <Seo path="/catalog" title="Cocktail catalog" description="Browse every cocktail in the catalog by base spirit, strength, and style." />
      <SectionTitle style={{ fontSize: font.size.xl, marginTop: spacing.md }}>Cocktail catalog</SectionTitle>
      <Body style={{ color: t.textMuted, marginBottom: spacing.lg }}>Every cocktail we know — filter by base spirit and strength.</Body>

      <FacetBar filters={filters} onChange={setFilters} />
      <Muted style={{ marginBottom: spacing.md }}>{list.length} cocktails</Muted>

      {list.map((c, i) => (
        <React.Fragment key={c.slug}>
          <CocktailCard cocktail={c} />
          {i === 4 ? <AdSlot placement="in-feed" /> : null}
        </React.Fragment>
      ))}

      <AppFooter />
    </Screen>
  );
}
