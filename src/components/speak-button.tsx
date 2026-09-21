import { StyleSheet, Text } from "react-native";

import { PressButton } from "@/components/press-button";
import { colors } from "@/constants/styles";
import { speakWord } from "@/lib/pronunciation";

type SpeakButtonProps = {
  text: string;
  language: string;
};

// Small icon button that plays a word's pronunciation via the device's own
// TTS engine (see lib/pronunciation.ts) — no network call, no backend
// involvement, so it's safe to drop next to any word anywhere in the app.
export function SpeakButton({ text, language }: SpeakButtonProps) {
  return (
    <PressButton onPress={() => speakWord(text, language)} hitSlop={8} style={styles.button}>
      <Text style={styles.icon}>🔊</Text>
    </PressButton>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 4,
  },
  icon: {
    fontSize: 15,
    color: colors.tertiary,
  },
});
