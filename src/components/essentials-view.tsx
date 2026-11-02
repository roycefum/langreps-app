import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { LanguageForm } from "@/components/language-form";

import { PressButton } from "@/components/press-button";
import { colors, shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { useMode } from "@/lib/mode-context";
import { usePairs, type SavedList } from "@/lib/pairs-context";
import { LIST_TYPES, type ListType } from "@/lib/types";

type ListSummary = {
  id: string;
  name: string;
  source_language: string;
  target_language: string;
};

// One Essentials card, as the backend lists it for the active target language
// (GET /essentials) — each language has its own catalog. name is the English
// name the backend saves the list under; it is used only to recognize an
// already-added list, never shown. The visible title and description come from
// the translation tables: sample_category_<key> and essentials_desc_<key>.
type EssentialsItem = {
  key: string;
  name: string;
  list_type: string;
  group: "everyday" | "grammar";
};

const GROUPS = [
  { groupKey: "everyday", titleKey: "sample_group_everyday" },
  { groupKey: "grammar", titleKey: "sample_group_grammar" },
];

// The "Essentials" tab of the Lists screen (see app/lists.tsx): complete,
// curated lists for the active language mode. Quiz is one tap and needs no
// account — a signed-in learner's copy is created in My Lists behind the
// scenes; anyone else quizzes straight from the built-in list.
export function EssentialsView() {
  const router = useRouter();
  const { t } = useI18n();
  const { userId } = useAuth();
  const { mode, isLoaded, setMode } = useMode();
  const { loadList, clearPairs, setPairs, setSourceLanguage, setTargetLanguage, setListType, setListName } =
    usePairs();
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [catalog, setCatalog] = useState<EssentialsItem[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Guards a double-tap on Quiz from opening the quiz screen twice.
  const isOpeningRef = useRef(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const result = await apiRequest<{ lists: ListSummary[] }>("/lists");
      setLists(result.lists);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error_loading_lists"));
    }
  }, [userId]);

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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function findAdded(englishName: string): ListSummary | undefined {
    if (!mode) return undefined;
    return lists.find(
      (l) =>
        l.name === englishName &&
        l.source_language === mode.sourceLanguage &&
        l.target_language === mode.targetLanguage
    );
  }

  // One tap to a quiz. Signed in: the list is created in My Lists if it isn't
  // there yet (the server returns the existing copy untouched otherwise) and
  // loaded like any saved list, so progress is tracked. Signed out: the
  // words come straight from the built-in tables and live in memory only.
  async function handleQuiz(categoryKey: string) {
    if (!mode || isOpeningRef.current) return;
    isOpeningRef.current = true;
    setBusyKey(categoryKey);
    setError(null);
    try {
      if (userId) {
        const { list_id } = await apiRequest<{ list_id: string }>("/sample-lists", {
          method: "POST",
          body: {
            category: categoryKey,
            source_language: mode.sourceLanguage,
            target_language: mode.targetLanguage,
          },
        });
        loadList(await apiRequest<SavedList>(`/lists/${list_id}`));
      } else {
        const query = `source_language=${encodeURIComponent(mode.sourceLanguage)}&target_language=${encodeURIComponent(mode.targetLanguage)}`;
        const result = await apiRequest<{
          list_type: string;
          pairs: { "source word": string; "target word": string }[];
        }>(`/essentials/${categoryKey}?${query}`);
        clearPairs();
        setPairs(result.pairs);
        setListName(t(`sample_category_${categoryKey}`));
        setSourceLanguage(mode.sourceLanguage);
        setTargetLanguage(mode.targetLanguage);
        const type = LIST_TYPES.find((lt) => lt.toLowerCase() === result.list_type);
        if (type) setListType(type as ListType);
      }
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
            {catalog.filter((e) => e.group === group.groupKey).map((item) => {
              const inMyLists = userId ? findAdded(item.name) : undefined;
              const isBusy = busyKey === item.key;
              return (
                <View key={item.key} style={styles.card}>
                  <Text style={styles.cardTitle}>{t(`sample_category_${item.key}`)}</Text>
                  <Text style={styles.cardDescription}>{t(`essentials_desc_${item.key}`)}</Text>
                  <View style={styles.cardActions}>
                    {inMyLists ? (
                      <Text style={styles.addedText}>✓ {t("essentials_in_my_lists")}</Text>
                    ) : (
                      <View />
                    )}
                    <PressButton
                      style={[
                        shared.secondaryButton,
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
