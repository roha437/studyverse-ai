import { useEffect, useRef, useState } from 'react';
import { Bookmark, BookOpen, CheckCircle2, Loader2, RotateCcw, Sparkles, X } from 'lucide-react';
import type {
  ActiveStudyContext,
  BoardId,
  BookmarkRecord,
  BookmarkResourceType,
  DbOperationResult,
  GradeLevelId,
  NavModuleId,
  StudentProgressRecord,
  VideoLearningProgress,
  VideoLearningProgressInput,
} from '../../types/studyverse';
import { resolveContextDetails } from '../../utils/curriculumHelpers';
import {
  normalizeGeneratedLesson,
  type GeneratedLesson,
  type LessonDepth,
  type LessonGenerationPayload,
  type LessonTeachingStyle,
} from '../../utils/lessonGeneratorHelpers';
import { ContextBreadcrumbBar } from '../common/ContextBreadcrumbBar';
import { VideoLearningPanel } from '../common/VideoLearningPanel';

interface LessonsViewProps {
  context: ActiveStudyContext;
  board: BoardId;
  videoProgress: VideoLearningProgress[];
  videoProgressError: string | null;
  isAuthenticated: boolean;
  onUpdateVideoProgress: (
    input: VideoLearningProgressInput
  ) => Promise<DbOperationResult<VideoLearningProgress>>;
  onStartQuizFromVideo: (context: ActiveStudyContext, board: BoardId) => void;
  onNavigate: (module: NavModuleId) => void;
  progressRecords: StudentProgressRecord[];
  bookmarks: BookmarkRecord[];
  onRecordTopicProgress: (input: {
    classLevel: GradeLevelId;
    subject: string;
    chapterId: string;
    topicId: string;
    completionPercentage: number;
    masteryLevel: number;
    timeSpentMinutes: number;
  }) => Promise<DbOperationResult<StudentProgressRecord>>;
  onToggleBookmark: (input: {
    resourceType: BookmarkResourceType;
    resourceId: string;
    title: string;
    metadata: BookmarkRecord['metadata'];
  }) => Promise<DbOperationResult<BookmarkRecord | { removedId: string }>>;
}

export function LessonsView({
  context,
  board,
  videoProgress,
  videoProgressError,
  isAuthenticated,
  onUpdateVideoProgress,
  onStartQuizFromVideo,
  onNavigate,
  progressRecords,
  bookmarks,
  onRecordTopicProgress,
  onToggleBookmark,
}: LessonsViewProps) {
  const { cls, subject, chapter, topic } = resolveContextDetails(context);
  const existingProgress = progressRecords.find((p) => p.topicId === topic.id);
  const isLessonBookmarked = bookmarks.some(
    (b) => b.resourceType === 'lesson' && b.resourceId === topic.id
  );

  const [depth, setDepth] = useState<LessonDepth>('walkthrough');
  const [completionPct, setCompletionPct] = useState<number>(
    existingProgress?.completionPercentage ?? 100
  );
  const [masteryPct, setMasteryPct] = useState<number>(existingProgress?.masteryLevel ?? 85);
  const [minutesSpent, setMinutesSpent] = useState<number>(
    existingProgress?.timeSpentMinutes ?? topic.estimatedMinutes
  );
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [teachingStyle, setTeachingStyle] = useState<LessonTeachingStyle>('step-by-step');
  const [generatedLesson, setGeneratedLesson] = useState<GeneratedLesson | null>(null);
  const [generatedSettings, setGeneratedSettings] = useState<
    Pick<LessonGenerationPayload, 'depth' | 'teachingStyle'> | null
  >(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [retryPayload, setRetryPayload] = useState<LessonGenerationPayload | null>(null);
  const [generationCancelled, setGenerationCancelled] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const lessonContextKey = [
    context.gradeId,
    board,
    subject.name,
    chapter.id,
    topic.id,
  ].join(':');

  useEffect(() => {
    setCompletionPct(existingProgress?.completionPercentage ?? 100);
    setMasteryPct(existingProgress?.masteryLevel ?? 85);
    setMinutesSpent(existingProgress?.timeSpentMinutes ?? topic.estimatedMinutes);
    setStatusMessage(null);
    setErrorMessage(null);
  }, [topic.id, existingProgress?.completionPercentage, existingProgress?.masteryLevel, existingProgress?.timeSpentMinutes, topic.estimatedMinutes]);

  useEffect(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setGeneratedLesson(null);
    setGeneratedSettings(null);
    setIsGenerating(false);
    setGenerationError(null);
    setRetryPayload(null);
    setGenerationCancelled(false);
  }, [lessonContextKey]);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    },
    []
  );

  const buildLessonRequest = (): LessonGenerationPayload => ({
    classLabel: cls.label,
    board,
    subject: subject.name,
    chapter: `${chapter.number}: ${chapter.title}`,
    topic: topic.title,
    topicSummary: topic.learningObjective
      ? `${topic.summary}\nLearning objective: ${topic.learningObjective}`
      : topic.summary,
    keyFormula: topic.keyFormula,
    depth,
    teachingStyle,
  });

  const requestLesson = async (payload: LessonGenerationPayload) => {
    const controller = new AbortController();
    abortControllerRef.current?.abort();
    abortControllerRef.current = controller;
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationCancelled(false);
    setRetryPayload(payload);

    try {
      const response = await fetch('/api/lessons/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
            ? data.error
            : 'Lesson generation failed. Please try again.';
        throw new Error(message);
      }

      const lessonData =
        data && typeof data === 'object' && 'lesson' in data ? data.lesson : undefined;
      if (!lessonData || typeof lessonData !== 'object') {
        throw new Error('The lesson response was incomplete. Please retry.');
      }
      const lesson = normalizeGeneratedLesson(JSON.stringify(lessonData), payload.topic);
      if (!lesson) throw new Error('The lesson response was incomplete. Please retry.');
      setGeneratedLesson(lesson);
      setGeneratedSettings({ depth: payload.depth, teachingStyle: payload.teachingStyle });
    } catch (error) {
      if (controller.signal.aborted) return;
      setGenerationError(
        error instanceof Error ? error.message : 'Lesson generation failed. Please try again.'
      );
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setIsGenerating(false);
      }
    }
  };

  const cancelGeneration = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsGenerating(false);
    setGenerationError(null);
    setGenerationCancelled(true);
  };

  const handleSaveProgress = async () => {
    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);
    const res = await onRecordTopicProgress({
      classLevel: context.gradeId,
      subject: subject.name,
      chapterId: chapter.id,
      topicId: topic.id,
      completionPercentage: completionPct,
      masteryLevel: masteryPct,
      timeSpentMinutes: minutesSpent,
    });
    setSaving(false);
    if (res.error) {
      setErrorMessage(res.error);
    } else {
      setStatusMessage(`Progress saved (${completionPct}% complete, ${masteryPct}% mastery)`);
    }
  };

  const handleBookmarkLesson = async () => {
    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);
    const res = await onToggleBookmark({
      resourceType: 'lesson',
      resourceId: topic.id,
      title: `${topic.title} (${depth} lesson)`,
      metadata: {
        gradeId: context.gradeId,
        subject: subject.name,
        chapterId: chapter.id,
        topicId: topic.id,
        subtitle: `${cls.label} · ${subject.name} · Chapter ${chapter.number}`,
        formula: topic.keyFormula,
      },
    });
    setSaving(false);
    if (res.error) {
      setErrorMessage(res.error);
    } else {
      setStatusMessage(
        isLessonBookmarked ? 'Lesson bookmark removed' : 'Lesson bookmarked in Personal Library'
      );
    }
  };

  return (
    <div className="space-y-6">
      <ContextBreadcrumbBar context={context} onNavigate={onNavigate} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-4 rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5 space-y-5">
          <div>
            <h2 className="font-display text-base font-bold text-[#1b1831] dark:text-[#f3f0fc]">
              Lesson Configuration
            </h2>
            <p className="mt-1 text-xs text-[#6b6684] dark:text-[#b0a6cf]">
              Aligned to {cls.label} · {subject.name} · {chapter.textbookUnit}
            </p>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf]">
              Teaching Depth
            </span>
            {(
              [
                { id: 'overview', label: 'Concept Overview', hint: 'Quick 10-min clarity' },
                {
                  id: 'walkthrough',
                  label: 'Textbook Walkthrough',
                  hint: 'Full definitions & examples',
                },
                { id: 'exam', label: 'Board Exam Revision', hint: 'Key proofs & marking points' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDepth(opt.id)}
                className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                  depth === opt.id
                    ? 'bg-[#e5deff] dark:bg-[#2c214f] border-[#5a45c8] text-[#442cb2] dark:text-[#f3f0fc]'
                    : 'bg-[#fcfaff] dark:bg-[#221a3a] border-[#e5deff] dark:border-[#2e244d] text-[#1b1831] dark:text-[#e9e4f8]'
                }`}
              >
                <div className="text-sm font-semibold">{opt.label}</div>
                <div className="text-xs opacity-80">{opt.hint}</div>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf]">
                Teaching Style
              </span>
              {(
                [
                  { id: 'step-by-step', label: 'Step by Step', hint: 'Build understanding one idea at a time' },
                  { id: 'analogy-led', label: 'Real-life Analogies', hint: 'Connect ideas to familiar examples' },
                  { id: 'socratic', label: 'Guided Questions', hint: 'Learn through small questions and hints' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTeachingStyle(opt.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                    teachingStyle === opt.id
                      ? 'bg-[#e5deff] dark:bg-[#2c214f] border-[#5a45c8] text-[#442cb2] dark:text-[#f3f0fc]'
                      : 'bg-[#fcfaff] dark:bg-[#221a3a] border-[#e5deff] dark:border-[#2e244d] text-[#1b1831] dark:text-[#e9e4f8]'
                  }`}
                >
                  <div className="text-sm font-semibold">{opt.label}</div>
                  <div className="text-xs opacity-80">{opt.hint}</div>
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={isGenerating}
              aria-busy={isGenerating}
              onClick={() => void requestLesson(buildLessonRequest())}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#5a45c8] hover:bg-[#442cb2] disabled:opacity-60 text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="w-4 h-4" aria-hidden="true" />
              )}
              <span>{isGenerating ? 'Generating lesson...' : 'Generate Textbook Lesson'}</span>
            </button>
            {isGenerating ? (
              <button
                type="button"
                onClick={cancelGeneration}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-[#e5deff] dark:border-[#372a5c] text-xs font-semibold text-[#6b6684] dark:text-[#e9e4f8] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
                Cancel generation
              </button>
            ) : null}
          </div>

          <div className="pt-4 border-t border-[#ece6ff] dark:border-[#2a2147] space-y-3">
            <div className="text-xs font-semibold text-[#1b1831] dark:text-[#f3f0fc]">
              Track Topic Progress
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor="sv-lesson-completion"
                  className="block text-[11px] font-medium text-[#6b6684] dark:text-[#b0a6cf] mb-1"
                >
                  Completion (%)
                </label>
                <select
                  id="sv-lesson-completion"
                  value={completionPct}
                  onChange={(e) => setCompletionPct(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-xs text-[#1b1831] dark:text-[#f3f0fc] tabular-nums"
                >
                  <option value={25}>25% Started</option>
                  <option value={50}>50% In Progress</option>
                  <option value={75}>75% Mostly Done</option>
                  <option value={100}>100% Completed</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="sv-lesson-mastery"
                  className="block text-[11px] font-medium text-[#6b6684] dark:text-[#b0a6cf] mb-1"
                >
                  Mastery (%)
                </label>
                <select
                  id="sv-lesson-mastery"
                  value={masteryPct}
                  onChange={(e) => setMasteryPct(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-xs text-[#1b1831] dark:text-[#f3f0fc] tabular-nums"
                >
                  <option value={40}>40% Needs Review</option>
                  <option value={65}>65% Developing</option>
                  <option value={85}>85% Proficient</option>
                  <option value={100}>100% Mastered</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="sv-lesson-minutes"
                className="block text-[11px] font-medium text-[#6b6684] dark:text-[#b0a6cf] mb-1"
              >
                Time Studied (minutes)
              </label>
              <input
                id="sv-lesson-minutes"
                type="number"
                min={5}
                max={300}
                value={minutesSpent}
                onChange={(e) => setMinutesSpent(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] font-mono-tabular text-xs text-[#1b1831] dark:text-[#f3f0fc]"
              />
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSaveProgress()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#059669] hover:bg-[#047857] disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              <span>{saving ? 'Saving...' : 'Save Lesson Progress'}</span>
            </button>
          </div>
        </section>

        <section className="lg:col-span-8 rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-5">
          <div className="flex items-start justify-between gap-4 border-b border-[#ece6ff] dark:border-[#2a2147] pb-4">
            <div>
              <div className="text-xs font-medium text-[#5a45c8] dark:text-[#c4b5fd]">
                Chapter {chapter.number}: {chapter.title}
                {existingProgress
                  ? ` · Saved: ${existingProgress.completionPercentage}% complete`
                  : ''}
              </div>
              <h3 className="mt-1 font-display text-xl font-bold text-[#1b1831] dark:text-[#f3f0fc]">
                {generatedLesson?.title ?? topic.title}
              </h3>
              <p className="mt-1.5 text-sm text-[#6b6684] dark:text-[#b0a6cf]">{topic.summary}</p>
              {topic.learningObjective ? (
                <p className="mt-2 text-xs font-medium text-[#5a45c8] dark:text-[#c4b5fd]">
                  Learning objective: {topic.learningObjective}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleBookmarkLesson()}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                  isLessonBookmarked
                    ? 'bg-[#e5deff] dark:bg-[#2c214f] border-[#5a45c8] text-[#442cb2] dark:text-[#f3f0fc]'
                    : 'border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-[#484554] dark:text-[#e9e4f8]'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isLessonBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
              </button>
              <BookOpen className="w-6 h-6 text-[#5a45c8] dark:text-[#a78bfa]" aria-hidden="true" />
            </div>
          </div>

          {errorMessage ? (
            <div
              role="alert"
              className="p-3 rounded-xl bg-[#fef2f2] dark:bg-[#3b151a] border border-[#fecaca] dark:border-[#7f1d1d] text-xs text-[#b91c1c] dark:text-[#fca5a5]"
            >
              {errorMessage}
            </div>
          ) : null}

          {statusMessage ? (
            <div
              role="status"
              className="p-3 rounded-xl bg-[#ecfdf5] dark:bg-[#102d24] border border-[#a7f3d0] dark:border-[#047857] text-xs font-semibold text-[#059669] dark:text-[#34d399]"
            >
              {statusMessage}
            </div>
          ) : null}

          {generationError ? (
            <div
              role="alert"
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#fef2f2] dark:bg-[#3b151a] border border-[#fecaca] dark:border-[#7f1d1d] text-xs text-[#b91c1c] dark:text-[#fca5a5]"
            >
              <span>{generationError}</span>
              {retryPayload ? (
                <button
                  type="button"
                  onClick={() => void requestLesson(retryPayload)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#fca5a5] font-semibold whitespace-nowrap cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  Retry
                </button>
              ) : null}
            </div>
          ) : null}

          {generationCancelled ? (
            <div
              role="status"
              className="p-3 rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] border border-[#e5deff] dark:border-[#2e244d] text-xs text-[#6b6684] dark:text-[#b0a6cf]"
            >
              Lesson generation cancelled.
            </div>
          ) : null}

          {generatedLesson ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <section className="p-4 rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] border border-[#ece6ff] dark:border-[#2e244d]">
                  <h4 className="text-xs font-semibold text-[#5a45c8] dark:text-[#c4b5fd]">
                    Simple Explanation
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-[#484554] dark:text-[#e9e4f8] whitespace-pre-wrap">
                    {generatedLesson.simpleExplanation}
                  </p>
                </section>
                <section className="p-4 rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] border border-[#ece6ff] dark:border-[#2e244d]">
                  <h4 className="text-xs font-semibold text-[#5a45c8] dark:text-[#c4b5fd]">
                    Detailed Explanation
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-[#484554] dark:text-[#e9e4f8] whitespace-pre-wrap">
                    {generatedLesson.detailedExplanation}
                  </p>
                </section>
              </div>

              <section className="p-4 rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] border border-[#ece6ff] dark:border-[#2e244d]">
                <h4 className="text-xs font-semibold text-[#5a45c8] dark:text-[#c4b5fd]">
                  Real-life Examples
                </h4>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-[#484554] dark:text-[#e9e4f8] list-disc pl-5">
                  {generatedLesson.realLifeExamples.map((example, index) => (
                    <li key={`${index}-${example}`}>{example}</li>
                  ))}
                </ul>
              </section>

              <section className="p-4 rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] border border-[#ece6ff] dark:border-[#2e244d]">
                <h4 className="text-xs font-semibold text-[#5a45c8] dark:text-[#c4b5fd]">
                  Important Definitions
                </h4>
                <dl className="mt-2 space-y-3">
                  {generatedLesson.definitions.map(({ term, definition }) => (
                    <div key={term}>
                      <dt className="text-sm font-semibold text-[#1b1831] dark:text-[#f3f0fc]">
                        {term}
                      </dt>
                      <dd className="text-sm leading-6 text-[#484554] dark:text-[#e9e4f8]">
                        {definition}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section className="p-4 rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] border border-[#ece6ff] dark:border-[#2e244d]">
                <h4 className="text-xs font-semibold text-[#5a45c8] dark:text-[#c4b5fd]">
                  Key Points
                </h4>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-[#484554] dark:text-[#e9e4f8] list-disc pl-5">
                  {generatedLesson.keyPoints.map((point, index) => (
                    <li key={`${index}-${point}`}>{point}</li>
                  ))}
                </ul>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-semibold text-[#5a45c8] dark:text-[#c4b5fd]">
                  Practice Questions
                </h4>
                {generatedLesson.practiceQuestions.map(({ question, answer, explanation }, index) => (
                  <details
                    key={`${index}-${question}`}
                    className="p-4 rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] border border-[#ece6ff] dark:border-[#2e244d]"
                  >
                    <summary className="text-sm font-semibold text-[#1b1831] dark:text-[#f3f0fc] cursor-pointer">
                      {index + 1}. {question}
                    </summary>
                    <div className="mt-3 space-y-1 text-sm leading-6 text-[#484554] dark:text-[#e9e4f8]">
                      <p><span className="font-semibold">Answer:</span> {answer}</p>
                      <p>{explanation}</p>
                    </div>
                  </details>
                ))}
              </section>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] border border-[#ece6ff] dark:border-[#2e244d]">
                <div className="text-xs font-semibold text-[#5a45c8] dark:text-[#c4b5fd]">
                  01. Core Concept
                </div>
                <p className="mt-1 text-xs text-[#6b6684] dark:text-[#b0a6cf]">
                  Textbook-grounded explanation tailored for {cls.label} comprehension.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] border border-[#ece6ff] dark:border-[#2e244d]">
                <div className="text-xs font-semibold text-[#5a45c8] dark:text-[#c4b5fd]">
                  02. Worked Example
                </div>
                <p className="mt-1 text-xs text-[#6b6684] dark:text-[#b0a6cf]">
                  {topic.keyFormula
                    ? `Key relation: ${topic.keyFormula}`
                    : 'Step-by-step derivation and formula application with unit checks.'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] border border-[#ece6ff] dark:border-[#2e244d]">
                <div className="text-xs font-semibold text-[#5a45c8] dark:text-[#c4b5fd]">
                  03. Exam Checkpoint
                </div>
                <p className="mt-1 text-xs text-[#6b6684] dark:text-[#b0a6cf]">
                  Common mistakes and quick self-check questions before moving on.
                </p>
              </div>
            </div>
          )}
          {generatedLesson ? (
            <p className="text-[11px] text-[#7b7194] dark:text-[#b0a6cf]">
              Generated for {cls.label} · {board} · {subject.name} · {chapter.title} ·{' '}
              {generatedSettings?.depth} ·{' '}
              {generatedSettings?.teachingStyle.replace(/-/g, ' ')} style.
            </p>
          ) : (
            <p className="text-xs text-[#6b6684] dark:text-[#b0a6cf]">
              Choose a lesson depth and teaching style, then generate a complete lesson tailored to
              this topic.
            </p>
          )}
        </section>
      </div>
      <VideoLearningPanel
        key={`${lessonContextKey}:video-learning`}
        context={context}
        board={board}
        progress={videoProgress}
        progressError={videoProgressError}
        isAuthenticated={isAuthenticated}
        onUpdateProgress={onUpdateVideoProgress}
        onStartQuiz={onStartQuizFromVideo}
      />
    </div>
  );
}
