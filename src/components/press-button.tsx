import { Pressable, type PressableProps } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Drop-in for Pressable on chunky buttons: the button dips slightly while a
// finger is down and springs back on release, so a tap physically registers.
// Reanimated's default reduce-motion handling covers people who turned
// animations off in iOS settings.
export function PressButton({ onPressIn, onPressOut, style, ...rest }: PressableProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 - pressed.get() * 0.04 },
      { translateY: pressed.get() * 2 },
    ],
  }));

  return (
    <AnimatedPressable
      {...rest}
      style={[style as object, animatedStyle]}
      onPressIn={(e) => {
        pressed.set(withSpring(1, { damping: 20, stiffness: 400 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.set(withSpring(0, { damping: 12, stiffness: 300 }));
        onPressOut?.(e);
      }}
    />
  );
}
