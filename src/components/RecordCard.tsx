import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SwimRecord, STROKE_LABEL } from '../types';
import { colors, fonts, moodEmoji, radius, spacing } from '../theme';
import { formatDateLabel } from '../utils/date';
import { stripMemoMarkers } from '../utils/memoFormat';

interface Props {
  record: SwimRecord;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function RecordCard({ record, onPress, onEdit, onDelete }: Props) {
  const strokesLabel = record.strokes.map((s) => STROKE_LABEL[s]).join(' · ');
  const editable = !!(onEdit || onDelete);

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.mainRow}
        onPress={onPress}
        activeOpacity={onPress ? 0.8 : 1}
        disabled={!onPress}
      >
        <View style={styles.moodBubble}>
          <Text style={styles.emoji}>{moodEmoji[record.mood]}</Text>
        </View>
        <View style={styles.body}>
          <View style={styles.headerRow}>
            <Text style={styles.date}>{formatDateLabel(record.date)}</Text>
            {record.source === 'health' && (
              <View style={styles.healthBadge}>
                <Text style={styles.healthBadgeText}>피트니스 연동</Text>
              </View>
            )}
          </View>
          {(record.distanceMeters || record.durationMinutes) && (
            <Text style={styles.meta}>
              {record.distanceMeters ? `${record.distanceMeters}m` : ''}
              {record.distanceMeters && record.durationMinutes ? ' · ' : ''}
              {record.durationMinutes ? `${record.durationMinutes}분` : ''}
              {record.calories ? ` · ${record.calories}kcal` : ''}
              {record.avgHeartRate ? ` · 평균 ${record.avgHeartRate}bpm` : ''}
            </Text>
          )}
          {strokesLabel ? <Text style={styles.strokes}>{strokesLabel}</Text> : null}
          {record.memo ? (
            <Text style={styles.memo} numberOfLines={2}>
              {stripMemoMarkers(record.memo)}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>

      {editable && (
        <View style={styles.footer}>
          {onEdit && (
            <TouchableOpacity style={styles.footerBtn} onPress={onEdit}>
              <Text style={styles.footerBtnText}>수정하기</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity style={styles.footerBtn} onPress={onDelete}>
              <Text style={styles.footerBtnTextDelete}>삭제</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginBottom: spacing.xs,
    shadowColor: colors.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    overflow: 'hidden',
  },
  mainRow: {
    flexDirection: 'row',
    padding: spacing.sm,
  },
  moodBubble: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  emoji: { fontSize: 22 },
  body: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: { fontFamily: fonts.bold, color: colors.text, fontSize: 15 },
  healthBadge: {
    backgroundColor: colors.cardSoft,
    paddingHorizontal: spacing.hairline + 2,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  healthBadgeText: { fontFamily: fonts.medium, color: colors.blueSea, fontSize: 10 },
  meta: { color: colors.textMuted, fontSize: 12, fontFamily: fonts.regular, marginTop: 2 },
  strokes: { color: colors.blueSea, marginTop: 2, fontSize: 12, fontFamily: fonts.semibold },
  memo: {
    color: colors.textMuted,
    marginTop: spacing.hairline,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.regular,
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  footerBtnText: { fontFamily: fonts.semibold, color: colors.primary, fontSize: 13 },
  footerBtnTextDelete: { fontFamily: fonts.semibold, color: '#D96C6C', fontSize: 13 },
});
