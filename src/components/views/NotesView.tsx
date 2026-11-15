import { useEffect, useState } from 'react';
import { FileText, Loader2, Plus, Sparkles, Star, Trash2 } from 'lucide-react';
import type {
  ActiveStudyContext,
  BoardId,
  DbOperationResult,
  GradeLevelId,
  NavModuleId,
  NoteContentPayload,
  NoteRecord,
  NoteType,
} from '../../types/studyverse';
import { STREAM_OPTIONS } from '../../data/curriculum';
import { resolveContextDetails } from '../../utils/curriculumHelpers';
import { normalizeGeneratedNotePayload } from '../../utils/notesGeneratorHelpers';
import { ContextBreadcrumbBar } from '../common/ContextBreadcrumbBar';
import { IntegrationBanner } from '../common/IntegrationBanner';

interface NotesViewProps {
  context: ActiveStudyContext;
  board?: BoardId;
  onNavigate: (module: NavModuleId) => void;
  notes: NoteRecord[];
  onSaveNote: (input: {
    title: string;
    classLevel: GradeLevelId;
    subject: string;
    chapterId: string | null;
    topicId: string | null;
    noteType: NoteType;
    content: NoteContentPayload;
    isFavorite?: boolean;
  }) => Promise<DbOperationResult<NoteRecord>>;
  onToggleNoteFavorite: (noteId: string, nextFavorite: boolean) => Promise<DbOperationResult<NoteRecord>>;
  onDeleteNote: (noteId: string) => Promise<DbOperationResult<{ id: string }>>;
}

export function NotesView({
  context,
  board = 'NCERT / CBSE',
  onNavigate,
  notes,
  onSaveNote,
  onToggleNoteFavorite,
  onDeleteNote,
}: NotesViewProps) {
  const { cls, subject, chapter, topic } = resolveContextDetails(context);
  const [noteFormat, setNoteFormat] = useState<NoteType>('summary');
  const [noteTitle, setNoteTitle] = useState(`${topic.title} — Study Notes`);
  const [noteBody, setNoteBody] = useState(topic.summary);
  const [keyPointsText, setKeyPointsText] = useState('');
  const [customFocus, setCustomFocus] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedTopicTitle, setGeneratedTopicTitle] = useState<string | null>(null);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setNoteTitle(`${topic.title} — Study Notes`);
    setNoteBody(topic.summary);
    setKeyPointsText('');
    setGeneratedTopicTitle(null);
    setGenerateMessage(null);
    setGenerateError(null);
    setSaveMessage(null);
    setSaveError(null);
  }, [topic.id, topic.title, topic.summary]);

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

    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    const keyPoints = keyPointsText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const res = await onSaveNote({
      title: noteTitle.trim(),
      classLevel: context.gradeId,
      subject: subject.name,
      chapterId: chapter.id,
      topicId: topic.id,
      noteType: noteFormat,
      content: {
        summary: noteBody.trim(),
        keyPoints,
        formula: topic.keyFormula,
        emphasis: customFocus.trim() || undefined,
      },
      isFavorite: false,
    });

    setSaving(false);
    if (res.error) {
      setSaveError(res.error);
    } else {
      setSaveMessage('Study note saved to your Personal Library');
      setKeyPointsText('');
    }
  };

  const contextNotes = notes.filter(
    (n) =>
      n.topicId === topic.id ||
      (n.classLevel === context.gradeId && n.subject.toLowerCase() === subject.name.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <ContextBreadcrumbBar context={context} onNavigate={onNavigate} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold text-[#1b1430] dark:text-[#f3f0fc]">
              Study Notes Studio &amp; AI Generator
            </h2>
            <p className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf]">
              Compose structured notes for {cls.label} · {subject.name} or prepare an AI prompt.
            </p>
          </div>

          <form onSubmit={handleSaveManualNote} className="space-y-4">
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf]">
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
                        ? 'bg-[#ede9fe] dark:bg-[#2c214f] border-[#6d28d9] text-[#5b21b6] dark:text-[#f3f0fc]'
                        : 'bg-[#faf8ff] dark:bg-[#221a3a] border-[#e5dff4] dark:border-[#2e244d] text-[#4c4366] dark:text-[#b0a6cf]'
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="sv-notes-title"
                className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
              >
                Note Title
              </label>
              <input
                id="sv-notes-title"
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc]"
              />
            </div>

            <div>
              <label
                htmlFor="sv-notes-body"
                className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
              >
                Note Summary
              </label>
              <textarea
                id="sv-notes-body"
                rows={3}
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc]"
              />
            </div>

            <div>
              <label
                htmlFor="sv-notes-points"
                className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
              >
                Key Revision Points (one per line, optional)
              </label>
              <textarea
                id="sv-notes-points"
                rows={2}
                value={keyPointsText}
                onChange={(e) => setKeyPointsText(e.target.value)}
                placeholder="e.g. Check sign convention before substituting values"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc]"
              />
            </div>

            <div>
              <label
                htmlFor="sv-notes-focus"
                className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
              >
                Study Focus Emphasis
              </label>
              <input
                id="sv-notes-focus"
                type="text"
                value={customFocus}
                onChange={(e) => setCustomFocus(e.target.value)}
                placeholder={`Highlight derivations for ${topic.title}`}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="submit"
                disabled={saving || generating}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>{saving ? 'Saving...' : 'Save Study Note'}</span>
              </button>
              <button
                type="button"
                disabled={generating || saving}
                onClick={() => void handleGenerateAiNotes()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-[#4c4366] dark:text-[#e9e4f8] hover:bg-[#ede9fe] disabled:opacity-60 text-xs font-semibold transition-colors cursor-pointer"
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
                className="text-xs font-medium text-[#6d28d9] dark:text-[#c4b5fd] flex items-center gap-2"
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

        <section className="lg:col-span-7 rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-[#efeaf9] dark:border-[#2a2147] pb-4">
              <div>
                <div className="text-xs font-medium text-[#6d28d9] dark:text-[#c4b5fd]">
                  Saved Notes · {subject.name} ({contextNotes.length})
                </div>
                <h3 className="mt-1 font-display text-lg font-bold text-[#1b1430] dark:text-[#f3f0fc]">
                  {chapter.title}: {topic.title}
                </h3>
              </div>
              <FileText className="w-5 h-5 text-[#6d28d9] dark:text-[#a78bfa]" aria-hidden="true" />
            </div>

            {contextNotes.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#faf8ff] dark:bg-[#221a3a] border border-[#efeaf9] dark:border-[#2e244d]">
                <div className="font-semibold text-sm text-[#1b1430] dark:text-[#f3f0fc]">
                  No saved notes for {subject.name} yet
                </div>
                <p className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf] leading-relaxed">
                  Save your own structured revision note using the composer on the left.{' '}
                  {topic.keyFormula ? `Reference Formula: ${topic.keyFormula}` : ''}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {contextNotes.map((note) => (
                  <article
                    key={note.id}
                    className="p-4 rounded-xl bg-[#faf8ff] dark:bg-[#221a3a] border border-[#efeaf9] dark:border-[#2e244d] space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-medium text-[#6d28d9] dark:text-[#c4b5fd] uppercase">
                          {note.noteType} · {note.subject}
                        </div>
                        <h4 className="font-display text-sm font-bold text-[#1b1430] dark:text-[#f3f0fc]">
                          {note.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => void onToggleNoteFavorite(note.id, !note.isFavorite)}
                          aria-label={note.isFavorite ? 'Remove favorite' : 'Mark favorite'}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            note.isFavorite
                              ? 'text-[#d97706] bg-[#fef3c7] dark:bg-[#3f2c12]'
                              : 'text-[#8f84b3] hover:text-[#6d28d9]'
                          }`}
                        >
                          <Star className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDeleteNote(note.id)}
                          aria-label={`Delete note ${note.title}`}
                          className="p-1.5 rounded-lg text-[#8f84b3] hover:text-[#dc2626] transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-[#5b5276] dark:text-[#b0a6cf] leading-relaxed">
                      {note.content.summary}
                    </p>
                    {note.content.keyPoints.length > 0 ? (
                      <ul className="list-disc pl-4 text-xs text-[#5b5276] dark:text-[#b0a6cf] space-y-0.5">
                        {note.content.keyPoints.map((pt, idx) => (
                          <li key={idx}>{pt}</li>
                        ))}
                      </ul>
                    ) : null}
                    {note.content.formula ? (
                      <div className="font-mono-tabular text-xs font-semibold text-[#5b21b6] dark:text-[#c4b5fd]">
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
    </div>
  );
}
