import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLessonPrompt,
  normalizeGeneratedLesson,
  validateLessonGenerationPayload,
  type LessonGenerationPayload,
} from './lessonGeneratorHelpers.ts';

const validPayload: LessonGenerationPayload = {
  classLabel: 'Class 8',
  board: 'CBSE',
  subject: 'Science',
  chapter: 'Force and Pressure',
  topic: 'Pressure',
  topicSummary: 'Pressure is force acting per unit area.',
  keyFormula: 'P = F / A',
  depth: 'walkthrough',
  teachingStyle: 'analogy-led',
};

test('lesson request validation requires complete bounded curriculum context', () => {
  assert.equal(validateLessonGenerationPayload(validPayload).valid, true);
  assert.equal(
    validateLessonGenerationPayload({ ...validPayload, board: '' }).valid,
    false
  );
  assert.equal(
    validateLessonGenerationPayload({ ...validPayload, teachingStyle: 'lecture' }).valid,
    false
  );
  assert.equal(
    validateLessonGenerationPayload({ ...validPayload, topicSummary: 'x'.repeat(701) }).valid,
    false
  );
});

test('lesson prompt includes the learning context and selected teaching style', () => {
  const prompt = buildLessonPrompt(validPayload);
  assert.match(prompt, /"board":"CBSE"/);
  assert.match(prompt, /"topic":"Pressure"/);
  assert.match(prompt, /Teaching style: analogy-led/);
});

test('lesson response normalization accepts complete structured content', () => {
  const lesson = normalizeGeneratedLesson(
    JSON.stringify({
      title: 'Understanding Pressure',
      simpleExplanation: 'Pressure tells how concentrated a force is.',
      detailedExplanation: 'Pressure is calculated by dividing force by area.',
      realLifeExamples: ['A sharp knife cuts more easily.'],
      definitions: [{ term: 'Pressure', definition: 'Force applied per unit area.' }],
      keyPoints: ['Smaller area creates greater pressure for the same force.'],
      practiceQuestions: [
        {
          question: 'What happens to pressure when area decreases?',
          answer: 'It increases.',
          explanation: 'The same force acts over a smaller area.',
        },
      ],
    }),
    'Pressure'
  );

  assert.equal(lesson?.title, 'Understanding Pressure');
  assert.equal(lesson?.practiceQuestions.length, 1);
});

test('lesson response normalization rejects missing sections and malformed JSON', () => {
  assert.equal(normalizeGeneratedLesson('{bad json', 'Pressure'), null);
  assert.equal(
    normalizeGeneratedLesson(
      JSON.stringify({
        simpleExplanation: 'A clear explanation.',
        detailedExplanation: 'More details.',
        realLifeExamples: [],
        definitions: [],
        keyPoints: [],
        practiceQuestions: [],
      }),
      'Pressure'
    ),
    null
  );
});
