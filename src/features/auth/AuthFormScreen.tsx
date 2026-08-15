import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { getAuthErrorTranslationKey, useAuth } from '@/features/auth/auth-context';
import { useI18n } from '@/features/i18n/i18n';
import { useTheme } from '@/hooks/use-theme';

type AuthMode = 'login' | 'register';

type AuthFormScreenProps = {
  mode: AuthMode;
};

export function AuthFormScreen({ mode }: AuthFormScreenProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const { signIn, signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegister = mode === 'register';

  const showFeedback = (message: string, error: boolean) => {
    setFeedback(message);
    setIsError(error);
  };

  const submit = async () => {
    Keyboard.dismiss();
    setFeedback(null);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = displayName.trim();

    if (!normalizedEmail.includes('@') || !normalizedEmail.includes('.')) {
      showFeedback(t('auth.validation.email'), true);
      return;
    }

    if (isRegister && normalizedName.length < 2) {
      showFeedback(t('auth.validation.name'), true);
      return;
    }

    if (password.length < 8) {
      showFeedback(t('auth.validation.password'), true);
      return;
    }

    if (isRegister && (!/\p{L}/u.test(password) || !/\p{N}/u.test(password))) {
      showFeedback(t('auth.validation.passwordPattern'), true);
      return;
    }

    if (isRegister && password !== passwordConfirmation) {
      showFeedback(t('auth.validation.passwordMatch'), true);
      return;
    }

    setIsSubmitting(true);

    try {
      if (isRegister) {
        const result = await signUp(normalizedName, normalizedEmail, password);

        if (result.error) {
          showFeedback(t(getAuthErrorTranslationKey(result.error)), true);
        } else if (result.requiresEmailConfirmation) {
          setPassword('');
          setPasswordConfirmation('');
          showFeedback(t('auth.success.checkEmail'), false);
        }
      } else {
        const result = await signIn(normalizedEmail, password);

        if (result.error) {
          showFeedback(t(getAuthErrorTranslationKey(result.error)), true);
        }
      }
    } catch {
      showFeedback(t('auth.error.generic'), true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setFeedback(null);
    router.replace(isRegister ? './login' : './register');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <View style={styles.intro}>
              <ThemedText type="eyebrow" themeColor="accent">
                Shia Ziyarah Iraq
              </ThemedText>
              <ThemedText type="title">
                {t(isRegister ? 'auth.registerTitle' : 'auth.loginTitle')}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {t(isRegister ? 'auth.registerBody' : 'auth.loginBody')}
              </ThemedText>
            </View>

            <ThemedView type="surface" style={[styles.card, { borderColor: theme.border }]}>
              {isRegister ? (
                <View style={styles.field}>
                  <ThemedText type="smallBold">{t('auth.name')}</ThemedText>
                  <TextInput
                    autoCapitalize="words"
                    autoComplete="name"
                    editable={!isSubmitting}
                    maxLength={80}
                    onChangeText={setDisplayName}
                    placeholder={t('auth.namePlaceholder')}
                    placeholderTextColor={theme.textSecondary}
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                        color: theme.text,
                      },
                    ]}
                    textContentType="name"
                    value={displayName}
                  />
                </View>
              ) : null}

              <View style={styles.field}>
                <ThemedText type="smallBold">{t('auth.email')}</ThemedText>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  inputMode="email"
                  keyboardType="email-address"
                  maxLength={254}
                  onChangeText={setEmail}
                  placeholder={t('auth.emailPlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  textContentType="emailAddress"
                  value={email}
                />
              </View>

              <View style={styles.field}>
                <ThemedText type="smallBold">{t('auth.password')}</ThemedText>
                <TextInput
                  autoCapitalize="none"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  editable={!isSubmitting}
                  onChangeText={setPassword}
                  onSubmitEditing={isRegister ? undefined : () => void submit()}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  textContentType={isRegister ? 'newPassword' : 'password'}
                  value={password}
                />
                {isRegister ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('auth.passwordHint')}
                  </ThemedText>
                ) : null}
              </View>

              {isRegister ? (
                <View style={styles.field}>
                  <ThemedText type="smallBold">{t('auth.passwordConfirm')}</ThemedText>
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="new-password"
                    editable={!isSubmitting}
                    onChangeText={setPasswordConfirmation}
                    onSubmitEditing={() => void submit()}
                    placeholder="••••••••"
                    placeholderTextColor={theme.textSecondary}
                    secureTextEntry
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                        color: theme.text,
                      },
                    ]}
                    textContentType="newPassword"
                    value={passwordConfirmation}
                  />
                </View>
              ) : null}

              {feedback ? (
                <View
                  accessibilityLiveRegion="polite"
                  style={[
                    styles.feedback,
                    {
                      backgroundColor: isError ? theme.dangerSoft : theme.successSoft,
                      borderColor: isError ? theme.danger : theme.success,
                    },
                  ]}>
                  <ThemedText type="small" themeColor={isError ? 'danger' : 'success'}>
                    {feedback}
                  </ThemedText>
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ busy: isSubmitting, disabled: isSubmitting }}
                disabled={isSubmitting}
                onPress={() => void submit()}
                style={({ pressed }) => [
                  styles.submitButton,
                  { backgroundColor: theme.accent },
                  pressed && styles.pressed,
                  isSubmitting && styles.disabled,
                ]}>
                {isSubmitting ? (
                  <ActivityIndicator color={theme.background} />
                ) : (
                  <ThemedText type="smallBold" style={{ color: theme.background }}>
                    {t(isRegister ? 'auth.signUp' : 'auth.signIn')}
                  </ThemedText>
                )}
              </Pressable>
            </ThemedView>

            <View style={styles.switchRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {t(isRegister ? 'auth.haveAccount' : 'auth.noAccount')}
              </ThemedText>
              <Pressable
                accessibilityRole="link"
                disabled={isSubmitting}
                onPress={switchMode}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText type="smallBold" themeColor="accent">
                  {t(isRegister ? 'auth.signIn' : 'auth.signUp')}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.three,
  },
  container: {
    alignSelf: 'stretch',
    flexShrink: 1,
    gap: Spacing.four,
    marginHorizontal: 'auto',
    maxWidth: Math.min(MaxContentWidth, 480),
    minWidth: 0,
    width: 'auto',
  },
  intro: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.three,
    minWidth: 0,
    padding: Spacing.four,
  },
  field: {
    gap: Spacing.two,
    minWidth: 0,
  },
  input: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
    minHeight: 50,
    minWidth: 0,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  feedback: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  submitButton: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: Spacing.three,
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.6,
  },
});
