import React from 'react';
import { SITE_NAME } from '@tailsnconk/core';
import { Screen } from '@/components/Screen';
import { Seo } from '@/components/Seo';
import { AppFooter } from '@/components/AppFooter';
import { Body, SectionTitle } from '@/components/ui';
import { spacing, font } from '@/constants/theme';

// PLACEHOLDER legal copy — have it reviewed before launch.
export default function Terms() {
  return (
    <Screen>
      <Seo path="/terms" title="Terms of Use" />
      <SectionTitle style={{ fontSize: font.size.xl, marginTop: spacing.md }}>Terms of Use</SectionTitle>
      <Body style={{ marginTop: spacing.md }}>
        {SITE_NAME} is for people of legal drinking age in their location. Recipes and measurements are provided for
        informational purposes; drink responsibly and never drink and drive.
      </Body>
      <Body style={{ marginTop: spacing.md }}>
        Content you submit (reviews, photos) must be your own and appropriate; we may remove anything at our
        discretion. The site is provided “as is” without warranties.
      </Body>
      <Body style={{ marginTop: spacing.md, color: '#999' }}>
        Placeholder text scaffolded with the site — replace with terms reviewed for your jurisdiction before launch.
      </Body>
      <AppFooter />
    </Screen>
  );
}
