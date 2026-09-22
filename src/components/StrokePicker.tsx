import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stroke, STROKE_LABEL, STROKE_ORDER } from '../types';
import { colors, radius, spacing } from '../theme';

interface Props {
  value: Stroke[];
  onChange: (strokes: Stroke[]) => void;
}

export default function StrokePicker({ value, onChange }: Props) {
  function toggle(stroke: Stroke) {
    if (value.includes(stroke)) {
      onChange(value.filter((s) => s !== stroke));
    } else {
      onChange([...value, stroke]);
    }
  }

  return (
    <View style={styles.row}>
      {STROKE_ORDER.map((stroke) => {
        const selected = value.includes(stroke);
        return (
          <TouchableOpacity
            key={stroke}
            onPress={() => toggle(stroke)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {STROKE_LABEL[stroke]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.cardSoft,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.text,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.white,
  },
});
