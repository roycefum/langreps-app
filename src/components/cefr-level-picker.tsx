import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/styles";
import { usePairs } from "@/lib/pairs-context";
import { CEFR_LEVELS } from "@/lib/types";

// Editable version — shown on each builder screen (add/paste/file/photo),
// same placement as LanguagePicker, since level (like the language pair) is
// set when the list is made and read when the quiz is generated.
export function CefrLevelPicker() {
  const { cefrLevel, setCefrLevel } = usePairs();

  return (
    <View>
      <Text style={styles.label}>Level</Text>
      <View style={styles.row}>
        {CEFR_LEVELS.map((level) => {
          const selected = level === cefrLevel;
          return (
            <Pressable
              key={level}
              style={[styles.pill, selected && styles.pillSelected]}
              onPress={() => setCefrLevel(level)}
            >
              <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{level}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    opacity: 0.6,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    gap: 6,
  },
  pill: {
    flex: 1,
    backgroundColor: colors.secondaryBackground,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  pillSelected: {
    backgroundColor: colors.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  pillTextSelected: {
    color: "white",
  },
});
