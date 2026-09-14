import { Link, useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Dropdown } from "@/components/dropdown";
import { LanguagePicker } from "@/components/language-picker";
import { colors, shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { usePairs } from "@/lib/pairs-context";
import { displayListName } from "@/lib/text";
import { LIST_TYPES } from "@/lib/types";

function showListTypeExplanation() {
  Alert.alert(
    "List Types",
    "Vocab — plain word pairs (nouns, adjectives, etc.), tested as-is.\n\n" +
      "Verb — infinitives get conjugated in context on Generate Quiz, so you're " +
      "tested on actual verb forms (e.g. \"habla\") instead of just recalling the " +
      "infinitive (\"hablar\")."
  );
}

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
    removePair,
    undoLast,
    clearPairs,
    sourceLanguage,
    targetLanguage,
    listType,
    setListType,
    savedListId,
    listName,
    setSavedList,
  } = usePairs();
  const { userId } = useAuth();
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [isSavingRename, setIsSavingRename] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  // Creates a brand-new list — only reachable when there's no savedListId
  // yet, since an already-saved list is updated by id (see
  // handleSaveChanges) rather than re-upserted by name.
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

  // Updates an already-saved list's pairs/metadata by id — never touches
  // the name, so editing words can't accidentally create a duplicate list
  // under a different name the way the old name-based upsert could.
  async function handleSaveChanges() {
    if (!savedListId) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      await apiRequest(`/lists/${savedListId}`, {
        method: "PUT",
        body: {
          source,
          source_language: sourceLanguage,
          target_language: targetLanguage,
          pairs,
          list_type: listType.toLowerCase(),
        },
      });
      setSaveMessage("Saved!");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Something went wrong saving.");
    } finally {
      setIsSaving(false);
    }
  }

  function startRenaming() {
    setRenameValue(listName ?? "");
    setRenameError(null);
    setIsRenaming(true);
  }

  async function handleRename() {
    if (!savedListId || !renameValue.trim()) return;
    setIsSavingRename(true);
    setRenameError(null);
    try {
      await apiRequest(`/lists/${savedListId}`, {
        method: "PATCH",
        body: { name: renameValue.trim() },
      });
      setSavedList(savedListId, renameValue.trim());
      setIsRenaming(false);
    } catch (e) {
      setRenameError(e instanceof Error ? e.message : "Something went wrong renaming.");
    } finally {
      setIsSavingRename(false);
    }
  }

  return (
    <View style={styles.container}>
      {savedListId && listName && !isRenaming && (
        <View style={styles.headingRow}>
          <Text style={styles.savedListHeading}>{displayListName(listName)}</Text>
          <Pressable onPress={startRenaming} hitSlop={8}>
            <Text style={styles.renameLink}>Rename</Text>
          </Pressable>
        </View>
      )}

      {savedListId && isRenaming && (
        <View style={styles.renameBlock}>
          <View style={shared.row}>
            <TextInput
              style={[shared.input, styles.rowButton]}
              value={renameValue}
              onChangeText={setRenameValue}
              autoFocus
            />
            <Pressable
              style={[
                shared.secondaryButton,
                shared.saveActionButton,
                styles.renameButton,
                (!renameValue.trim() || isSavingRename) && shared.primaryButtonDisabled,
              ]}
              disabled={!renameValue.trim() || isSavingRename}
              onPress={handleRename}
            >
              <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>
                {isSavingRename ? "…" : "Save"}
              </Text>
            </Pressable>
            <Pressable
              style={[shared.secondaryButton, styles.renameButton]}
              onPress={() => setIsRenaming(false)}
            >
              <Text style={shared.secondaryButtonText}>Cancel</Text>
            </Pressable>
          </View>
          {renameError && <Text style={shared.errorText}>{renameError}</Text>}
        </View>
      )}

      {userId && (
        <View style={styles.typeRow}>
          <View style={styles.typeGroup}>
            <Text style={styles.typeLabel}>List type</Text>
            <Pressable
              onPress={showListTypeExplanation}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 2 }}
            >
              <Text style={styles.infoIcon}>ⓘ</Text>
            </Pressable>
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
      {userId && !savedListId && (
        <View style={shared.row}>
          <TextInput
            style={[shared.input, styles.rowButton]}
            placeholder="Name this list"
            placeholderTextColor={colors.placeholder}
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
      {userId && savedListId && (
        <Pressable
          style={[
            shared.secondaryButton,
            shared.saveActionButton,
            pairs.length === 0 && shared.primaryButtonDisabled,
          ]}
          disabled={isSaving || pairs.length === 0}
          onPress={handleSaveChanges}
        >
          <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>
            {isSaving ? "Saving…" : "Save Changes"}
          </Text>
        </Pressable>
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
            <View key={index} style={styles.listRow}>
              <Text style={styles.listItem}>
                {pair["source word"]} → {pair["target word"]}
              </Text>
              <Pressable onPress={() => removePair(index)} hitSlop={8}>
                <Text style={styles.removeIcon}>✕</Text>
              </Pressable>
            </View>
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
  headingRow: {
    alignItems: "center",
    gap: 2,
  },
  savedListHeading: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.generateQuiz,
    textAlign: "center",
  },
  renameLink: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.tertiary,
    textDecorationLine: "underline",
  },
  renameBlock: {
    gap: 4,
  },
  renameButton: {
    paddingHorizontal: 16,
  },
  rowButton: {
    flex: 1,
  },
  list: {
    gap: 2,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  listItem: {
    fontSize: 16,
    paddingVertical: 6,
  },
  removeIcon: {
    fontSize: 16,
    color: colors.error,
    paddingHorizontal: 8,
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
    gap: 6,
  },
  typeLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  infoIcon: {
    fontSize: 15,
    color: colors.tertiary,
    fontWeight: "700",
    marginRight: 2,
  },
});
