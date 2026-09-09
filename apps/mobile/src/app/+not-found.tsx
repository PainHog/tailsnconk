import React from 'react';
import { Link } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Seo } from '@/components/Seo';
import { Body, Button, SectionTitle } from '@/components/ui';

export default function NotFound() {
  return (
    <Screen>
      <Seo path="/404" title="Not found" noindex />
      <SectionTitle>Nothing on the shelf here</SectionTitle>
      <Body style={{ marginBottom: 24 }}>That page doesn’t exist. Let’s get you back to your bar.</Body>
      <Link href="/" asChild>
        <Button label="Back to My Bar" />
      </Link>
    </Screen>
  );
}
