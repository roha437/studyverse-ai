import assert from 'node:assert/strict';
import test from 'node:test';
import { getCurriculumQuestionsForContext } from './assessments.ts';
import { CURRICULUM_CLASSES } from './curriculum.ts';

const classTen = CURRICULUM_CLASSES.find((item) => item.id === 'class-10')!;
const subject = classTen.subjects.find((item) =>
  item.chapters.some((chapterItem) => chapterItem.topics.some((topicItem) => topicItem.id === 'c10-math-t1'))
)!;
const chapter = subject.chapters.find((item) => item.topics.some((topic) => topic.id === 'c10-math-t1'))!;
const topic = chapter.topics.find((item) => item.id === 'c10-math-t1')!;

test('quiz difficulty selects only reviewed questions and bounds the requested set', () => {
  const foundation = getCurriculumQuestionsForContext(subject, chapter, topic, 10, 'Foundation');
  const challenge = getCurriculumQuestionsForContext(subject, chapter, topic, 10, 'Challenge');
  assert.deepEqual(foundation.map((question) => question.id), ['c10-math-t1-q1']);
  assert.deepEqual(challenge.map((question) => question.id), ['c10-math-t1-q2']);
  assert.equal(getCurriculumQuestionsForContext(subject, chapter, topic, 0, 'Challenge').length, 0);
});

test('quiz question selection shuffles without repeats and does not invent uncovered questions', () => {
  const shuffled = getCurriculumQuestionsForContext(
    subject,
    chapter,
    topic,
    10,
    'Board Standard',
    () => 0
  );
  assert.deepEqual(shuffled.map((question) => question.id), ['c10-math-t1-q3']);
  assert.equal(new Set(shuffled.map((question) => question.id)).size, shuffled.length);

  const unsupportedTopic = { ...topic, id: 'unsupported-topic' };
  assert.deepEqual(
    getCurriculumQuestionsForContext(subject, chapter, unsupportedTopic, 10, 'Foundation'),
    []
  );
});
