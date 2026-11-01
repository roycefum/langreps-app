import { Link, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { PressButton } from "@/components/press-button";
import { colors, shared } from "@/constants/styles";
import { useI18n } from "@/lib/i18n";
import { setContinuedAsGuest } from "@/lib/settings-storage";

// The first real screen (after the intro): log in / sign up, or look around
// without an account. Guests can quiz Essentials; an account is what saves
// lists and progress. Home sends anyone who is neither signed in nor a
// returning guest here.
export default function Welcome() {
  const router = useRouter();
  const { t } = useI18n();

  async function handleContinueAsGuest() {
    await setContinuedAsGuest(true);
    router.replace("/");
  }

  return (
    <View style={[shared.screenCentered, styles.container]}>
      <Text style={styles.title}>{t("app_name")}</Text>
      <Text style={styles.subtitle}>{t("home_subtitle")}</Text>

      <View style={styles.buttons}>
        <Link href="/login" asChild>
          <PressButton style={loginButtonStyle}>
            <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>{t("log_in_sign_up")}</Text>
          </PressButton>
        </Link>
        <Text style={[shared.hint, styles.centerText]}>{t("signup_incentive_hint")}</Text>
        <PressButton style={shared.primaryButton} onPress={handleContinueAsGuest}>
          <Text style={shared.primaryButtonText}>{t("continue_without_account")}</Text>
        </PressButton>
      </View>
    </View>
  );
}

// Flattened because Link asChild's Slot rejects an array of styles on its child.
const loginButtonStyle = StyleSheet.flatten([
  shared.primaryButton,
  { backgroundColor: colors.accent, borderBottomColor: colors.accentShadow },
]);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 24,
  },
  title: {
    fontSize: 44,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.7,
  },
  buttons: {
    alignSelf: "stretch",
    gap: 12,
  },
  centerText: {
    textAlign: "center",
  },
});
