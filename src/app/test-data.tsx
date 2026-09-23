import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { BackButton } from "@/components/back-button";
import { PressButton } from "@/components/press-button";
import { colors, shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { usePairs, type SavedList } from "@/lib/pairs-context";
import { removeAccents } from "@/lib/text";

// Dev-only (Home only links here under __DEV__): builds a finished quiz with
// realistic wrong answers on a throwaway [TEST] list so the tailored
// feedback can be tried without taking real quizzes. English-only on
// purpose. Uses only the normal API endpoints — nothing special on the
// server. The feedback analysis reads only a list's LAST completed quiz, so
// switching scenarios is just tapping another one; no clearing needed.

const TEST_LIST_NAME = "[TEST] Spanish verbs";

const VERBS: [string, string][] = [
  ["to speak", "hablar"],
  ["to eat", "comer"],
  ["to live", "vivir"],
  ["to have", "tener"],
  ["to want", "querer"],
  ["to understand", "entender"],
  ["to play", "jugar"],
  ["to ask for", "pedir"],
  ["to sleep", "dormir"],
  ["to be able to", "poder"],
  ["to do", "hacer"],
  ["to go", "ir"],
  ["to be", "ser"],
  ["to be (location)", "estar"],
  ["to say", "decir"],
  ["to come", "venir"],
  ["to leave", "salir"],
  ["to think", "pensar"],
  ["to return", "volver"],
  ["to work", "trabajar"],
];

type Item = { verb: number; question: string; correct: string; typed: string };

type Scenario = { key: string; label: string; hint: string; items: Item[] };

// Same grading the real quiz uses with "Require Diacritics" off: case and
// accents are ignored, so an accent-only slip is accepted (a "near-miss").
function isCorrect(typed: string, correct: string): boolean {
  const norm = (s: string) => removeAccents(s.trim().toLowerCase());
  return norm(typed) === norm(correct);
}

const SCENARIOS: Scenario[] = [
  {
    key: "amos",
    label: "Dropping -amos (nosotros)",
    hint: "5 wrong: nosotros forms typed as ellos forms",
    items: [
      { verb: 0, question: "Nosotros ___ español todos los días. (hablar)", correct: "hablamos", typed: "hablan" },
      { verb: 1, question: "Nosotros ___ juntos a las dos. (comer)", correct: "comemos", typed: "comen" },
      { verb: 2, question: "Nosotros ___ cerca del parque. (vivir)", correct: "vivimos", typed: "viven" },
      { verb: 19, question: "Nosotros ___ mucho en la oficina. (trabajar)", correct: "trabajamos", typed: "trabajan" },
      { verb: 8, question: "Nosotros ___ ocho horas. (dormir)", correct: "dormimos", typed: "duermen" },
      { verb: 0, question: "Yo ___ con mi madre. (hablar)", correct: "hablo", typed: "hablo" },
      { verb: 1, question: "Ella ___ una manzana. (comer)", correct: "come", typed: "come" },
      { verb: 2, question: "Tú ___ en Madrid. (vivir)", correct: "vives", typed: "vives" },
      { verb: 19, question: "Ellos ___ los lunes. (trabajar)", correct: "trabajan", typed: "trabajan" },
      { verb: 8, question: "Yo ___ tarde. (dormir)", correct: "duermo", typed: "duermo" },
    ],
  },
  {
    key: "stem",
    label: "Missing stem changes",
    hint: "5 wrong: e→ie / o→ue / e→i left out",
    items: [
      { verb: 3, question: "Tú ___ mucha hambre. (tener)", correct: "tienes", typed: "tenes" },
      { verb: 4, question: "Ella ___ ir al cine. (querer)", correct: "quiere", typed: "quere" },
      { verb: 5, question: "Yo ___ el problema. (entender)", correct: "entiendo", typed: "entendo" },
      { verb: 7, question: "Ellos ___ café. (pedir)", correct: "piden", typed: "pedan" },
      { verb: 6, question: "Yo ___ al fútbol. (jugar)", correct: "juego", typed: "jugo" },
      { verb: 4, question: "Nosotros ___ ir. (querer)", correct: "queremos", typed: "queremos" },
      { verb: 0, question: "Yo ___ español. (hablar)", correct: "hablo", typed: "hablo" },
      { verb: 1, question: "Ella ___ pan. (comer)", correct: "come", typed: "come" },
      { verb: 2, question: "Nosotros ___ aquí. (vivir)", correct: "vivimos", typed: "vivimos" },
      { verb: 19, question: "Tú ___ mucho. (trabajar)", correct: "trabajas", typed: "trabajas" },
    ],
  },
  {
    key: "accents",
    label: "Accent drops + tense slips",
    hint: "3 wrong (present typed for past) + 4 accepted-but-unaccented",
    items: [
      { verb: 0, question: "Antes nosotros ___ mucho. (hablar)", correct: "hablábamos", typed: "hablabamos" },
      { verb: 6, question: "De niños ___ en la calle. (jugar)", correct: "jugábamos", typed: "jugabamos" },
      { verb: 1, question: "Ellos ___ temprano. (comer)", correct: "comían", typed: "comian" },
      { verb: 2, question: "Yo ___ en París. (vivir)", correct: "vivía", typed: "vivia" },
      { verb: 11, question: "Ayer yo ___ al mercado. (ir)", correct: "fui", typed: "voy" },
      { verb: 14, question: "Ayer ellos ___ la verdad. (decir)", correct: "dijeron", typed: "dicen" },
      { verb: 15, question: "Ayer nosotros ___ tarde. (venir)", correct: "vinimos", typed: "venimos" },
      { verb: 0, question: "Yo ___ español. (hablar)", correct: "hablo", typed: "hablo" },
      { verb: 1, question: "Ella ___ pan. (comer)", correct: "come", typed: "come" },
      { verb: 19, question: "Tú ___ mucho. (trabajar)", correct: "trabajas", typed: "trabajas" },
    ],
  },
  {
    key: "scattered",
    label: "Scattered mistakes",
    hint: "3 unrelated wrong — the AI should say there's no clear pattern",
    items: [
      { verb: 0, question: "Tú ___ español. (hablar)", correct: "hablas", typed: "habla" },
      { verb: 13, question: "Ellos ___ en casa. (estar)", correct: "están", typed: "son" },
      { verb: 9, question: "Mañana yo ___ ir. (poder)", correct: "podré", typed: "puedo" },
      { verb: 1, question: "Ella ___ pan. (comer)", correct: "come", typed: "come" },
      { verb: 2, question: "Tú ___ aquí. (vivir)", correct: "vives", typed: "vives" },
      { verb: 19, question: "Nosotros ___ hoy. (trabajar)", correct: "trabajamos", typed: "trabajamos" },
      { verb: 8, question: "Yo ___ tarde. (dormir)", correct: "duermo", typed: "duermo" },
      { verb: 5, question: "Yo ___ la lección. (entender)", correct: "entiendo", typed: "entiendo" },
      { verb: 3, question: "Yo ___ un perro. (tener)", correct: "tengo", typed: "tengo" },
      { verb: 10, question: "Yo ___ la cena. (hacer)", correct: "hago", typed: "hago" },
    ],
  },
];

type ListRow = { id: string; name: string };

export default function TestData() {
  const router = useRouter();
  const { loadList } = usePairs();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!__DEV__) return null;

  async function run(task: () => Promise<string | void>) {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const result = await task();
      if (result) setMessage(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function findTestList(): Promise<ListRow | undefined> {
    const { lists } = await apiRequest<{ lists: ListRow[] }>("/lists");
    return lists.find((l) => l.name === TEST_LIST_NAME);
  }

  async function ensureTestList(): Promise<string> {
    const existing = await findTestList();
    if (existing) return existing.id;
    const { list_id } = await apiRequest<{ list_id: string }>("/save-list", {
      method: "POST",
      body: {
        name: TEST_LIST_NAME,
        source: "test",
        source_language: "English",
        target_language: "Spanish",
        pairs: VERBS.map(([en, es]) => ({ "source word": en, "target word": es })),
        list_type: "verb",
      },
    });
    return list_id;
  }

  async function seed(scenario: Scenario) {
    const listId = await ensureTestList();
    const list = await apiRequest<SavedList>(`/lists/${listId}`);
    const idByTarget = new Map(list.pairs.map((p) => [p.target_term, p.id]));
    const pairId = (verb: number) => idByTarget.get(VERBS[verb][1]) ?? null;

    const { session_id } = await apiRequest<{ session_id: string }>("/quiz-sessions", {
      method: "POST",
      body: {
        list_id: listId,
        verb_tenses: ["present"],
        questions: scenario.items.map((it) => ({
          question_text: it.question,
          correct_answer: it.correct,
          skill_category: "verb conjugation",
          vocab_pair_id: pairId(it.verb),
        })),
      },
    });

    for (const it of scenario.items) {
      await apiRequest("/quiz-attempts", {
        method: "POST",
        body: {
          session_id,
          vocab_pair_id: pairId(it.verb),
          question_text: it.question,
          skill_category: "verb conjugation",
          was_correct: isCorrect(it.typed, it.correct),
          user_answer: it.typed,
          correct_answer: it.correct,
        },
      });
    }

    await apiRequest(`/quiz-sessions/${session_id}`, {
      method: "PATCH",
      body: { current_index: scenario.items.length, status: "completed" },
    });
    return `Seeded "${scenario.label}" on ${TEST_LIST_NAME}. Tap Open Generate Quiz below.`;
  }

  async function openGenerateQuiz() {
    const existing = await findTestList();
    if (!existing) throw new Error("No test list yet — tap a scenario first.");
    const list = await apiRequest<SavedList>(`/lists/${existing.id}`);
    loadList(list);
    router.push("/generate-quiz");
  }

  async function deleteTestData() {
    const existing = await findTestList();
    if (!existing) return "No test data to delete.";
    const [active, completed] = await Promise.all([
      apiRequest<{ sessions: { id: string; list_id: string }[] }>("/quiz-sessions"),
      apiRequest<{ sessions: { session_id: string; list_id: string }[] }>("/quiz-sessions/completed"),
    ]);
    const sessionIds = [
      ...active.sessions.filter((s) => s.list_id === existing.id).map((s) => s.id),
      ...completed.sessions.filter((s) => s.list_id === existing.id).map((s) => s.session_id),
    ];
    for (const id of sessionIds) {
      await apiRequest(`/quiz-sessions/${id}`, { method: "DELETE" });
    }
    await apiRequest(`/lists/${existing.id}`, { method: "DELETE" });
    return `Deleted ${TEST_LIST_NAME} and ${sessionIds.length} test quiz(zes).`;
  }

  return (
    <ScrollView style={shared.screen} contentContainerStyle={styles.content}>
      <BackButton href="/" />
      <Text style={shared.title}>Test data</Text>
      <Text style={shared.hint}>
        Adds a finished quiz with realistic mistakes to a throwaway [TEST] list (20 Spanish verbs).
        Tap a scenario, then Open Generate Quiz. On Generate Quiz, set the number of questions to 5
        so Target My Mistakes visibly picks the words. Needs Adaptive Quizzes on in Settings.
      </Text>

      <Text style={styles.sectionTitle}>Scenarios</Text>
      {SCENARIOS.map((scenario) => (
        <PressButton
          key={scenario.key}
          style={[shared.secondaryButton, busy && shared.primaryButtonDisabled]}
          disabled={busy}
          onPress={() => run(() => seed(scenario))}
        >
          <Text style={shared.secondaryButtonText}>{scenario.label}</Text>
          <Text style={styles.buttonHint}>{scenario.hint}</Text>
        </PressButton>
      ))}

      <Text style={styles.sectionTitle}>Then</Text>
      <PressButton
        style={[shared.primaryButton, shared.generateQuizButton, busy && shared.primaryButtonDisabled]}
        disabled={busy}
        onPress={() => run(openGenerateQuiz)}
      >
        <Text style={shared.primaryButtonText}>Open Generate Quiz</Text>
      </PressButton>

      <Text style={styles.sectionTitle}>Cleanup</Text>
      <PressButton
        style={[shared.secondaryButton, busy && shared.primaryButtonDisabled]}
        disabled={busy}
        onPress={() => run(deleteTestData)}
      >
        <Text style={[shared.secondaryButtonText, styles.deleteText]}>Delete test data</Text>
      </PressButton>

      <View>
        {busy && <Text style={shared.hint}>Working…</Text>}
        {message && <Text style={styles.success}>{message}</Text>}
        {error && <Text style={shared.errorText}>{error}</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8,
    color: colors.text,
  },
  buttonHint: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
    textAlign: "center",
  },
  deleteText: {
    color: colors.error,
  },
  success: {
    color: colors.success,
    fontWeight: "600",
  },
});
