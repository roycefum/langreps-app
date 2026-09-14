import { Pressable, StyleSheet, Text, View } from "react-native";

import { shared } from "@/constants/styles";

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
  return (
    <View style={styles.container}>
      <Text style={shared.hint}>
        Detected {firstLanguage} and {secondLanguage}. Which one do you already know?
      </Text>
      <View style={styles.row}>
        <Pressable
          style={[shared.secondaryButton, shared.addActionButton, styles.button]}
          onPress={() => onConfirm(true)}
        >
          <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>
            I know {firstLanguage}
          </Text>
        </Pressable>
        <Pressable
          style={[shared.secondaryButton, shared.addActionButton, styles.button]}
          onPress={() => onConfirm(false)}
        >
          <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>
            I know {secondLanguage}
          </Text>
        </Pressable>
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
