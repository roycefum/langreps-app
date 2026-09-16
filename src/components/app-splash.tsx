import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { colors, shared } from "@/constants/styles";
import { useI18n } from "@/lib/i18n";

// Shown every time the app launches (see _layout.tsx's AppGate), for at
// least MIN_VISIBLE_MS regardless of how fast the underlying auth restore
// finishes — otherwise the animation would just flash on a fast reload.
export const MIN_VISIBLE_MS = 1800;

export function AppSplash() {
  const { t } = useI18n();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale]);

  return (
    <View style={[shared.screenCentered, styles.container]}>
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <Text style={styles.title}>{t("app_name")}</Text>
        <Text style={styles.tagline}>{t("splash_tagline")}</Text>
      </Animated.View>
      <Text style={styles.copyright}>{t("splash_copyright")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 44,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  tagline: {
    fontSize: 15,
    color: colors.text,
    opacity: 0.65,
    textAlign: "center",
    marginTop: 8,
  },
  copyright: {
    position: "absolute",
    bottom: 20,
    right: 24,
    fontSize: 11,
    color: colors.text,
    opacity: 0.45,
  },
});
