import { useEffect } from "react";
import { StyleSheet, type TextStyle } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/constants/styles";

type GenerateTitleProps = {
  children: string;
  // True while a quiz is being generated: the title swaps its entrance pop
  // for a slow, continuous bob so the screen feels busy, not frozen.
  busy: boolean;
  style?: TextStyle;
};

// The Generate Quiz screen's heading. It pops in with a springy overshoot
// when the screen opens, and bobs up and down while the quiz is generating.
// Both are skipped when the device asks for reduced motion.
export function GenerateTitle({ children, busy, style }: GenerateTitleProps) {
  const reduceMotion = useReducedMotion();
  const pop = useSharedValue(reduceMotion ? 1 : 0);
  const bob = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    pop.value = withSpring(1, { damping: 7, stiffness: 140, mass: 0.8 });
  }, [reduceMotion, pop]);

  useEffect(() => {
    if (reduceMotion) return;
    if (busy) {
      bob.value = withRepeat(
        withSequence(
          withTiming(-7, { duration: 450, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 450, easing: Easing.inOut(Easing.quad) })
        ),
        -1
      );
    } else {
      cancelAnimation(bob);
      bob.value = withTiming(0, { duration: 200 });
    }
  }, [busy, reduceMotion, bob]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 1.5),
    transform: [{ translateY: bob.value }, { scale: 0.5 + pop.value * 0.5 }],
  }));

  return <Animated.Text style={[styles.title, style, animatedStyle]}>{children}</Animated.Text>;
}

const styles = StyleSheet.create({
  title: {
    fontSize: 38,
    fontWeight: "700",
    textAlign: "center",
    color: colors.text,
  },
});
