import React from 'react';
import { ScrollView, View } from 'react-native';
import type { AbvBand, SpiritBase, SpinFilters } from '@tailsnconk/core';
import { SPIRIT_LABELS, ABV_LABELS, SPIRIT_ORDER, ABV_ORDER } from '@tailsnconk/core';
import { Chip, Muted } from './ui';
import { spacing } from '@/constants/theme';

/**
 * Facet controls for the discovery tools: base spirit, ABV band, zero-proof.
 * `available*` come from the engine's eligible* helpers so the UI never offers
 * a dead-end facet.
 */
export function FacetBar({
  filters,
  onChange,
  availableBases,
  availableBands,
}: {
  filters: SpinFilters;
  onChange: (next: SpinFilters) => void;
  availableBases?: SpiritBase[];
  availableBands?: AbvBand[];
}) {
  const bases = SPIRIT_ORDER.filter((b) => !availableBases || availableBases.includes(b));
  const bands = ABV_ORDER.filter((b) => !availableBands || availableBands.includes(b));

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Muted style={{ marginBottom: spacing.xs }}>Base spirit</Muted>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: spacing.lg }}>
        <Chip label="Any" active={!filters.spiritBase} onPress={() => onChange({ ...filters, spiritBase: undefined })} />
        {bases.map((b) => (
          <Chip
            key={b}
            label={SPIRIT_LABELS[b]}
            active={filters.spiritBase === b}
            onPress={() => onChange({ ...filters, spiritBase: filters.spiritBase === b ? undefined : b })}
          />
        ))}
      </ScrollView>

      <Muted style={{ marginTop: spacing.sm, marginBottom: spacing.xs }}>Strength</Muted>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: spacing.lg }}>
        <Chip label="Any" active={!filters.abvBand && !filters.zeroProof} onPress={() => onChange({ ...filters, abvBand: undefined, zeroProof: undefined })} />
        {bands.map((b) => (
          <Chip
            key={b}
            label={ABV_LABELS[b]}
            active={filters.abvBand === b}
            onPress={() => onChange({ ...filters, zeroProof: undefined, abvBand: filters.abvBand === b ? undefined : b })}
          />
        ))}
        <Chip label="Zero-proof only" active={!!filters.zeroProof} onPress={() => onChange({ ...filters, abvBand: undefined, zeroProof: !filters.zeroProof })} />
      </ScrollView>
    </View>
  );
}
