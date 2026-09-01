import { StyleSheet, View } from "react-native";

import { colors } from "@/constants/styles";

type ProgressBarProps = {
  /** 0 to 1 */
  progress: number;
};

export function ProgressBar({ progress }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e2e2e2",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
