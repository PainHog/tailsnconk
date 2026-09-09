import React from 'react';
import { COCKTAILS, faqJsonLd, SITE_NAME } from '@tailsnconk/core';
import { Screen } from '@/components/Screen';
import { Seo } from '@/components/Seo';
import { AppFooter } from '@/components/AppFooter';
import { EmailCapture } from '@/components/EmailCapture';
import { Body, Card, Divider, Muted, SectionTitle } from '@/components/ui';
import { spacing, font } from '@/constants/theme';

// Original evergreen content (the blueprint's "kitchen-school" equivalent).
export default function Guide() {
  const faqs = [
    { question: 'What is the minimum I need to make good cocktails at home?', answer: 'A shaker, a jigger, a bar spoon, and a strainer cover almost everything. Add a citrus juicer and a Y-peeler and you can make the large majority of the classics.' },
    { question: 'Which bottles should I buy first?', answer: 'Start with one spirit you already enjoy, then add fresh citrus, a sweetener (simple syrup), and a bottle of Angostura bitters. That handful unlocks a surprising number of drinks — check them off in My Bar to see exactly which.' },
    { question: 'Do I need fancy syrups?', answer: 'No. Simple syrup is equal parts sugar and hot water, stirred until clear. That one syrup covers most sours and highballs.' },
  ];
  return (
    <Screen>
      <Seo
        path="/guide"
        title="Home Bar Guide"
        description="How to build a home bar from scratch: the starter bottles, the tools that matter, glassware, and the four techniques behind almost every cocktail."
        jsonLd={[faqJsonLd(faqs)]}
      />
      <SectionTitle style={{ fontSize: font.size.xl, marginTop: spacing.md }}>The home bar guide</SectionTitle>
      <Body style={{ marginBottom: spacing.lg }}>
        You don’t need a back bar to make great drinks — you need a few smart bottles and four simple techniques. Here’s
        how to get from an empty shelf to a bar that makes dozens of the {COCKTAILS.length} cocktails in our catalog.
      </Body>

      <SectionTitle style={{ fontSize: font.size.md }}>The five-bottle starter bar</SectionTitle>
      <Body style={{ marginBottom: spacing.md }}>
        Pick a base spirit you like — say gin or bourbon — then round it out: an orange liqueur, a sweet vermouth, a
        bottle of Angostura bitters, and fresh citrus. With those you can already build an Old Fashioned, a Negroni-style
        sip, a sour, and a highball. Add a second base spirit and the list roughly doubles.
      </Body>

      <SectionTitle style={{ fontSize: font.size.md }}>Mixers & citrus</SectionTitle>
      <Body style={{ marginBottom: spacing.md }}>
        Fresh lemons and limes do more for a drink than any expensive bottle. Keep soda water and tonic on hand for
        highballs, and make a jar of simple syrup (equal parts sugar and hot water). Bottled juice is a last resort —
        fresh is the whole point.
      </Body>

      <SectionTitle style={{ fontSize: font.size.md }}>Tools that matter</SectionTitle>
      <Body style={{ marginBottom: spacing.md }}>
        A shaker, a jigger for measuring, a bar spoon for stirring, and a strainer. That’s the core kit. A citrus juicer
        and a peeler for garnishes are the two upgrades worth making early.
      </Body>

      <SectionTitle style={{ fontSize: font.size.md }}>The four techniques</SectionTitle>
      <Body style={{ marginBottom: spacing.md }}>
        <Body style={{ fontWeight: '700' }}>Shake</Body> drinks with citrus or egg to chill and aerate them.{' '}
        <Body style={{ fontWeight: '700' }}>Stir</Body> spirit-only drinks to keep them silky and clear.{' '}
        <Body style={{ fontWeight: '700' }}>Build</Body> highballs directly in the glass over ice.{' '}
        <Body style={{ fontWeight: '700' }}>Muddle</Body> herbs or fruit gently to release their oils. Almost every
        cocktail is one of these four.
      </Body>

      <Card>
        <Muted>Ready to see what you can make? Head to My Bar, check off what you own, and get your list.</Muted>
      </Card>

      <Divider />
      <SectionTitle>Common questions</SectionTitle>
      {faqs.map((f) => (
        <React.Fragment key={f.question}>
          <SectionTitle style={{ fontSize: font.size.md }}>{f.question}</SectionTitle>
          <Body style={{ marginBottom: spacing.md }}>{f.answer}</Body>
        </React.Fragment>
      ))}

      <Divider />
      <EmailCapture source="guide" />
      <AppFooter />
    </Screen>
  );
}
