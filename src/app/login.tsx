import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { BackButton } from "@/components/back-button";
import { shared } from "@/constants/styles";
import { useAuth } from "@/lib/auth-context";

type Mode = "login" | "signup";

export default function Login() {
  const router = useRouter();
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
          confirmationRequired
            ? "Check your email to confirm, then log in below."
            : "Account created — log in below."
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={shared.screenCentered}>
      <BackButton href="/" />
      <Text style={[shared.title, styles.centerText]}>
        {mode === "login" ? "Log In" : "Sign Up"}
      </Text>

      {message && <Text style={[shared.hint, styles.centerText]}>{message}</Text>}
      {error && <Text style={[shared.errorText, styles.centerText]}>{error}</Text>}

      <TextInput
        style={shared.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />
      <TextInput
        style={shared.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Pressable
        style={[
          shared.primaryButton,
          (!email.trim() || !password || isSubmitting) && shared.primaryButtonDisabled,
        ]}
        disabled={!email.trim() || !password || isSubmitting}
        onPress={handleSubmit}
      >
        <Text style={shared.primaryButtonText}>
          {isSubmitting ? "Please wait…" : mode === "login" ? "Log In" : "Sign Up"}
        </Text>
      </Pressable>

      {mode === "login" ? (
        <Pressable style={shared.backLink} onPress={() => switchMode("signup")}>
          <Text>
            Don&apos;t have an account? <Text style={shared.linkText}>Sign up</Text>
          </Text>
        </Pressable>
      ) : (
        <Pressable style={shared.backLink} onPress={() => switchMode("login")}>
          <Text>
            Already have an account? <Text style={shared.linkText}>Log in</Text>
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centerText: {
    textAlign: "center",
  },
});
