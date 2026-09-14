import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { BackButton } from "@/components/back-button";
import { colors, shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await apiRequest("/request-password-reset", {
        method: "POST",
        body: { email: email.trim() },
      });
      // Always shown, regardless of whether the email actually has an
      // account — matches the backend's deliberately non-revealing
      // response, so this screen can't be used to check who's registered.
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={shared.screenCentered}>
      <BackButton href="/login" />
      <Text style={[shared.title, styles.centerText]}>Forgot Password</Text>

      {sent ? (
        <Text style={[shared.hint, styles.centerText]}>
          If an account exists for that email, we&apos;ve sent a link to reset your password.
          Check your inbox.
        </Text>
      ) : (
        <>
          <Text style={[shared.hint, styles.centerText]}>
            Enter your email and we&apos;ll send you a link to reset your password.
          </Text>

          {error && <Text style={[shared.errorText, styles.centerText]}>{error}</Text>}

          <TextInput
            style={shared.input}
            placeholder="Email"
            placeholderTextColor={colors.placeholder}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          <Pressable
            style={[
              shared.primaryButton,
              (!email.trim() || isSubmitting) && shared.primaryButtonDisabled,
            ]}
            disabled={!email.trim() || isSubmitting}
            onPress={handleSubmit}
          >
            <Text style={shared.primaryButtonText}>
              {isSubmitting ? "Sending…" : "Send Reset Link"}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centerText: {
    textAlign: "center",
  },
});
