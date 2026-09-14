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
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

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

  function toggleSelectMode() {
    setSelectMode((v) => !v);
    setSelectedIds(new Set());
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === sessions.length ? new Set() : new Set(sessions.map((s) => s.id))
    );
  }

  function confirmBulkDelete() {
    const count = selectedIds.size;
    if (count === 0) return;
    Alert.alert(
      "Delete Quizzes",
      `Delete ${count} quiz${count === 1 ? "" : "zes"}? This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsBulkDeleting(true);
            setError(null);
            try {
              await Promise.all(
                Array.from(selectedIds).map((id) =>
                  apiRequest(`/quiz-sessions/${id}`, { method: "DELETE" })
                )
              );
              setSelectMode(false);
              setSelectedIds(new Set());
              await load();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Something went wrong deleting those quizzes."
              );
              await load();
            } finally {
              setIsBulkDeleting(false);
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
            <View style={styles.sectionHeaderRow}>
              <Text style={shared.hint}>{sessions.length} in progress</Text>
              {selectMode ? (
                <View style={styles.headerActions}>
                  <Pressable onPress={toggleSelectAll}>
                    <Text style={styles.headerActionText}>
                      {selectedIds.size === sessions.length ? "Deselect All" : "Select All"}
                    </Text>
                  </Pressable>
                  <Pressable
                    disabled={selectedIds.size === 0 || isBulkDeleting}
                    onPress={confirmBulkDelete}
                  >
                    <Text
                      style={[
                        styles.headerActionText,
                        styles.headerDeleteText,
                        selectedIds.size === 0 && styles.disabled,
                      ]}
                    >
                      {isBulkDeleting ? "Deleting…" : `Delete (${selectedIds.size})`}
                    </Text>
                  </Pressable>
                  <Pressable onPress={toggleSelectMode}>
                    <Text style={styles.headerActionText}>Done</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={toggleSelectMode}>
                  <Text style={shared.linkText}>Select</Text>
                </Pressable>
              )}
            </View>

            {sessions.map((session) => {
              const list = lists.find((l) => l.id === session.list_id);
              return (
                <View key={session.id} style={styles.row}>
                  {selectMode && (
                    <Pressable
                      style={styles.checkbox}
                      onPress={() => toggleSelected(session.id)}
                      hitSlop={8}
                    >
                      <Text style={styles.checkboxMark}>
                        {selectedIds.has(session.id) ? "☑" : "☐"}
                      </Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={styles.rowMain}
                    onPress={() =>
                      selectMode ? toggleSelected(session.id) : resumeSession(session)
                    }
                  >
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
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerActionText: {
    color: colors.tertiary,
    fontWeight: "600",
    fontSize: 13,
  },
  headerDeleteText: {
    color: colors.error,
  },
  disabled: {
    opacity: 0.4,
  },
  checkbox: {
    paddingRight: 4,
  },
  checkboxMark: {
    fontSize: 20,
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
