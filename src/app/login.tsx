import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
} from "react-native";

import { BackButton } from "@/components/back-button";
import { PressButton } from "@/components/press-button";
import { colors, shared } from "@/constants/styles";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";

type Mode = "login" | "signup";

export default function Login() {
  const router = useRouter();
  const { t } = useI18n();
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError(null);
    setMessage(null);
  }

  async function handleSubmit() {
    if (!email.trim() || !password) return;
    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
        router.replace("/");
      } else {
        const { confirmationRequired } = await signup(email.trim(), password);
        setMode("login");
        setPassword("");
        setMessage(
          confirmationRequired ? t("confirm_email_message") : t("account_created_message")
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error_generic"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <KeyboardAvoidingView
      style={shared.screenCentered}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <BackButton href="/" />
      <Text style={[shared.title, styles.centerText]}>
        {mode === "login" ? t("log_in") : t("sign_up")}
      </Text>

      {message && <Text style={[shared.hint, styles.centerText]}>{message}</Text>}
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
        placeholder={t("password_placeholder")}
        placeholderTextColor={colors.placeholder}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />

      <PressButton
        style={[
          shared.primaryButton,
          (!email.trim() || !password || isSubmitting) && shared.primaryButtonDisabled,
        ]}
        disabled={!email.trim() || !password || isSubmitting}
        onPress={handleSubmit}
      >
        <Text style={shared.primaryButtonText}>
          {isSubmitting ? t("please_wait") : mode === "login" ? t("log_in") : t("sign_up")}
        </Text>
      </PressButton>

      {mode === "login" ? (
        <>
          <Pressable style={shared.backLink} onPress={() => switchMode("signup")}>
            <Text>{t("switch_to_signup")}</Text>
          </Pressable>
          <Link href="/forgot-password" style={shared.backLink}>
            <Text style={shared.linkText}>{t("forgot_password_link")}</Text>
          </Link>
        </>
      ) : (
        <Pressable style={shared.backLink} onPress={() => switchMode("login")}>
          <Text>{t("switch_to_login")}</Text>
        </Pressable>
      )}
    </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  centerText: {
    textAlign: "center",
  },
});
