import type { AuthError } from "@supabase/supabase-js";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Section } from "@/components/ui/section";
import { Spacing } from "@/constants/theme";
import {
  getAuthErrorTranslationKey,
  useAuth,
} from "@/features/auth/auth-context";
import { RequireAuth } from "@/features/auth/RequireAuth";
import {
  getPartySize,
  PartySizeField,
} from "@/features/auth/PartySizeField";
import { useI18n } from "@/features/i18n/i18n";
import { useTheme } from "@/hooks/use-theme";

type FeedbackState = {
  isError: boolean;
  message: string;
} | null;

function getAccountErrorTranslationKey(error: AuthError) {
  switch (error.code) {
    case "invalid_credentials":
      return "account.error.currentPassword";
    case "reauthentication_needed":
      return "account.error.reauthentication";
    case "same_password":
      return "account.error.samePassword";
    default:
      return getAuthErrorTranslationKey(error);
  }
}

export default function AccountScreen() {
  return (
    <RequireAuth returnTo="/account">
      <AccountContent />
    </RequireAuth>
  );
}

function AccountContent() {
  const theme = useTheme();
  const { t } = useI18n();
  const {
    changeEmail,
    changePassword,
    deleteAccount,
    profile,
    updatePartySize,
    user,
  } = useAuth();
  const [partySize, setPartySize] = useState(
    String(profile?.party_size ?? 1),
  );
  const [partyFeedback, setPartyFeedback] = useState<FeedbackState>(null);
  const [isChangingPartySize, setIsChangingPartySize] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailFeedback, setEmailFeedback] = useState<FeedbackState>(null);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordFeedback, setPasswordFeedback] = useState<FeedbackState>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState<FeedbackState>(null);
  const [isDeleteDialogVisible, setIsDeleteDialogVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.background,
      borderColor: theme.border,
      color: theme.text,
    },
  ];

  const submitPartySizeChange = async () => {
    setPartyFeedback(null);
    const normalizedPartySize = getPartySize(partySize);

    if (normalizedPartySize === null) {
      setPartyFeedback({
        isError: true,
        message: t("family.validation.partySize"),
      });
      return;
    }

    setIsChangingPartySize(true);

    try {
      const { error } = await updatePartySize(normalizedPartySize);

      if (error) {
        setPartyFeedback({
          isError: true,
          message: t("account.partySizeError"),
        });
      } else {
        setPartySize(String(normalizedPartySize));
        setPartyFeedback({
          isError: false,
          message: t("account.partySizeSuccess"),
        });
      }
    } catch {
      setPartyFeedback({
        isError: true,
        message: t("account.partySizeError"),
      });
    } finally {
      setIsChangingPartySize(false);
    }
  };

  const submitEmailChange = async () => {
    Keyboard.dismiss();
    setEmailFeedback(null);

    const normalizedEmail = newEmail.trim().toLowerCase();

    if (!normalizedEmail.includes("@") || !normalizedEmail.includes(".")) {
      setEmailFeedback({ isError: true, message: t("auth.validation.email") });
      return;
    }

    if (normalizedEmail === user?.email?.toLowerCase()) {
      setEmailFeedback({
        isError: true,
        message: t("account.error.sameEmail"),
      });
      return;
    }

    if (!emailPassword) {
      setEmailFeedback({
        isError: true,
        message: t("account.validation.currentPassword"),
      });
      return;
    }

    setIsChangingEmail(true);

    try {
      const { error } = await changeEmail(emailPassword, normalizedEmail);

      if (error) {
        setEmailFeedback({
          isError: true,
          message: t(getAccountErrorTranslationKey(error)),
        });
      } else {
        setNewEmail("");
        setEmailPassword("");
        setEmailFeedback({
          isError: false,
          message: t("account.emailSuccess"),
        });
      }
    } catch {
      setEmailFeedback({ isError: true, message: t("auth.error.generic") });
    } finally {
      setIsChangingEmail(false);
    }
  };

  const submitPasswordChange = async () => {
    Keyboard.dismiss();
    setPasswordFeedback(null);

    if (!currentPassword) {
      setPasswordFeedback({
        isError: true,
        message: t("account.validation.currentPassword"),
      });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordFeedback({
        isError: true,
        message: t("auth.validation.password"),
      });
      return;
    }

    if (!/\p{L}/u.test(newPassword) || !/\p{N}/u.test(newPassword)) {
      setPasswordFeedback({
        isError: true,
        message: t("auth.validation.passwordPattern"),
      });
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordFeedback({
        isError: true,
        message: t("account.error.samePassword"),
      });
      return;
    }

    if (newPassword !== passwordConfirmation) {
      setPasswordFeedback({
        isError: true,
        message: t("auth.validation.passwordMatch"),
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      const { error } = await changePassword(currentPassword, newPassword);

      if (error) {
        setPasswordFeedback({
          isError: true,
          message: t(getAccountErrorTranslationKey(error)),
        });
      } else {
        setCurrentPassword("");
        setNewPassword("");
        setPasswordConfirmation("");
        setPasswordFeedback({
          isError: false,
          message: t("account.passwordSuccess"),
        });
      }
    } catch {
      setPasswordFeedback({ isError: true, message: t("auth.error.generic") });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const submitAccountDeletion = async () => {
    setDeleteFeedback(null);
    setIsDeleting(true);

    try {
      const result = await deleteAccount();

      if (result.error) {
        setDeleteFeedback({
          isError: true,
          message: t(
            result.code === "last_admin"
              ? "account.deleteLastAdmin"
              : "account.deleteError",
          ),
        });
        setIsDeleteDialogVisible(false);
        return;
      }

      setIsDeleteDialogVisible(false);
      router.replace("/");
    } catch {
      setDeleteFeedback({ isError: true, message: t("account.deleteError") });
      setIsDeleteDialogVisible(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 10 }}>
      <View style={styles.intro}>
        <ThemedText type="title">{t("account.title")}</ThemedText>
        <ThemedText themeColor="textSecondary">
          {t("account.description")}
        </ThemedText>
      </View>
      <View style={{ gap: 30 }}>
        <Section title={t("account.partySizeTitle")}>
          <ThemedView
            type="surface"
            style={[styles.panel, { borderColor: theme.border }]}
          >
            <ThemedText type="small" themeColor="textSecondary">
              {t("account.partySizeBody")}
            </ThemedText>
            <PartySizeField
              disabled={isChangingPartySize}
              onChange={setPartySize}
              value={partySize}
            />
            <Feedback feedback={partyFeedback} />
            <SubmitButton
              isLoading={isChangingPartySize}
              label={t("account.partySizeSave")}
              onPress={() => void submitPartySizeChange()}
            />
          </ThemedView>
        </Section>

        <Section title={t("account.emailTitle")}>
          <ThemedView
            type="surface"
            style={[styles.panel, { borderColor: theme.border }]}
          >
            <View style={styles.field}>
              <ThemedText type="smallBold">
                {t("settings.accountEmail")}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {user?.email ?? "—"}
              </ThemedText>
            </View>

            <ThemedText type="small" themeColor="textSecondary">
              {t("account.emailBody")}
            </ThemedText>

            <View style={styles.field}>
              <ThemedText type="smallBold">{t("account.newEmail")}</ThemedText>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={!isChangingEmail}
                inputMode="email"
                keyboardType="email-address"
                maxLength={254}
                onChangeText={setNewEmail}
                placeholder={t("auth.emailPlaceholder")}
                placeholderTextColor={theme.textSecondary}
                style={inputStyle}
                textContentType="emailAddress"
                value={newEmail}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold">
                {t("account.currentPassword")}
              </ThemedText>
              <TextInput
                autoCapitalize="none"
                autoComplete="current-password"
                editable={!isChangingEmail}
                onChangeText={setEmailPassword}
                onSubmitEditing={() => void submitEmailChange()}
                placeholder="••••••••"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                style={inputStyle}
                textContentType="password"
                value={emailPassword}
              />
            </View>

            <Feedback feedback={emailFeedback} />
            <SubmitButton
              isLoading={isChangingEmail}
              label={t("account.changeEmail")}
              onPress={() => void submitEmailChange()}
            />
          </ThemedView>
        </Section>

        <Section title={t("account.passwordTitle")}>
          <ThemedView
            type="surface"
            style={[styles.panel, { borderColor: theme.border }]}
          >
            <ThemedText type="small" themeColor="textSecondary">
              {t("account.passwordBody")}
            </ThemedText>

            <View style={styles.field}>
              <ThemedText type="smallBold">
                {t("account.currentPassword")}
              </ThemedText>
              <TextInput
                autoCapitalize="none"
                autoComplete="current-password"
                editable={!isChangingPassword}
                onChangeText={setCurrentPassword}
                placeholder="••••••••"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                style={inputStyle}
                textContentType="password"
                value={currentPassword}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold">
                {t("account.newPassword")}
              </ThemedText>
              <TextInput
                autoCapitalize="none"
                autoComplete="new-password"
                editable={!isChangingPassword}
                onChangeText={setNewPassword}
                placeholder="••••••••"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                style={inputStyle}
                textContentType="newPassword"
                value={newPassword}
              />
              <ThemedText type="small" themeColor="textSecondary">
                {t("auth.passwordHint")}
              </ThemedText>
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold">
                {t("auth.passwordConfirm")}
              </ThemedText>
              <TextInput
                autoCapitalize="none"
                autoComplete="new-password"
                editable={!isChangingPassword}
                onChangeText={setPasswordConfirmation}
                onSubmitEditing={() => void submitPasswordChange()}
                placeholder="••••••••"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                style={inputStyle}
                textContentType="newPassword"
                value={passwordConfirmation}
              />
            </View>

            <Feedback feedback={passwordFeedback} />
            <SubmitButton
              isLoading={isChangingPassword}
              label={t("account.changePassword")}
              onPress={() => void submitPasswordChange()}
            />
          </ThemedView>
        </Section>

        <Section title={t("account.deleteTitle")}>
          <ThemedView
            type="surface"
            style={[
              styles.panel,
              styles.dangerPanel,
              {
                backgroundColor: theme.dangerSoft,
                borderColor: theme.danger,
              },
            ]}
          >
            <ThemedText>{t("account.deleteBody")}</ThemedText>
            <ThemedText type="smallBold" themeColor="danger">
              {t("account.deleteWarning")}
            </ThemedText>
            <Feedback feedback={deleteFeedback} />
            <Pressable
              accessibilityRole="button"
              disabled={isDeleting}
              onPress={() => {
                setDeleteFeedback(null);
                setIsDeleteDialogVisible(true);
              }}
              style={({ pressed }) => [
                styles.submitButton,
                { backgroundColor: theme.danger },
                pressed && styles.pressed,
                isDeleting && styles.disabled,
              ]}
            >
              <ThemedText type="smallBold" style={{ color: theme.background }}>
                {t("account.deleteAction")}
              </ThemedText>
            </Pressable>
          </ThemedView>
        </Section>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          if (!isDeleting) {
            setIsDeleteDialogVisible(false);
          }
        }}
        transparent
        visible={isDeleteDialogVisible}
      >
        <View style={styles.modalBackdrop}>
          <ThemedView
            accessibilityViewIsModal
            type="surface"
            style={[styles.modalCard, { borderColor: theme.danger }]}
          >
            <ThemedText type="subtitle" themeColor="danger">
              {t("account.deleteConfirmTitle")}
            </ThemedText>
            <ThemedText>{t("account.deleteConfirmBody")}</ThemedText>
            <ThemedText type="smallBold" themeColor="danger">
              {t("account.deleteWarning")}
            </ThemedText>
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                disabled={isDeleting}
                onPress={() => setIsDeleteDialogVisible(false)}
                style={({ pressed }) => [
                  styles.modalButton,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                  pressed && styles.pressed,
                  isDeleting && styles.disabled,
                ]}
              >
                <ThemedText type="smallBold">
                  {t("account.deleteCancel")}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ busy: isDeleting, disabled: isDeleting }}
                disabled={isDeleting}
                onPress={() => void submitAccountDeletion()}
                style={({ pressed }) => [
                  styles.modalButton,
                  { backgroundColor: theme.danger, borderColor: theme.danger },
                  pressed && styles.pressed,
                  isDeleting && styles.disabled,
                ]}
              >
                {isDeleting ? (
                  <ActivityIndicator color={theme.background} />
                ) : (
                  <ThemedText type="smallBold" style={{ color: theme.background }}>
                    {t("account.deleteConfirm")}
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Feedback({ feedback }: { feedback: FeedbackState }) {
  const theme = useTheme();

  if (!feedback) {
    return null;
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.feedback,
        {
          backgroundColor: feedback.isError
            ? theme.dangerSoft
            : theme.successSoft,
          borderColor: feedback.isError ? theme.danger : theme.success,
        },
      ]}
    >
      <ThemedText
        type="small"
        themeColor={feedback.isError ? "danger" : "success"}
      >
        {feedback.message}
      </ThemedText>
    </View>
  );
}

function SubmitButton({
  isLoading,
  label,
  onPress,
}: {
  isLoading: boolean;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: isLoading, disabled: isLoading }}
      disabled={isLoading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.submitButton,
        { backgroundColor: theme.accent },
        pressed && styles.pressed,
        isLoading && styles.disabled,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={theme.background} />
      ) : (
        <ThemedText type="smallBold" style={{ color: theme.background }}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: Spacing.two,
  },
  panel: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  dangerPanel: {
    marginBottom: Spacing.five,
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
    textAlign: "left",
    writingDirection: "ltr",
  },
  feedback: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  submitButton: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: Spacing.three,
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.56)",
    flex: 1,
    justifyContent: "center",
    padding: Spacing.three,
  },
  modalCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.three,
    maxWidth: 520,
    padding: Spacing.four,
    width: "100%",
  },
  modalActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
    justifyContent: "flex-end",
  },
  modalButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 50,
    minWidth: 160,
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.6,
  },
});
