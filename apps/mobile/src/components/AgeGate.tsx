import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { IS_WEB } from '@/lib/env';
import { radius, spacing, useTheme, font } from '@/constants/theme';

const KEY = 'tnc:ageok';

function readOk(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * First-visit "are you of legal drinking age?" gate. Client-only and rendered
 * null until mounted, so it never blocks crawlers, never ships in the static
 * HTML, and causes no hydration mismatch. A confirmation is remembered per
 * device. (A client gate is advisory — standard practice for an alcohol site.)
 */
export function AgeGate() {
  const t = useTheme();
  const [mounted, setMounted] = useState(false);
  const [ok, setOk] = useState(true); // assume ok until mounted so nothing flashes on SSR
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    setMounted(true);
    setOk(readOk());
  }, []);

  if (!mounted || !IS_WEB || ok) return null;

  const confirm = () => {
    try {
      window.localStorage.setItem(KEY, '1');
    } catch {
      /* private mode — gate just won't persist */
    }
    setOk(true);
  };

  return (
    <View
      // Fixed overlay covering the viewport (react-native-web accepts position:fixed).
      style={{ position: 'fixed' as 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(12,9,16,0.92)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg, zIndex: 9999 }}
      accessibilityRole="none"
    >
      <View
        accessibilityRole="alert"
        accessibilityLabel="Age verification"
        style={{ width: '100%', maxWidth: 440, backgroundColor: t.surface, borderColor: t.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.xl }}
      >
        <Text style={{ color: t.accent, fontFamily: font.family.display, fontSize: font.size.xl, fontWeight: '900', marginBottom: spacing.sm }}>
          Tails ’n Conk
        </Text>
        {declined ? (
          <Text style={{ color: t.text, fontFamily: font.family.body, fontSize: font.size.md, lineHeight: 23 }}>
            Come back when you’re of legal drinking age. Please enjoy responsibly.
          </Text>
        ) : (
          <>
            <Text style={{ color: t.text, fontFamily: font.family.display, fontSize: font.size.lg, fontWeight: '600', marginBottom: spacing.sm }}>
              Are you of legal drinking age?
            </Text>
            <Text style={{ color: t.textMuted, fontFamily: font.family.body, fontSize: font.size.sm, lineHeight: 21, marginBottom: spacing.lg }}>
              This is a cocktail recipe site. Please confirm you’re 21 or older (or of legal drinking age where you live).
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Pressable
                onPress={confirm}
                accessibilityRole="button"
                accessibilityLabel="Yes, I’m 21+ and of legal drinking age"
                style={({ pressed }) => ({ flex: 1, backgroundColor: t.accent, borderRadius: radius.pill, paddingVertical: spacing.md, alignItems: 'center', opacity: pressed ? 0.85 : 1 })}
              >
                <Text style={{ color: t.accentText, fontFamily: font.family.body, fontWeight: '700', fontSize: font.size.md }}>Yes, I’m 21+</Text>
              </Pressable>
              <Pressable
                onPress={() => setDeclined(true)}
                accessibilityRole="button"
                accessibilityLabel="No, I am not of legal drinking age"
                style={({ pressed }) => ({ flex: 1, borderColor: t.border, borderWidth: 1, borderRadius: radius.pill, paddingVertical: spacing.md, alignItems: 'center', opacity: pressed ? 0.85 : 1 })}
              >
                <Text style={{ color: t.text, fontFamily: font.family.body, fontWeight: '700', fontSize: font.size.md }}>No</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </View>
  );
}
