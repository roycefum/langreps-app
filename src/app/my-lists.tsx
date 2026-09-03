import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { usePairs, type SavedList } from "@/lib/pairs-context";
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

export default function MyLists() {
  const router = useRouter();
  const { loadList } = usePairs();
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
      setError(e instanceof Error ? e.message : "Something went wrong loading your lists.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function resumeSession(session: QuizSessionRow) {
    startQuiz(session.questions, session.id, session.current_index);
    router.push("/quiz");
  }

  async function openList(listId: string) {
    try {
      const list = await apiRequest<SavedList>(`/lists/${listId}`);
      loadList(list);
      router.push("/generate-quiz");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong loading that list.");
    }
  }

  function confirmDelete(list: ListSummary) {
    Alert.alert("Delete List", `Delete "${list.name}"? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiRequest(`/lists/${list.id}`, { method: "DELETE" });
            load();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong deleting that list.");
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={shared.screen} contentContainerStyle={styles.content}>
      <Text style={shared.title}>My Lists</Text>

      {error && <Text style={shared.errorText}>{error}</Text>}
      {isLoading && <Text style={shared.hint}>Loading…</Text>}

      {!isLoading && sessions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Continue a Quiz</Text>
          {sessions.map((session) => {
            const list = lists.find((l) => l.id === session.list_id);
            return (
              <Pressable
                key={session.id}
                style={styles.row}
                onPress={() => resumeSession(session)}
              >
                <Text style={styles.rowTitle}>{list?.name ?? "Quiz in progress"}</Text>
                <Text style={shared.hint}>
                  Question {session.current_index + 1} of {session.questions.length}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {!isLoading && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Lists</Text>
          {lists.length === 0 ? (
            <Text style={shared.hint}>No saved lists yet.</Text>
          ) : (
            lists.map((list) => (
              <View key={list.id} style={styles.row}>
                <Pressable style={styles.rowMain} onPress={() => openList(list.id)}>
                  <Text style={styles.rowTitle}>{list.name}</Text>
                  <Text style={shared.hint}>
                    {list.source_language} → {list.target_language}
                  </Text>
                </Pressable>
                <Pressable onPress={() => confirmDelete(list)}>
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      )}

      <Link href="/" style={shared.backLink}>
        <Text>← Back to Home</Text>
      </Link>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
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
