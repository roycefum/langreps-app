import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { usePairs } from "@/lib/pairs-context";

export default function AddWords() {
  const router = useRouter();
  const { pairs, addPair, undoLast, clearPairs } = usePairs();
  const [sourceWord, setSourceWord] = useState("");
  const [targetWord, setTargetWord] = useState("");

  function handleAdd() {
    if (!sourceWord.trim() || !targetWord.trim()) return;
    addPair(sourceWord.trim(), targetWord.trim());
    setSourceWord("");
    setTargetWord("");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Words</Text>

      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="Source word"
          value={sourceWord}
          onChangeText={setSourceWord}
        />
        <TextInput
          style={styles.input}
          placeholder="Target word"
          value={targetWord}
          onChangeText={setTargetWord}
        />
      </View>

      <View style={styles.row}>
        <Pressable style={styles.smallButton} onPress={handleAdd}>
          <Text style={styles.smallButtonText}>Add to list</Text>
        </Pressable>
        <Pressable style={styles.smallButton} onPress={undoLast}>
          <Text style={styles.smallButtonText}>Undo last</Text>
        </Pressable>
        <Pressable style={styles.smallButton} onPress={clearPairs}>
          <Text style={styles.smallButtonText}>Clear list</Text>
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
        style={[styles.button, pairs.length < 3 && styles.buttonDisabled]}
        disabled={pairs.length < 3}
        onPress={() => router.push("/generate-quiz")}
      >
        <Text style={styles.buttonText}>
          {pairs.length < 3
            ? `Add ${3 - pairs.length} more word${3 - pairs.length === 1 ? "" : "s"} to generate a quiz`
            : "Generate Quiz"}
        </Text>
      </Pressable>

      <Link href="/" style={styles.backLink}>
        <Text>← Back to Home</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  smallButton: {
    flex: 1,
    backgroundColor: "#eee",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  smallButtonText: {
    fontSize: 13,
    fontWeight: "600",
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
  button: {
    backgroundColor: "#208AEF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  backLink: {
    alignSelf: "center",
    paddingVertical: 8,
  },
});
