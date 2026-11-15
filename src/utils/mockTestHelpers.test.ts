import assert from 'node:assert/strict';
import test from 'node:test';
import type { AssessmentQuestion } from '../types/studyverse.ts';
import {
  getRemainingTestSeconds,
  getTimedTestDurationSeconds,
  restoreSavedTimedAssessment,
} from './mockTestHelpers.ts';

const question: AssessmentQuestion = {
  id: 'q1',
  prompt: 'Question',
  options: ['A', 'B'],
  correctIndex: 1,
  explanation: 'B is correct.',
  difficulty: 'Board Standard',
};

test('mock test countdown uses bounded duration and expires from its deadline', () => {
  assert.equal(getTimedTestDurationSeconds(5), 600);
  assert.equal(getTimedTestDurationSeconds(100), 2400);
  assert.equal(getRemainingTestSeconds(10_000, 8_500), 2);
  assert.equal(getRemainingTestSeconds(8_000, 8_500), 0);
});

test('active timed tests restore only validated user/context-matching state', () => {
  const saved = {
    contextKey: 'class-10:math:chapter:topic',
    difficulty: 'Board Standard',
    questionCount: 3,
    questionIds: ['q1'],
    deadlineAt: 50_000,
    elapsedSeconds: 30,
    selectedAnswers: { q1: 1 },
    markedQuestionIds: ['q1'],
    currentQuestionIndex: 0,
  };
  const restored = restoreSavedTimedAssessment(saved, saved.contextKey, [question], 10_000);
  assert.equal(restored?.selectedAnswers.q1, 1);
  assert.deepEqual(restored?.markedQuestionIds, ['q1']);
  assert.equal(restoreSavedTimedAssessment(saved, 'another-user-context', [question], 10_000), null);
  assert.equal(
    restoreSavedTimedAssessment({ ...saved, questionIds: ['q1', 'q1'] }, saved.contextKey, [question], 10_000),
    null
  );
});
