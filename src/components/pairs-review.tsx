import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { usePairs } from "@/lib/pairs-context";

type PairsReviewProps = {
  // Matches the Streamlit prototype's render_save_button(source, ...)
  // convention — records which builder screen produced this list.
  source: "manual" | "paste" | "file" | "photo";
};

// Shared "here's your list so far" UI used by every builder screen (manual,
// paste, file, photo) — they all funnel into the same in-memory pairs list,
// so they all end with the same review/edit/save/generate step.
export function PairsReview({ source }: PairsReviewProps) {
  const router = useRouter();
  const { pairs, undoLast, clearPairs, sourceLanguage, targetLanguage, savedListId, setSavedListId } =
    usePairs();
  const { userId } = useAuth();
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      const result = await apiRequest<{ list_id: string }>("/save-list", {
        method: "POST",
        body: {
          name: name.trim(),
          source,
          source_language: sourceLanguage,
          target_language: targetLanguage,
          pairs,
        },
      });
      setSavedListId(result.list_id);
      setSaveMessage("Saved!");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Something went wrong saving.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={shared.row}>
        <Pressable style={[shared.secondaryButton, styles.rowButton]} onPress={undoLast}>
          <Text style={shared.secondaryButtonText}>Undo last</Text>
        </Pressable>
        <Pressable style={[shared.secondaryButton, styles.rowButton]} onPress={clearPairs}>
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

      {userId && (
        <View style={shared.row}>
          <TextInput
            style={[shared.input, styles.rowButton]}
            placeholder={savedListId ? "List name (saving updates it)" : "List name"}
            value={name}
            onChangeText={setName}
          />
          <Pressable
            style={[
              shared.secondaryButton,
              styles.rowButton,
              (!name.trim() || isSaving || pairs.length === 0) && shared.primaryButtonDisabled,
            ]}
            disabled={!name.trim() || isSaving || pairs.length === 0}
            onPress={handleSave}
          >
            <Text style={shared.secondaryButtonText}>{isSaving ? "Saving…" : "Save List"}</Text>
          </Pressable>
        </View>
      )}
      {saveMessage && <Text style={shared.hint}>{saveMessage}</Text>}
      {saveError && <Text style={shared.errorText}>{saveError}</Text>}

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
  rowButton: {
    flex: 1,
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
