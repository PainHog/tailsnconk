import React from 'react';
import { Text, View } from 'react-native';
import { COCKTAILS, baseProgress, earnedBadges, passportRank, madeCount, SPIRIT_LABELS } from '@tailsnconk/core';
import { Card, Muted, Row, SectionTitle } from './ui';
import { radius, spacing, useTheme, font } from '@/constants/theme';

/** Retention / badges (blueprint §5.2), driven by the set of made cocktails. */
export function BadgeShelf({ made }: { made: string[] }) {
  const t = useTheme();
  const rank = passportRank(COCKTAILS, made);
  const count = madeCount(COCKTAILS, made);
  const badges = earnedBadges(COCKTAILS, made);
  const progress = baseProgress(COCKTAILS, made);

  return (
    <Card>
      <SectionTitle>Your bar passport</SectionTitle>
      <Text style={{ color: t.accent, fontSize: font.size.xl, fontWeight: '800' }}>{rank}</Text>
      <Muted>{count} of {COCKTAILS.length} cocktails made</Muted>

      {badges.length > 0 ? (
        <Row style={{ marginTop: spacing.md }}>
          {badges.map((b) => (
            <View
              key={b.id}
              style={{ backgroundColor: t.surfaceAlt, borderColor: t.border, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginRight: spacing.sm, marginBottom: spacing.sm }}
            >
              <Text style={{ color: t.text, fontSize: font.size.xs, fontWeight: '700' }}>🏅 {b.label}</Text>
            </View>
          ))}
        </Row>
      ) : null}

      <View style={{ marginTop: spacing.md }}>
        {progress.map((p) => (
          <View key={p.spiritBase} style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Muted>{SPIRIT_LABELS[p.spiritBase]}</Muted>
              <Muted>{p.made}/{p.total}</Muted>
            </View>
            <View style={{ height: 6, backgroundColor: t.surfaceAlt, borderRadius: radius.pill, marginTop: 3, overflow: 'hidden' }}>
              <View style={{ width: `${Math.round(p.pct * 100)}%`, height: 6, backgroundColor: t.accent }} />
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}
