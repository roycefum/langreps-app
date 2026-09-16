import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

// Reached via the deep link in Supabase's password-reset email
// (langrepsapp://reset-password, configured in
// request_password_reset()) — Supabase attaches access_token/
// refresh_token/type=recovery as URL params on that redirect.
export default function ResetPassword() {
  const router = useRouter();
  const { t } = useI18n();
  const { access_token, refresh_token } = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
    type?: string;
  }>();
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasValidLink = !!access_token && !!refresh_token;

  async function handleSubmit() {
    if (!hasValidLink || !newPassword) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await apiRequest("/reset-password", {
        method: "POST",
        body: { access_token, refresh_token, new_password: newPassword },
      });
      router.replace("/login");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error_generic"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!hasValidLink) {
    return (
      <View style={shared.screenCentered}>
        <Text style={[shared.title, styles.centerText]}>{t("reset_password_title")}</Text>
        <Text style={[shared.hint, styles.centerText]}>{t("reset_link_invalid_message")}</Text>
      </View>
    );
  }

  return (
    <View style={shared.screenCentered}>
      <Text style={[shared.title, styles.centerText]}>{t("set_new_password_title")}</Text>

      {error && <Text style={[shared.errorText, styles.centerText]}>{error}</Text>}

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

      <Pressable
        style={[
          shared.primaryButton,
          (!newPassword || isSubmitting) && shared.primaryButtonDisabled,
        ]}
        disabled={!newPassword || isSubmitting}
        onPress={handleSubmit}
      >
        <Text style={shared.primaryButtonText}>
          {isSubmitting ? t("saving_ellipsis") : t("save_new_password")}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centerText: {
    textAlign: "center",
  },
});
