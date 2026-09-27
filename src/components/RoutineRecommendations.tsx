import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';

// 수영장 등급 데이터를 아직 서버에서 받아오지 않아서, 일반적인 수영장 강습 커리큘럼을
// 참고한 추천 루틴 4종을 고정으로 보여준다. 나중에 회원가입 시 수영 등급 설문이 생기면
// 그 결과에 맞는 루틴을 골라 보여주는 방식으로 바꾼다.
interface Routine {
  level: string;
  title: string;
  detail: string;
}

const ROUTINES: Routine[] = [
  {
    level: '초급',
    title: '자유형 기초 다지기',
    detail: '주 3회 · 킥판 연습 위주 · 25m x 8~10회\n호흡과 자세를 편하게 만드는 데 집중해요.',
  },
  {
    level: '중급',
    title: '지구력과 폼 다듬기',
    detail: '주 4회 · 50m 인터벌 · 4종목 골고루\n영법을 바꿔가며 전체적인 지구력을 늘려요.',
  },
  {
    level: '상급',
    title: '스피드 & 지구력',
    detail: '주 5회 · 인터벌 트레이닝 · SWOLF 개선 목표\n페이스를 끌어올리고 효율을 다듬어요.',
  },
  {
    level: '연수반',
    title: '영법 교정 & 턴/출발 드릴',
    detail: '주 3~4회 · 드릴 위주\n턴, 출발, 스트로크 디테일을 교정해요.',
  },
];

export default function RoutineRecommendations() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>수영 루틴 설정</Text>
      <Text style={styles.subtitle}>추천 루틴 중 하나를 골라 참고해보세요</Text>
      {ROUTINES.map((r) => (
        <TouchableOpacity
          key={r.level}
          style={styles.card}
          onPress={() => Alert.alert(`${r.level} · ${r.title}`, r.detail)}
        >
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>{r.level}</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{r.title}</Text>
            <Text style={styles.cardDetail} numberOfLines={1}>
              {r.detail.split('\n')[0]}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.lg },
  title: { fontFamily: fonts.bold, color: colors.text, fontSize: 15 },
  subtitle: {
    fontFamily: fonts.regular,
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.hairline + 4,
    gap: spacing.xs,
  },
  levelBadge: {
    backgroundColor: colors.cardSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
  levelBadgeText: { fontFamily: fonts.bold, color: colors.primary, fontSize: 12 },
  cardBody: { flex: 1 },
  cardTitle: { fontFamily: fonts.semibold, color: colors.text, fontSize: 14 },
  cardDetail: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
