import type { QuizAttemptRecord, TestAttemptRecord } from '../types/studyverse.ts';

export interface TopicAssessmentPerformance {
  topicId: string;
  questions: number;
  correctAnswers: number;
  accuracy: number;
  attempts: number;
}

export function getWeakTopicPerformance(
  quizAttempts: QuizAttemptRecord[],
  testAttempts: TestAttemptRecord[],
  threshold = 60
): TopicAssessmentPerformance[] {
  const totals = new Map<string, { questions: number; correctAnswers: number; attempts: number }>();
  const addAttempt = (topicId: string | null | undefined, answers: { isCorrect: boolean }[]) => {
    if (!topicId || answers.length === 0) return;
    const current = totals.get(topicId) ?? { questions: 0, correctAnswers: 0, attempts: 0 };
    current.questions += answers.length;
    current.correctAnswers += answers.filter((answer) => answer.isCorrect).length;
    current.attempts += 1;
    totals.set(topicId, current);
  };

  quizAttempts.forEach((attempt) => addAttempt(attempt.topicId, attempt.answers));
  testAttempts.forEach((attempt) => addAttempt(attempt.result.topicId, attempt.answers));

  return [...totals.entries()]
    .map(([topicId, totalsForTopic]) => ({
      topicId,
      ...totalsForTopic,
      accuracy:
        totalsForTopic.questions > 0
          ? Math.round((totalsForTopic.correctAnswers / totalsForTopic.questions) * 100)
          : 0,
    }))
    .filter((topic) => topic.accuracy < threshold)
    .sort((left, right) => left.accuracy - right.accuracy || right.questions - left.questions);
}
