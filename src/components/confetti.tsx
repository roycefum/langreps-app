import { useEffect, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/constants/styles";

const PIECE_COUNT = 28;
const PIECE_COLORS = [
  colors.primary,
  colors.accent,
  colors.tertiary,
  colors.fileAction,
  colors.photoAction,
  colors.saveAction,
];

type Piece = {
  x: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  drift: number;
  spin: number;
  round: boolean;
};

function makePieces(width: number): Piece[] {
  return Array.from({ length: PIECE_COUNT }, (_, i) => ({
    x: Math.random() * width,
    size: 7 + Math.random() * 6,
    color: PIECE_COLORS[i % PIECE_COLORS.length],
    delay: Math.random() * 500,
    duration: 1800 + Math.random() * 1200,
    drift: (Math.random() - 0.5) * 120,
    spin: 360 + Math.random() * 540,
    round: Math.random() < 0.3,
  }));
}

function ConfettiPiece({ piece, fall }: { piece: Piece; fall: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withDelay(piece.delay, withTiming(1, { duration: piece.duration, easing: Easing.in(Easing.quad) }))
    );
  }, [piece, progress]);

  const style = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: p === 0 ? 0 : p > 0.8 ? (1 - p) / 0.2 : 1,
      transform: [
        { translateX: p * piece.drift },
        { translateY: -20 + p * fall },
        { rotate: `${p * piece.spin}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left: piece.x,
          width: piece.size,
          height: piece.round ? piece.size : piece.size * 1.6,
          borderRadius: piece.round ? piece.size / 2 : 2,
          backgroundColor: piece.color,
        },
        style,
      ]}
    />
  );
}

// A short, small burst that falls once from the top of the screen and then
// removes itself — deliberately modest, for a strong quiz result only.
export function Confetti() {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [pieces] = useState(() => makePieces(width));
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDone(true), 3800);
    return () => clearTimeout(timer);
  }, []);

  if (done || reduceMotion) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((piece, i) => (
        <ConfettiPiece key={i} piece={piece} fall={height * 0.85} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: {
    position: "absolute",
    top: 0,
  },
});
