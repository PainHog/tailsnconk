import React from 'react';
import { SITE_NAME } from '@tailsnconk/core';
import { Screen } from '@/components/Screen';
import { Seo } from '@/components/Seo';
import { AppFooter } from '@/components/AppFooter';
import { Body, SectionTitle } from '@/components/ui';
import { spacing, font } from '@/constants/theme';

// PLACEHOLDER legal copy — have it reviewed before launch.
export default function Privacy() {
  return (
    <Screen>
      <Seo path="/privacy" title="Privacy Policy" />
      <SectionTitle style={{ fontSize: font.size.xl, marginTop: spacing.md }}>Privacy Policy</SectionTitle>
      <Body style={{ marginTop: spacing.md }}>
        {SITE_NAME} keeps things minimal. Your bar (the ingredients you check off) is stored on your own device unless
        you create an account. If you create an account, we store your email, display name, saved and made cocktails,
        and any reviews or photos you submit, in order to sync them across your devices.
      </Body>
      <Body style={{ marginTop: spacing.md }}>
        We use privacy-friendly, cookieless analytics that do not track you across sites. If you subscribe to the
        newsletter we store your email address and only send what you opted into; every email has a one-click
        unsubscribe. Photos you submit are reviewed before they appear publicly.
      </Body>
      <Body style={{ marginTop: spacing.md, color: '#999' }}>
        This is placeholder text scaffolded with the site — replace it with a policy reviewed for your jurisdiction
        before launch. Contact: add a real contact address here.
      </Body>
      <AppFooter />
    </Screen>
  );
}
