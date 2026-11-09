import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { LanguageForm } from "@/components/language-form";

import { PressButton } from "@/components/press-button";
import { colors, shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { useMode } from "@/lib/mode-context";
import { usePairs } from "@/lib/pairs-context";
import { LIST_TYPES, type ListType } from "@/lib/types";

// One Essentials card, as the backend lists it for the active target language
// (GET /essentials) — each language has its own catalog. name is the English
// name, shown only as a fallback. The visible title and description come from
// the translation tables: sample_category_<key> and essentials_desc_<key>
// (each optionally overridden per target language with a _<language> suffix).
type WordPair = { "source word": string; "target word": string };

type EssentialsItem = {
  key: string;
  name: string;
  list_type: string;
  group: "everyday" | "grammar";
  level?: "beginner" | "intermediate" | "advanced";
};

const GROUPS = [
  { groupKey: "everyday", titleKey: "sample_group_everyday" },
  { groupKey: "grammar", titleKey: "sample_group_grammar" },
];

// The "Essentials" tab of the Lists screen (see app/lists.tsx): complete,
// curated lists for the active language mode. Quiz is one tap and needs no
// account. Signed in, the quiz is recorded against the learner's own record
// of the built-in list (kept out of My Lists), so feedback and history work;
// anyone else quizzes straight from the built-in list, unrecorded.
export function EssentialsView() {
  const router = useRouter();
  const { t } = useI18n();
  const { userId } = useAuth();
  const { mode, isLoaded, setMode } = useMode();
  const { clearPairs, setPairs, setSavedList, setSourceLanguage, setTargetLanguage, setListType, setListName } =
    usePairs();
  const [catalog, setCatalog] = useState<EssentialsItem[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // "View words": which card is expanded, and the words already fetched for
  // each (keyed by category and language pair, so switching mode refetches).
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, WordPair[]>>({});
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);
  // Guards a double-tap on Quiz from opening the quiz screen twice.
  const isOpeningRef = useRef(false);

  // The catalog follows the learning language, signed in or not.
  const targetLanguage = mode?.targetLanguage;
  useEffect(() => {
    if (!targetLanguage) return;
    let cancelled = false;
    apiRequest<{ categories: EssentialsItem[] }>(`/essentials?target_language=${encodeURIComponent(targetLanguage)}`)
      .then((result) => {
        if (!cancelled) setCatalog(result.categories);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t("error_loading_lists"));
      });
    return () => {
      cancelled = true;
    };
  }, [targetLanguage]);

  async function togglePreview(categoryKey: string) {
    if (!mode) return;
    if (openKey === categoryKey) {
      setOpenKey(null);
      return;
    }
    setOpenKey(categoryKey);
    const cacheKey = `${categoryKey}|${mode.sourceLanguage}|${mode.targetLanguage}`;
    if (previews[cacheKey]) return;
    setLoadingPreview(categoryKey);
    setError(null);
    try {
      const query = `source_language=${encodeURIComponent(mode.sourceLanguage)}&target_language=${encodeURIComponent(mode.targetLanguage)}`;
      const result = await apiRequest<{ pairs: WordPair[] }>(`/essentials/${categoryKey}?${query}`);
      setPreviews((prev) => ({ ...prev, [cacheKey]: result.pairs }));
    } catch (e) {
      setOpenKey(null);
      setError(e instanceof Error ? e.message : t("error_loading_list"));
    } finally {
      setLoadingPreview(null);
    }
  }

  // A category the app has no translation for yet (a newer or older server)
  // shows the server's English name instead of a raw string key.
  function titleOf(item: { key: string; name: string }): string {
    const title = categoryText("sample_category", item.key);
    return title ?? item.name;
  }

  // A card's name or description, from the translation tables. Where a
  // language's own grammar differs (Spanish "prepositional" vs French
  // "stressed" pronouns) there is a <prefix>_<key>_<target language> entry that
  // wins over the shared <prefix>_<key>; undefined when neither exists.
  function categoryText(prefix: string, key: string): string | undefined {
    const candidates = [
      mode ? `${prefix}_${key}_${mode.targetLanguage.toLowerCase()}` : null,
      `${prefix}_${key}`,
    ];
    for (const candidate of candidates) {
      if (!candidate) continue;
      const text = t(candidate);
      if (text !== candidate) return text;
    }
    return undefined;
  }

  function previewFor(categoryKey: string): WordPair[] | undefined {
    return mode
      ? previews[`${categoryKey}|${mode.sourceLanguage}|${mode.targetLanguage}`]
      : undefined;
  }

  // One tap to a quiz, signed in or not. The words come straight from the
  // built-in tables. Signed in, the server also returns the learner's own
  // record of the list (created on first use, never shown in My Lists) so the
  // quiz keeps history and feedback; if that fails the quiz still runs, just
  // unrecorded.
  async function handleQuiz(categoryKey: string) {
    if (!mode || isOpeningRef.current) return;
    isOpeningRef.current = true;
    setBusyKey(categoryKey);
    setError(null);
    try {
      const query = `source_language=${encodeURIComponent(mode.sourceLanguage)}&target_language=${encodeURIComponent(mode.targetLanguage)}`;
      const result = await apiRequest<{
        list_type: string;
        pairs: { "source word": string; "target word": string }[];
      }>(`/essentials/${categoryKey}?${query}`);
      clearPairs();
      setPairs(result.pairs);
      const title = titleOf(catalog.find((c) => c.key === categoryKey) ?? { key: categoryKey, name: categoryKey });
      setListName(title);
      if (userId) {
        try {
          const saved = await apiRequest<{ list_id: string }>("/sample-lists", {
            method: "POST",
            body: { category: categoryKey, source_language: mode.sourceLanguage, target_language: mode.targetLanguage },
          });
          setSavedList(saved.list_id, title);
        } catch {
          // unrecorded quiz — see above
        }
      }
      setSourceLanguage(mode.sourceLanguage);
      setTargetLanguage(mode.targetLanguage);
      const type = LIST_TYPES.find((lt) => lt.toLowerCase() === result.list_type);
      if (type) setListType(type as ListType);
      router.push("/generate-quiz");
      setTimeout(() => {
        isOpeningRef.current = false;
      }, 600);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error_loading_list"));
      isOpeningRef.current = false;
    } finally {
      setBusyKey(null);
    }
  }

  if (isLoaded && !mode) {
    return (
      <View style={styles.notice}>
        <Text style={shared.hint}>{t("setup_hint")}</Text>
        <LanguageForm submitLabel={t("setup_continue")} onSubmit={setMode} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={shared.hint}>{t("essentials_hint")}</Text>

      {error && <Text style={shared.errorText}>{error}</Text>}

      {mode &&
        GROUPS.map((group) => (
          <View key={group.groupKey} style={styles.section}>
            <Text style={styles.sectionTitle}>{t(group.titleKey)}</Text>
            {[...catalog]
              .filter((e) => e.group === group.groupKey)
              .sort((a, b) => titleOf(a).localeCompare(titleOf(b)))
              .map((item) => {
              const isBusy = busyKey === item.key;
              return (
                <View key={item.key} style={styles.card}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>{titleOf(item)}</Text>
                    {item.level && <Text style={styles.levelText}>{t(`level_${item.level}`)}</Text>}
                  </View>
                  {categoryText("essentials_desc", item.key) && (
                    <Text style={styles.cardDescription}>{categoryText("essentials_desc", item.key)}</Text>
                  )}
                  {openKey === item.key && (
                    <View style={styles.previewBox}>
                      {loadingPreview === item.key && !previewFor(item.key) ? (
                        <ActivityIndicator />
                      ) : (
                        previewFor(item.key)?.map((p, i) => (
                          <Text key={i} style={styles.previewRow}>
                            <Text style={styles.previewTarget}>{p["target word"]}</Text>
                            {"  ·  "}
                            {p["source word"]}
                          </Text>
                        ))
                      )}
                    </View>
                  )}
                  <View style={styles.cardActions}>
                    <View style={styles.rightButtons}>
                      <PressButton
                        style={[shared.secondaryButton, styles.sizedButton]}
                        onPress={() => togglePreview(item.key)}
                      >
                        <Text style={shared.secondaryButtonText}>
                          {openKey === item.key ? t("essentials_hide_words") : t("essentials_view_words")}
                        </Text>
                      </PressButton>
                      <PressButton
                        style={[
                          shared.secondaryButton,
                          styles.sizedButton,
                          styles.quizButton,
                          !!busyKey && shared.primaryButtonDisabled,
                        ]}
                        disabled={!!busyKey}
                        onPress={() => handleQuiz(item.key)}
                      >
                        <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>
                          {isBusy ? t("essentials_preparing") : t("essentials_quiz")}
                        </Text>
                      </PressButton>
                    </View>
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
  section: {
    gap: 10,
  },
  sectionTitle: {
    marginTop: 12,
    paddingBottom: 4,
    fontSize: 26,
    fontWeight: "800",
    color: colors.generateQuiz,
    borderBottomWidth: 2,
    borderBottomColor: colors.generateQuiz,
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
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  levelText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.tertiary,
  },
  cardTitle: {
    flexShrink: 1,
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  previewBox: {
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.secondaryBackground,
  },
  previewRow: {
    fontSize: 14,
    color: colors.text,
  },
  previewTarget: {
    fontWeight: "700",
  },
  cardDescription: {
    fontSize: 14,
    color: colors.text,
    opacity: 0.75,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 6,
    gap: 10,
  },
  rightButtons: {
    flexDirection: "row",
    gap: 10,
  },
  // View and Quiz share one size so the pair reads as a set.
  sizedButton: {
    minWidth: 92,
    paddingHorizontal: 18,
  },
  quizButton: {
    backgroundColor: colors.generateQuiz,
    borderBottomColor: colors.generateQuizShadow,
  },
});
