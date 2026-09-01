import { Link } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { colors } from "@/constants/styles";

// Shown on paste-text and upload-file, whose parsing is best-effort text
// matching (not AI) and can misfire on unusual formatting — nudges toward
// the photo path, which is both more forgiving (AI-extracted) and a more
// natural mobile input method than typing/pasting a list.
export function ParsingWarning() {
  return (
    <Text style={styles.text}>
      Parsing can make mistakes with unusual formatting. For best results, try{" "}
      <Link href="/upload-picture" style={styles.link}>
        Share a Picture
      </Link>{" "}
      instead.
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 13,
    opacity: 0.7,
  },
  link: {
    color: colors.primary,
    fontWeight: "600",
  },
});
