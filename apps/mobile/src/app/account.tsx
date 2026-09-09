import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { getCocktail } from '@tailsnconk/core';
import { Screen } from '@/components/Screen';
import { Seo } from '@/components/Seo';
import { AppFooter } from '@/components/AppFooter';
import { BadgeShelf } from '@/components/BadgeShelf';
import { Body, Button, Card, Divider, Muted, SectionTitle } from '@/components/ui';
import { backend } from '@/lib/backend';
import { useUser } from '@/hooks/useUser';
import { radius, spacing, useTheme, font } from '@/constants/theme';

export default function Account() {
  const t = useTheme();
  const { user, profile, loading, refresh, mode } = useUser();
  const [mkind, setMkind] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [made, setMade] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    void backend().listSaved().then(setSaved);
    void backend().listMade().then(setMade);
  }, [user?.id]);

  const submit = async () => {
    setErr(null);
    try {
      const b = backend();
      if (mkind === 'up') await b.signUp(email.trim(), password, name.trim());
      else await b.signIn(email.trim(), password);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.');
    }
  };

  const signOut = async () => {
    await backend().signOut();
    await refresh();
  };

  const input = {
    backgroundColor: t.surfaceAlt,
    borderColor: t.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: t.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  } as const;

  return (
    <Screen>
      <Seo path="/account" title="Your account" noindex />
      <SectionTitle style={{ fontSize: font.size.xl, marginTop: spacing.md }}>Account</SectionTitle>
      <Muted style={{ marginBottom: spacing.lg }}>
        {mode === 'cloud' ? 'Signed-in accounts sync across devices.' : 'Local mode — saved on this device. Configure Supabase to enable accounts.'}
      </Muted>

      {loading ? (
        <Muted>Loading…</Muted>
      ) : user ? (
        <>
          <Card style={{ marginBottom: spacing.lg }}>
            <Text style={{ color: t.text, fontSize: font.size.lg, fontWeight: '800' }}>
              {profile?.name || user.email || 'Welcome'}
            </Text>
            {user.email ? <Muted>{user.email}</Muted> : null}
            {profile?.isAdmin ? (
              <Link href={'/moderate' as never} asChild>
                <Text style={{ color: t.accent, marginTop: spacing.sm, fontWeight: '700' }}>Open moderation dashboard →</Text>
              </Link>
            ) : null}
            <Button variant="ghost" label="Sign out" onPress={signOut} style={{ marginTop: spacing.md, alignSelf: 'flex-start' }} />
          </Card>

          <BadgeShelf made={made} />

          <Divider />
          <SectionTitle>Saved cocktails</SectionTitle>
          {saved.length === 0 ? (
            <Muted>Nothing saved yet.</Muted>
          ) : (
            saved.map((s) => {
              const c = getCocktail(s);
              if (!c) return null;
              return (
                <Link key={s} href={`/cocktail/${s}`} asChild>
                  <Pressable
                    style={{
                      backgroundColor: t.surface,
                      borderColor: t.border,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderRadius: radius.lg,
                      padding: spacing.lg,
                      marginBottom: spacing.sm,
                    }}
                  >
                    <Text style={{ color: t.text, fontWeight: '700' }}>{c.name}</Text>
                  </Pressable>
                </Link>
              );
            })
          )}
        </>
      ) : (
        <Card>
          <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
            <Button variant={mkind === 'in' ? 'primary' : 'ghost'} label="Sign in" onPress={() => setMkind('in')} style={{ marginRight: spacing.sm }} />
            <Button variant={mkind === 'up' ? 'primary' : 'ghost'} label="Create account" onPress={() => setMkind('up')} />
          </View>
          {mkind === 'up' ? (
            <TextInput value={name} onChangeText={setName} placeholder="Display name" placeholderTextColor={t.textMuted} style={input} />
          ) : null}
          <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={t.textMuted} autoCapitalize="none" keyboardType="email-address" style={input} />
          <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={t.textMuted} secureTextEntry style={input} />
          <Button label={mkind === 'up' ? 'Create account' : 'Sign in'} onPress={submit} />
          {err ? <Muted style={{ color: t.cranberry, marginTop: spacing.sm }}>{err}</Muted> : null}
          {mode === 'local' ? <Muted style={{ marginTop: spacing.sm }}>In local mode any email/password works and stays on this device.</Muted> : null}
        </Card>
      )}

      <AppFooter />
    </Screen>
  );
}
