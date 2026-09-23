import React, { useCallback, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ScreenBackground from '../../components/ScreenBackground';
import { colors, fonts, radius, spacing } from '../../theme';
import { SocialStackParamList } from '../../navigation/socialTypes';
import { ChatMessage, getMessages, sendTextMessage, shareRecordToGroup } from '../../storage/social';
import { getAllRecords } from '../../storage/records';
import { formatDateLabel } from '../../utils/date';
import { STROKE_LABEL } from '../../types';

type Props = NativeStackScreenProps<SocialStackParamList, 'ChatRoom'>;

const ME = '나';

export default function ChatRoomScreen({ route }: Props) {
  const { groupId, groupName } = route.params;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');

  const reload = useCallback(async () => {
    setMessages(await getMessages(groupId));
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  async function handleSend() {
    if (!draft.trim()) return;
    await sendTextMessage(groupId, ME, draft.trim());
    setDraft('');
    reload();
  }

  async function handleShareLatestRecord() {
    const records = await getAllRecords();
    if (records.length === 0) return;
    const latest = records[0];
    const strokes = latest.strokes.map((s) => STROKE_LABEL[s]).join(' · ');
    const summary = `${formatDateLabel(latest.date)} · ${strokes || '기록'}${
      latest.distanceMeters ? ` · ${latest.distanceMeters}m` : ''
    }`;
    await shareRecordToGroup(groupId, ME, summary);
    reload();
  }

  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{groupName}</Text>
        </View>

        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const mine = item.senderName === ME;
            return (
              <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
                {!mine && <Text style={styles.sender}>{item.senderName}</Text>}
                <View style={[styles.bubble, mine && styles.bubbleMine]}>
                  {item.type === 'text' && (
                    <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.text}</Text>
                  )}
                  {item.type === 'record_share' && (
                    <View>
                      <Text style={[styles.shareLabel, mine && styles.bubbleTextMine]}>
                        🏊 노팅 기록 공유
                      </Text>
                      <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
                        {item.sharedSummary}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>아직 대화가 없어요.</Text>}
        />

        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShareLatestRecord}>
            <Text style={styles.shareBtnText}>🏊</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="메시지 보내기"
            placeholderTextColor={colors.textMuted}
            value={draft}
            onChangeText={setDraft}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Text style={styles.sendBtnText}>전송</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  headerTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: spacing.hairline },
  bubbleRow: { marginBottom: spacing.hairline, alignItems: 'flex-start' },
  bubbleRowMine: { alignItems: 'flex-end' },
  sender: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 11, marginBottom: 2 },
  bubble: {
    maxWidth: '78%',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline + 2,
  },
  bubbleMine: { backgroundColor: colors.primary },
  bubbleText: { fontFamily: fonts.regular, color: colors.text, fontSize: 14 },
  bubbleTextMine: { color: colors.white },
  shareLabel: { fontFamily: fonts.semibold, fontSize: 12, marginBottom: 2 },
  empty: { fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    gap: spacing.hairline + 4,
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnText: { fontSize: 18 },
  textInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.hairline + 4,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  sendBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.hairline + 4,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  sendBtnText: { fontFamily: fonts.semibold, color: colors.white },
});
