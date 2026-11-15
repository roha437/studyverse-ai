import { useEffect, useRef, useState } from 'react';
import { BookOpen, Edit3, FileText, Loader2, Plus, Sparkles, Star, Trash2, X } from 'lucide-react';
import type {
  ActiveStudyContext,
  BoardId,
  DatabaseSyncStatus,
  DbOperationResult,
  NavModuleId,
  NoteInput,
  NoteRecord,
  NoteType,
} from '../../types/studyverse';
import { STREAM_OPTIONS } from '../../data/curriculum';
import { getAvailableSubjects, getClassById, resolveContextDetails } from '../../utils/curriculumHelpers';
import { isDuplicateNote } from '../../utils/noteHelpers';
import { normalizeGeneratedNotePayload } from '../../utils/notesGeneratorHelpers';
import { ContextBreadcrumbBar } from '../common/ContextBreadcrumbBar';
import { IntegrationBanner } from '../common/IntegrationBanner';

interface NotesViewProps {
  context: ActiveStudyContext;
  board?: BoardId;
  onNavigate: (module: NavModuleId) => void;
  notes: NoteRecord[];
  dbStatus?: DatabaseSyncStatus;
  onSaveNote: (input: NoteInput) => Promise<DbOperationResult<NoteRecord>>;
  onUpdateNote: (noteId: string, input: NoteInput) => Promise<DbOperationResult<NoteRecord>>;
  onToggleNoteFavorite: (noteId: string, nextFavorite: boolean) => Promise<DbOperationResult<NoteRecord>>;
  onDeleteNote: (noteId: string) => Promise<DbOperationResult<{ id: string }>>;
}

export function NotesView({
  context,
  board = 'NCERT / CBSE',
  onNavigate,
  notes,
  dbStatus,
  onSaveNote,
  onUpdateNote,
  onToggleNoteFavorite,
  onDeleteNote,
}: NotesViewProps) {
  const { cls, subject, chapter, topic } = resolveContextDetails(context);
  const [noteFormat, setNoteFormat] = useState<NoteType>('summary');
  const [noteTitle, setNoteTitle] = useState(`${topic.title} — Study Notes`);
  const [noteBody, setNoteBody] = useState(topic.summary);
  const [keyPointsText, setKeyPointsText] = useState('');
  const [customFocus, setCustomFocus] = useState('');
  const [noteClassLevel, setNoteClassLevel] = useState(context.gradeId);
  const [noteSubject, setNoteSubject] = useState(subject.name);
  const [noteChapterId, setNoteChapterId] = useState<string | null>(chapter.id);
  const [noteTopicId, setNoteTopicId] = useState<string | null>(topic.id);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedTopicTitle, setGeneratedTopicTitle] = useState<string | null>(null);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [noteActionId, setNoteActionId] = useState<string | null>(null);
  const [readingNote, setReadingNote] = useState<NoteRecord | null>(null);
  const noteReaderRef = useRef<HTMLElement>(null);
  const closeNoteReaderRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setEditingNoteId(null);
    setReadingNote(null);
    setNoteClassLevel(context.gradeId);
    setNoteSubject(subject.name);
    setNoteChapterId(chapter.id);
    setNoteTopicId(topic.id);
    setNoteTitle(`${topic.title} — Study Notes`);
    setNoteBody(topic.summary);
    setKeyPointsText('');
    setGeneratedTopicTitle(null);
    setGenerateMessage(null);
    setGenerateError(null);
    setSaveMessage(null);
    setSaveError(null);
  }, [context.gradeId, subject.name, chapter.id, topic.id, topic.title, topic.summary]);

  useEffect(() => {
    if (!readingNote) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeNoteReaderRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setReadingNote(null);
        return;
      }
      if (event.key === 'Tab') {
        const focusable = noteReaderRef.current?.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [readingNote]);

  const handleGenerateAiNotes = async () => {
    setGenerating(true);
    setGenerateError(null);
    setGenerateMessage(null);
    setSaveMessage(null);
    setSaveError(null);

    const streamLabel =
      context.streamId !== 'general'
        ? STREAM_OPTIONS.find((s) => s.id === context.streamId)?.label ?? context.streamId.toUpperCase()
        : undefined;

    try {
      const response = await fetch('/api/notes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classLabel: cls.label,
          board,
          streamLabel,
          subject: subject.name,
          chapter: chapter.title,
          topic: topic.title,
          topicSummary: topic.summary,
          keyFormula: topic.keyFormula,
          noteFormat,
          customFocus: customFocus.trim() || undefined,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        note?: { title?: string; summary?: string; keyPoints?: string[] };
        error?: string;
      };

      if (!response.ok || !data.note) {
        setGenerateError(
          data.error || 'Could not generate AI notes right now. Please try again in a moment.'
        );
        return;
      }

      const normalized = normalizeGeneratedNotePayload(JSON.stringify(data.note), {
        topic: topic.title,
        keyFormula: topic.keyFormula,
        noteFormat,
      });

      if (!normalized) {
        setGenerateError('The generated notes were incomplete. Please try generating again.');
        return;
      }

      setNoteTitle(normalized.title);
      setNoteBody(normalized.summary);
      setKeyPointsText(normalized.keyPoints.join('\n'));
      setGeneratedTopicTitle(topic.title);
      setGenerateMessage(
        'AI notes populated in the editor above. Review or customize them, then click Save Study Note.'
      );
    } catch {
      setGenerateError(
        'Network error while connecting to the StudyVerse AI notes service. Please try again.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveManualNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (noteTitle.trim().length < 3) {
      setSaveError('Enter a note title of at least 3 characters.');
      return;
    }
    if (noteBody.trim().length < 5) {
      setSaveError('Enter summary content before saving your study note.');
      return;
    }

    const keyPoints = keyPointsText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const input: NoteInput = {
      title: noteTitle.trim(),
      classLevel: noteClassLevel,
      subject: noteSubject,
      chapterId: noteChapterId,
      topicId: noteTopicId,
      noteType: noteFormat,
      content: {
        summary: noteBody.trim(),
        keyPoints,
        formula: editingNoteId ? notes.find((note) => note.id === editingNoteId)?.content.formula : topic.keyFormula,
        emphasis: customFocus.trim() || undefined,
      },
      isFavorite: editingNoteId
        ? notes.find((note) => note.id === editingNoteId)?.isFavorite ?? false
        : false,
    };

    if (isDuplicateNote(notes, input, editingNoteId ?? undefined)) {
      setSaveError('This note already exists. Edit the saved note instead of creating a duplicate.');
      return;
    }

    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const res = editingNoteId
        ? await onUpdateNote(editingNoteId, input)
        : await onSaveNote(input);

      if (res.error) {
        setSaveError(res.error);
      } else {
        setSaveMessage(editingNoteId ? 'Study note updated.' : 'Study note saved to your Personal Library');
        setKeyPointsText('');
        if (editingNoteId) {
          setEditingNoteId(null);
          setNoteClassLevel(context.gradeId);
          setNoteSubject(subject.name);
          setNoteChapterId(chapter.id);
          setNoteTopicId(topic.id);
        }
      }
    } catch {
      setSaveError('Could not save your note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleBeginEdit = (note: NoteRecord) => {
    setEditingNoteId(note.id);
    setNoteClassLevel(note.classLevel);
    setNoteSubject(note.subject);
    setNoteChapterId(note.chapterId);
    setNoteTopicId(note.topicId);
    setNoteFormat(note.noteType);
    setNoteTitle(note.title);
    setNoteBody(note.content.summary);
    setKeyPointsText(note.content.keyPoints.join('\n'));
    setCustomFocus(note.content.emphasis ?? '');
    setSaveError(null);
    setSaveMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setNoteClassLevel(context.gradeId);
    setNoteSubject(subject.name);
    setNoteChapterId(chapter.id);
    setNoteTopicId(topic.id);
    setNoteFormat('summary');
    setNoteTitle(`${topic.title} — Study Notes`);
    setNoteBody(topic.summary);
    setKeyPointsText('');
    setCustomFocus('');
    setSaveError(null);
    setSaveMessage(null);
  };

  const contextNotes = notes.filter(
    (n) =>
      n.topicId === topic.id ||
      (n.classLevel === context.gradeId && n.subject.toLowerCase() === subject.name.toLowerCase())
  );
  const noteSubjects = getAvailableSubjects(noteClassLevel, context.streamId);

  const handleToggleFavorite = async (note: NoteRecord) => {
    setNoteActionId(note.id);
    setSaveError(null);
    try {
      const result = await onToggleNoteFavorite(note.id, !note.isFavorite);
      if (result.error) setSaveError(result.error);
    } catch {
      setSaveError('Could not update the note favorite. Please try again.');
    } finally {
      setNoteActionId(null);
    }
  };

  const handleDelete = async (note: NoteRecord) => {
    setNoteActionId(note.id);
    setSaveError(null);
    try {
      const result = await onDeleteNote(note.id);
      if (result.error) setSaveError(result.error);
    } catch {
      setSaveError('Could not delete the note. Please try again.');
    } finally {
      setNoteActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <ContextBreadcrumbBar context={context} onNavigate={onNavigate} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold text-[#1b1831] dark:text-[#f3f0fc]">
              Study Notes Studio &amp; AI Generator
            </h2>
            <p className="mt-1 text-xs text-[#6b6684] dark:text-[#b0a6cf]">
              Compose structured notes for {cls.label} · {subject.name} or prepare an AI prompt.
            </p>
          </div>

          <form onSubmit={handleSaveManualNote} className="space-y-4">
            {editingNoteId ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[#c4b5fd] bg-[#f5f3ff] dark:bg-[#2c214f] p-3">
                <span className="text-xs font-semibold text-[#442cb2] dark:text-[#ddd6fe]">
                  Editing saved note
                </span>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#5a45c8] dark:text-[#c4b5fd] cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Cancel
                </button>
              </div>
            ) : null}

            <div className="space-y-2">
              <span className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf]">
                Note Format
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                {(
                  [
                    { id: 'summary', label: 'Concise Summary' },
                    { id: 'formulas', label: 'Formula Sheet' },
                    { id: 'qa', label: 'Exam Q&A' },
                    { id: 'mindmap', label: 'Concept Outline' },
                  ] as const
                ).map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setNoteFormat(fmt.id)}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                      noteFormat === fmt.id
                        ? 'bg-[#e5deff] dark:bg-[#2c214f] border-[#5a45c8] text-[#442cb2] dark:text-[#f3f0fc]'
                        : 'bg-[#fcfaff] dark:bg-[#221a3a] border-[#e5deff] dark:border-[#2e244d] text-[#484554] dark:text-[#b0a6cf]'
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="sv-notes-subject"
                className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
              >
                Subject
              </label>
              <select
                id="sv-notes-subject"
                value={noteSubject}
                onChange={(event) => {
                  setNoteSubject(event.target.value);
                  if (event.target.value !== noteSubject) {
                    setNoteChapterId(null);
                    setNoteTopicId(null);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc]"
              >
                {noteSubjects.map((item) => (
                  <option key={item.id} value={item.name}>{item.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="sv-notes-title"
                className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
              >
                Note Title
              </label>
              <input
                id="sv-notes-title"
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc]"
              />
            </div>

            <div>
              <label
                htmlFor="sv-notes-body"
                className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
              >
                Note Summary
              </label>
              <textarea
                id="sv-notes-body"
                rows={3}
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc]"
              />
            </div>

            <div>
              <label
                htmlFor="sv-notes-points"
                className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
              >
                Key Revision Points (one per line, optional)
              </label>
              <textarea
                id="sv-notes-points"
                rows={2}
                value={keyPointsText}
                onChange={(e) => setKeyPointsText(e.target.value)}
                placeholder="e.g. Check sign convention before substituting values"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc]"
              />
            </div>

            <div>
              <label
                htmlFor="sv-notes-focus"
                className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
              >
                Study Focus Emphasis
              </label>
              <input
                id="sv-notes-focus"
                type="text"
                value={customFocus}
                onChange={(e) => setCustomFocus(e.target.value)}
                placeholder={`Highlight derivations for ${topic.title}`}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="submit"
                disabled={saving || generating}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#5a45c8] hover:bg-[#442cb2] disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : editingNoteId ? (
                  <Edit3 className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Plus className="w-4 h-4" aria-hidden="true" />
                )}
                <span>{saving ? 'Saving...' : editingNoteId ? 'Update Study Note' : 'Save Study Note'}</span>
              </button>
              <button
                type="button"
                disabled={generating || saving}
                onClick={() => void handleGenerateAiNotes()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-[#484554] dark:text-[#e9e4f8] hover:bg-[#e5deff] disabled:opacity-60 text-xs font-semibold transition-colors cursor-pointer"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                )}
                <span>{generating ? 'Generating...' : 'Generate AI Notes'}</span>
              </button>
            </div>

            {generating ? (
              <p
                role="status"
                className="text-xs font-medium text-[#5a45c8] dark:text-[#c4b5fd] flex items-center gap-2"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" aria-hidden="true" />
                <span>
                  Generating {noteFormat} notes for {cls.label} {subject.name} ({board})...
                </span>
              </p>
            ) : null}

            {generateError || saveError ? (
              <div
                role="alert"
                className="p-3 rounded-xl bg-[#fef2f2] dark:bg-[#3b151a] border border-[#fecaca] dark:border-[#7f1d1d] text-xs text-[#b91c1c] dark:text-[#fca5a5]"
              >
                {generateError || saveError}
              </div>
            ) : null}

            {generateMessage || saveMessage ? (
              <p role="status" className="text-xs font-semibold text-[#059669] dark:text-[#34d399]">
                {saveMessage || generateMessage}
              </p>
            ) : null}
          </form>
        </section>

        <section className="lg:col-span-7 rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-[#ece6ff] dark:border-[#2a2147] pb-4">
              <div>
                <div className="text-xs font-medium text-[#5a45c8] dark:text-[#c4b5fd]">
                  Saved Notes · {subject.name} ({contextNotes.length})
                </div>
                <h3 className="mt-1 font-display text-lg font-bold text-[#1b1831] dark:text-[#f3f0fc]">
                  {chapter.title}: {topic.title}
                </h3>
              </div>
              <FileText className="w-5 h-5 text-[#5a45c8] dark:text-[#a78bfa]" aria-hidden="true" />
            </div>

            {dbStatus === 'loading' ? (
              <div role="status" className="flex items-center gap-2 rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] p-4 text-sm text-[#6b6684] dark:text-[#b0a6cf]">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading saved notes...
              </div>
            ) : contextNotes.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] border border-[#ece6ff] dark:border-[#2e244d]">
                <div className="font-semibold text-sm text-[#1b1831] dark:text-[#f3f0fc]">
                  No saved notes for {subject.name} yet
                </div>
                <p className="mt-1 text-xs text-[#6b6684] dark:text-[#b0a6cf] leading-relaxed">
                  Save your own structured revision note using the composer on the left.{' '}
                  {topic.keyFormula ? `Reference Formula: ${topic.keyFormula}` : ''}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {contextNotes.map((note) => (
                  <article
                    key={note.id}
                    className="p-4 rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] border border-[#ece6ff] dark:border-[#2e244d] space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-medium text-[#5a45c8] dark:text-[#c4b5fd] uppercase">
                          {note.noteType} · {note.subject}
                        </div>
                        <h4 className="font-display text-sm font-bold text-[#1b1831] dark:text-[#f3f0fc]">
                          {note.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setReadingNote(note)}
                          aria-label={`Read note ${note.title}`}
                          className="p-1.5 rounded-lg text-[#8f84b3] hover:text-[#5a45c8] transition-colors cursor-pointer"
                        >
                          <BookOpen className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleToggleFavorite(note)}
                          disabled={noteActionId === note.id}
                          aria-label={note.isFavorite ? 'Remove favorite' : 'Mark favorite'}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            note.isFavorite
                              ? 'text-[#d97706] bg-[#fef3c7] dark:bg-[#3f2c12]'
                              : 'text-[#8f84b3] hover:text-[#5a45c8]'
                          }`}
                        >
                          <Star className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(note)}
                          disabled={noteActionId === note.id}
                          aria-label={`Delete note ${note.title}`}
                          className="p-1.5 rounded-lg text-[#8f84b3] hover:text-[#dc2626] transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBeginEdit(note)}
                          aria-label={`Edit note ${note.title}`}
                          disabled={noteActionId === note.id || saving}
                          className="p-1.5 rounded-lg text-[#8f84b3] hover:text-[#5a45c8] transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-[#6b6684] dark:text-[#b0a6cf] leading-relaxed">
                      {note.content.summary}
                    </p>
                    {note.content.keyPoints.length > 0 ? (
                      <ul className="list-disc pl-4 text-xs text-[#6b6684] dark:text-[#b0a6cf] space-y-0.5">
                        {note.content.keyPoints.map((pt, idx) => (
                          <li key={idx}>{pt}</li>
                        ))}
                      </ul>
                    ) : null}
                    {note.content.formula ? (
                      <div className="font-mono-tabular text-xs font-semibold text-[#442cb2] dark:text-[#c4b5fd]">
                        Formula: {note.content.formula}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>

          <IntegrationBanner
            serviceName="Gemini API"
            title={
              generatedTopicTitle
                ? `AI notes generated for "${generatedTopicTitle}"`
                : 'AI Notes Studio'
            }
            description="Generate syllabus-aligned summaries, formula sheets, Q&A notes, or concept outlines directly into the editor, then save them to your StudyVerse personal library."
            onNavigate={onNavigate}
          />
        </section>
      </div>

      {readingNote ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1b1831]/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setReadingNote(null);
          }}
        >
          <section
            ref={noteReaderRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sv-note-reader-title"
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-[#e5deff] bg-white p-6 shadow-2xl dark:border-[#372a5c] dark:bg-[#19132b] sm:p-8"
          >
            <header className="flex items-start justify-between gap-4 border-b border-[#ece6ff] pb-5 dark:border-[#2a2147]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#5a45c8] dark:text-[#c4b5fd]">
                  {readingNote.noteType} · {readingNote.subject} · {getClassById(readingNote.classLevel).label}
                </p>
                <h2
                  id="sv-note-reader-title"
                  className="mt-2 font-display text-2xl font-bold text-[#1b1831] dark:text-[#f3f0fc]"
                >
                  {readingNote.title}
                </h2>
              </div>
              <button
                type="button"
                ref={closeNoteReaderRef}
                onClick={() => setReadingNote(null)}
                aria-label="Close note reader"
                className="rounded-full p-2 text-[#6b6684] hover:bg-[#f0ebff] dark:text-[#b0a6cf] dark:hover:bg-[#221a3a]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>
            <div className="space-y-6 py-6">
              <p className="whitespace-pre-wrap text-sm leading-7 text-[#484554] dark:text-[#e9e4f8]">
                {readingNote.content.summary}
              </p>
              {readingNote.content.formula ? (
                <div className="rounded-2xl bg-[#f0ebff] p-4 dark:bg-[#221a3a]">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[#5a45c8] dark:text-[#c4b5fd]">
                    Key formula
                  </h3>
                  <p className="mt-2 font-mono-tabular text-base font-semibold text-[#1b1831] dark:text-[#f3f0fc]">
                    {readingNote.content.formula}
                  </p>
                </div>
              ) : null}
              {readingNote.content.keyPoints.length > 0 ? (
                <div>
                  <h3 className="font-display text-base font-bold text-[#1b1831] dark:text-[#f3f0fc]">
                    Key revision points
                  </h3>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#484554] dark:text-[#e9e4f8]">
                    {readingNote.content.keyPoints.map((point, index) => (
                      <li key={`${readingNote.id}-point-${index}`}>{point}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {readingNote.content.emphasis ? (
                <p className="rounded-2xl border border-[#e5deff] p-4 text-sm text-[#484554] dark:border-[#372a5c] dark:text-[#e9e4f8]">
                  <span className="font-semibold">Study focus:</span> {readingNote.content.emphasis}
                </p>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
