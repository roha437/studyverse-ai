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

test('Classes 6–10 expose core learning pathways with unique context IDs and objectives', () => {
  const middleAndSecondary = CURRICULUM_CLASSES.filter(
    (curriculumClass) => curriculumClass.order >= 6 && curriculumClass.order <= 10
  );
  const curriculumIds = new Set<string>();

  assert.equal(middleAndSecondary.length, 5);
  for (const curriculumClass of middleAndSecondary) {
    const subjects = curriculumClass.subjects;
    assert.ok(subjects.some((subject) => subject.name === 'Mathematics'));
    assert.ok(subjects.some((subject) => subject.name === 'English Language' || subject.name === 'English Language and Literature'));
    assert.ok(subjects.some((subject) => subject.name === 'Social Studies' || subject.name === 'Social Science'));
    assert.ok(subjects.some((subject) => ['Science', 'Physics', 'Biology'].includes(subject.name)));

    for (const subject of subjects) {
      assert.ok(!curriculumIds.has(subject.id), `duplicate subject id: ${subject.id}`);
      curriculumIds.add(subject.id);
      for (const chapter of subject.chapters) {
        assert.ok(!curriculumIds.has(chapter.id), `duplicate chapter id: ${chapter.id}`);
        curriculumIds.add(chapter.id);
        assert.ok(chapter.topics.length > 0, `empty chapter: ${chapter.id}`);
        if (chapter.textbookUnit.startsWith('Curated learning cluster')) {
          for (const topic of chapter.topics) {
            assert.ok(topic.learningObjective, `missing learning objective: ${topic.id}`);
            assert.ok(!curriculumIds.has(topic.id), `duplicate topic id: ${topic.id}`);
            curriculumIds.add(topic.id);
          }
        }
      }
    }
  }
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
