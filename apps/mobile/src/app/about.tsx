import React from 'react';
import { COCKTAILS, faqJsonLd, SITE_NAME } from '@tailsnconk/core';
import { Screen } from '@/components/Screen';
import { Seo } from '@/components/Seo';
import { AppFooter } from '@/components/AppFooter';
import { EmailCapture } from '@/components/EmailCapture';
import { Body, Divider, SectionTitle } from '@/components/ui';
import { spacing, font } from '@/constants/theme';

export default function About() {
  const faqs = [
    { question: 'How does the "what can I make" tool work?', answer: 'You check off the bottles, mixers, and garnishes you own. We list every cocktail whose required ingredients you already have — no dead ends, no guessing.' },
    { question: 'Do garnishes count?', answer: 'Garnishes and truly optional touches never block a cocktail from showing up — only the ingredients you actually need to.' },
    { question: 'Are the recipes accurate?', answer: 'Every recipe is validated against reputable sources (including the IBA official specs) and kept to the simplest widely-accepted build.' },
    { question: 'Can I make drinks alcohol-free?', answer: 'Many cocktails have a zero-proof toggle that swaps the alcoholic parts for non-alcoholic equivalents, honestly flagging anything that can’t be swapped.' },
  ];
  return (
    <Screen>
      <Seo path="/about" title="About" description={`About ${SITE_NAME}.`} jsonLd={[faqJsonLd(faqs)]} />
      <SectionTitle style={{ fontSize: font.size.xl, marginTop: spacing.md }}>About {SITE_NAME}</SectionTitle>
      <Body style={{ marginTop: spacing.md }}>
        {SITE_NAME} answers one question: with the bottles already on your shelf, what can you actually make tonight?
        Check off what you own and get the full list — plus a one-tap random pick when you can’t decide. We currently
        track {COCKTAILS.length} validated cocktails and are adding more.
      </Body>

      <Divider />
      <SectionTitle>FAQ</SectionTitle>
      {faqs.map((f) => (
        <React.Fragment key={f.question}>
          <SectionTitle style={{ fontSize: font.size.md }}>{f.question}</SectionTitle>
          <Body style={{ marginBottom: spacing.md }}>{f.answer}</Body>
        </React.Fragment>
      ))}

      <Divider />
      <EmailCapture source="about" />
      <AppFooter />
    </Screen>
  );
}
