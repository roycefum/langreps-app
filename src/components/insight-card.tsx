import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/styles";
import { useI18n } from "@/lib/i18n";

type InsightCardProps = {
  message: string;
  // Real "typed → correct" answers from the last quiz the message is based
  // on, one per line under the message. Omit for a plain message.
  examples?: string[];
};

// The tailored feedback from the last quiz — deliberately large and on its
// own card, not fine print, since it's the reason to pick Target My
// Mistakes. Shared by Generate Quiz and Quiz Complete.
export function InsightCard({ message, examples = [] }: InsightCardProps) {
  const { t } = useI18n();
  return (
    <View style={styles.card}>
      <Text style={styles.message}>{message}</Text>
      {examples.length > 0 && (
        <View style={styles.examples}>
          <Text style={styles.examplesLabel}>{t("insight_examples_label")}</Text>
          {examples.map((example, i) => (
            <Text key={i} style={styles.example}>
              {example}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "stretch",
    gap: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    borderTopWidth: 3,
    borderTopColor: colors.cardAccent,
    padding: 16,
  },
  message: {
    fontSize: 17,
    lineHeight: 25,
    fontWeight: "600",
    color: colors.text,
  },
  examples: {
    gap: 4,
  },
  examplesLabel: {
    fontSize: 13,
    opacity: 0.6,
    color: colors.text,
  },
  example: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.text,
  },
});
