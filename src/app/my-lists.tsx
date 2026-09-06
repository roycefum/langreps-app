import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { usePairs, type SavedList } from "@/lib/pairs-context";

type ListSummary = {
  id: string;
  name: string;
  source_language: string;
  target_language: string;
};

export default function MyLists() {
  const router = useRouter();
  const { loadList } = usePairs();
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <ScrollView style={shared.screen} contentContainerStyle={styles.content}>
      <Text style={shared.title}>My Lists</Text>

      {error && <Text style={shared.errorText}>{error}</Text>}
      {isLoading && <Text style={shared.hint}>Loading…</Text>}

      {!isLoading && (
        <View style={styles.section}>
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
