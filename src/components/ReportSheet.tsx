import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';
import { blockUser, reportContent, REPORT_REASONS, ReportReason, ReportTargetType } from '../storage/safety';

export interface ReportTarget {
  type: ReportTargetType;
  /** 신고하는 글·댓글·메시지의 id (사용자 자체를 신고할 때는 없음) */
  id?: string;
  userId: string;
  userName: string;
  /** 신고 당시의 내용 (운영자 확인용) */
  text?: string;
}

type Step = 'menu' | 'reasons' | 'done';

/**
 * 다른 사람의 글·댓글·채팅·프로필을 눌렀을 때 뜨는 아래 시트: 신고하기 / 차단하기.
 * 신고를 마치면 같은 사람을 바로 차단할 수 있게 이어서 물어본다.
 */
export default function ReportSheet({ target, onClose }: { target: ReportTarget | null; onClose: () => void }) {
  const [step, setStep] = useState<Step>('menu');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (target) {
      setStep('menu');
      setBusy(false);
    }
  }, [target]);

  if (!target) return null;
  const name = target.userName;

  async function submit(reason: ReportReason) {
    if (!target || busy) return;
    setBusy(true);
    try {
      await reportContent({ targetType: target.type, targetId: target.id, targetUserId: target.userId, reason, targetText: target.text });
      setStep('done');
    } catch {
      Alert.alert('신고 실패', '잠시 후 다시 시도해주세요.');
    } finally {
      setBusy(false);
    }
  }

  function confirmBlock() {
    Alert.alert(`${name}님을 차단할까요?`, '차단하면 이 사람의 글·댓글·채팅이 보이지 않아요. 설정의 "차단한 사용자"에서 언제든 해제할 수 있어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '차단',
        style: 'destructive',
        onPress: async () => {
          try {
            await blockUser(target!.userId);
            onClose();
          } catch {
            Alert.alert('차단 실패', '잠시 후 다시 시도해주세요.');
          }
        },
      },
    ]);
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {step === 'menu' && (
            <>
              <Text style={styles.title}>{name}님</Text>
              <TouchableOpacity style={styles.option} onPress={() => setStep('reasons')}>
                <Text style={styles.optionText}>신고하기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.option} onPress={confirmBlock}>
                <Text style={[styles.optionText, styles.danger]}>차단하기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.option, styles.cancel]} onPress={onClose}>
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'reasons' && (
            <>
              <Text style={styles.title}>신고 사유를 골라주세요</Text>
              {REPORT_REASONS.map((r) => (
                <TouchableOpacity key={r} style={styles.option} onPress={() => submit(r)} disabled={busy}>
                  <Text style={styles.optionText}>{r}</Text>
                </TouchableOpacity>
              ))}
              {busy && <ActivityIndicator color={colors.primary} style={styles.spinner} />}
              <TouchableOpacity style={[styles.option, styles.cancel]} onPress={onClose} disabled={busy}>
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'done' && (
            <>
              <Text style={styles.title}>신고가 접수되었어요</Text>
              <Text style={styles.body}>운영자가 확인하고 필요한 조치를 해요. 이 사람의 글과 채팅이 더 이상 보이지 않게 하려면 차단해 주세요.</Text>
              <TouchableOpacity style={styles.option} onPress={confirmBlock}>
                <Text style={[styles.optionText, styles.danger]}>{name}님 차단하기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.option, styles.primary]} onPress={onClose}>
                <Text style={styles.primaryText}>닫기</Text>
              </TouchableOpacity>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(11,42,74,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  title: { fontFamily: fonts.bold, color: colors.text, fontSize: 16, textAlign: 'center', marginVertical: spacing.xs },
  body: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: spacing.xs },
  option: { backgroundColor: colors.card, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center' },
  optionText: { fontFamily: fonts.semibold, color: colors.text, fontSize: 15 },
  danger: { color: colors.alert },
  cancel: { backgroundColor: colors.cardSoft, marginTop: spacing.hairline },
  cancelText: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 15 },
  primary: { backgroundColor: colors.primary },
  primaryText: { fontFamily: fonts.bold, color: colors.white, fontSize: 15 },
  spinner: { marginVertical: spacing.hairline },
});
