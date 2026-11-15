import assert from 'node:assert/strict';
import test from 'node:test';
import type { NoteInput, NoteRecord } from '../types/studyverse.ts';
import { isDuplicateNote, mapNoteInputToDatabaseFields } from './noteHelpers.ts';

const input: NoteInput = {
  title: 'Cell Structure Notes',
  classLevel: 'class-10',
  subject: 'Biology',
  chapterId: 'c10-bio-t1',
  topicId: 'c10-bio-t1-cell',
  noteType: 'summary',
  content: {
    summary: 'Cells are the basic units of life.',
    keyPoints: ['Cell membrane surrounds the cell.'],
    formula: '',
    emphasis: 'Review organelles',
  },
};

const saved: NoteRecord = {
  ...input,
  id: 'note-1',
  content: { ...input.content },
  isFavorite: false,
  createdAt: '2026-11-15T10:00:00Z',
  updatedAt: '2026-11-15T10:00:00Z',
};

test('duplicate detection compares content and curriculum metadata and supports editing the same note', () => {
  assert.equal(isDuplicateNote([saved], input), true);
  assert.equal(isDuplicateNote([saved], input, saved.id), false);
  assert.equal(isDuplicateNote([saved], { ...input, content: { ...input.content, summary: 'Different' } }), false);
  assert.equal(isDuplicateNote([saved], { ...input, topicId: null }), false);
});

test('note persistence payload trims text and preserves editable metadata', () => {
  const payload = mapNoteInputToDatabaseFields({
    ...input,
    title: '  Updated title  ',
    subject: ' Chemistry ',
    isFavorite: true,
    content: {
      summary: ' Updated summary ',
      keyPoints: [' one ', '  '],
      formula: ' H2O ',
      emphasis: ' Review ',
    },
  });
  assert.equal(payload.title, 'Updated title');
  assert.equal(payload.subject, 'Chemistry');
  assert.equal(payload.note_type, 'summary');
  assert.deepEqual(payload.content, {
    summary: 'Updated summary',
    keyPoints: ['one'],
    formula: 'H2O',
    emphasis: 'Review',
  });
  assert.equal(payload.is_favorite, true);
});
