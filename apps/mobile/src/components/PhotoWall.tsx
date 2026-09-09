import React, { useEffect, useRef, useState } from 'react';
import { Image, Text, TextInput, View } from 'react-native';
import { backend } from '@/lib/backend';
import type { CommunityPhoto } from '@/lib/backend/types';
import { IS_WEB } from '@/lib/env';
import { Body, Button, Card, Muted, SectionTitle } from './ui';
import { radius, spacing, useTheme } from '@/constants/theme';

/**
 * Moderated user photo submissions (blueprint §5.3). Only APPROVED photos are
 * ever shown (served via short-lived signed URLs). On web, the file is
 * re-encoded through a canvas before upload to strip EXIF.
 */
export function PhotoWall({ cocktailId }: { cocktailId: string }) {
  const t = useTheme();
  const [photos, setPhotos] = useState<CommunityPhoto[]>([]);
  const [caption, setCaption] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    backend().listApprovedPhotos(cocktailId).then(setPhotos).catch(() => setPhotos([]));
  }, [cocktailId]);

  const onPickWeb = async (file: File) => {
    // Re-encode through a canvas to strip EXIF and cap dimensions.
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);
    await new Promise((res, rej) => {
      img.onload = () => res(null);
      img.onerror = rej;
      img.src = url;
    });
    const max = 1280;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
    setDataUrl(canvas.toDataURL('image/jpeg', 0.85));
    URL.revokeObjectURL(url);
  };

  const submit = async () => {
    if (!dataUrl) {
      setMsg('Choose a photo first.');
      return;
    }
    const res = await backend().submitPhoto(cocktailId, dataUrl, caption.trim());
    setMsg(res.message);
    if (res.ok) {
      setDataUrl(null);
      setCaption('');
    }
  };

  return (
    <View>
      <SectionTitle>Made it? Share a photo</SectionTitle>
      {photos.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
          {photos.map((p) => (
            <View key={p.id} style={{ width: 140 }}>
              <Image source={{ uri: p.url }} style={{ width: 140, height: 140, borderRadius: radius.md }} />
              <Muted style={{ marginTop: 4 }} >{p.userName}</Muted>
            </View>
          ))}
        </View>
      ) : (
        <Muted style={{ marginBottom: spacing.md }}>No photos yet — be the first.</Muted>
      )}

      <Card>
        {IS_WEB ? (
          <>
            {React.createElement('input', {
              ref: fileRef,
              type: 'file',
              accept: 'image/*',
              style: { color: t.text, marginBottom: spacing.md },
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                const f = e.target.files?.[0];
                if (f) void onPickWeb(f);
              },
            })}
            {dataUrl ? <Image source={{ uri: dataUrl }} style={{ width: 120, height: 120, borderRadius: radius.md, marginBottom: spacing.md }} /> : null}
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Caption (optional)"
              placeholderTextColor={t.textMuted}
              style={{ backgroundColor: t.surfaceAlt, borderColor: t.border, borderWidth: 1, borderRadius: radius.md, color: t.text, padding: spacing.md, marginBottom: spacing.md }}
            />
            <Button label="Submit for review" onPress={submit} />
            <Muted style={{ marginTop: spacing.sm }}>Photos are reviewed before they appear.</Muted>
          </>
        ) : (
          <Body style={{ color: t.textMuted }}>Photo submissions are available on the web app.</Body>
        )}
        {msg ? <Muted style={{ marginTop: spacing.sm }}>{msg}</Muted> : null}
      </Card>
    </View>
  );
}
