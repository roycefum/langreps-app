import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, LinearTransition, SlideOutLeft } from "react-native-reanimated";

import { PressButton } from "@/components/press-button";
import { colors, shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { inMode, useMode } from "@/lib/mode-context";
import { usePairs, type SavedList } from "@/lib/pairs-context";

type ListSummary = {
  id: string;
  name: string;
  source_language: string;
  target_language: string;
  created_at: string;
  last_modified: string;
  source: string;
};

type SortBy = "name" | "date";

const browseEssentialsButtonStyle = [
  shared.primaryButton,
  shared.generateQuizButton,
  { marginTop: 4, alignSelf: "stretch" as const },
];

// The "My Lists" tab of the Lists screen (see app/lists.tsx) — the learner's
// saved lists. onBrowseEssentials switches to the other tab from the empty state.
export function MyListsView({ onBrowseEssentials }: { onBrowseEssentials: () => void }) {
  const router = useRouter();
  const { t } = useI18n();
  const { loadList } = usePairs();
  const { mode } = useMode();
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const sortedLists = useMemo(() => {
    const copy = [...lists];
    if (sortBy === "name") {
      copy.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // Most recently uploaded/updated first.
      copy.sort(
        (a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime()
      );
    }
    return copy;
  }, [lists, sortBy]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const listsResult = await apiRequest<{ lists: ListSummary[] }>("/lists");
      // Built-in (Essentials) lists live in the Essentials tab, not here.
      setLists(listsResult.lists.filter((l) => l.source !== "sample" && inMode(mode, l)));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error_loading_lists"));
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Guards against a double-tap firing the open/delete request twice before
  // the first one resolves (e.g. navigation away is slightly delayed).
  const isBusyRef = useRef(false);

  // Lands on List Details with the list preloaded — that screen already
  // supports updating an existing list in place (save_list treats a
  // repeated name as "update this list"), and PairsReview's own Generate
  // Quiz button is right there once you've seen the list. Previously this
  // tap went straight to Generate Quiz, with viewing/editing the list only
  // reachable via a separate "Edit" link — combined here since seeing the
  // list you tapped is the more natural default action.
  async function openList(listId: string) {
    if (isBusyRef.current) return;
    isBusyRef.current = true;
    try {
      const list = await apiRequest<SavedList>(`/lists/${listId}`);
      loadList(list);
      router.push("/list-details");
      // Deliberately NOT reset immediately here — router.push() returns
      // before the screen actually finishes transitioning away (expo-router
      // keeps this screen mounted underneath), so an impatient second tap
      // right after the first resolves could push the same list onto the
      // stack twice. Give the transition a moment to actually happen
      // instead of leaving this screen permanently locked once the user
      // comes back to it.
      setTimeout(() => {
        isBusyRef.current = false;
      }, 600);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error_loading_list"));
      isBusyRef.current = false;
    }
  }

  function confirmDelete(list: ListSummary) {
    Alert.alert(t("delete_list_alert_title"), t("delete_list_confirm", { name: list.name }), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          if (isBusyRef.current) return;
          isBusyRef.current = true;
          try {
            await apiRequest(`/lists/${list.id}`, { method: "DELETE" });
            load();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong deleting that list.");
          } finally {
            isBusyRef.current = false;
          }
        },
      },
    ]);
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
      prev.size === lists.length ? new Set() : new Set(lists.map((l) => l.id))
    );
  }

  function confirmBulkDelete() {
    const count = selectedIds.size;
    if (count === 0) return;
    Alert.alert(
      t("bulk_delete_lists_alert_title"),
      t("bulk_delete_lists_alert_message_template", { count }),
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
                  apiRequest(`/lists/${id}`, { method: "DELETE" })
                )
              );
              setSelectMode(false);
              setSelectedIds(new Set());
              await load();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : t("error_deleting_lists_bulk")
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
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {error && <Text style={shared.errorText}>{error}</Text>}
      {isLoading && <Text style={shared.hint}>{t("loading_ellipsis")}</Text>}

      {!isLoading && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            {lists.length > 0 &&
              (selectMode ? (
                <View style={styles.headerActions}>
                  <Pressable onPress={toggleSelectAll}>
                    <Text style={styles.headerActionText}>
                      {selectedIds.size === lists.length ? t("deselect_all_label") : t("select_all_label")}
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
              ))}
          </View>

          {lists.length > 0 && (
            <View style={styles.sortRow}>
              <Text style={shared.hint}>{t("sort_by_label")}</Text>
              <Pressable onPress={() => setSortBy("date")}>
                <Text style={[styles.sortOption, sortBy === "date" && styles.sortOptionActive]}>
                  {t("sort_by_date")}
                </Text>
              </Pressable>
              <Pressable onPress={() => setSortBy("name")}>
                <Text style={[styles.sortOption, sortBy === "name" && styles.sortOptionActive]}>
                  {t("sort_by_name")}
                </Text>
              </Pressable>
            </View>
          )}

          {lists.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={shared.hint}>{t("no_saved_lists")}</Text>
              <PressButton style={browseEssentialsButtonStyle} onPress={onBrowseEssentials}>
                <Text style={shared.primaryButtonText}>{t("browse_essentials_button")}</Text>
              </PressButton>
            </View>
          ) : (
            sortedLists.map((list, index) => (
              <Animated.View
                key={list.id}
                style={styles.row}
                entering={FadeInDown.delay(Math.min(index, 8) * 45).duration(300)}
                exiting={SlideOutLeft.duration(250)}
                layout={LinearTransition}
              >
                <Pressable
                  style={styles.rowMain}
                  onPress={() =>
                    selectMode ? toggleSelected(list.id) : openList(list.id)
                  }
                >
                  <Text style={styles.rowTitle}>{list.name}</Text>
                  <Text style={shared.hint}>
                    {list.source_language} → {list.target_language}
                  </Text>
                  <Text style={shared.hint}>
                    {t("last_uploaded_template", { date: new Date(list.last_modified).toLocaleDateString() })}
                  </Text>
                </Pressable>
                <Link
                  href={{
                    pathname: "/list-history",
                    params: { listId: list.id, listName: list.name },
                  }}
                >
                  <Text style={styles.historyText}>{t("progress_link")}</Text>
                </Link>
                <Pressable onPress={() => confirmDelete(list)}>
                  <Text style={styles.deleteText}>{t("delete")}</Text>
                </Pressable>
                {selectMode && (
                  <Pressable
                    style={styles.checkbox}
                    onPress={() => toggleSelected(list.id)}
                    hitSlop={8}
                  >
                    <Text style={styles.checkboxMark}>
                      {selectedIds.has(list.id) ? "☑" : "☐"}
                    </Text>
                  </Pressable>
                )}
              </Animated.View>
            ))
          )}
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
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
  emptyState: {
    gap: 10,
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
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
    paddingLeft: 6,
  },
  checkboxMark: {
    fontSize: 30,
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    borderTopWidth: 3,
    borderTopColor: colors.cardAccent,
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
  historyText: {
    color: colors.tertiary,
    fontWeight: "600",
  },
  deleteText: {
    color: colors.error,
    fontWeight: "600",
  },
});
