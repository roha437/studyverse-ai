import type { AssessmentDifficulty, AssessmentQuestion } from '../types/studyverse.ts';

export interface SavedTimedAssessment {
  contextKey: string;
  difficulty: AssessmentDifficulty;
  questionCount: number;
  questionIds: string[];
  deadlineAt: number;
  elapsedSeconds: number;
  selectedAnswers: Record<string, number>;
  markedQuestionIds: string[];
  currentQuestionIndex: number;
}

const DIFFICULTIES: AssessmentDifficulty[] = ['Foundation', 'Board Standard', 'Challenge'];

export function getTimedTestDurationSeconds(questionCount: number): number {
  return Math.max(120, Math.min(20, Math.floor(questionCount)) * 120);
}

export function getRemainingTestSeconds(deadlineAt: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((deadlineAt - now) / 1000));
}

export function restoreSavedTimedAssessment(
  value: unknown,
  contextKey: string,
  questionBank: AssessmentQuestion[],
  now = Date.now()
): SavedTimedAssessment | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (
    raw.contextKey !== contextKey ||
    !DIFFICULTIES.includes(raw.difficulty as AssessmentDifficulty) ||
    ![3, 5, 10].includes(Number(raw.questionCount)) ||
    !Array.isArray(raw.questionIds) ||
    raw.questionIds.length === 0 ||
    raw.questionIds.length > 20 ||
    !Number.isFinite(raw.deadlineAt) ||
    !Number.isFinite(raw.elapsedSeconds) ||
    !Array.isArray(raw.markedQuestionIds) ||
    !Number.isInteger(raw.currentQuestionIndex)
  ) {
    return null;
  }

  const questionIds = raw.questionIds.filter((id): id is string => typeof id === 'string');
  const uniqueIds = [...new Set(questionIds)];
  if (uniqueIds.length !== raw.questionIds.length || uniqueIds.length !== questionIds.length) return null;
  const questionsById = new Map(questionBank.map((question) => [question.id, question]));
  if (uniqueIds.some((id) => !questionsById.has(id))) return null;

  const selectedAnswers: Record<string, number> = {};
  if (raw.selectedAnswers && typeof raw.selectedAnswers === 'object') {
    for (const [questionId, answerIndex] of Object.entries(raw.selectedAnswers)) {
      const question = questionsById.get(questionId);
      if (
        uniqueIds.includes(questionId) &&
        question &&
        Number.isInteger(answerIndex) &&
        Number(answerIndex) >= 0 &&
        Number(answerIndex) < question.options.length
      ) {
        selectedAnswers[questionId] = Number(answerIndex);
      }
    }
  }
  const markedQuestionIds = raw.markedQuestionIds.filter(
    (id): id is string => typeof id === 'string' && uniqueIds.includes(id)
  );
  const deadlineAt = Number(raw.deadlineAt);
  if (!Number.isFinite(deadlineAt) || deadlineAt <= 0 || deadlineAt > now + 24 * 60 * 60 * 1000) {
    return null;
  }

  return {
    contextKey,
    difficulty: raw.difficulty as AssessmentDifficulty,
    questionCount: Number(raw.questionCount),
    questionIds: uniqueIds,
    deadlineAt,
    elapsedSeconds: Math.max(0, Math.min(getTimedTestDurationSeconds(uniqueIds.length), Math.floor(Number(raw.elapsedSeconds)))),
    selectedAnswers,
    markedQuestionIds: [...new Set(markedQuestionIds)],
    currentQuestionIndex: Math.max(
      0,
      Math.min(uniqueIds.length - 1, Number(raw.currentQuestionIndex))
    ),
  };
}
