import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BackButton } from "@/components/back-button";
import { colors, shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { usePairs, type SavedList, type VocabPair } from "@/lib/pairs-context";
import { getStarterPairs } from "@/lib/starter-vocab";
import { getStarterVerbPairs } from "@/lib/starter-verbs";

type ListSummary = {
  id: string;
  name: string;
  source_language: string;
  target_language: string;
  created_at: string;
  last_modified: string;
};

type SortBy = "name" | "date";

// Every direction between the app's supported languages — the underlying
// data (starter-vocab.ts / starter-verbs.ts) has all three languages for
// each concept, so any of these 6 directions works, not just ones that
// happen to include English.
const LANGUAGE_PAIRS: [string, string][] = [
  ["English", "Spanish"],
  ["Spanish", "English"],
  ["English", "French"],
  ["French", "English"],
  ["Spanish", "French"],
  ["French", "Spanish"],
];

// Flags sidestep language-name capitalization entirely, and read faster
// when scanning a list of 12 sample entries anyway.
const LANGUAGE_FLAGS: Record<string, string> = {
  English: "🇬🇧",
  Spanish: "🇪🇸",
  French: "🇫🇷",
};

type SampleListEntry = {
  key: string;
  name: string;
  sourceLanguage: string;
  targetLanguage: string;
  listType: "vocab" | "verb";
  pairs: VocabPair[];
};

// A fixed catalog, not a single auto-picked list — the user can add as
// many of these as they want, in any order, whenever they want, instead
// of the app assuming up front which one language pair they're studying.
const SAMPLE_LISTS: SampleListEntry[] = LANGUAGE_PAIRS.flatMap(([source, target]) => {
  const entries: SampleListEntry[] = [];
  // Includes the source language in the name (not just "Spanish
  // Vocabulary") so two entries with the same target but different
  // sources (e.g. English->Spanish and French->Spanish) can't collide —
  // save-list treats a repeated name as "update this list in place",
  // which would silently overwrite one with the other otherwise.
  const vocabPairs = getStarterPairs(source, target);
  if (vocabPairs) {
    entries.push({
      key: `${source}-${target}-vocab`,
      name: `${target} Vocabulary (from ${source})`,
      sourceLanguage: source,
      targetLanguage: target,
      listType: "vocab",
      pairs: vocabPairs,
    });
  }
  const verbPairs = getStarterVerbPairs(source, target);
  if (verbPairs) {
    entries.push({
      key: `${source}-${target}-verb`,
      name: `${target} Verbs (from ${source})`,
      sourceLanguage: source,
      targetLanguage: target,
      listType: "verb",
      pairs: verbPairs,
    });
  }
  return entries;
});

export default function MyLists() {
  const router = useRouter();
  const { loadList } = usePairs();
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [showSampleLists, setShowSampleLists] = useState(false);
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
      setLists(listsResult.lists);
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

  // Guards against a double-tap firing the open/delete request twice before
  // the first one resolves (e.g. navigation away is slightly delayed).
  const isBusyRef = useRef(false);

  async function openList(listId: string) {
    if (isBusyRef.current) return;
    isBusyRef.current = true;
    try {
      const list = await apiRequest<SavedList>(`/lists/${listId}`);
      loadList(list);
      router.push("/generate-quiz");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong loading that list.");
    } finally {
      isBusyRef.current = false;
    }
  }

  function confirmDelete(list: ListSummary) {
    Alert.alert("Delete List", `Delete "${list.name}"? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
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
      "Delete Lists",
      `Delete ${count} list${count === 1 ? "" : "s"}? This can't be undone.`,
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
                  apiRequest(`/lists/${id}`, { method: "DELETE" })
                )
              );
              setSelectMode(false);
              setSelectedIds(new Set());
              await load();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Something went wrong deleting those lists."
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

  async function handleAddSample(entry: SampleListEntry) {
    if (addingKey) return;
    setAddingKey(entry.key);
    setError(null);
    try {
      await apiRequest("/save-list", {
        method: "POST",
        body: {
          name: entry.name,
          source: "sample",
          source_language: entry.sourceLanguage,
          target_language: entry.targetLanguage,
          pairs: entry.pairs,
          list_type: entry.listType,
        },
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong adding that sample list.");
    } finally {
      setAddingKey(null);
    }
  }

  return (
    <ScrollView style={shared.screen} contentContainerStyle={styles.content}>
      <BackButton href="/" />
      <Text style={shared.title}>My Lists</Text>

      {error && <Text style={shared.errorText}>{error}</Text>}
      {isLoading && <Text style={shared.hint}>Loading…</Text>}

      {!isLoading && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Your Lists</Text>
            {lists.length > 0 &&
              (selectMode ? (
                <View style={styles.headerActions}>
                  <Pressable onPress={toggleSelectAll}>
                    <Text style={styles.headerActionText}>
                      {selectedIds.size === lists.length ? "Deselect All" : "Select All"}
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
              ))}
          </View>

          {lists.length > 0 && (
            <View style={styles.sortRow}>
              <Text style={shared.hint}>Sort by</Text>
              <Pressable onPress={() => setSortBy("date")}>
                <Text style={[styles.sortOption, sortBy === "date" && styles.sortOptionActive]}>
                  Last Uploaded
                </Text>
              </Pressable>
              <Pressable onPress={() => setSortBy("name")}>
                <Text style={[styles.sortOption, sortBy === "name" && styles.sortOptionActive]}>
                  Name
                </Text>
              </Pressable>
            </View>
          )}

          {lists.length === 0 ? (
            <Text style={shared.hint}>No saved lists yet.</Text>
          ) : (
            sortedLists.map((list) => (
              <View key={list.id} style={styles.row}>
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
                    Last uploaded: {new Date(list.last_modified).toLocaleDateString()}
                  </Text>
                </Pressable>
                <Link
                  href={{
                    pathname: "/list-history",
                    params: { listId: list.id, listName: list.name },
                  }}
                >
                  <Text style={styles.historyText}>Progress</Text>
                </Link>
                <Pressable onPress={() => confirmDelete(list)}>
                  <Text style={styles.deleteText}>Delete</Text>
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
              </View>
            ))
          )}
        </View>
      )}

      {!isLoading && (
        <View style={styles.section}>
          <Pressable
            style={styles.sectionToggle}
            onPress={() => setShowSampleLists((v) => !v)}
          >
            <Text style={styles.sectionTitle}>
              {showSampleLists ? "▾" : "▸"} Sample Lists
            </Text>
          </Pressable>
          {showSampleLists && (
            <>
              <Text style={shared.hint}>
                Add a ready-made 50-word list for any language pair — add as many as you want,
                whenever you want.
              </Text>
              {SAMPLE_LISTS.map((entry) => {
                const alreadyAdded = lists.some((l) => l.name === entry.name);
                return (
                  <View key={entry.key} style={styles.row}>
                    <View style={styles.rowMain}>
                      <Text style={styles.rowTitle}>
                        {entry.listType === "vocab" ? "Vocab" : "Verb"} {entry.pairs.length}
                      </Text>
                      <Text style={shared.hint}>
                        {LANGUAGE_FLAGS[entry.sourceLanguage]} → {LANGUAGE_FLAGS[entry.targetLanguage]}
                      </Text>
                    </View>
                    <Pressable
                      style={[shared.secondaryButton, shared.saveActionButton, styles.addButton]}
                      disabled={addingKey === entry.key}
                      onPress={() => handleAddSample(entry)}
                    >
                      <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>
                        {addingKey === entry.key ? "Adding…" : alreadyAdded ? "Added" : "Add"}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionToggle: {
    paddingVertical: 4,
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
  historyText: {
    color: colors.tertiary,
    fontWeight: "600",
  },
  deleteText: {
    color: colors.error,
    fontWeight: "600",
  },
});
