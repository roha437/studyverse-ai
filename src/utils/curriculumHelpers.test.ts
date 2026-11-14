import test from 'node:test';
import assert from 'node:assert/strict';
import { CURRICULUM_CLASSES, INITIAL_STUDY_TASKS } from '../data/curriculum';
import {
  computePlannerSummary,
  filterCurriculumTopics,
  formatSecondsToTimer,
  getAvailableSubjects,
  getPreviousClassesForGrade,
  resolveDefaultContext,
  validateOnboardingProfile,
} from './curriculumHelpers';

test('getPreviousClassesForGrade returns strictly lower grades', () => {
  const prevFrom10 = getPreviousClassesForGrade('class-10');
  assert.deepEqual(
    prevFrom10.map((c) => c.id),
    ['class-5', 'class-6', 'class-7', 'class-8', 'class-9']
  );

  const prevFrom5 = getPreviousClassesForGrade('class-5');
  assert.equal(prevFrom5.length, 0);

  const prevFromInter2 = getPreviousClassesForGrade('inter-2');
  assert.equal(prevFromInter2.length, 7);
  assert.equal(prevFromInter2[prevFromInter2.length - 1].id, 'inter-1');
});

test('getAvailableSubjects filters Intermediate streams properly', () => {
  const mpcSubjects = getAvailableSubjects('inter-1', 'mpc').map((s) => s.name);
  assert.ok(mpcSubjects.includes('Mathematics (1A & 1B)'));
  assert.ok(mpcSubjects.includes('Physics'));
  assert.ok(!mpcSubjects.includes('Botany & Zoology'));

  const bipcSubjects = getAvailableSubjects('inter-1', 'bipc').map((s) => s.name);
  assert.ok(bipcSubjects.includes('Botany & Zoology'));
  assert.ok(!bipcSubjects.includes('Mathematics (1A & 1B)'));
});

test('resolveDefaultContext picks valid subject, chapter, and topic', () => {
  const ctx = resolveDefaultContext('inter-2', 'general');
  assert.equal(ctx.streamId, 'mpc');
  assert.ok(ctx.subjectId.length > 0);
  assert.ok(ctx.chapterId.length > 0);
  assert.ok(ctx.topicId.length > 0);
});

test('filterCurriculumTopics finds matching topics across grades', () => {
  const hits = filterCurriculumTopics(CURRICULUM_CLASSES, 'quadratic', 'class-10');
  assert.ok(hits.length >= 1);
  assert.equal(hits[0].gradeId, 'class-10');
});

test('formatSecondsToTimer formats MM:SS deterministically', () => {
  assert.equal(formatSecondsToTimer(1500), '25:00');
  assert.equal(formatSecondsToTimer(65), '01:05');
  assert.equal(formatSecondsToTimer(-4), '00:00');
});

test('validateOnboardingProfile enforces name and intermediate stream', () => {
  const invalidName = validateOnboardingProfile({
    name: ' ',
    gradeId: 'class-10',
    streamId: 'general',
  });
  assert.equal(invalidName.valid, false);
  assert.ok(invalidName.errors.name);

  const missingStream = validateOnboardingProfile({
    name: 'Aarav Rao',
    gradeId: 'inter-1',
    streamId: 'general',
  });
  assert.equal(missingStream.valid, false);
  assert.ok(missingStream.errors.streamId);

  const validInter = validateOnboardingProfile({
    name: 'Aarav Rao',
    gradeId: 'inter-1',
    streamId: 'mpc',
  });
  assert.equal(validInter.valid, true);
});

test('computePlannerSummary calculates totals accurately', () => {
  const tasks = INITIAL_STUDY_TASKS.map((t, idx) =>
    idx === 0 ? { ...t, completed: true } : t
  );
  const summary = computePlannerSummary(tasks);
  assert.equal(summary.totalTasks, 3);
  assert.equal(summary.completedTasks, 1);
  assert.equal(summary.totalMinutes, 105);
  assert.equal(summary.completedMinutes, 40);
  assert.equal(summary.remainingMinutes, 65);
});
