import React, { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
import { TipRoomStackParamList } from '../../navigation/tipRoomTypes';
import {
  addComment,
  BoardComment,
  BoardPost,
  deleteBoardPost,
  getBoardPosts,
  getComments,
} from '../../storage/tipRoom';
import { getCurrentUser } from '../../storage/auth';

type Props = NativeStackScreenProps<TipRoomStackParamList, 'PostDetail'>;

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return '방금 전';
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export default function PostDetailScreen({ route, navigation }: Props) {
  const { postId } = route.params;
  const [post, setPost] = useState<BoardPost | null>(null);
  const [comments, setComments] = useState<BoardComment[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const reload = useCallback(async () => {
    const [user, posts, commentList] = await Promise.all([
      getCurrentUser(),
      getBoardPosts(),
      getComments(postId),
    ]);
    setMyId(user?.id ?? null);
    setPost(posts.find((p) => p.id === postId) ?? null);
    setComments(commentList);
  }, [postId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  async function handleSendComment() {
    if (!draft.trim()) return;
    await addComment(postId, draft.trim());
    setDraft('');
    await reload();
  }

  function handleDeletePost() {
    Alert.alert('글 삭제', '이 글을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await deleteBoardPost(postId);
          navigation.goBack();
        },
      },
    ]);
  }

  if (!post) return <ScreenBackground><View /></ScreenBackground>;

  return (
    <ScreenBackground>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{post.category}</Text>
          </View>
          <Text style={styles.title}>{post.title}</Text>
          <Text style={styles.meta}>
            {post.authorNickname} · {timeAgo(post.createdAt)}
          </Text>
          <Text style={styles.body}>{post.body}</Text>

          {post.authorId === myId && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDeletePost}>
              <Text style={styles.deleteBtnText}>글 삭제</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.commentTitle}>댓글 {comments.length}</Text>
          {comments.map((c) => (
            <View key={c.id} style={styles.commentRow}>
              <Text style={styles.commentAuthor}>{c.authorNickname}</Text>
              <Text style={styles.commentBody}>{c.body}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="댓글 남기기"
            placeholderTextColor={colors.textMuted}
            value={draft}
            onChangeText={setDraft}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSendComment}>
            <Text style={styles.sendBtnText}>등록</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.cardSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.hairline + 2,
    paddingVertical: 2,
    marginBottom: spacing.xs,
  },
  categoryBadgeText: { fontFamily: fonts.bold, color: colors.blueSea, fontSize: 11 },
  title: { fontFamily: fonts.bold, fontSize: 20, color: colors.text },
  meta: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 12, marginTop: 4 },
  body: { fontFamily: fonts.regular, color: colors.text, fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
  deleteBtn: { alignSelf: 'flex-start', marginTop: spacing.sm },
  deleteBtnText: { fontFamily: fonts.semibold, color: '#D96C6C', fontSize: 12 },
  commentTitle: {
    fontFamily: fonts.bold,
    color: colors.text,
    fontSize: 14,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  commentRow: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.xs,
    marginBottom: spacing.hairline + 4,
  },
  commentAuthor: { fontFamily: fonts.semibold, color: colors.text, fontSize: 12 },
  commentBody: { fontFamily: fonts.regular, color: colors.text, fontSize: 13, marginTop: 2 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    gap: spacing.hairline + 4,
  },
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
