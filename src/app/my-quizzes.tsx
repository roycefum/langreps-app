import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BackButton } from "@/components/back-button";
import { colors, shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useQuiz } from "@/lib/quiz-context";
import type { Question } from "@/lib/types";

type ListSummary = {
  id: string;
  name: string;
  source_language: string;
  target_language: string;
};

type QuizSessionRow = {
  id: string;
  list_id: string;
  questions: Question[];
  current_index: number;
};

export default function MyQuizzes() {
  const router = useRouter();
  const { startQuiz } = useQuiz();
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [sessions, setSessions] = useState<QuizSessionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [listsResult, sessionsResult] = await Promise.all([
        apiRequest<{ lists: ListSummary[] }>("/lists"),
        apiRequest<{ sessions: QuizSessionRow[] }>("/quiz-sessions"),
      ]);
      setLists(listsResult.lists);
      setSessions(sessionsResult.sessions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong loading your quizzes.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Guards against a double-tap pushing the quiz route twice before this
  // screen unmounts.
  const isResumingRef = useRef(false);

  function resumeSession(session: QuizSessionRow) {
    if (isResumingRef.current) return;
    isResumingRef.current = true;
    startQuiz(session.questions, session.id, session.current_index);
    router.push("/quiz");
  }

  function confirmDelete(session: QuizSessionRow) {
    const list = lists.find((l) => l.id === session.list_id);
    Alert.alert(
      "Delete Quiz",
      `Delete this quiz${list ? ` for "${list.name}"` : ""}? This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiRequest(`/quiz-sessions/${session.id}`, { method: "DELETE" });
              setSessions((prev) => prev.filter((s) => s.id !== session.id));
            } catch (e) {
              setError(e instanceof Error ? e.message : "Something went wrong deleting that quiz.");
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={shared.screen} contentContainerStyle={styles.content}>
      <BackButton href="/" />
      <Text style={shared.title}>My Quizzes</Text>

      {error && <Text style={shared.errorText}>{error}</Text>}
      {isLoading && <Text style={shared.hint}>Loading…</Text>}

      {!isLoading &&
        (sessions.length === 0 ? (
          <Text style={shared.hint}>No quizzes in progress.</Text>
        ) : (
          <View style={styles.section}>
            {sessions.map((session) => {
              const list = lists.find((l) => l.id === session.list_id);
              return (
                <View key={session.id} style={styles.row}>
                  <Pressable style={styles.rowMain} onPress={() => resumeSession(session)}>
                    <Text style={styles.rowTitle}>{list?.name ?? "Quiz in progress"}</Text>
                    <Text style={shared.hint}>
                      Question {session.current_index + 1} of {session.questions.length}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => confirmDelete(session)}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 32,
  },
  section: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  deleteText: {
    color: colors.error,
    fontWeight: "600",
  },
});
