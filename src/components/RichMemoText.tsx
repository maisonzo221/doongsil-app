import React from 'react';
import { StyleSheet, Text, TextStyle, View } from 'react-native';
import { fonts } from '../theme';
import { parseMemo } from '../utils/memoFormat';

interface Props {
  memo: string;
  style?: TextStyle;
}

export default function RichMemoText({ memo, style }: Props) {
  const lines = parseMemo(memo);
  return (
    <View>
      {lines.map((line, i) => (
        <View key={i} style={styles.line}>
          {line.bullet && <Text style={[styles.bulletDot, style]}>{'•'}</Text>}
          <Text style={[styles.text, style, line.bullet && styles.bulletText]}>
            {line.segments.map((seg, j) => (
              <Text key={j} style={seg.bold ? styles.bold : undefined}>
                {seg.text}
              </Text>
            ))}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row' },
  bulletDot: { marginRight: 6 },
  bulletText: { flex: 1 },
  text: { fontFamily: fonts.regular },
  bold: { fontFamily: fonts.bold },
});
