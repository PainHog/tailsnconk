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
    <View
      style={{ flexDirection: 'row' }}
      accessibilityRole={onChange ? undefined : 'image'}
      accessibilityLabel={onChange ? undefined : `Rated ${Math.round(value)} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        const star = (
          <Text style={{ fontSize: size, color: filled ? t.amber : t.border }}>{filled ? '★' : '☆'}</Text>
        );
        return onChange ? (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${n} star${n === 1 ? '' : 's'}`}
            accessibilityState={{ selected: n <= Math.round(value) }}
            style={{ paddingHorizontal: 2 }}
          >
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
