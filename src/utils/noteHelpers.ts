import type { NoteInput, NoteRecord } from '../types/studyverse.ts';

function normalizedText(value: string | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function sameContent(left: NoteInput['content'], right: NoteInput['content']): boolean {
  const leftPoints = left.keyPoints.map(normalizedText).filter(Boolean);
  const rightPoints = right.keyPoints.map(normalizedText).filter(Boolean);
  return (
    normalizedText(left.summary) === normalizedText(right.summary) &&
    normalizedText(left.formula) === normalizedText(right.formula) &&
    normalizedText(left.emphasis) === normalizedText(right.emphasis) &&
    leftPoints.length === rightPoints.length &&
    leftPoints.every((point, index) => point === rightPoints[index])
  );
}

export function isDuplicateNote(
  existingNotes: NoteRecord[],
  input: NoteInput,
  excludingNoteId?: string
): boolean {
  return existingNotes.some(
    (note) =>
      note.id !== excludingNoteId &&
      note.classLevel === input.classLevel &&
      note.subject.trim().toLocaleLowerCase() === input.subject.trim().toLocaleLowerCase() &&
      note.chapterId === input.chapterId &&
      note.topicId === input.topicId &&
      note.noteType === input.noteType &&
      normalizedText(note.title) === normalizedText(input.title) &&
      sameContent(note.content, input.content)
  );
}

export function mapNoteInputToDatabaseFields(input: NoteInput) {
  return {
    title: input.title.trim(),
    class_level: input.classLevel,
    subject: input.subject.trim(),
    chapter_id: input.chapterId,
    topic_id: input.topicId,
    note_type: input.noteType,
    content: {
      summary: input.content.summary.trim(),
      keyPoints: input.content.keyPoints.map((point) => point.trim()).filter(Boolean),
      ...(input.content.formula?.trim() ? { formula: input.content.formula.trim() } : {}),
      ...(input.content.emphasis?.trim() ? { emphasis: input.content.emphasis.trim() } : {}),
    },
    is_favorite: Boolean(input.isFavorite),
  };
}
