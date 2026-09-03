import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { apiRequest } from "./api";
import { removeAccents } from "./text";
import type { Question } from "./types";

type QuizPhase = "question" | "feedback";

type QuizState = {
  questions: Question[];
  currentIndex: number;
  phase: QuizPhase;
  lastAnswer: string;
  wasCorrect: boolean;
  correctCount: number;
  isComplete: boolean;
  startQuiz: (questions: Question[], sessionId: string | null, startIndex?: number) => void;
  submitAnswer: (answer: string) => void;
  skipQuestion: () => void;
  nextQuestion: () => Promise<void>;
  resetQuiz: () => void;
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

  const isComplete = questions.length > 0 && currentIndex >= questions.length;

  const startQuiz = useCallback(
    (newQuestions: Question[], newSessionId: string | null, startIndex: number = 0) => {
      setQuestions(newQuestions);
      setCurrentIndex(startIndex);
      setPhase("question");
      setCorrectCount(0);
      setSessionId(newSessionId);
    },
    []
  );

  // Best-effort, like the progress PATCH below — a failed attempt-record
  // shouldn't block the user's quiz. Only meaningful when there's a real
  // session (a saved list); ad-hoc quizzes have no history to build.
  const recordAttempt = useCallback(
    async (question: Question, correct: boolean) => {
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
          },
        });
      } catch {
        // best-effort
      }
    },
    [sessionId]
  );

  const submitAnswer = useCallback(
    (answer: string) => {
      const current = questions[currentIndex];
      const correct =
        removeAccents(answer.trim().toLowerCase()) ===
        removeAccents(current.correct_answer.trim().toLowerCase());
      setLastAnswer(answer);
      setWasCorrect(correct);
      if (correct) setCorrectCount((prev) => prev + 1);
      setPhase("feedback");
      recordAttempt(current, correct);
    },
    [questions, currentIndex, recordAttempt]
  );

  const skipQuestion = useCallback(() => {
    const current = questions[currentIndex];
    setLastAnswer("(skipped)");
    setWasCorrect(false);
    setPhase("feedback");
    recordAttempt(current, false);
  }, [questions, currentIndex, recordAttempt]);

  const nextQuestion = useCallback(async () => {
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    setPhase("question");
    if (sessionId) {
      try {
        await apiRequest(`/quiz-sessions/${sessionId}`, {
          method: "PATCH",
          body: { current_index: newIndex },
        });
      } catch {
        // Progress persistence is best-effort — don't block the user's
        // quiz flow on a transient network error.
      }
    }
  }, [currentIndex, sessionId]);

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
      startQuiz,
      submitAnswer,
      skipQuestion,
      nextQuestion,
      resetQuiz,
    }),
    [
      questions,
      currentIndex,
      phase,
      lastAnswer,
      wasCorrect,
      correctCount,
      isComplete,
      startQuiz,
      submitAnswer,
      skipQuestion,
      nextQuestion,
      resetQuiz,
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
