import { Link, useRouter } from "expo-router";
import { useMemo, useState, type ReactNode } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown, LinearTransition, SlideOutLeft } from "react-native-reanimated";

import { Dropdown } from "@/components/dropdown";
import { LanguagePicker } from "@/components/language-picker";
import { SpeakButton } from "@/components/speak-button";
import { PressButton } from "@/components/press-button";
import { colors, shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { quizDirection, useMode } from "@/lib/mode-context";
import { usePairs, type VocabListPayload } from "@/lib/pairs-context";
import { LIST_TYPES } from "@/lib/types";

type PairsReviewProps = {
  // Matches the Streamlit prototype's render_save_button(source, ...)
  // convention — records which builder screen produced this list.
  source: "manual" | "paste" | "file" | "photo";
  // Rendered directly above Undo/Clear and the word list — lets a screen
  // (e.g. List Details' Source/Target inputs) put its own "add more" UI
  // directly above the list it affects, instead of it being stuck up top, far from where
  // added words actually show up.
  children?: ReactNode;
};

// Shared "here's your list so far" UI used by every builder screen (manual,
// paste, file, photo) — they all funnel into the same in-memory pairs list,
// so they all end with the same review/edit/save/generate step.
export function PairsReview({ source, children }: PairsReviewProps) {
  const router = useRouter();
  const { t } = useI18n();
  const {
    pairs,
    setPairs,
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
    markSaved,
    hasUnsavedChanges,
  } = usePairs();
  const { userId } = useAuth();
  const { mode } = useMode();
  // A list can be written with either language first, but the word being
  // learned is always the bold one on a card and the one pronounced.
  const { reversed } = quizDirection(mode, sourceLanguage, targetLanguage);
  const learnKey = reversed ? "source word" : "target word";
  const knownKey = reversed ? "target word" : "source word";
  const learnLanguage = reversed ? sourceLanguage : targetLanguage;
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [isSavingRename, setIsSavingRename] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  // Indices into the raw `pairs` array (not the possibly-sorted display
  // order) — stable regardless of which sort is active, and simplest since
  // pairs have no id until they've been saved once.
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<"order" | "alpha">("order");

  const indexedPairs = useMemo(() => {
    // Keyed by the words (plus a repeat count for duplicates), not by
    // position, so removing a card animates that card out instead of
    // whichever one is last in the list.
    const seen = new Map<string, number>();
    const withIndex = pairs.map((pair, index) => {
      const base = `${pair["target word"]}|${pair["source word"]}`;
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      return { pair, index, key: `${base}|${n}` };
    });
    if (sortBy === "alpha") {
      return [...withIndex].sort((a, b) =>
        a.pair[learnKey].localeCompare(b.pair[learnKey])
      );
    }
    return withIndex;
  }, [pairs, sortBy, learnKey]);

  function toggleSelectMode() {
    setSelectMode((v) => !v);
    setSelectedIndices(new Set());
  }

  function toggleSelected(index: number) {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIndices((prev) =>
      prev.size === pairs.length ? new Set() : new Set(pairs.map((_, i) => i))
    );
  }

  function confirmBulkDelete() {
    const count = selectedIndices.size;
    if (count === 0) return;
    Alert.alert(
      t("bulk_delete_words_alert_title"),
      t("bulk_delete_words_alert_message_template", { count }),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: () => {
            setPairs(pairs.filter((_, i) => !selectedIndices.has(i)));
            setSelectMode(false);
            setSelectedIndices(new Set());
          },
        },
      ]
    );
  }

  function showListTypeExplanation(isLocked: boolean) {
    Alert.alert(
      t("list_type_info_alert_title"),
      `${t("list_type_info_vocab")}\n\n${t("list_type_info_verb")}\n\n${t("list_type_info_grammar")}` +
        (isLocked ? `\n\n${t("list_type_locked_explanation")}` : "")
    );
  }

  // Creates a brand-new list — only reachable when there's no savedListId
  // yet, since an already-saved list is updated by id (see
  // handleSaveChanges) rather than re-upserted by name.
  function buildListPayload(): VocabListPayload {
    return {
      source,
      source_language: sourceLanguage,
      target_language: targetLanguage,
      pairs,
      list_type: listType.toLowerCase(),
    };
  }

  async function handleSave(): Promise<boolean> {
    if (!name.trim()) return false;
    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      const result = await apiRequest<{ list_id: string }>("/save-list", {
        method: "POST",
        body: { name: name.trim(), ...buildListPayload() },
      });
      setSavedList(result.list_id, name.trim());
      markSaved();
      setSaveMessage(t("saved_message"));
      return true;
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t("error_saving"));
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  // Updates an already-saved list's pairs/metadata by id — never touches
  // the name, so editing words can't accidentally create a duplicate list
  // under a different name the way the old name-based upsert could.
  async function handleSaveChanges(): Promise<boolean> {
    if (!savedListId) return false;
    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      await apiRequest(`/lists/${savedListId}`, {
        method: "PUT",
        body: buildListPayload(),
      });
      markSaved();
      setSaveMessage(t("saved_message"));
      return true;
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t("error_saving"));
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  // A quiz on a saved list is built from the server's copy, so unsaved edits
  // would be missing from it (and lost): save first. A new list is saved too
  // once it has a name; without one the quiz just runs on the unsaved words.
  // If saving fails the error shows and the quiz does not start.
  async function handleGenerateQuiz() {
    if (userId && !isSaving) {
      if (savedListId && hasUnsavedChanges) {
        if (!(await handleSaveChanges())) return;
      } else if (!savedListId && name.trim() && pairs.length > 0) {
        if (!(await handleSave())) return;
      }
    }
    router.push("/generate-quiz");
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
    const newName = renameValue.trim();
    try {
      await apiRequest(`/lists/${savedListId}`, {
        method: "PATCH",
        body: { name: newName },
      });
      setSavedList(savedListId, newName);
      setIsRenaming(false);
    } catch (e) {
      setRenameError(e instanceof Error ? e.message : t("error_renaming"));
    } finally {
      setIsSavingRename(false);
    }
  }

  const saveStatus = (
    <>
      {saveMessage && <Text style={shared.hint}>{saveMessage}</Text>}
      {saveError && <Text style={shared.errorText}>{saveError}</Text>}
    </>
  );

  return (
    <View style={styles.container}>
      {savedListId && listName && !isRenaming && (
        <View style={styles.headingRow}>
          <Text style={styles.savedListHeading}>{listName}</Text>
          <Pressable
            style={styles.editButton}
            onPress={startRenaming}
            accessibilityRole="button"
            accessibilityLabel={t("rename_link")}
          >
            <Text style={styles.editIcon}>✎</Text>
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
            <PressButton
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
                {isSavingRename ? "…" : t("rename_save_button")}
              </Text>
            </PressButton>
            <PressButton
              style={[shared.secondaryButton, styles.renameButton]}
              onPress={() => setIsRenaming(false)}
            >
              <Text style={shared.secondaryButtonText}>{t("rename_cancel_button")}</Text>
            </PressButton>
          </View>
          {renameError && <Text style={shared.errorText}>{renameError}</Text>}
        </View>
      )}

      {userId && (
        <View style={styles.typeRow}>
          <View style={styles.typeGroup}>
            <Text style={styles.typeLabel}>{savedListId ? t("list_type_locked_label") : t("list_type_label")}</Text>
            <Pressable
              onPress={() => showListTypeExplanation(!!savedListId)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 2 }}
            >
              <Text style={styles.infoIcon}>ⓘ</Text>
            </Pressable>
            <Dropdown
              value={listType}
              onChange={(value) => setListType(value as typeof listType)}
              options={LIST_TYPES}
              disabled={!!savedListId}
            />
          </View>
          <Link
            href="/lists"
            style={[shared.secondaryButton, shared.myListsButton, styles.myListsInline]}
          >
            <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>{t("my_lists_link")}</Text>
          </Link>
        </View>
      )}
      {userId && !savedListId && (
        <View style={shared.row}>
          <TextInput
            style={[shared.input, styles.rowButton]}
            placeholder={t("save_input_placeholder_new")}
            placeholderTextColor={colors.placeholder}
            value={name}
            onChangeText={setName}
          />
          <PressButton
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
              {isSaving ? t("saving_ellipsis") : t("save_list")}
            </Text>
          </PressButton>
        </View>
      )}
      {!savedListId && saveStatus}

      <PressButton
        style={[
          shared.primaryButton,
          shared.generateQuizButton,
          pairs.length < 3 && shared.primaryButtonDisabled,
        ]}
        disabled={pairs.length < 3 || isSaving}
        onPress={handleGenerateQuiz}
      >
        <Text style={shared.primaryButtonText}>
          {pairs.length < 3
            ? t("add_more_words_to_quiz", { n: 3 - pairs.length })
            : t("generate_quiz_button")}
        </Text>
      </PressButton>

      <LanguagePicker />

      {children}

      <View style={shared.row}>
        <PressButton style={[shared.secondaryButton, styles.rowButton]} onPress={undoLast}>
          <Text style={shared.secondaryButtonText}>{t("undo_last")}</Text>
        </PressButton>
        <PressButton style={[shared.secondaryButton, styles.rowButton]} onPress={clearPairs}>
          <Text style={shared.secondaryButtonText}>{t("clear_list")}</Text>
        </PressButton>
      </View>

      {/* A saved list's Save Changes sits right under Undo and Clear, where
          the words are being edited. */}
      {userId && savedListId && (
        <>
          <PressButton
            style={[
              shared.secondaryButton,
              shared.saveActionButton,
              pairs.length === 0 && shared.primaryButtonDisabled,
            ]}
            disabled={isSaving || pairs.length === 0}
            onPress={handleSaveChanges}
          >
            <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>
              {isSaving ? t("saving_ellipsis") : t("save_changes_button")}
            </Text>
          </PressButton>
          {saveStatus}
        </>
      )}

      {/* Deliberately last — with a long list, the actions above (Save,
          Generate Quiz) would otherwise sit below the whole word list,
          forcing a scroll just to reach them. */}
      {pairs.length === 0 ? (
        <Text style={styles.emptyText}>{t("no_words_added")}</Text>
      ) : (
        <>
          <View style={styles.listToolbar}>
            <View style={styles.sortRow}>
              <Text style={shared.hint}>{t("sort_by_label")}</Text>
              <Pressable style={styles.tapTarget} onPress={() => setSortBy("order")}>
                <Text style={[styles.sortOption, sortBy === "order" && styles.sortOptionActive]}>
                  {t("sort_by_added_order")}
                </Text>
              </Pressable>
              <Pressable style={styles.tapTarget} onPress={() => setSortBy("alpha")}>
                <Text style={[styles.sortOption, sortBy === "alpha" && styles.sortOptionActive]}>
                  {t("sort_by_name")}
                </Text>
              </Pressable>
            </View>
            {selectMode ? (
              <View style={styles.headerActions}>
                <Pressable style={styles.tapTarget} onPress={toggleSelectAll}>
                  <Text style={styles.headerActionText}>
                    {selectedIndices.size === pairs.length
                      ? t("deselect_all_label")
                      : t("select_all_label")}
                  </Text>
                </Pressable>
                <Pressable style={styles.tapTarget} disabled={selectedIndices.size === 0} onPress={confirmBulkDelete}>
                  <Text
                    style={[
                      styles.headerActionText,
                      styles.headerDeleteText,
                      selectedIndices.size === 0 && styles.disabled,
                    ]}
                  >
                    {t("bulk_delete_selected_template", { count: selectedIndices.size })}
                  </Text>
                </Pressable>
                <Pressable style={styles.tapTarget} onPress={toggleSelectMode}>
                  <Text style={styles.headerActionText}>{t("done_label")}</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.tapTarget} onPress={toggleSelectMode}>
                <Text style={styles.headerActionText}>{t("select_label")}</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.list}>
            {indexedPairs.map(({ pair, index, key }, position) => (
              <Animated.View
                key={key}
                style={styles.card}
                entering={FadeInDown.delay(Math.min(position, 8) * 35).duration(280)}
                exiting={SlideOutLeft.duration(220)}
                layout={LinearTransition}
              >
                <Pressable
                  style={styles.cardText}
                  onPress={() => selectMode && toggleSelected(index)}
                  disabled={!selectMode}
                >
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTargetWord}>{pair[learnKey]}</Text>
                    <SpeakButton text={pair[learnKey]} language={learnLanguage} />
                  </View>
                  <Text style={styles.cardSubtitle}>{pair[knownKey]}</Text>
                </Pressable>
                {selectMode ? (
                  <Pressable
                    style={styles.checkbox}
                    onPress={() => toggleSelected(index)}
                    hitSlop={8}
                  >
                    <Text style={styles.checkboxMark}>
                      {selectedIndices.has(index) ? "☑" : "☐"}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable style={styles.removeButton} onPress={() => removePair(index)}>
                    <Text style={styles.removeIcon}>✕</Text>
                  </Pressable>
                )}
              </Animated.View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  savedListHeading: {
    flexShrink: 1,
    fontSize: 28,
    fontWeight: "800",
    color: colors.generateQuiz,
    textAlign: "center",
  },
  editButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  editIcon: {
    fontSize: 24,
    color: colors.tertiary,
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
    gap: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    borderTopWidth: 3,
    borderTopColor: colors.cardAccent,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTargetWord: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.text,
    opacity: 0.65,
  },
  removeIcon: {
    fontSize: 18,
    color: colors.error,
  },
  emptyText: {
    opacity: 0.5,
    paddingVertical: 12,
  },
  listToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    rowGap: 4,
  },
  // Everything tappable in the toolbar, rename and remove controls is at
  // least 44pt tall (Apple's minimum for a finger) rather than just as big
  // as its text.
  tapTarget: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  removeButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sortOption: {
    fontSize: 16,
    opacity: 0.5,
    fontWeight: "600",
  },
  sortOptionActive: {
    opacity: 1,
    color: colors.primary,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerActionText: {
    color: colors.tertiary,
    fontWeight: "600",
    fontSize: 16,
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
    fontSize: 26,
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
