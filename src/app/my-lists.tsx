import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, LinearTransition, SlideOutLeft } from "react-native-reanimated";

type Tab = "lists" | "samples";

import { BackButton } from "@/components/back-button";
import { Dropdown } from "@/components/dropdown";
import { PressButton } from "@/components/press-button";
import { colors, shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { usePairs, type SavedList } from "@/lib/pairs-context";

type ListSummary = {
  id: string;
  name: string;
  source_language: string;
  target_language: string;
  created_at: string;
  last_modified: string;
};

type SortBy = "name" | "date";

// One canonical direction per language pair — the app's own Flip toggle
// (Generate Quiz, for Vocab lists) already covers quizzing the reverse
// direction, so offering both directions as separate options would just
// be redundant clutter.
const LANGUAGE_PAIRS: [string, string][] = [
  ["English", "Spanish"],
  ["English", "French"],
  ["Spanish", "French"],
];

const PAIR_OPTIONS = LANGUAGE_PAIRS.map(([source, target]) => `${source} → ${target}`);

// categoryKey matches the backend's SAMPLE_CATEGORY_META keys exactly
// (core/sample_lists.py) — POST /sample-lists takes this literal string.
// labelKey is the frontend's own translated display label, which can
// differ from the backend's (always-English) stored list name.
const SAMPLE_CATEGORY_DEFS = [
  { categoryKey: "common_words", labelKey: "sample_category_common_words" },
  { categoryKey: "common_verbs", labelKey: "sample_category_common_verbs" },
  { categoryKey: "irregular_verbs", labelKey: "sample_category_irregular_verbs" },
  { categoryKey: "food", labelKey: "sample_category_food" },
];

// Mirrors core/sample_lists.py's SAMPLE_CATEGORY_META labels exactly —
// used only to recognize an already-added list by name (the backend
// always names a generated list in English, regardless of the app's UI
// locale), never shown to the user.
const ENGLISH_CATEGORY_LABELS: Record<string, string> = {
  common_words: "Common Words",
  common_verbs: "Common Verbs",
  irregular_verbs: "Irregular Verbs",
  food: "Food",
};

export default function MyLists() {
  const router = useRouter();
  const { t } = useI18n();
  const { loadList } = usePairs();
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("lists");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  // One selected language-pair index per category, independent of each
  // other — defaults to English -> Spanish (index 0) for all of them.
  const [pairIndexByCategory, setPairIndexByCategory] = useState<Record<string, number>>(() =>
    Object.fromEntries(SAMPLE_CATEGORY_DEFS.map((c) => [c.categoryKey, 0]))
  );

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
      setLists(listsResult.lists);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error_loading_lists"));
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  // Generates (via Gemini, server-side) and saves one category's sample
  // list for its currently-selected language pair — no more static local
  // data, so this takes a moment rather than being instant.
  async function handleAddSample(categoryKey: string) {
    if (addingKey) return;
    const [sourceLanguage, targetLanguage] = LANGUAGE_PAIRS[pairIndexByCategory[categoryKey] ?? 0];
    setAddingKey(categoryKey);
    setError(null);
    try {
      await apiRequest("/sample-lists", {
        method: "POST",
        body: { category: categoryKey, source_language: sourceLanguage, target_language: targetLanguage },
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error_adding_sample"));
    } finally {
      setAddingKey(null);
    }
  }

  return (
    <ScrollView style={shared.screen} contentContainerStyle={styles.content}>
      <BackButton href="/" />
      <Text style={shared.title}>{t("my_lists_title")}</Text>

      {error && <Text style={shared.errorText}>{error}</Text>}
      {isLoading && <Text style={shared.hint}>{t("loading_ellipsis")}</Text>}

      <View style={styles.tabRow}>
        <Pressable style={[styles.tab, activeTab === "lists" && styles.tabActive]} onPress={() => setActiveTab("lists")}>
          <Text style={[styles.tabText, activeTab === "lists" && styles.tabTextActive]}>
            {t("your_lists_section_title")}
          </Text>
        </Pressable>
        <Pressable style={[styles.tab, activeTab === "samples" && styles.tabActive]} onPress={() => setActiveTab("samples")}>
          <Text style={[styles.tabText, activeTab === "samples" && styles.tabTextActive]}>
            {t("sample_lists_title")}
          </Text>
        </Pressable>
      </View>

      {!isLoading && activeTab === "lists" && (
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
            <Text style={shared.hint}>{t("no_saved_lists")}</Text>
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

      {!isLoading && activeTab === "samples" && (
        <View style={styles.section}>
          <Text style={shared.hint}>{t("sample_lists_hint")}</Text>
              {SAMPLE_CATEGORY_DEFS.map((def) => {
                const pairIndex = pairIndexByCategory[def.categoryKey] ?? 0;
                const [sourceLanguage, targetLanguage] = LANGUAGE_PAIRS[pairIndex];
                // The backend saves a sample list under its plain English
                // label with no suffix (find_list/save_list disambiguate by
                // name + language pair together, not a suffixed name), so
                // matching just checks those three fields directly instead
                // of reconstructing a suffixed string to compare against.
                const expectedLabel = ENGLISH_CATEGORY_LABELS[def.categoryKey];
                const alreadyAdded = lists.some(
                  (l) =>
                    l.name === expectedLabel &&
                    l.source_language === sourceLanguage &&
                    l.target_language === targetLanguage
                );
                return (
                  <View key={def.categoryKey} style={styles.row}>
                    <View style={styles.rowMain}>
                      {/* Every category is a fixed 50-word set (see
                          core/sample_lists.py) — no local data to read a
                          real count from now that generation is on-demand. */}
                      <Text style={styles.rowTitle}>{t(def.labelKey)} (50)</Text>
                      <Dropdown
                        value={PAIR_OPTIONS[pairIndex]}
                        onChange={(label) => {
                          const next = PAIR_OPTIONS.indexOf(label);
                          if (next >= 0) {
                            setPairIndexByCategory((prev) => ({ ...prev, [def.categoryKey]: next }));
                          }
                        }}
                        options={PAIR_OPTIONS}
                      />
                    </View>
                    <PressButton
                      style={[shared.secondaryButton, shared.saveActionButton, styles.addButton]}
                      disabled={addingKey === def.categoryKey}
                      onPress={() => handleAddSample(def.categoryKey)}
                    >
                      <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>
                        {addingKey === def.categoryKey
                          ? t("sample_list_adding")
                          : alreadyAdded
                            ? t("sample_list_added")
                            : t("sample_list_add")}
                      </Text>
                    </PressButton>
                  </View>
                );
              })}
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
  },
  tabActive: {
    backgroundColor: colors.tertiary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  tabTextActive: {
    color: "white",
  },
  addButton: {
    paddingHorizontal: 20,
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
