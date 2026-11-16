import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { BackButton } from "@/components/back-button";
import { PressButton } from "@/components/press-button";
import { colors, shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

// Reached via the deep link in Supabase's password-reset email
// (langrepsapp://reset-password, configured in
// request_password_reset()) — Supabase attaches access_token/
// refresh_token/type=recovery to that redirect after a "#", which Expo Router
// hands over as one "#" param ("access_token=…&refresh_token=…") rather than as
// separate params. Plain "?" params are accepted too.
export default function ResetPassword() {
  const router = useRouter();
  const { t } = useI18n();
  const params = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
    type?: string;
    "#"?: string;
  }>();
  // The raw URL the app was opened with is the reliable source: it always
  // carries the "#access_token=…&refresh_token=…" part intact.
  const url = Linking.useLinkingURL();
  const rawFragment = url?.split("#")[1] ?? params["#"] ?? "";
  const fragment = new URLSearchParams(rawFragment);
  const access_token = params.access_token ?? fragment.get("access_token") ?? undefined;
  const refresh_token = params.refresh_token ?? fragment.get("refresh_token") ?? undefined;
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasValidLink = !!access_token && !!refresh_token;
  // Why the link failed, when it did: Supabase's own error code from the link
  // (e.g. otp_expired), or a note that the app received no link data at all.
  const linkProblem = fragment.get("error_code") ?? (url ? "no_token_in_link" : "no_link_received");

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
        <BackButton href="/login" />
        <Text style={[shared.title, styles.centerText]}>{t("reset_password_title")}</Text>
        <Text style={[shared.hint, styles.centerText]}>{t("reset_link_invalid_message")}</Text>
        <Text style={[shared.hint, styles.centerText]}>({linkProblem})</Text>
      </View>
    );
  }

  return (
    <View style={shared.screenCentered}>
      <BackButton href="/login" />
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

      <PressButton
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
      </PressButton>
    </View>
  );
}

const styles = StyleSheet.create({
  centerText: {
    textAlign: "center",
  },
});
