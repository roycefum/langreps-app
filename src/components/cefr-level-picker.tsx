import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/styles";
import { CEFR_LEVELS, type CefrLevel } from "@/lib/types";

type CefrLevelPickerProps = {
  value: CefrLevel;
  onChange: (level: CefrLevel) => void;
};

// Level isn't a property of a list (unlike language) — it's a per-quiz
// choice that defaults from Settings but can be overridden for one
// generation, so this is a plain value/onChange component (like Dropdown)
// rather than reading/writing shared list state directly.
export function CefrLevelPicker({ value, onChange }: CefrLevelPickerProps) {
  return (
    <View>
      <Text style={styles.label}>Level</Text>
      <View style={styles.row}>
        {CEFR_LEVELS.map((level) => {
          const selected = level === value;
          return (
            <Pressable
              key={level}
              style={[styles.pill, selected && styles.pillSelected]}
              onPress={() => onChange(level)}
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
    backgroundColor: colors.accent,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  pillTextSelected: {
    color: "white",
  },
});
