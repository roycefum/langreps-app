import { useEffect, type ReactNode } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/constants/styles";

type AnswerFeedbackProps = {
  correct: boolean;
  children: ReactNode;
};

// The result banner after an answer: a correct one fades in with a small,
// quick settle (no bounce), a wrong one flashes red and shakes side to side. Mounts fresh for every
// answer, so the animation plays each time.
export function AnswerFeedback({ correct, children }: AnswerFeedbackProps) {
  const scale = useSharedValue(correct ? 0.92 : 1);
  const shake = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.set(withTiming(1, { duration: 160 }));
    if (correct) {
      scale.set(withSpring(1, { damping: 18, stiffness: 260 }));
    } else {
      shake.set(
        withSequence(
          withTiming(-10, { duration: 55 }),
          withTiming(10, { duration: 55 }),
          withTiming(-8, { duration: 55 }),
          withTiming(8, { duration: 55 }),
          withTiming(0, { duration: 55 })
        )
      );
    }
  }, [correct, opacity, scale, shake]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ scale: scale.get() }, { translateX: shake.get() }],
  }));

  return (
    <Animated.View style={[styles.banner, correct ? styles.correct : styles.incorrect, style]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  correct: {
    backgroundColor: "rgba(39, 174, 96, 0.14)",
  },
  incorrect: {
    backgroundColor: "rgba(192, 57, 43, 0.14)",
  },
});
