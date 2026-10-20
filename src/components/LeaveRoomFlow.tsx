import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';
import {
  Friend,
  getGroupById,
  getGroupMembers,
  leaveGroup,
  leaveGroupAsOwner,
  transferOwnership,
} from '../storage/social';
import { getCurrentUser } from '../storage/auth';

export interface LeaveTarget {
  id: string;
  name: string;
  roomLabel: string;
}

type Step = 'choose' | 'pick';

/** 수톡방 나가기 흐름.
 *  - 방장이 아니면: 확인 후 바로 나간다.
 *  - 방장이면: "방장 위임하고 나가기"(멤버를 골라 위임) / "그냥 나가기"(자동으로 처리) 중 선택한다. */
export function useLeaveRoom(onLeft: (groupId: string) => void) {
  const [target, setTarget] = useState<LeaveTarget | null>(null);
  const [step, setStep] = useState<Step>('choose');
  const [members, setMembers] = useState<Friend[]>([]);
  const [myId, setMyId] = useState('');
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = useCallback(() => {
    setTarget(null);
    setStep('choose');
    setPickedId(null);
    setBusy(false);
  }, []);

  const finish = useCallback(
    (groupId: string) => {
      close();
      onLeft(groupId);
    },
    [close, onLeft]
  );

  const failed = useCallback((e: any) => {
    setBusy(false);
    if (e?.message === 'sole_owner_needs_server_update') {
      Alert.alert('나갈 수 없어요', '혼자 남은 방은 서버 설정(migration_011)을 적용한 뒤 나갈 수 있어요.');
    } else {
      Alert.alert('나가기 실패', '잠시 후 다시 시도해주세요.');
    }
  }, []);

  const requestLeave = useCallback(
    async (t: LeaveTarget) => {
      const [me, group] = await Promise.all([getCurrentUser(), getGroupById(t.id)]);
      if (!me) return;
      if (!group || group.ownerId !== me.id) {
        Alert.alert(`${t.roomLabel}방 나가기`, `"${t.name}"에서 나갈까요?`, [
          { text: '취소', style: 'cancel' },
          {
            text: '나가기',
            style: 'destructive',
            onPress: async () => {
              try {
                await leaveGroup(t.id);
                onLeft(t.id);
              } catch (e) {
                failed(e);
              }
            },
          },
        ]);
        return;
      }
      const others = (await getGroupMembers(t.id)).filter((m) => m.id !== me.id);
      setMyId(me.id);
      setMembers(others);
      setPickedId(null);
      setStep('choose');
      setTarget(t);
    },
    [failed, onLeft]
  );

  async function justLeave() {
    if (!target) return;
    setBusy(true);
    try {
      await leaveGroupAsOwner(target.id, myId);
      finish(target.id);
    } catch (e) {
      failed(e);
    }
  }

  async function delegateAndLeave() {
    if (!target || !pickedId) return;
    setBusy(true);
    try {
      await transferOwnership(target.id, pickedId);
      await leaveGroup(target.id);
      finish(target.id);
    } catch (e) {
      failed(e);
    }
  }

  const pickedName = members.find((m) => m.id === pickedId)?.nicknameKo;

  const element = (
    <Modal visible={!!target} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {step === 'choose' ? (
            <>
              <Text style={styles.title}>{target?.roomLabel}방 나가기</Text>
              <Text style={styles.desc}>"{target?.name}"의 방장이에요. 어떻게 나갈까요?</Text>

              <TouchableOpacity
                style={[styles.option, members.length === 0 && styles.optionDisabled]}
                disabled={members.length === 0 || busy}
                onPress={() => setStep('pick')}
              >
                <Text style={styles.optionTitle}>방장 위임하고 나가기</Text>
                <Text style={styles.optionDesc}>
                  {members.length === 0 ? '다른 멤버가 없어서 위임할 수 없어요.' : '방에 있는 멤버 중 한 명에게 방장을 넘겨요.'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.option} disabled={busy} onPress={justLeave}>
                <Text style={styles.optionTitle}>그냥 나가기</Text>
                <Text style={styles.optionDesc}>
                  {members.length > 0
                    ? '가장 먼저 들어온 멤버가 자동으로 방장이 돼요.'
                    : '혼자 남은 방이라 나가면 방이 사라져요.'}
                </Text>
              </TouchableOpacity>

              {busy && <ActivityIndicator color={colors.primary} style={styles.busy} />}
              <TouchableOpacity style={styles.cancel} onPress={close} disabled={busy}>
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>누구에게 방장을 넘길까요?</Text>
              <FlatList
                data={members}
                keyExtractor={(m) => m.id}
                style={styles.list}
                renderItem={({ item }) => {
                  const picked = item.id === pickedId;
                  return (
                    <TouchableOpacity style={[styles.memberRow, picked && styles.memberRowPicked]} onPress={() => setPickedId(item.id)}>
                      <Text style={styles.memberName}>{item.nicknameKo}</Text>
                      <Text style={styles.memberCheck}>{picked ? '✓' : ''}</Text>
                    </TouchableOpacity>
                  );
                }}
              />
              {busy && <ActivityIndicator color={colors.primary} style={styles.busy} />}
              <View style={styles.row}>
                <TouchableOpacity style={styles.rowCancel} onPress={() => setStep('choose')} disabled={busy}>
                  <Text style={styles.cancelText}>뒤로</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirm, (!pickedId || busy) && styles.confirmDisabled]}
                  disabled={!pickedId || busy}
                  onPress={delegateAndLeave}
                >
                  <Text style={styles.confirmText}>{pickedName ? `${pickedName}님에게 위임하고 나가기` : '위임할 멤버를 골라주세요'}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  return { requestLeave, leaveElement: element };
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(11,42,74,0.4)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: { width: '100%', maxHeight: '80%', backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg },
  title: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, marginBottom: spacing.xs },
  desc: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm },
  option: { backgroundColor: colors.cardSoft, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.xs },
  optionDisabled: { opacity: 0.45 },
  optionTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  optionDesc: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  busy: { marginVertical: spacing.xs },
  cancel: { alignItems: 'center', paddingVertical: spacing.xs, marginTop: spacing.hairline },
  cancelText: { fontFamily: fonts.semibold, color: colors.textMuted },
  list: { maxHeight: 260, marginVertical: spacing.xs },
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xs, paddingHorizontal: spacing.xs, borderRadius: radius.sm },
  memberRowPicked: { backgroundColor: colors.cardSoft },
  memberName: { fontFamily: fonts.semibold, color: colors.text, flex: 1 },
  memberCheck: { fontFamily: fonts.bold, color: colors.primary, width: 18 },
  row: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs, alignItems: 'center' },
  rowCancel: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  confirm: { flex: 1, alignItems: 'center', paddingVertical: spacing.xs, backgroundColor: colors.alert, borderRadius: radius.pill },
  confirmDisabled: { opacity: 0.4 },
  confirmText: { fontFamily: fonts.semibold, color: colors.white, fontSize: 13 },
});
