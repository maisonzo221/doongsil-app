import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Mood, MOOD_ORDER } from '../types';
import { colors, moodColors, moodEmoji, moodLabel, radius, spacing } from '../theme';

interface Props {
  value: Mood;
  onChange: (mood: Mood) => void;
}

export default function MoodPicker({ value, onChange }: Props) {
  return (
    <View>
      <View style={styles.row}>
        {MOOD_ORDER.map((mood) => {
          const selected = mood === value;
          return (
            <TouchableOpacity
              key={mood}
              onPress={() => onChange(mood)}
              style={[
                styles.item,
                selected && {
                  backgroundColor: moodColors[mood],
                  borderColor: moodColors[mood],
                },
              ]}
            >
              <Text style={styles.emoji}>{moodEmoji[mood]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.label}>{moodLabel[value]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  item: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardSoft,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emoji: {
    fontSize: 26,
  },
  label: {
    textAlign: 'center',
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 13,
  },
});
