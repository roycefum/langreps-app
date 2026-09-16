import { useRouter } from "expo-router";
import { useState, type ComponentType } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline, Rect } from "react-native-svg";

import { colors, shared } from "@/constants/styles";
import { useI18n } from "@/lib/i18n";
import { setHasSeenOnboarding } from "@/lib/settings-storage";

// Simple geometric shapes rather than actual app screenshots — screenshots
// go stale the moment any screen's UI changes (which has happened a lot
// this project), while a plain icon never needs re-capturing.
function BuildListIllustration() {
  return (
    <Svg width={160} height={160} viewBox="0 0 160 160">
      <Rect x={30} y={70} width={100} height={55} rx={12} stroke={colors.photoAction} strokeWidth={3} fill="none" />
      <Rect x={20} y={55} width={100} height={55} rx={12} stroke={colors.fileAction} strokeWidth={3} fill="none" />
      <Rect x={10} y={40} width={100} height={55} rx={12} stroke={colors.addAction} strokeWidth={3} fill="none" />
    </Svg>
  );
}

function QuizIllustration() {
  return (
    <Svg width={160} height={160} viewBox="0 0 160 160">
      <Rect x={20} y={40} width={110} height={75} rx={16} stroke={colors.generateQuiz} strokeWidth={3} fill="none" />
      <Line x1={42} y1={77} x2={108} y2={77} stroke={colors.generateQuiz} strokeWidth={3} strokeDasharray="8,6" />
      <Circle cx={120} cy={110} r={18} fill={colors.generateQuiz} />
      <Line x1={112} y1={110} x2={118} y2={116} stroke="white" strokeWidth={3} strokeLinecap="round" />
      <Line x1={118} y1={116} x2={129} y2={103} stroke="white" strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

function ProgressIllustration() {
  const points = [
    { x: 20, y: 120 },
    { x: 52, y: 92 },
    { x: 84, y: 100 },
    { x: 116, y: 55 },
    { x: 140, y: 40 },
  ];
  return (
    <Svg width={160} height={160} viewBox="0 0 160 160">
      <Polyline
        points={points.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke={colors.primary}
        strokeWidth={3}
      />
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={5} fill={colors.primary} />
      ))}
    </Svg>
  );
}

type Slide = {
  Illustration: ComponentType;
  headlineKey: string;
  bodyKey: string;
};

const SLIDES: Slide[] = [
  {
    Illustration: BuildListIllustration,
    headlineKey: "slide1_headline",
    bodyKey: "slide1_body_updated",
  },
  {
    Illustration: QuizIllustration,
    headlineKey: "slide2_headline",
    bodyKey: "slide2_body",
  },
  {
    Illustration: ProgressIllustration,
    headlineKey: "slide3_headline",
    bodyKey: "slide3_body",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const { t } = useI18n();
  const [slideIndex, setSlideIndex] = useState(0);
  const isLast = slideIndex === SLIDES.length - 1;
  const slide = SLIDES[slideIndex];

  async function finish() {
    await setHasSeenOnboarding(true);
    router.replace("/");
  }

  function next() {
    if (isLast) {
      finish();
    } else {
      setSlideIndex((i) => i + 1);
    }
  }

  function back() {
    setSlideIndex((i) => Math.max(0, i - 1));
  }

  return (
    <View style={[shared.screenCentered, styles.container]}>
      <Pressable style={styles.skip} onPress={finish}>
        <Text style={shared.linkText}>{t("skip")}</Text>
      </Pressable>

      <View style={styles.illustration}>
        <slide.Illustration />
      </View>

      <Text style={[shared.title, styles.centerText]}>{t(slide.headlineKey)}</Text>
      <Text style={[shared.hint, styles.centerText, styles.body]}>{t(slide.bodyKey)}</Text>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === slideIndex && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.navRow}>
        {slideIndex > 0 ? (
          <Pressable onPress={back}>
            <Text style={shared.linkText}>{t("back")}</Text>
          </Pressable>
        ) : (
          <View style={styles.navSpacer} />
        )}
        <Pressable
          style={[shared.primaryButton, shared.generateQuizButton, styles.nextButton]}
          onPress={next}
        >
          <Text style={shared.primaryButtonText}>{isLast ? t("get_started") : t("next")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  skip: {
    position: "absolute",
    top: 16,
    right: 24,
  },
  illustration: {
    alignItems: "center",
    justifyContent: "center",
    height: 160,
  },
  centerText: {
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    paddingHorizontal: 16,
  },
  dots: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondaryShadow,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginTop: 8,
  },
  navSpacer: {
    width: 1,
  },
  nextButton: {
    paddingHorizontal: 32,
  },
});
