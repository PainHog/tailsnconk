import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@/constants/theme';

export function RatingStars({
  value,
  onChange,
  size = 20,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        const star = (
          <Text style={{ fontSize: size, color: filled ? t.amber : t.border }}>{filled ? '★' : '☆'}</Text>
        );
        return onChange ? (
          <Pressable key={n} onPress={() => onChange(n)} hitSlop={4} style={{ paddingHorizontal: 2 }}>
            {star}
          </Pressable>
        ) : (
          <View key={n} style={{ paddingHorizontal: 1 }}>
            {star}
          </View>
        );
      })}
    </View>
  );
}
