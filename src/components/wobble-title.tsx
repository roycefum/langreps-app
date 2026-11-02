import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

// The app name on Home: gives one small wobble when it first appears, then
// sits still. Skipped when the device asks for reduced motion.
export function WobbleTitle({ children }: { children: string }) {
  const reduceMotion = useReducedMotion();
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    // The delay lets the screen's own fade-in finish so the wobble is seen.
    rotation.value = withDelay(
      300,
      withSequence(
        withTiming(-5, { duration: 90 }),
        withTiming(5, { duration: 130 }),
        withTiming(-3, { duration: 110 }),
        withTiming(2, { duration: 90 }),
        withTiming(0, { duration: 90 })
      )
    );
  }, [reduceMotion, rotation]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return <Animated.Text style={[styles.title, style]}>{children}</Animated.Text>;
}

const styles = StyleSheet.create({
  title: {
    fontSize: 44,
    fontWeight: "700",
  },
});
