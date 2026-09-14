import { Link, useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Dropdown } from "@/components/dropdown";
import { LanguagePicker } from "@/components/language-picker";
import { shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { usePairs } from "@/lib/pairs-context";
import { LIST_TYPES } from "@/lib/types";

type PairsReviewProps = {
  // Matches the Streamlit prototype's render_save_button(source, ...)
  // convention — records which builder screen produced this list.
  source: "manual" | "paste" | "file" | "photo";
  // Rendered between Undo/Clear and the word list — lets a screen (e.g. Add
  // Words' Source/Target inputs) put its own "add more" UI directly above
  // the list it affects, instead of it being stuck up top, far from where
  // added words actually show up.
  children?: ReactNode;
};

// Shared "here's your list so far" UI used by every builder screen (manual,
// paste, file, photo) — they all funnel into the same in-memory pairs list,
// so they all end with the same review/edit/save/generate step.
export function PairsReview({ source, children }: PairsReviewProps) {
  const router = useRouter();
  const {
    pairs,
    undoLast,
    clearPairs,
    sourceLanguage,
    targetLanguage,
    listType,
    setListType,
    savedListId,
    setSavedList,
  } = usePairs();
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
          list_type: listType.toLowerCase(),
        },
      });
      setSavedList(result.list_id, name.trim());
      setSaveMessage("Saved!");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Something went wrong saving.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      {userId && (
        <View style={styles.typeRow}>
          <View style={styles.typeGroup}>
            <Text style={shared.hint}>List type</Text>
            <Dropdown
              value={listType}
              onChange={(value) => setListType(value as typeof listType)}
              options={LIST_TYPES}
            />
          </View>
          <Link
            href="/my-lists"
            style={[shared.secondaryButton, shared.myListsButton, styles.myListsInline]}
          >
            <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>My Lists</Text>
          </Link>
        </View>
      )}
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
              shared.saveActionButton,
              styles.rowButton,
              (!name.trim() || isSaving || pairs.length === 0) && shared.primaryButtonDisabled,
            ]}
            disabled={!name.trim() || isSaving || pairs.length === 0}
            onPress={handleSave}
          >
            <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>
              {isSaving ? "Saving…" : "Save List"}
            </Text>
          </Pressable>
        </View>
      )}
      {saveMessage && <Text style={shared.hint}>{saveMessage}</Text>}
      {saveError && <Text style={shared.errorText}>{saveError}</Text>}

      <Pressable
        style={[
          shared.primaryButton,
          shared.generateQuizButton,
          pairs.length < 3 && shared.primaryButtonDisabled,
        ]}
        disabled={pairs.length < 3}
        onPress={() => router.push("/generate-quiz")}
      >
        <Text style={shared.primaryButtonText}>
          {pairs.length < 3
            ? `Add ${3 - pairs.length} more word${3 - pairs.length === 1 ? "" : "s"} to generate a quiz`
            : "Generate Quiz"}
        </Text>
      </Pressable>

      <View style={shared.row}>
        <Pressable style={[shared.secondaryButton, styles.rowButton]} onPress={undoLast}>
          <Text style={shared.secondaryButtonText}>Undo last</Text>
        </Pressable>
        <Pressable style={[shared.secondaryButton, styles.rowButton]} onPress={clearPairs}>
          <Text style={shared.secondaryButtonText}>Clear list</Text>
        </Pressable>
      </View>

      <LanguagePicker />

      {children}

      {/* Deliberately last — with a long list, the actions above (Save,
          Generate Quiz) would otherwise sit below the whole word list,
          forcing a scroll just to reach them. */}
      {pairs.length === 0 ? (
        <Text style={styles.emptyText}>No words added yet.</Text>
      ) : (
        <View style={styles.list}>
          {pairs.map((pair, index) => (
            <Text key={index} style={styles.listItem}>
              {pair["source word"]} → {pair["target word"]}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  rowButton: {
    flex: 1,
  },
  list: {
    gap: 2,
  },
  listItem: {
    fontSize: 16,
    paddingVertical: 6,
  },
  emptyText: {
    opacity: 0.5,
    paddingVertical: 12,
  },
  myListsButton: {
    alignSelf: "center",
    paddingHorizontal: 24,
  },
  myListsInline: {
    alignSelf: "auto",
    paddingHorizontal: 16,
  },
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  typeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
