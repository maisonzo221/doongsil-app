import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import WaterDrop from '../components/WaterDrop';
import AppleLogo from '../components/AppleLogo';
import { colors, fonts, radius, spacing } from '../theme';
import { continueAsGuest, mockSignInWithApple, mockSyncContacts, UserProfile } from '../storage/auth';

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
      // Expo Go 데모용 가짜 로그인. 실제 기기 배포 시 expo-apple-authentication으로 교체.
      const user = await mockSignInWithApple();
      setPendingUser(user);
      setStep('contacts');
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
    await mockSyncContacts();
    onAuthenticated({ ...pendingUser, contactsSynced: true });
  }

  function handleSkipContacts() {
    if (!pendingUser) return;
    onAuthenticated(pendingUser);
  }

  return (
    <LinearGradient colors={[colors.emerald, colors.blueSea, colors.deepSea]} style={styles.fill}>
      <View style={styles.content}>
        {step === 'signIn' ? (
          <>
            <View style={styles.logoCircle}>
              <WaterDrop color={colors.white} size={36} />
            </View>
            <Text style={styles.wordmark}>둥실</Text>
            <Text style={styles.subtitle}>수영을 기록하는 감성 다이어리</Text>

            <View style={styles.buttons}>
              <TouchableOpacity
                style={styles.appleButton}
                onPress={handleAppleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <View style={styles.appleButtonRow}>
                    <AppleLogo size={16} color={colors.white} />
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  wordmark: {
    fontFamily: fonts.heading,
    fontSize: 30,
    color: colors.white,
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
  appleButton: {
    backgroundColor: colors.deepSea,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  appleButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.hairline,
  },
  appleButtonText: {
    color: colors.white,
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
