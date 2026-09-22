import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SwimRecord, STROKE_LABEL } from '../types';
import { colors, moodEmoji, radius, spacing } from '../theme';
import { formatDateLabel } from '../utils/date';

interface Props {
  record: SwimRecord;
  onPress: () => void;
}

export default function RecordCard({ record, onPress }: Props) {
  const strokesLabel = record.strokes.map((s) => STROKE_LABEL[s]).join(' · ');
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.moodBubble}>
        <Text style={styles.emoji}>{moodEmoji[record.mood]}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.date}>{formatDateLabel(record.date)}</Text>
          {(record.distanceMeters || record.durationMinutes) && (
            <Text style={styles.meta}>
              {record.distanceMeters ? `${record.distanceMeters}m ` : ''}
              {record.durationMinutes ? `${record.durationMinutes}분` : ''}
            </Text>
          )}
        </View>
        {strokesLabel ? <Text style={styles.strokes}>{strokesLabel}</Text> : null}
        {record.memo ? (
          <Text style={styles.memo} numberOfLines={2}>
            {record.memo}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: colors.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  moodBubble: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  emoji: { fontSize: 22 },
  body: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: { fontWeight: '700', color: colors.text, fontSize: 15 },
  meta: { color: colors.textMuted, fontSize: 12 },
  strokes: { color: colors.primaryDark, marginTop: 2, fontSize: 12, fontWeight: '600' },
  memo: { color: colors.textMuted, marginTop: spacing.xs, fontSize: 13, lineHeight: 18 },
});
