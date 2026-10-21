import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as AppleAuthentication from 'expo-apple-authentication';
import BrandMark from '../components/BrandMark';
import AppleLogo from '../components/AppleLogo';
import { colors, fonts, radius, spacing } from '../theme';
import { continueAsGuest, signInWithApple, syncContacts, UserProfile } from '../storage/auth';

interface Props {
  onAuthenticated: (user: UserProfile) => void;
}

export default function AuthScreen({ onAuthenticated }: Props) {
  const [step, setStep] = useState<'signIn' | 'contacts'>('signIn');
  const [pendingUser, setPendingUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAppleSignIn() {
    setLoading(true);
    try {
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        Alert.alert('Apple 로그인 불가', '이 기기에서는 Apple 로그인을 사용할 수 없어요.');
        return;
      }
      const user = await signInWithApple();
      setPendingUser(user);
      setStep('contacts');
    } catch (err: any) {
      if (err?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('로그인 실패', '다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGuest() {
    setLoading(true);
    try {
      const user = await continueAsGuest();
      onAuthenticated(user);
    } finally {
      setLoading(false);
    }
  }

  async function handleAllowContacts() {
    if (!pendingUser) return;
    try {
      const { granted } = await syncContacts();
      onAuthenticated({ ...pendingUser, contactsSynced: granted });
    } catch {
      onAuthenticated(pendingUser);
    }
  }

  function handleSkipContacts() {
    if (!pendingUser) return;
    onAuthenticated(pendingUser);
  }

  return (
    <View style={styles.fill}>
      {/* 로딩 화면과 같은 북극곰 그림의 물 배경 위에, 글씨가 읽히도록 어둡게 덮는다. */}
      <Image source={require('../../assets/landing/water.jpg')} style={styles.backdrop} resizeMode="cover" />
      <LinearGradient colors={['rgba(11,42,74,0.35)', 'rgba(11,42,74,0.72)']} style={StyleSheet.absoluteFill} />
      <StatusBar style="light" />
      <View style={styles.content}>
        {step === 'signIn' ? (
          <>
            <BrandMark size={128} uid="auth" />
            <Text style={styles.wordmark}>둥실</Text>
            <Text style={styles.subtitle}>수영을 기록하는 감성 다이어리</Text>

            <View style={styles.buttons}>
              <TouchableOpacity
                style={styles.appleButton}
                onPress={handleAppleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.deepSea} />
                ) : (
                  <View style={styles.appleButtonRow}>
                    <AppleLogo size={16} color={colors.deepSea} />
                    <Text style={styles.appleButtonText}>Apple로 계속하기</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.guestButton} onPress={handleGuest} disabled={loading}>
                <Text style={styles.guestButtonText}>로그인 없이 둘러보기</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.footnote}>
              카카오 로그인은 지원하지 않아요. Apple 계정 하나로 간편하게 시작하세요.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.contactsTitle}>수친을 찾아볼까요?</Text>
            <Text style={styles.contactsBody}>
              연락처에 접근하면, 예전에 같이 수영하던 친구를 수친으로 쉽게 추가할 수 있어요.
              {'\n'}번호는 친구 찾기에만 쓰이고 외부로 전송되지 않아요.
            </Text>
            <View style={styles.buttons}>
              <TouchableOpacity style={styles.appleButton} onPress={handleAllowContacts}>
                <Text style={styles.appleButtonText}>연락처 접근 허용</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.guestButton} onPress={handleSkipContacts}>
                <Text style={styles.guestButtonText}>나중에 할게요</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.splashBackground },
  backdrop: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  wordmark: {
    fontFamily: fonts.heading,
    fontSize: 34,
    color: colors.white,
    letterSpacing: 2,
    marginTop: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.regular,
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.hairline,
    marginBottom: spacing.xl,
  },
  buttons: {
    width: '100%',
    gap: spacing.xs,
  },
  // 어두운 배경에서 눈에 띄도록 흰 버튼 (Sign in with Apple의 흰색 스타일).
  appleButton: {
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  appleButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.hairline,
  },
  appleButtonText: {
    color: colors.deepSea,
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  guestButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  guestButtonText: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  footnote: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  contactsTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.white,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  contactsBody: {
    fontFamily: fonts.regular,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
});
