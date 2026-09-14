import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { AppSplash, MIN_VISIBLE_MS } from "@/components/app-splash";
import { colors } from "@/constants/styles";
import { AuthProvider, useAuth } from "@/lib/auth-context";
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
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
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
                  <Stack screenOptions={{ headerShown: false }} />
                </AppGate>
              </SafeAreaView>
            </SafeAreaProvider>
          </QuizProvider>
        </PairsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
