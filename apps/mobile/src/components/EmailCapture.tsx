import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import { backend } from '@/lib/backend';
import { Body, Button, Card, Muted, SectionTitle } from './ui';
import { radius, spacing, useTheme } from '@/constants/theme';

/** Double opt-in newsletter capture (blueprint §5.1). The server sends the
 *  confirmation email; this only kicks off the flow. */
export function EmailCapture({ source = 'site' }: { source?: string }) {
  const t = useTheme();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setMsg('Enter a valid email.');
      return;
    }
    setBusy(true);
    const res = await backend().subscribeEmail(email.trim(), source);
    setMsg(res.message);
    if (res.ok) setEmail('');
    setBusy(false);
  };

  return (
    <Card>
      <SectionTitle>Get a cocktail every week</SectionTitle>
      <Body style={{ marginBottom: spacing.md, color: t.textMuted }}>
        One featured cocktail, delivered. Double opt-in, unsubscribe anytime.
      </Body>
      <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={t.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          style={{
            flexGrow: 1,
            minWidth: 200,
            backgroundColor: t.surfaceAlt,
            borderColor: t.border,
            borderWidth: 1,
            borderRadius: radius.md,
            color: t.text,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
        />
        <Button label={busy ? '…' : 'Subscribe'} onPress={submit} disabled={busy} />
      </View>
      {msg ? <Muted style={{ marginTop: spacing.sm }}>{msg}</Muted> : null}
    </Card>
  );
}
