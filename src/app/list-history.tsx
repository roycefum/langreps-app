import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";

import { BackButton } from "@/components/back-button";
import { colors, shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { getTrendFeedback, type QuizHistoryEntry } from "@/lib/quiz-feedback";
import { getAutoDeleteOldQuizzes } from "@/lib/settings-storage";

const GRAPH_WIDTH = 320;
const GRAPH_HEIGHT = 140;
const GRAPH_PADDING = 12;

export default function ListHistory() {
  const { listId, listName } = useLocalSearchParams<{ listId: string; listName?: string }>();
  const [history, setHistory] = useState<QuizHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Opportunistic cleanup, opt-in via Settings — there's no background
      // job running anywhere in this app, so "30 days" is enforced whenever
      // the user actually opens a screen that reads quiz history, rather
      // than on a fixed schedule. Best-effort: a failure here shouldn't
      // block viewing history.
      if (await getAutoDeleteOldQuizzes()) {
        try {
          await apiRequest("/quiz-sessions/stale/cleanup", { method: "DELETE" });
        } catch {
          // best-effort
        }
      }
      const result = await apiRequest<{ history: QuizHistoryEntry[] }>(
        `/lists/${listId}/quiz-history`
      );
      setHistory(result.history);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong loading quiz history.");
    } finally {
      setIsLoading(false);
    }
  }, [listId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Picked fresh on every screen visit rather than memoized on history
  // itself, so re-opening this screen can surface a different phrasing of
  // the same trend instead of always showing the same canned line.
  const feedback = useMemo(() => getTrendFeedback(history), [history]);

  const points = useMemo(() => {
    if (history.length < 2) return null;
    const scores = history.map((h) => (h.total > 0 ? h.correct / h.total : 0));
    const stepX = (GRAPH_WIDTH - GRAPH_PADDING * 2) / (scores.length - 1);
    return scores.map((score, i) => ({
      x: GRAPH_PADDING + i * stepX,
      y: GRAPH_PADDING + (1 - score) * (GRAPH_HEIGHT - GRAPH_PADDING * 2),
    }));
  }, [history]);

  return (
    <ScrollView style={shared.screen} contentContainerStyle={styles.content}>
      <BackButton href="/my-lists" />
      <Text style={shared.title}>{listName ?? "Progress"}</Text>
      <Text style={shared.hint}>Progress</Text>

      {error && <Text style={shared.errorText}>{error}</Text>}
      {isLoading && <Text style={shared.hint}>Loading…</Text>}

      {!isLoading && history.length === 0 && (
        <Text style={shared.hint}>No completed quizzes for this list yet.</Text>
      )}

      {!isLoading && history.length > 0 && (
        <>
          {points && (
            <Svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT} style={styles.graph}>
              <Polyline
                points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={colors.primary}
                strokeWidth={2}
              />
              {points.map((p, i) => (
                <Circle key={i} cx={p.x} cy={p.y} r={4} fill={colors.primary} />
              ))}
            </Svg>
          )}

          {feedback && <Text style={[shared.hint, styles.feedback]}>{feedback}</Text>}

          <View style={styles.section}>
            {[...history].reverse().map((entry) => (
              <View key={entry.session_id} style={styles.row}>
                <Text style={styles.rowScore}>
                  {entry.correct}/{entry.total} (
                  {entry.total > 0 ? Math.round((entry.correct / entry.total) * 100) : 0}%)
                </Text>
                <Text style={shared.hint}>
                  {new Date(entry.completed_at).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 32,
  },
  graph: {
    alignSelf: "center",
  },
  feedback: {
    textAlign: "center",
    fontWeight: "600",
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
  },
  rowScore: {
    fontSize: 16,
    fontWeight: "600",
  },
});
