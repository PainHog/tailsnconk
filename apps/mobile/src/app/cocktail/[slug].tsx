import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  allCocktailSlugs,
  getCocktail,
  ingredientName,
  cocktailJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  adaptCocktail,
  activeConstraints,
  makeability,
  SPIRIT_LABELS,
  ABV_LABELS,
  METHOD_LABELS,
  type Method,
} from '@tailsnconk/core/full';
import { Screen } from '@/components/Screen';
import { Seo } from '@/components/Seo';
import { AppFooter } from '@/components/AppFooter';
import { AdSlot } from '@/components/AdSlot';
import { Reviews } from '@/components/Reviews';
import { PhotoWall } from '@/components/PhotoWall';
import { RatingStars } from '@/components/RatingStars';
import { Body, Button, Card, Chip, Divider, Muted, Row, SectionTitle } from '@/components/ui';
import { useOwnedBar } from '@/hooks/useOwnedBar';
import { useShoppingList } from '@/hooks/useShoppingList';
import { backend } from '@/lib/backend';
import { bakedRating } from '@/lib/baked-ratings';
import { override } from '@/lib/baked-overrides';
import { ENV } from '@/lib/env';
import { spacing, font, radius, useTheme } from '@/constants/theme';

// Enumerate every cocktail as a prerendered static route.
export async function generateStaticParams() {
  return allCocktailSlugs().map((slug) => ({ slug }));
}

const MAKE_STEPS: Record<Method, string> = {
  stir: 'Add everything to a mixing glass with ice, stir until well chilled, and strain into the glass.',
  shake: 'Add everything to a shaker with ice, shake hard until chilled, and strain into the glass.',
  build: 'Build directly in the glass over fresh ice and give it a gentle stir.',
  muddle: 'Gently muddle the fresh ingredients, add the rest with ice, and stir to combine.',
  blend: 'Add everything to a blender with ice and blend until smooth.',
};

const ML_PER_OZ = 29.5735;

function fmtNum(n: number): string {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : String(r).replace(/\.?0+$/, '');
}

/** Scale an amount by servings and optionally convert oz → ml for display. */
function displayAmount(amount: string, unit: string, servings: number, ml: boolean): { amount: string; unit: string } {
  const n = parseFloat(amount);
  if (!Number.isFinite(n)) return { amount, unit }; // "top", "dash", etc.
  const scaled = n * servings;
  if (ml && unit === 'oz') return { amount: String(Math.round((scaled * ML_PER_OZ) / 5) * 5), unit: 'ml' };
  const rounded = unit === 'oz' ? Math.round(scaled * 4) / 4 : scaled;
  return { amount: fmtNum(rounded), unit };
}

export default function CocktailDetail() {
  const t = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const cocktail = slug ? getCocktail(slug) : undefined;

  const [saved, setSaved] = useState(false);
  const [made, setMade] = useState(false);
  const [constraints, setConstraints] = useState<string[]>([]);
  const [servings, setServings] = useState(1);
  const [useMl, setUseMl] = useState(false);
  const bar = useOwnedBar();
  const shop = useShoppingList();

  useEffect(() => {
    if (!cocktail) return;
    const b = backend();
    void b.listSaved().then((s) => setSaved(s.includes(cocktail.slug)));
    void b.listMade().then((m) => setMade(m.includes(cocktail.slug)));
  }, [cocktail?.slug]);

  const adapted = useMemo(
    () => (cocktail && constraints.length ? adaptCocktail(cocktail, constraints) : null),
    [cocktail, constraints],
  );

  if (!cocktail) {
    return (
      <Screen>
        <Seo path={`/cocktail/${slug ?? ''}`} title="Cocktail not found" noindex />
        <SectionTitle>Not found</SectionTitle>
        <Body>We don’t have that cocktail (yet).</Body>
      </Screen>
    );
  }

  const rating = bakedRating(cocktail.slug);
  const story = override(`cocktail:${cocktail.slug}:story`, cocktail.description);

  // "Can you make this?" against the on-device bar (client-only; null until ready).
  const mk = bar.ready ? makeability(cocktail, bar.ownedSet) : null;
  const missing = mk && mk.status === 'no' ? mk.missing : [];
  const missingOnList = missing.length > 0 && missing.every((s) => shop.has(s));

  const toggleSave = async () => {
    const next = !saved;
    setSaved(next);
    try {
      await backend().setSaved(cocktail.slug, next);
    } catch {
      setSaved(!next);
    }
  };
  const toggleMade = async () => {
    const next = !made;
    setMade(next);
    try {
      await backend().setMade(cocktail.slug, next);
    } catch {
      setMade(!next);
    }
  };
  const toggleConstraint = (id: string) =>
    setConstraints((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const jsonLd = [
    cocktailJsonLd(cocktail, ENV.siteUrl, rating),
    breadcrumbJsonLd(ENV.siteUrl, [
      { name: 'Catalog', path: '/catalog' },
      { name: `${SPIRIT_LABELS[cocktail.spiritBase]} Cocktails`, path: `/collection/spirit-${cocktail.spiritBase}` },
      { name: cocktail.name, path: `/cocktail/${cocktail.slug}` },
    ]),
    faqJsonLd([
      {
        question: `What's in a ${cocktail.name}?`,
        answer: `A ${cocktail.name} is made with ${cocktail.ingredients
          .filter((i) => !i.optional)
          .map((i) => ingredientName(i.ingredientSlug))
          .join(', ')}.`,
      },
      {
        question: `Can I make a zero-proof ${cocktail.name}?`,
        answer: `Yes — swap the alcoholic components for non-alcoholic equivalents. Use the "Make it zero-proof" toggle on this page.`,
      },
    ]),
  ];

  return (
    <Screen>
      <Seo
        path={`/cocktail/${cocktail.slug}`}
        title={cocktail.name}
        description={cocktail.description}
        jsonLd={jsonLd}
      />

      <SectionTitle style={{ fontSize: font.size.xxl, marginTop: spacing.md }}>{cocktail.name}</SectionTitle>
      <Muted>
        {SPIRIT_LABELS[cocktail.spiritBase]} · {ABV_LABELS[cocktail.abvBand]} · {METHOD_LABELS[cocktail.method]} · {cocktail.glass}
      </Muted>
      {rating && rating.reviewCount > 0 ? (
        <Row style={{ marginTop: spacing.sm }}>
          <RatingStars value={rating.ratingValue} size={16} />
          <Muted style={{ marginLeft: spacing.sm }}>
            {rating.ratingValue.toFixed(1)} ({rating.reviewCount})
          </Muted>
        </Row>
      ) : null}

      <Body style={{ marginTop: spacing.md, color: t.text }}>{story}</Body>

      <Row style={{ marginTop: spacing.md }}>
        <Button label={saved ? '★ Saved' : '☆ Save'} variant={saved ? 'primary' : 'ghost'} onPress={toggleSave} style={{ marginRight: spacing.sm }} />
        <Button label={made ? '✓ Made it' : 'Mark as made'} variant={made ? 'primary' : 'ghost'} onPress={toggleMade} />
      </Row>

      {mk ? (
        <View
          style={{
            marginTop: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1,
            padding: spacing.md,
            borderColor:
              mk.status === 'exact' ? t.accent : mk.status === 'substitute' ? t.lime : t.border,
            backgroundColor: t.surface,
          }}
        >
          {mk.status === 'exact' ? (
            <Text style={{ color: t.accent, fontWeight: '800', fontFamily: font.family.body }}>
              ✓ You can make this with your bar.
            </Text>
          ) : mk.status === 'substitute' ? (
            <Text style={{ color: t.lime, fontWeight: '800', fontFamily: font.family.body }}>
              Make it with a swap — {mk.substitutions.map((s) => `use ${ingredientName(s.use)} for ${ingredientName(s.required)}`).join(', ')}.
            </Text>
          ) : (
            <>
              <Text style={{ color: t.text, fontFamily: font.family.body }}>
                {missing.length === 1 ? 'You’re one ingredient away — need ' : 'You still need '}
                <Text style={{ fontWeight: '800' }}>{missing.map(ingredientName).join(', ')}</Text>.
              </Text>
              <View style={{ marginTop: spacing.sm }}>
                <Button
                  variant={missingOnList ? 'primary' : 'ghost'}
                  label={missingOnList ? '✓ On your shopping list' : `+ Add ${missing.length === 1 ? 'it' : 'them'} to shopping list`}
                  onPress={() => (missingOnList ? missing.forEach((s) => shop.remove(s)) : shop.addMany(missing))}
                />
              </View>
            </>
          )}
        </View>
      ) : null}

      <Divider />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <SectionTitle style={{ marginBottom: 0 }}>Ingredients</SectionTitle>
        <Row>
          <Chip label="oz" active={!useMl} onPress={() => setUseMl(false)} />
          <Chip label="ml" active={useMl} onPress={() => setUseMl(true)} />
        </Row>
      </View>
      <Row style={{ marginBottom: spacing.sm, alignItems: 'center' }}>
        <Muted style={{ marginRight: spacing.sm }}>Servings</Muted>
        <Button variant="ghost" label="–" onPress={() => setServings((s) => Math.max(1, s - 1))} style={{ paddingHorizontal: spacing.md }} />
        <Text style={{ color: t.text, fontFamily: font.family.display, fontWeight: '800', fontSize: font.size.lg, marginHorizontal: spacing.md }}>{servings}</Text>
        <Button variant="ghost" label="+" onPress={() => setServings((s) => Math.min(12, s + 1))} style={{ paddingHorizontal: spacing.md }} />
      </Row>
      <Card>
        {(adapted ? adapted.parts : cocktail.ingredients.map((l) => ({
          ingredientSlug: l.ingredientSlug,
          name: ingredientName(l.ingredientSlug),
          amount: l.amount,
          unit: l.unit,
          optional: l.optional,
          status: 'kept' as const,
          replacementName: undefined as string | undefined,
        }))).map((p, i) => {
          const d = displayAmount(p.amount, p.unit, servings, useMl);
          return (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
            <Text style={{ color: t.text, fontSize: font.size.md }}>
              {p.status === 'swapped' ? (
                <>
                  <Text style={{ textDecorationLine: 'line-through', color: t.textMuted }}>{p.name}</Text>
                  {'  →  '}
                  <Text style={{ color: t.lime, fontWeight: '700' }}>{p.replacementName}</Text>
                </>
              ) : (
                <Text style={{ color: p.status === 'unresolvable' ? t.cranberry : t.text }}>{p.name}</Text>
              )}
              {p.optional ? <Text style={{ color: t.textMuted }}> (optional)</Text> : null}
              {p.status === 'unresolvable' ? <Text style={{ color: t.cranberry }}> — no swap</Text> : null}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: font.size.md }}>
              {d.amount} {d.unit}
            </Text>
          </View>
          );
        })}
      </Card>

      {/* Secondary feature: zero-proof / allergen constraint rewriting */}
      <View style={{ marginTop: spacing.md }}>
        <Muted style={{ marginBottom: spacing.xs }}>Make it your way</Muted>
        <Row>
          {activeConstraints().map((c) => (
            <Chip key={c.id} label={c.label} active={constraints.includes(c.id)} onPress={() => toggleConstraint(c.id)} />
          ))}
        </Row>
        {adapted && !adapted.fullyResolved ? (
          <Muted style={{ color: t.cranberry, marginTop: spacing.xs }}>
            Some components can’t be swapped honestly — shown above in red.
          </Muted>
        ) : null}
      </View>

      <Divider />
      <SectionTitle>How to make it</SectionTitle>
      <Body>{MAKE_STEPS[cocktail.method]}</Body>

      <AdSlot placement="mid-content" />

      <Divider />
      <Reviews cocktailId={cocktail.slug} />

      <Divider />
      <PhotoWall cocktailId={cocktail.slug} />

      {cocktail.sources && cocktail.sources.length ? (
        <>
          <Divider />
          <Muted>Recipe validated against: {cocktail.sources.map((s) => hostOf(s)).join(', ')}.</Muted>
        </>
      ) : null}

      <AppFooter />
    </Screen>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
