import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  COCKTAILS,
  getCocktail,
  getCollection,
  indexableCollections,
  isIndexableCollection,
  breadcrumbJsonLd,
} from '@tailsnconk/core';
import { Screen } from '@/components/Screen';
import { Seo } from '@/components/Seo';
import { AppFooter } from '@/components/AppFooter';
import { CocktailCard } from '@/components/CocktailCard';
import { AdSlot } from '@/components/AdSlot';
import { Body, Muted, SectionTitle } from '@/components/ui';
import { ENV } from '@/lib/env';
import { spacing, font } from '@/constants/theme';

// Only indexable hubs (>= MIN members) become prerendered routes.
export async function generateStaticParams() {
  return indexableCollections(COCKTAILS).map((h) => ({ slug: h.slug }));
}

export default function CollectionHub() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const hub = slug ? getCollection(COCKTAILS, slug) : undefined;

  if (!hub) {
    return (
      <Screen>
        <Seo path={`/collection/${slug ?? ''}`} title="Collection not found" noindex />
        <SectionTitle>Not found</SectionTitle>
      </Screen>
    );
  }

  const members = hub.memberSlugs.map((s) => getCocktail(s)).filter(Boolean);
  const indexable = isIndexableCollection(hub);

  return (
    <Screen>
      <Seo
        path={`/collection/${hub.slug}`}
        title={hub.title}
        description={hub.description}
        noindex={!indexable}
        jsonLd={
          indexable
            ? [
                breadcrumbJsonLd(ENV.siteUrl, [
                  { name: 'Collections', path: '/collections' },
                  { name: hub.title, path: `/collection/${hub.slug}` },
                ]),
              ]
            : undefined
        }
      />
      <SectionTitle style={{ fontSize: font.size.xl, marginTop: spacing.md }}>{hub.title}</SectionTitle>
      <Body style={{ marginBottom: spacing.lg }}>{hub.description}</Body>
      <Muted style={{ marginBottom: spacing.md }}>{members.length} cocktails</Muted>
      {members.map((c, i) => (
        <React.Fragment key={c!.slug}>
          <CocktailCard cocktail={c!} />
          {i === 3 ? <AdSlot placement="in-feed" /> : null}
        </React.Fragment>
      ))}
      <AppFooter />
    </Screen>
  );
}
