import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/styles";
import { CEFR_LEVELS, type CefrLevel } from "@/lib/types";

type CefrLevelPickerProps = {
  value: CefrLevel;
  onChange: (level: CefrLevel) => void;
};

// Plain-language summaries of the official CEFR level names/descriptors —
// just enough for someone to place themselves, not the full framework.
const CEFR_LEVEL_EXPLANATIONS: Record<CefrLevel, string> = {
  A1: "Breakthrough — basic words and phrases for everyday needs.",
  A2: "Waystage — simple sentences about familiar topics like family and shopping.",
  B1: "Threshold — comfortable with everyday situations, travel, and routine topics.",
  B2: "Vantage — can discuss general and some abstract topics with varied vocabulary.",
  C1: "Advanced — fluent, spontaneous use for social, academic, or work purposes.",
  C2: "Mastery — near-native fluency with precise, nuanced expression.",
};

function showCefrExplanation() {
  Alert.alert(
    "CEFR Levels",
    CEFR_LEVELS.map((level) => `${level} — ${CEFR_LEVEL_EXPLANATIONS[level]}`).join("\n\n")
  );
}

// Level isn't a property of a list (unlike language) — it's a per-quiz
// choice that defaults from Settings but can be overridden for one
// generation, so this is a plain value/onChange component (like Dropdown)
// rather than reading/writing shared list state directly.
export function CefrLevelPicker({ value, onChange }: CefrLevelPickerProps) {
  return (
    <View>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Level</Text>
        <Pressable onPress={showCefrExplanation} hitSlop={8}>
          <Text style={styles.infoIcon}>ⓘ</Text>
        </Pressable>
      </View>
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
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    opacity: 0.6,
  },
  infoIcon: {
    fontSize: 14,
    color: colors.tertiary,
    fontWeight: "700",
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
