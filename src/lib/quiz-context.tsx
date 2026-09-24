import * as Haptics from "expo-haptics";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { apiRequest } from "./api";
import { getLanguagePairSettings } from "./settings-storage";
import { removeAccents } from "./text";
import type { Question } from "./types";

type QuizPhase = "question" | "feedback";

// Bundles what startQuiz needs instead of a positional parameter list —
// that list had grown to 6 (two of them, startIndex/startCorrect, added
// later specifically for resuming a session) and was one more fix away
// from a 7th. A caller can't get these mixed up by position now, and
// adding another later doesn't ripple through every call site's argument
// order.
export type StartQuizOptions = {
  questions: Question[];
  sessionId: string | null;
  sourceLanguage: string;
  targetLanguage: string;
  // Only set when resuming a partly-finished session — where to jump back
  // in, and how many answers before that point were already correct, so
  // the final score counts them too.
  startIndex?: number;
  startCorrect?: number;
};

type QuizState = {
  questions: Question[];
  currentIndex: number;
  phase: QuizPhase;
  lastAnswer: string;
  wasCorrect: boolean;
  correctCount: number;
  isComplete: boolean;
  // Exposed so Quiz Complete can link to a full results view fetched from
  // GET /quiz-sessions/{sessionId}/attempts — null for an anonymous/unsaved
  // quiz, which has no persisted attempt history to show.
  sessionId: string | null;
  startQuiz: (options: StartQuizOptions) => void;
  submitAnswer: (answer: string) => void;
  skipQuestion: () => void;
  nextQuestion: () => Promise<void>;
  resetQuiz: () => void;
  // Marks that the current question's tense-hint reveal was tapped, so
  // it's recorded alongside the attempt when this question is answered —
  // developer-facing only (see create_quiz_attempt on the backend), never
  // shown back to the user or affecting scoring.
  markTenseHintUsed: () => void;
};

const QuizContext = createContext<QuizState | null>(null);

// Mirrors the Streamlit prototype's screens/quiz.py state machine: each
// question has a "question" phase (input) then a "feedback" phase
// (correct/incorrect + the right answer), advancing persists progress via
// PATCH /quiz-sessions/{id} when a session exists (logged-in users only).
export function QuizProvider({ children }: { children: ReactNode }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<QuizPhase>("question");
  const [lastAnswer, setLastAnswer] = useState("");
  const [wasCorrect, setWasCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [requireAccents, setRequireAccentsState] = useState(false);
  const [usedTenseHint, setUsedTenseHint] = useState(false);

  const isComplete = questions.length > 0 && currentIndex >= questions.length;

  const startQuiz = useCallback((options: StartQuizOptions) => {
    const { questions: newQuestions, sessionId: newSessionId, sourceLanguage, targetLanguage } = options;
    setQuestions(newQuestions);
    setCurrentIndex(options.startIndex ?? 0);
    setPhase("question");
    setCorrectCount(options.startCorrect ?? 0);
    setSessionId(newSessionId);
    setUsedTenseHint(false);
    // Re-read fresh (per this specific language pair, not a flat global
    // default) so a change made in Settings takes effect on the next
    // quiz, without needing to restart the app.
    getLanguagePairSettings(sourceLanguage, targetLanguage).then((settings) =>
      setRequireAccentsState(settings.requireAccents)
    );
  }, []);

  // Best-effort, like the progress PATCH below — a failed attempt-record
  // shouldn't block the user's quiz. Only meaningful when there's a real
  // session (a saved list); ad-hoc quizzes have no history to build.
  const recordAttempt = useCallback(
    async (question: Question, correct: boolean, userAnswer: string, hintUsed: boolean) => {
      if (!sessionId) return;
      try {
        await apiRequest("/quiz-attempts", {
          method: "POST",
          body: {
            session_id: sessionId,
            vocab_pair_id: question.vocab_pair_id,
            question_text: question.question_text,
            skill_category: question.skill_category,
            was_correct: correct,
            user_answer: userAnswer,
            correct_answer: question.correct_answer,
            tense: question.tense ?? null,
            used_tense_hint: hintUsed,
          },
        });
      } catch {
        // best-effort
      }
    },
    [sessionId]
  );

  // Persists that this question is answered as soon as it's graded, not
  // when "Next Question" is pressed — otherwise navigating away from the
  // feedback screen without pressing Next leaves current_index stuck on
  // the just-answered question, letting it be re-answered on resume.
  const persistProgress = useCallback(
    async (newIndex: number) => {
      if (!sessionId) return;
      try {
        await apiRequest(`/quiz-sessions/${sessionId}`, {
          method: "PATCH",
          body: {
            current_index: newIndex,
            // Marks the session done once the last question's been
            // answered, so it drops off "Continue a Quiz" and starts
            // counting toward this list's score history.
            status: newIndex >= questions.length ? "completed" : undefined,
          },
        });
      } catch {
        // Progress persistence is best-effort — don't block the user's
        // quiz flow on a transient network error.
      }
    },
    [sessionId, questions.length]
  );

  const submitAnswer = useCallback(
    (answer: string) => {
      const current = questions[currentIndex];
      const normalize = (s: string) => {
        const lowered = s.trim().toLowerCase();
        return requireAccents ? lowered : removeAccents(lowered);
      };
      const correct = normalize(answer) === normalize(current.correct_answer);
      setLastAnswer(answer);
      setWasCorrect(correct);
      if (correct) setCorrectCount((prev) => prev + 1);
      setPhase("feedback");
      recordAttempt(current, correct, answer, usedTenseHint);
      persistProgress(currentIndex + 1);
      Haptics.notificationAsync(
        correct
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      ).catch(() => {
        // No-op on platforms/devices without haptic support (e.g. web).
      });
    },
    [questions, currentIndex, recordAttempt, persistProgress, requireAccents, usedTenseHint]
  );

  const skipQuestion = useCallback(() => {
    const current = questions[currentIndex];
    setLastAnswer("(skipped)");
    setWasCorrect(false);
    setPhase("feedback");
    recordAttempt(current, false, "(skipped)", usedTenseHint);
    persistProgress(currentIndex + 1);
  }, [questions, currentIndex, recordAttempt, persistProgress, usedTenseHint]);

  const nextQuestion = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      // No-op on platforms/devices without haptic support (e.g. web).
    });
    setCurrentIndex((prev) => prev + 1);
    setPhase("question");
    setUsedTenseHint(false);
  }, []);

  const markTenseHintUsed = useCallback(() => setUsedTenseHint(true), []);

  const resetQuiz = useCallback(() => {
    setQuestions([]);
    setCurrentIndex(0);
    setPhase("question");
    setCorrectCount(0);
    setSessionId(null);
  }, []);

  const value = useMemo(
    () => ({
      questions,
      currentIndex,
      phase,
      lastAnswer,
      wasCorrect,
      correctCount,
      isComplete,
      sessionId,
      startQuiz,
      submitAnswer,
      skipQuestion,
      nextQuestion,
      resetQuiz,
      markTenseHintUsed,
    }),
    [
      questions,
      currentIndex,
      phase,
      lastAnswer,
      wasCorrect,
      correctCount,
      isComplete,
      sessionId,
      startQuiz,
      submitAnswer,
      skipQuestion,
      nextQuestion,
      resetQuiz,
      markTenseHintUsed,
    ]
  );

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}

export function useQuiz() {
  const ctx = useContext(QuizContext);
  if (!ctx) {
    throw new Error("useQuiz must be used within a QuizProvider");
  }
  return ctx;
}
