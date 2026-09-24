import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { PressButton } from "@/components/press-button";
import Animated, { FadeInDown, LinearTransition, SlideOutLeft } from "react-native-reanimated";

import { BackButton } from "@/components/back-button";
import { colors, shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useQuiz } from "@/lib/quiz-context";
import { TENSES_BY_LANGUAGE, type Question } from "@/lib/types";

type ListSummary = {
  id: string;
  name: string;
  source_language: string;
  target_language: string;
  list_type: "vocab" | "verb";
};

type QuizSessionRow = {
  id: string;
  list_id: string;
  questions: Question[];
  current_index: number;
  last_active_at: string;
  verb_tense: string | null;
};

type CompletedSessionRow = {
  session_id: string;
  list_id: string;
  completed_at: string;
  correct: number;
  total: number;
};

type SortBy = "name" | "date";

// Flattened because Link asChild's Slot rejects an array of styles on its
// child (same fix as index.tsx's My Lists / My Quizzes buttons).
const browseListsButtonStyle = StyleSheet.flatten([
  shared.primaryButton,
  shared.generateQuizButton,
  { marginTop: 4, alignSelf: "stretch" as const },
]);

export default function MyQuizzes() {
  const router = useRouter();
  const { t } = useI18n();
  const { startQuiz } = useQuiz();
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [sessions, setSessions] = useState<QuizSessionRow[]>([]);
  const [completedSessions, setCompletedSessions] = useState<CompletedSessionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("date");
  // Separate select-mode state for Past Quizzes — a different section with
  // its own row ids, kept independent so selecting in one section doesn't
  // affect the other.
  const [completedSelectMode, setCompletedSelectMode] = useState(false);
  const [completedSelectedIds, setCompletedSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeletingCompleted, setIsBulkDeletingCompleted] = useState(false);

  const sortedSessions = useMemo(() => {
    const copy = [...sessions];
    if (sortBy === "name") {
      copy.sort((a, b) => {
        const nameA = lists.find((l) => l.id === a.list_id)?.name ?? "";
        const nameB = lists.find((l) => l.id === b.list_id)?.name ?? "";
        return nameA.localeCompare(nameB);
      });
    } else {
      copy.sort(
        (a, b) => new Date(b.last_active_at).getTime() - new Date(a.last_active_at).getTime()
      );
    }
    return copy;
  }, [sessions, lists, sortBy]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [listsResult, sessionsResult, completedResult] = await Promise.all([
        apiRequest<{ lists: ListSummary[] }>("/lists"),
        apiRequest<{ sessions: QuizSessionRow[] }>("/quiz-sessions"),
        apiRequest<{ sessions: CompletedSessionRow[] }>("/quiz-sessions/completed"),
      ]);
      setLists(listsResult.lists);
      setSessions(sessionsResult.sessions);
      setCompletedSessions(completedResult.sessions);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error_loading_quizzes"));
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

  async function resumeSession(session: QuizSessionRow) {
    if (isResumingRef.current) return;
    isResumingRef.current = true;
    const list = lists.find((l) => l.id === session.list_id);
    // Carry over how many were already right, or the final score would only
    // count the questions answered after resuming.
    let alreadyCorrect = 0;
    try {
      const result = await apiRequest<{ attempts: { was_correct: boolean }[] }>(
        `/quiz-sessions/${session.id}/attempts`
      );
      alreadyCorrect = result.attempts.filter((a) => a.was_correct).length;
    } catch {
      // fall back to counting from zero rather than blocking the resume
    }
    startQuiz({
      questions: session.questions,
      sessionId: session.id,
      sourceLanguage: list?.source_language ?? "English",
      targetLanguage: list?.target_language ?? "English",
      startIndex: session.current_index,
      startCorrect: alreadyCorrect,
    });
    router.push("/quiz");
  }

  function confirmDelete(session: QuizSessionRow) {
    const list = lists.find((l) => l.id === session.list_id);
    Alert.alert(
      t("delete_quiz_alert_title"),
      list ? t("delete_quiz_confirm", { name: list.name }) : t("delete_quiz_alert_title"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await apiRequest(`/quiz-sessions/${session.id}`, { method: "DELETE" });
              setSessions((prev) => prev.filter((s) => s.id !== session.id));
            } catch (e) {
              setError(e instanceof Error ? e.message : t("error_deleting_quiz"));
            }
          },
        },
      ]
    );
  }

  function viewResults(session: CompletedSessionRow) {
    router.push({ pathname: "/quiz-results", params: { sessionId: session.session_id } });
  }

  function confirmDeleteCompleted(session: CompletedSessionRow) {
    const list = lists.find((l) => l.id === session.list_id);
    Alert.alert(
      t("delete_quiz_alert_title"),
      list ? t("delete_quiz_confirm", { name: list.name }) : t("delete_quiz_alert_title"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await apiRequest(`/quiz-sessions/${session.session_id}`, { method: "DELETE" });
              setCompletedSessions((prev) =>
                prev.filter((s) => s.session_id !== session.session_id)
              );
            } catch (e) {
              setError(e instanceof Error ? e.message : t("error_deleting_quiz"));
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
      t("bulk_delete_quizzes_alert_title"),
      t("bulk_delete_quizzes_alert_message_template", { count }),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
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
                e instanceof Error ? e.message : t("error_deleting_quizzes_bulk")
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

  function toggleCompletedSelectMode() {
    setCompletedSelectMode((v) => !v);
    setCompletedSelectedIds(new Set());
  }

  function toggleCompletedSelected(id: string) {
    setCompletedSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleCompletedSelectAll() {
    setCompletedSelectedIds((prev) =>
      prev.size === completedSessions.length
        ? new Set()
        : new Set(completedSessions.map((s) => s.session_id))
    );
  }

  function confirmBulkDeleteCompleted() {
    const count = completedSelectedIds.size;
    if (count === 0) return;
    Alert.alert(
      t("bulk_delete_quizzes_alert_title"),
      t("bulk_delete_quizzes_alert_message_template", { count }),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: async () => {
            setIsBulkDeletingCompleted(true);
            setError(null);
            try {
              await Promise.all(
                Array.from(completedSelectedIds).map((id) =>
                  apiRequest(`/quiz-sessions/${id}`, { method: "DELETE" })
                )
              );
              setCompletedSelectMode(false);
              setCompletedSelectedIds(new Set());
              await load();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : t("error_deleting_quizzes_bulk")
              );
              await load();
            } finally {
              setIsBulkDeletingCompleted(false);
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={shared.screen} contentContainerStyle={styles.content}>
      <BackButton href="/" />
      <Text style={shared.title}>{t("my_quizzes_title")}</Text>

      {error && <Text style={shared.errorText}>{error}</Text>}
      {isLoading && <Text style={shared.hint}>{t("loading_ellipsis")}</Text>}

      {/* Nothing at all yet — a bare "no quizzes" sentence in each section
          left a first-time visitor with no idea what to do next. Shown
          only when BOTH sections are empty; either one alone still gets
          its own plain sentence below, since that's a normal state for an
          active user (e.g. no quiz currently in progress). */}
      {!isLoading && sessions.length === 0 && completedSessions.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{t("no_quizzes_yet_title")}</Text>
          <Text style={shared.hint}>{t("no_quizzes_yet_hint")}</Text>
          <Link href="/my-lists" asChild>
            <PressButton style={browseListsButtonStyle}>
              <Text style={shared.primaryButtonText}>{t("browse_lists_button")}</Text>
            </PressButton>
          </Link>
        </View>
      )}

      {!isLoading && !(sessions.length === 0 && completedSessions.length === 0) &&
        (sessions.length === 0 ? (
          <Text style={shared.hint}>{t("no_quizzes_in_progress")}</Text>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={shared.hint}>{t("quizzes_in_progress_count_template", { count: sessions.length })}</Text>
              {selectMode ? (
                <View style={styles.headerActions}>
                  <Pressable onPress={toggleSelectAll}>
                    <Text style={styles.headerActionText}>
                      {selectedIds.size === sessions.length ? t("deselect_all_label") : t("select_all_label")}
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
                      {isBulkDeleting ? t("bulk_deleting") : t("bulk_delete_selected_template", { count: selectedIds.size })}
                    </Text>
                  </Pressable>
                  <Pressable onPress={toggleSelectMode}>
                    <Text style={styles.headerActionText}>{t("done_label")}</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={toggleSelectMode}>
                  <Text style={shared.linkText}>{t("select_label")}</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.sortRow}>
              <Text style={shared.hint}>{t("sort_by_label")}</Text>
              <Pressable onPress={() => setSortBy("date")}>
                <Text style={[styles.sortOption, sortBy === "date" && styles.sortOptionActive]}>
                  {t("sort_by_last_updated")}
                </Text>
              </Pressable>
              <Pressable onPress={() => setSortBy("name")}>
                <Text style={[styles.sortOption, sortBy === "name" && styles.sortOptionActive]}>
                  {t("sort_by_name")}
                </Text>
              </Pressable>
            </View>

            {sortedSessions.map((session, index) => {
              const list = lists.find((l) => l.id === session.list_id);
              // verb_tense is stored as a comma-joined string (e.g.
              // "preterite,imperfect") since a quiz can cover more than
              // one tense — split it back apart to look up each label.
              // Empty/null means an old "Mixed" session from before tenses
              // were explicitly chosen.
              const sessionTenseLabels = (session.verb_tense ?? "")
                .split(",")
                .map((value) => TENSES_BY_LANGUAGE[list?.target_language ?? ""]?.find((t) => t.value === value)?.label)
                .filter((label): label is string => !!label);
              const typeLine = !list
                ? null
                : list.list_type === "verb"
                  ? `${t("quiz_type_badge_verb")} — ${
                      sessionTenseLabels.length > 0 ? sessionTenseLabels.join(", ") : t("mixed_tense")
                    }`
                  : t("quiz_type_badge_vocab");
              return (
                <Animated.View
                  key={session.id}
                  style={styles.row}
                  entering={FadeInDown.delay(Math.min(index, 8) * 45).duration(300)}
                  exiting={SlideOutLeft.duration(250)}
                  layout={LinearTransition}
                >
                  <Pressable
                    style={styles.rowMain}
                    onPress={() =>
                      selectMode ? toggleSelected(session.id) : resumeSession(session)
                    }
                  >
                    <Text style={styles.rowTitle}>
                      {list ? list.name : t("quiz_in_progress_fallback")}
                    </Text>
                    {typeLine && <Text style={styles.typeLine}>{typeLine}</Text>}
                    <Text style={shared.hint}>
                      {t("question_n_of_total", { n: session.current_index + 1, total: session.questions.length })}
                    </Text>
                    <Text style={shared.hint}>
                      {t("last_updated_template", { date: new Date(session.last_active_at).toLocaleDateString() })}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => confirmDelete(session)}>
                    <Text style={styles.deleteText}>{t("delete")}</Text>
                  </Pressable>
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
                </Animated.View>
              );
            })}
          </View>
        ))}

      {!isLoading && !(sessions.length === 0 && completedSessions.length === 0) && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t("past_quizzes_section_title")}</Text>
            {completedSessions.length > 0 &&
              (completedSelectMode ? (
                <View style={styles.headerActions}>
                  <Pressable onPress={toggleCompletedSelectAll}>
                    <Text style={styles.headerActionText}>
                      {completedSelectedIds.size === completedSessions.length
                        ? t("deselect_all_label")
                        : t("select_all_label")}
                    </Text>
                  </Pressable>
                  <Pressable
                    disabled={completedSelectedIds.size === 0 || isBulkDeletingCompleted}
                    onPress={confirmBulkDeleteCompleted}
                  >
                    <Text
                      style={[
                        styles.headerActionText,
                        styles.headerDeleteText,
                        completedSelectedIds.size === 0 && styles.disabled,
                      ]}
                    >
                      {isBulkDeletingCompleted
                        ? t("bulk_deleting")
                        : t("bulk_delete_selected_template", { count: completedSelectedIds.size })}
                    </Text>
                  </Pressable>
                  <Pressable onPress={toggleCompletedSelectMode}>
                    <Text style={styles.headerActionText}>{t("done_label")}</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={toggleCompletedSelectMode}>
                  <Text style={shared.linkText}>{t("select_label")}</Text>
                </Pressable>
              ))}
          </View>

          {completedSessions.length === 0 ? (
            <Text style={shared.hint}>{t("no_past_quizzes")}</Text>
          ) : (
            completedSessions.map((session, index) => {
              const list = lists.find((l) => l.id === session.list_id);
              const pct =
                session.total > 0 ? Math.round((session.correct / session.total) * 100) : 0;
              return (
                <Animated.View
                  key={session.session_id}
                  style={styles.row}
                  entering={FadeInDown.delay(Math.min(index, 8) * 45).duration(300)}
                  exiting={SlideOutLeft.duration(250)}
                  layout={LinearTransition}
                >
                  <Pressable
                    style={styles.rowMain}
                    onPress={() =>
                      completedSelectMode
                        ? toggleCompletedSelected(session.session_id)
                        : viewResults(session)
                    }
                  >
                    <Text style={styles.rowTitle}>
                      {list ? list.name : t("deleted_list_fallback")}
                    </Text>
                    <Text style={shared.hint}>
                      {t("past_quiz_score_template", { correct: session.correct, total: session.total, pct })}
                    </Text>
                    <Text style={shared.hint}>
                      {new Date(session.completed_at).toLocaleDateString()}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => confirmDeleteCompleted(session)}>
                    <Text style={styles.deleteText}>{t("delete")}</Text>
                  </Pressable>
                  {completedSelectMode && (
                    <Pressable
                      style={styles.checkbox}
                      onPress={() => toggleCompletedSelected(session.session_id)}
                      hitSlop={8}
                    >
                      <Text style={styles.checkboxMark}>
                        {completedSelectedIds.has(session.session_id) ? "☑" : "☐"}
                      </Text>
                    </Pressable>
                  )}
                </Animated.View>
              );
            })
          )}
        </View>
      )}
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
  emptyState: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
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
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  sortOption: {
    fontSize: 13,
    opacity: 0.5,
    fontWeight: "600",
  },
  sortOptionActive: {
    opacity: 1,
    color: colors.primary,
  },
  checkbox: {
    paddingLeft: 6,
  },
  checkboxMark: {
    fontSize: 30,
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
  typeLine: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.tertiary,
  },
  deleteText: {
    color: colors.error,
    fontWeight: "600",
  },
});
