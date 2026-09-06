import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/styles";
import { AuthProvider } from "@/lib/auth-context";
import { PairsProvider } from "@/lib/pairs-context";
import { QuizProvider } from "@/lib/quiz-context";

const queryClient = new QueryClient();

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
                <Stack screenOptions={{ headerShown: false }} />
              </SafeAreaView>
            </SafeAreaProvider>
          </QuizProvider>
        </PairsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
