import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNotesPrompt,
  mapGeminiErrorToResponse,
  normalizeGeneratedNotePayload,
  validateGenerateNotesPayload,
} from './notesGeneratorHelpers';

test('validateGenerateNotesPayload enforces required curriculum fields and normalizes format', () => {
  const invalid = validateGenerateNotesPayload({ classLabel: 'Class 10', subject: 'Physics' });
  assert.equal(invalid.valid, false);

  const valid = validateGenerateNotesPayload({
    classLabel: 'Class 10',
    board: 'NCERT / CBSE',
    subject: 'Physics',
    chapter: 'Light – Reflection and Refraction',
    topic: 'Mirror Formula & Magnification',
    noteFormat: 'formulas',
    customFocus: 'Sign conventions for concave mirrors',
  });
  assert.equal(valid.valid, true);
  if (valid.valid) {
    assert.equal(valid.data.noteFormat, 'formulas');
    assert.equal(valid.data.board, 'NCERT / CBSE');
    assert.equal(valid.data.customFocus, 'Sign conventions for concave mirrors');
  }
});

test('buildNotesPrompt includes class, board, subject, chapter, topic, and format guidance', () => {
  const prompt = buildNotesPrompt({
    classLabel: 'Intermediate 1st Year',
    streamLabel: 'MPC',
    board: 'Intermediate Board',
    subject: 'Mathematics',
    chapter: 'Functions & Limits',
    topic: 'Standard Limits',
    topicSummary: 'Algebraic and trigonometric limit identities.',
    keyFormula: 'lim(x->0) sin(x)/x = 1',
    noteFormat: 'qa',
    customFocus: 'Board 4-mark proofs',
  });
  assert.match(prompt, /Intermediate 1st Year \(MPC stream\)/);
  assert.match(prompt, /Curriculum Board: Intermediate Board/);
  assert.match(prompt, /Exam Q&A Revision Notes/);
  assert.match(prompt, /Board 4-mark proofs/);
});

test('normalizeGeneratedNotePayload parses JSON or fenced JSON cleanly', () => {
  const raw = '```json\n{"title":"Mirror Formula Sheet","summary":"Relates object distance u, image distance v, and focal length f.","keyPoints":["1/f = 1/v + 1/u","m = -v/u"]}\n```';
  const parsed = normalizeGeneratedNotePayload(raw, {
    topic: 'Mirror Formula & Magnification',
    keyFormula: '1/f = 1/v + 1/u',
    noteFormat: 'formulas',
  });
  assert.ok(parsed);
  assert.equal(parsed?.title, 'Mirror Formula Sheet');
  assert.equal(parsed?.keyPoints.length, 2);
  assert.equal(parsed?.formula, '1/f = 1/v + 1/u');

  assert.equal(
    normalizeGeneratedNotePayload('not-valid-json', {
      topic: 'Any',
      noteFormat: 'summary',
    }),
    null
  );
});

test('mapGeminiErrorToResponse maps quota, key, and network failures cleanly', () => {
  assert.equal(mapGeminiErrorToResponse(new Error('429 RESOURCE_EXHAUSTED')).status, 429);
  assert.equal(mapGeminiErrorToResponse(new Error('API_KEY_INVALID')).status, 502);
  assert.equal(mapGeminiErrorToResponse(new Error('fetch failed')).status, 504);
});
