import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";

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
            <Stack />
          </QuizProvider>
        </PairsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
