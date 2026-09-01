import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { shared } from "@/constants/styles";
import { usePairs } from "@/lib/pairs-context";

// Shared "here's your list so far" UI used by every builder screen (manual,
// paste, file, photo) — they all funnel into the same in-memory pairs list,
// so they all end with the same review/edit/generate step.
export function PairsReview() {
  const router = useRouter();
  const { pairs, undoLast, clearPairs } = usePairs();

  return (
    <View style={styles.container}>
      <View style={shared.row}>
        <Pressable style={shared.secondaryButton} onPress={undoLast}>
          <Text style={shared.secondaryButtonText}>Undo last</Text>
        </Pressable>
        <Pressable style={shared.secondaryButton} onPress={clearPairs}>
          <Text style={shared.secondaryButtonText}>Clear list</Text>
        </Pressable>
      </View>

      <FlatList
        style={styles.list}
        data={pairs}
        keyExtractor={(_, index) => String(index)}
        renderItem={({ item }) => (
          <Text style={styles.listItem}>
            {item["source word"]} → {item["target word"]}
          </Text>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No words added yet.</Text>}
      />

      <Pressable
        style={[shared.primaryButton, pairs.length < 3 && shared.primaryButtonDisabled]}
        disabled={pairs.length < 3}
        onPress={() => router.push("/generate-quiz")}
      >
        <Text style={shared.primaryButtonText}>
          {pairs.length < 3
            ? `Add ${3 - pairs.length} more word${3 - pairs.length === 1 ? "" : "s"} to generate a quiz`
            : "Generate Quiz"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12,
  },
  list: {
    flex: 1,
  },
  listItem: {
    fontSize: 16,
    paddingVertical: 6,
  },
  emptyText: {
    opacity: 0.5,
    paddingVertical: 12,
  },
});
