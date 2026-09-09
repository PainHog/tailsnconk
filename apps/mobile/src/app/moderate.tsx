import React from 'react';
import { Screen } from '@/components/Screen';
import { Seo } from '@/components/Seo';
import { AppFooter } from '@/components/AppFooter';
import { Body, Card, Muted, SectionTitle } from '@/components/ui';
import { useUser } from '@/hooks/useUser';
import { spacing, font } from '@/constants/theme';

/**
 * Admin-only moderation dashboard (noindex). Gated on profiles.is_admin. Deep
 * moderation actions run against admin-scoped RLS; wire the queues to the
 * cloud backend once a Supabase project exists.
 */
export default function Moderate() {
  const { profile, loading, mode } = useUser();

  return (
    <Screen>
      <Seo path="/moderate" title="Moderation" noindex />
      <SectionTitle style={{ fontSize: font.size.xl, marginTop: spacing.md }}>Moderation</SectionTitle>

      {loading ? (
        <Muted>Loading…</Muted>
      ) : mode === 'local' ? (
        <Card>
          <Body>Moderation needs the cloud backend. Configure Supabase and grant your account admin.</Body>
        </Card>
      ) : !profile?.isAdmin ? (
        <Card>
          <Body>You don’t have access to this page.</Body>
        </Card>
      ) : (
        <>
          <Card style={{ marginBottom: spacing.md }}>
            <SectionTitle style={{ fontSize: font.size.md }}>Photo submissions</SectionTitle>
            <Muted>Approve or reject pending photos (status → approved makes them public via signed URLs).</Muted>
          </Card>
          <Card style={{ marginBottom: spacing.md }}>
            <SectionTitle style={{ fontSize: font.size.md }}>Reviews</SectionTitle>
            <Muted>Review flagged comments and ratings.</Muted>
          </Card>
          <Card>
            <SectionTitle style={{ fontSize: font.size.md }}>Text overrides</SectionTitle>
            <Muted>Edit cocktail stories and hub copy (baked into the next build).</Muted>
          </Card>
        </>
      )}

      <AppFooter />
    </Screen>
  );
}
