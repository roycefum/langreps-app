import * as Haptics from "expo-haptics";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/styles";
import { useI18n } from "@/lib/i18n";
import { CEFR_LEVELS, type CefrLevel } from "@/lib/types";

type CefrLevelPickerProps = {
  value: CefrLevel;
  onChange: (level: CefrLevel) => void;
};

// Keys into the translation tables for each level's plain-language
// summary — just enough for someone to place themselves, not the full
// CEFR framework.
const CEFR_EXPLANATION_KEYS: Record<CefrLevel, string> = {
  A1: "cefr_a1_explanation",
  A2: "cefr_a2_explanation",
  B1: "cefr_b1_explanation",
  B2: "cefr_b2_explanation",
  C1: "cefr_c1_explanation",
  C2: "cefr_c2_explanation",
};

// Level isn't a property of a list (unlike language) — it's a per-quiz
// choice that defaults from Settings but can be overridden for one
// generation, so this is a plain value/onChange component (like Dropdown)
// rather than reading/writing shared list state directly.
export function CefrLevelPicker({ value, onChange }: CefrLevelPickerProps) {
  const { t } = useI18n();

  function showCefrExplanation() {
    Alert.alert(
      t("cefr_info_alert_title"),
      CEFR_LEVELS.map((level) => `${level} — ${t(CEFR_EXPLANATION_KEYS[level])}`).join("\n\n")
    );
  }

  return (
    <View>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{t("level_label")}</Text>
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
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                onChange(level);
              }}
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
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
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
