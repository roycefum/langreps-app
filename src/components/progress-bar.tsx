import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/constants/styles";

type ProgressBarProps = {
  /** 0 to 1 */
  progress: number;
  /** Bar thickness in px (default 8) */
  height?: number;
};

export function ProgressBar({ progress, height = 8 }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const fill = useSharedValue(clamped);

  useEffect(() => {
    fill.set(withTiming(clamped, { duration: 450, easing: Easing.out(Easing.cubic) }));
  }, [clamped, fill]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <Animated.View style={[styles.fill, { borderRadius: height / 2 }, fillStyle]} />
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
