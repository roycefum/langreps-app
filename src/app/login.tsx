import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { CefrLevelPicker } from "@/components/cefr-level-picker";
import { Dropdown } from "@/components/dropdown";
import { shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { setDefaultCefrLevel } from "@/lib/settings-storage";
import { getStarterPairs } from "@/lib/starter-vocab";
import { DEFAULT_CEFR_LEVEL, DEFAULT_SOURCE_LANGUAGE, DEFAULT_TARGET_LANGUAGE, LANGUAGES, type CefrLevel } from "@/lib/types";

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

  // Collected during signup, used to seed a starter vocab list and the
  // default CEFR level on this account's first successful login (signup
  // itself never returns a session — email confirmation may be required —
  // so the actual seeding happens post-login instead). Surviving the
  // signup -> login mode switch needs no persistence since it's the same
  // mounted component the whole time.
  const [sourceLanguage, setSourceLanguage] = useState(DEFAULT_SOURCE_LANGUAGE);
  const [targetLanguage, setTargetLanguage] = useState(DEFAULT_TARGET_LANGUAGE);
  const [cefrLevel, setCefrLevel] = useState<CefrLevel>(DEFAULT_CEFR_LEVEL);
  const pendingSeedRef = useRef(false);

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError(null);
    setMessage(null);
  }

  async function seedNewAccount() {
    try {
      await setDefaultCefrLevel(cefrLevel);
      const pairs = getStarterPairs(sourceLanguage, targetLanguage);
      if (pairs) {
        await apiRequest("/save-list", {
          method: "POST",
          body: {
            name: `${targetLanguage} Starter Vocab`,
            source: "seed",
            source_language: sourceLanguage,
            target_language: targetLanguage,
            pairs,
            list_type: "vocab",
          },
        });
      }
    } catch {
      // Best-effort — a failed seed shouldn't block a brand-new user from
      // reaching the app; they can always build their own list instead.
    }
  }

  async function handleSubmit() {
    if (!email.trim() || !password) return;
    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
        if (pendingSeedRef.current) {
          pendingSeedRef.current = false;
          await seedNewAccount();
        }
        router.replace("/");
      } else {
        const { confirmationRequired } = await signup(email.trim(), password);
        pendingSeedRef.current = true;
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

      {mode === "signup" && (
        <>
          <View style={styles.languageRow}>
            <View style={styles.languageField}>
              <Text style={shared.hint}>I already know</Text>
              <Dropdown value={sourceLanguage} onChange={setSourceLanguage} options={LANGUAGES} />
            </View>
            <View style={styles.languageField}>
              <Text style={shared.hint}>I'm learning</Text>
              <Dropdown value={targetLanguage} onChange={setTargetLanguage} options={LANGUAGES} />
            </View>
          </View>
          <CefrLevelPicker value={cefrLevel} onChange={setCefrLevel} />
        </>
      )}

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
          <Text>Don&apos;t have an account? Sign up</Text>
        </Pressable>
      ) : (
        <Pressable style={shared.backLink} onPress={() => switchMode("login")}>
          <Text>Already have an account? Log in</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centerText: {
    textAlign: "center",
  },
  languageRow: {
    flexDirection: "row",
    gap: 8,
  },
  languageField: {
    flex: 1,
    gap: 4,
  },
});
