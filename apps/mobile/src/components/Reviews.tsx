import React, { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { backend } from '@/lib/backend';
import type { Review } from '@/lib/backend/types';
import { Body, Button, Card, Divider, Muted, SectionTitle } from './ui';
import { RatingStars } from './RatingStars';
import { radius, spacing, useTheme, font } from '@/constants/theme';

/** Comments + ratings (blueprint §5.4). One review per user per cocktail. */
export function Reviews({ cocktailId }: { cocktailId: string }) {
  const t = useTheme();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => backend().listReviews(cocktailId).then(setReviews).catch(() => setReviews([]));
  useEffect(() => {
    void load();
  }, [cocktailId]);

  const submit = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await backend().submitReview(cocktailId, rating, body.trim());
      setBody('');
      setStatus('Thanks for your review!');
      await load();
    } catch {
      setStatus('You need to be signed in to review.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <SectionTitle>Ratings & reviews</SectionTitle>
      <Card>
        <Muted>Your rating</Muted>
        <View style={{ marginVertical: spacing.sm }}>
          <RatingStars value={rating} onChange={setRating} size={28} />
        </View>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="How did it turn out? (optional)"
          placeholderTextColor={t.textMuted}
          multiline
          style={{
            backgroundColor: t.surfaceAlt,
            borderColor: t.border,
            borderWidth: 1,
            borderRadius: radius.md,
            color: t.text,
            padding: spacing.md,
            minHeight: 70,
            marginBottom: spacing.md,
          }}
        />
        <Button label={busy ? 'Saving…' : 'Post review'} onPress={submit} disabled={busy} />
        {status ? <Muted style={{ marginTop: spacing.sm }}>{status}</Muted> : null}
      </Card>

      {reviews.length > 0 ? <Divider /> : null}
      {reviews.map((r, i) => (
        <View key={r.id ?? i} style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: t.text, fontWeight: '700' }}>{r.userName ?? 'Guest'}</Text>
            <RatingStars value={r.rating} size={14} />
          </View>
          {r.body ? <Body style={{ marginTop: 4, fontSize: font.size.sm }}>{r.body}</Body> : null}
        </View>
      ))}
    </View>
  );
}
