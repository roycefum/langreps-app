import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { PressButton } from "@/components/press-button";
import { colors, shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { usePairs, type SavedList } from "@/lib/pairs-context";
import { getLanguagePairs, type LanguagePairSettings } from "@/lib/settings-storage";

type ListSummary = {
  id: string;
  name: string;
  source_language: string;
  target_language: string;
};

// categoryKey matches the backend's SAMPLE_CATEGORY_META keys exactly
// (core/sample_lists.py) — POST /sample-lists takes this literal string.
// englishName is the name the backend saves the list under (always English,
// regardless of the app's UI language) — used only to recognize an already-
// added list, never shown. The visible title and description come from the
// translation tables: sample_category_<key> and essentials_desc_<key>.
const ESSENTIALS = [
  { categoryKey: "common_words", englishName: "Common Words", group: "everyday" },
  { categoryKey: "common_verbs", englishName: "Common Verbs", group: "everyday" },
  { categoryKey: "irregular_verbs", englishName: "Irregular Verbs", group: "everyday" },
  { categoryKey: "food", englishName: "Food", group: "everyday" },
  { categoryKey: "subject_pronouns", englishName: "Subject Pronouns", group: "grammar" },
  { categoryKey: "conjunctions", englishName: "Conjunctions", group: "grammar" },
  { categoryKey: "prepositions", englishName: "Prepositions", group: "grammar" },
];

const GROUPS = [
  { groupKey: "everyday", titleKey: "sample_group_everyday" },
  { groupKey: "grammar", titleKey: "sample_group_grammar" },
];

// Flattened because Link asChild's Slot rejects an array of styles on its child.
const loginButtonStyle = StyleSheet.flatten([
  shared.secondaryButton,
  shared.addActionButton,
  { alignSelf: "stretch" as const },
]);
const settingsButtonStyle = StyleSheet.flatten([
  shared.secondaryButton,
  shared.myListsButton,
  { alignSelf: "stretch" as const },
]);

// The "Essentials" tab of the Lists screen (see app/lists.tsx): ready-made
// lists, a finite curated set per language, added with one tap. The language
// comes from the pairs the learner already saved in Settings — there's no
// per-list direction to choose.
export function EssentialsView() {
  const router = useRouter();
  const { t } = useI18n();
  const { userId } = useAuth();
  const { loadList } = usePairs();
  // null while loading, so the "no language yet" message doesn't flash.
  const [pairs, setPairs] = useState<LanguagePairSettings[] | null>(null);
  const [pairIndex, setPairIndex] = useState(0);
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Guards a double-tap on Quiz now from opening the quiz screen twice.
  const isOpeningRef = useRef(false);

  const load = useCallback(async () => {
    setPairs(await getLanguagePairs());
    if (!userId) return;
    try {
      const result = await apiRequest<{ lists: ListSummary[] }>("/lists");
      setLists(result.lists);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error_loading_lists"));
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const pair = pairs && pairs.length > 0 ? pairs[Math.min(pairIndex, pairs.length - 1)] : null;

  function findAdded(englishName: string): ListSummary | undefined {
    if (!pair) return undefined;
    return lists.find(
      (l) =>
        l.name === englishName &&
        l.source_language === pair.sourceLanguage &&
        l.target_language === pair.targetLanguage
    );
  }

  // Generates (everyday lists, via Gemini — a few seconds) or builds
  // (grammar lists, instantly) and saves one list for the selected pair.
  async function handleAdd(categoryKey: string) {
    if (!userId) {
      router.push("/login");
      return;
    }
    if (!pair || addingKey) return;
    setAddingKey(categoryKey);
    setError(null);
    try {
      await apiRequest("/sample-lists", {
        method: "POST",
        body: {
          category: categoryKey,
          source_language: pair.sourceLanguage,
          target_language: pair.targetLanguage,
        },
      });
      const result = await apiRequest<{ lists: ListSummary[] }>("/lists");
      setLists(result.lists);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error_adding_sample"));
    } finally {
      setAddingKey(null);
    }
  }

  // Straight into Generate Quiz — skips the List Details screen, since the
  // point of adding an essential list is to practice it.
  async function handleQuizNow(list: ListSummary) {
    if (isOpeningRef.current) return;
    isOpeningRef.current = true;
    try {
      const full = await apiRequest<SavedList>(`/lists/${list.id}`);
      loadList(full);
      router.push("/generate-quiz");
      setTimeout(() => {
        isOpeningRef.current = false;
      }, 600);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error_loading_list"));
      isOpeningRef.current = false;
    }
  }

  const needsLanguage = !!userId && pairs !== null && pairs.length === 0;
  const showCards = !userId || !!pair;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={shared.hint}>{t("essentials_hint")}</Text>

      {error && <Text style={shared.errorText}>{error}</Text>}

      {!userId && (
        <View style={styles.notice}>
          <Text style={shared.hint}>{t("essentials_signin_prompt")}</Text>
          <Link href="/login" asChild>
            <PressButton style={loginButtonStyle}>
              <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>
                {t("log_in_sign_up")}
              </Text>
            </PressButton>
          </Link>
        </View>
      )}

      {needsLanguage && (
        <View style={styles.notice}>
          <Text style={shared.hint}>{t("essentials_no_pair")}</Text>
          <Link href="/settings" asChild>
            <PressButton style={settingsButtonStyle}>
              <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>
                {t("settings_link")}
              </Text>
            </PressButton>
          </Link>
        </View>
      )}

      {/* One saved language pair (the usual case): just say which. Several:
          a switcher limited to the learner's own pairs. */}
      {userId && pairs && pairs.length === 1 && (
        <Text style={styles.pairHeader}>
          {pairs[0].sourceLanguage} → {pairs[0].targetLanguage}
        </Text>
      )}
      {userId && pairs && pairs.length > 1 && (
        <View style={styles.pairRow}>
          {pairs.map((p, i) => (
            <Pressable
              key={`${p.sourceLanguage}-${p.targetLanguage}`}
              style={[styles.pairChip, i === pairIndex && styles.pairChipActive]}
              onPress={() => setPairIndex(i)}
            >
              <Text style={[styles.pairChipText, i === pairIndex && styles.pairChipTextActive]}>
                {p.sourceLanguage} → {p.targetLanguage}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {showCards &&
        GROUPS.map((group) => (
          <View key={group.groupKey} style={styles.section}>
            <Text style={styles.sectionTitle}>{t(group.titleKey)}</Text>
            {ESSENTIALS.filter((e) => e.group === group.groupKey).map((item) => {
              const added = userId ? findAdded(item.englishName) : undefined;
              const isAdding = addingKey === item.categoryKey;
              return (
                <View key={item.categoryKey} style={styles.card}>
                  <Text style={styles.cardTitle}>{t(`sample_category_${item.categoryKey}`)}</Text>
                  <Text style={styles.cardDescription}>{t(`essentials_desc_${item.categoryKey}`)}</Text>
                  <View style={styles.cardActions}>
                    {added ? (
                      <>
                        <Text style={styles.addedText}>✓ {t("sample_list_added")}</Text>
                        <PressButton
                          style={[shared.secondaryButton, styles.quizButton]}
                          onPress={() => handleQuizNow(added)}
                        >
                          <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>
                            {t("essentials_quiz_now")}
                          </Text>
                        </PressButton>
                      </>
                    ) : (
                      <PressButton
                        style={[
                          shared.secondaryButton,
                          shared.saveActionButton,
                          styles.addButton,
                          (isAdding || !!addingKey) && shared.primaryButtonDisabled,
                        ]}
                        disabled={isAdding || !!addingKey}
                        onPress={() => handleAdd(item.categoryKey)}
                      >
                        <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>
                          {isAdding ? t("sample_list_adding") : t("sample_list_add")}
                        </Text>
                      </PressButton>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
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
  notice: {
    gap: 10,
    backgroundColor: colors.secondaryBackground,
    borderRadius: 10,
    padding: 14,
  },
  pairHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
  pairRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  pairChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.secondaryBackground,
  },
  pairChipActive: {
    backgroundColor: colors.tertiary,
  },
  pairChipText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  pairChipTextActive: {
    color: "white",
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  card: {
    gap: 6,
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    borderTopWidth: 3,
    borderTopColor: colors.cardAccent,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  cardDescription: {
    fontSize: 14,
    color: colors.text,
    opacity: 0.75,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    gap: 10,
  },
  addButton: {
    paddingHorizontal: 28,
  },
  quizButton: {
    backgroundColor: colors.generateQuiz,
    borderBottomColor: colors.generateQuizShadow,
    paddingHorizontal: 22,
  },
  addedText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.success,
  },
});
