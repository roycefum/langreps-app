import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import Animated, { FadeIn } from "react-native-reanimated";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { AppSplash, MIN_VISIBLE_MS } from "@/components/app-splash";
import { colors } from "@/constants/styles";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { LocaleProvider } from "@/lib/i18n";
import { PairsProvider } from "@/lib/pairs-context";
import { QuizProvider } from "@/lib/quiz-context";

const queryClient = new QueryClient();

// Shows the branded splash on every app launch — not just while the auth
// restore is genuinely in flight, but for at least MIN_VISIBLE_MS, so a
// near-instant restore doesn't make the animation flash by unseen.
function AppGate({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading || !minTimeElapsed) {
    return <AppSplash />;
  }
  // Fades the app in as the splash leaves, instead of a hard cut.
  return (
    <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(350)}>
      {children}
    </Animated.View>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <AuthProvider>
          <PairsProvider>
            <QuizProvider>
              <SafeAreaProvider>
                {/* Every screen already has its own title text and back
                    navigation (a "← Back to Home" link or button) — the native
                    stack header just duplicated that with raw route filenames
                    ("index", "generate-quiz", etc.) showing to real users.
                    Hiding it also removed the safe-area padding it used to
                    provide, so that's applied here instead (top edge only —
                    bottom is handled per-screen where needed, e.g. a
                    ScrollView's contentContainerStyle padding). */}
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
                  <AppGate>
                    <Stack screenOptions={{ headerShown: false }}>
                      {/* Finishing a quiz fades in rather than sliding like
                          ordinary navigation, so it reads as a moment.
                          Settings and the dev test screen rise from the
                          bottom like a sheet. */}
                      <Stack.Screen name="quiz-complete" options={{ animation: "fade" }} />
                      <Stack.Screen name="settings" options={{ animation: "slide_from_bottom" }} />
                      <Stack.Screen name="test-data" options={{ animation: "slide_from_bottom" }} />
                    </Stack>
                  </AppGate>
                </SafeAreaView>
              </SafeAreaProvider>
            </QuizProvider>
          </PairsProvider>
        </AuthProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
}
