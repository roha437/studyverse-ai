import assert from 'node:assert/strict';
import test from 'node:test';
import type { QuizAttemptRecord, TestAttemptRecord } from '../types/studyverse.ts';
import { getWeakTopicPerformance } from './assessmentAnalytics.ts';

const quizAttempt: QuizAttemptRecord = {
  id: 'quiz-1',
  classLevel: 'class-10',
  subject: 'Mathematics',
  chapterId: 'chapter-1',
  topicId: 'topic-weak',
  quizType: 'practice',
  difficulty: 'Foundation',
  totalQuestions: 2,
  correctAnswers: 1,
  scorePercentage: 50,
  answers: [{ questionId: 'q1', prompt: 'q1', selectedIndex: 0, correctIndex: 0, isCorrect: true }],
  durationSeconds: 30,
  completedAt: '2026-11-15T10:00:00Z',
};

const testAttempt: TestAttemptRecord = {
  id: 'test-1',
  title: 'Topic test',
  classLevel: 'class-10',
  subject: 'Mathematics',
  testType: 'timed',
  totalMarks: 2,
  obtainedMarks: 0,
  durationSeconds: 60,
  answers: [{ questionId: 'q2', prompt: 'q2', selectedIndex: 0, correctIndex: 1, isCorrect: false }],
  result: { percentage: 0, gradeLabel: 'Needs Revision', topicId: 'topic-weak' },
  completedAt: '2026-11-15T10:05:00Z',
};

test('weak topic performance aggregates only recorded answers with topic context', () => {
  assert.deepEqual(getWeakTopicPerformance([quizAttempt], [testAttempt]), [
    { topicId: 'topic-weak', questions: 2, correctAnswers: 1, attempts: 2, accuracy: 50 },
  ]);
  assert.deepEqual(getWeakTopicPerformance([{ ...quizAttempt, topicId: null }], []), []);
});
