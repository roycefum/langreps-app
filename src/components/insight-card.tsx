import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

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
    <Animated.View style={styles.card} entering={FadeInDown.duration(450)}>
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
    </Animated.View>
  );
}

// Pulsing placeholder shown while the tailored feedback is being fetched, so
// the card doesn't just pop in and shove everything down.
export function InsightSkeleton() {
  const pulse = useSharedValue(0.45);
  useEffect(() => {
    pulse.set(withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.45, { duration: 700 })), -1));
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ opacity: pulse.get() }));
  return (
    <Animated.View style={[styles.card, style]}>
      <View style={[styles.skeletonLine, { width: "92%" }]} />
      <View style={[styles.skeletonLine, { width: "70%" }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  skeletonLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.cardAccent,
  },
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
