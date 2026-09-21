import { StyleSheet, Text, View } from "react-native";

import { PressButton } from "@/components/press-button";
import { shared } from "@/constants/styles";
import { useI18n } from "@/lib/i18n";

type LanguageOrderConfirmProps = {
  // The two languages involved, in whatever order the source data implied
  // (e.g. the first/second word in each parsed line, or the original word
  // vs. its AI translation). Never assumed to be known-then-learning —
  // that's exactly what this asks the user to settle, since a textbook
  // list often puts the foreign word first while handwritten notes might
  // not, and a translated word's own language isn't necessarily the one
  // the user already knows either.
  firstLanguage: string;
  secondLanguage: string;
  onConfirm: (knownIsFirst: boolean) => void;
};

// Shown once, right after a fresh parse/translation detects which two
// languages are involved — asks which one the user already knows instead
// of assuming an order, then the caller reorders pairs accordingly.
export function LanguageOrderConfirm({
  firstLanguage,
  secondLanguage,
  onConfirm,
}: LanguageOrderConfirmProps) {
  const { t } = useI18n();
  return (
    <View style={styles.container}>
      <Text style={shared.hint}>
        {t("order_confirm_prompt_template", { first: firstLanguage, second: secondLanguage })}
      </Text>
      <View style={styles.row}>
        <PressButton
          style={[shared.secondaryButton, shared.addActionButton, styles.button]}
          onPress={() => onConfirm(true)}
        >
          <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>
            {t("order_confirm_option_template", { language: firstLanguage })}
          </Text>
        </PressButton>
        <PressButton
          style={[shared.secondaryButton, shared.addActionButton, styles.button]}
          onPress={() => onConfirm(false)}
        >
          <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>
            {t("order_confirm_option_template", { language: secondLanguage })}
          </Text>
        </PressButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    flex: 1,
  },
});
