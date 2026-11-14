import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { BackButton } from "@/components/back-button";
import { PressButton } from "@/components/press-button";
import { colors, shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

// The second half of "Forgot password": the recovery email holds a one-time
// code (not a link, which mail apps, scanners and browsers kept breaking), and
// it is typed in here along with the new password. The backend checks the code
// and sets the password (POST /reset-password-with-code).
export default function ResetPassword() {
  const router = useRouter();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !!email.trim() && !!code.trim() && !!newPassword && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await apiRequest("/reset-password-with-code", {
        method: "POST",
        body: { email: email.trim(), code: code.trim(), new_password: newPassword },
      });
      router.replace("/login");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error_generic"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={shared.screenCentered}>
      <BackButton href="/login" />
      <Text style={[shared.title, styles.centerText]}>{t("reset_password_title")}</Text>
      <Text style={[shared.hint, styles.centerText]}>{t("reset_code_instructions")}</Text>

      {error && <Text style={[shared.errorText, styles.centerText]}>{error}</Text>}

      <TextInput
        style={shared.input}
        placeholder={t("email_placeholder")}
        placeholderTextColor={colors.placeholder}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />
      <TextInput
        style={shared.input}
        placeholder={t("code_placeholder")}
        placeholderTextColor={colors.placeholder}
        value={code}
        onChangeText={setCode}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
      />
      <TextInput
        style={shared.input}
        placeholder={t("new_password_placeholder")}
        placeholderTextColor={colors.placeholder}
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />

      <PressButton
        style={[shared.primaryButton, !canSubmit && shared.primaryButtonDisabled]}
        disabled={!canSubmit}
        onPress={handleSubmit}
      >
        <Text style={shared.primaryButtonText}>
          {isSubmitting ? t("saving_ellipsis") : t("save_new_password")}
        </Text>
      </PressButton>
    </View>
  );
}

const styles = StyleSheet.create({
  centerText: {
    textAlign: "center",
  },
});
