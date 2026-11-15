import { useEffect, useState } from 'react';
import { Bookmark, BookOpen, CheckCircle2, Sparkles } from 'lucide-react';
import type {
  ActiveStudyContext,
  BookmarkRecord,
  BookmarkResourceType,
  DbOperationResult,
  GradeLevelId,
  NavModuleId,
  StudentProgressRecord,
} from '../../types/studyverse';
import { resolveContextDetails } from '../../utils/curriculumHelpers';
import { ContextBreadcrumbBar } from '../common/ContextBreadcrumbBar';
import { IntegrationBanner } from '../common/IntegrationBanner';

interface LessonsViewProps {
  context: ActiveStudyContext;
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

type LessonDepth = 'overview' | 'walkthrough' | 'exam';

export function LessonsView({
  context,
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
  const [requestedTopicId, setRequestedTopicId] = useState<string | null>(null);
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

  useEffect(() => {
    setCompletionPct(existingProgress?.completionPercentage ?? 100);
    setMasteryPct(existingProgress?.masteryLevel ?? 85);
    setMinutesSpent(existingProgress?.timeSpentMinutes ?? topic.estimatedMinutes);
    setStatusMessage(null);
    setErrorMessage(null);
  }, [topic.id, existingProgress?.completionPercentage, existingProgress?.masteryLevel, existingProgress?.timeSpentMinutes, topic.estimatedMinutes]);

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
        <section className="lg:col-span-4 rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5 space-y-5">
          <div>
            <h2 className="font-display text-base font-bold text-[#1b1430] dark:text-[#f3f0fc]">
              Lesson Configuration
            </h2>
            <p className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf]">
              Aligned to {cls.label} · {subject.name} · {chapter.textbookUnit}
            </p>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf]">
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
                    ? 'bg-[#ede9fe] dark:bg-[#2c214f] border-[#6d28d9] text-[#5b21b6] dark:text-[#f3f0fc]'
                    : 'bg-[#faf8ff] dark:bg-[#221a3a] border-[#e5dff4] dark:border-[#2e244d] text-[#1b1430] dark:text-[#e9e4f8]'
                }`}
              >
                <div className="text-sm font-semibold">{opt.label}</div>
                <div className="text-xs opacity-80">{opt.hint}</div>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setRequestedTopicId(topic.id)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>Generate Textbook Lesson</span>
          </button>

          <div className="pt-4 border-t border-[#efeaf9] dark:border-[#2a2147] space-y-3">
            <div className="text-xs font-semibold text-[#1b1430] dark:text-[#f3f0fc]">
              Track Topic Progress
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor="sv-lesson-completion"
                  className="block text-[11px] font-medium text-[#5b5276] dark:text-[#b0a6cf] mb-1"
                >
                  Completion (%)
                </label>
                <select
                  id="sv-lesson-completion"
                  value={completionPct}
                  onChange={(e) => setCompletionPct(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-xs text-[#1b1430] dark:text-[#f3f0fc] tabular-nums"
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
                  className="block text-[11px] font-medium text-[#5b5276] dark:text-[#b0a6cf] mb-1"
                >
                  Mastery (%)
                </label>
                <select
                  id="sv-lesson-mastery"
                  value={masteryPct}
                  onChange={(e) => setMasteryPct(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-xs text-[#1b1430] dark:text-[#f3f0fc] tabular-nums"
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
                className="block text-[11px] font-medium text-[#5b5276] dark:text-[#b0a6cf] mb-1"
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
                className="w-full px-3 py-2 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] font-mono-tabular text-xs text-[#1b1430] dark:text-[#f3f0fc]"
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

        <section className="lg:col-span-8 rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-5">
          <div className="flex items-start justify-between gap-4 border-b border-[#efeaf9] dark:border-[#2a2147] pb-4">
            <div>
              <div className="text-xs font-medium text-[#6d28d9] dark:text-[#c4b5fd]">
                Chapter {chapter.number}: {chapter.title}
                {existingProgress
                  ? ` · Saved: ${existingProgress.completionPercentage}% complete`
                  : ''}
              </div>
              <h3 className="mt-1 font-display text-xl font-bold text-[#1b1430] dark:text-[#f3f0fc]">
                {topic.title}
              </h3>
              <p className="mt-1.5 text-sm text-[#5b5276] dark:text-[#b0a6cf]">{topic.summary}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleBookmarkLesson()}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                  isLessonBookmarked
                    ? 'bg-[#ede9fe] dark:bg-[#2c214f] border-[#6d28d9] text-[#5b21b6] dark:text-[#f3f0fc]'
                    : 'border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-[#4c4366] dark:text-[#e9e4f8]'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isLessonBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
              </button>
              <BookOpen className="w-6 h-6 text-[#6d28d9] dark:text-[#a78bfa]" aria-hidden="true" />
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-[#faf8ff] dark:bg-[#221a3a] border border-[#efeaf9] dark:border-[#2e244d]">
              <div className="text-xs font-semibold text-[#6d28d9] dark:text-[#c4b5fd]">
                01. Core Concept
              </div>
              <p className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf]">
                Textbook-grounded explanation tailored for {cls.label} comprehension.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#faf8ff] dark:bg-[#221a3a] border border-[#efeaf9] dark:border-[#2e244d]">
              <div className="text-xs font-semibold text-[#6d28d9] dark:text-[#c4b5fd]">
                02. Worked Example
              </div>
              <p className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf]">
                {topic.keyFormula
                  ? `Key relation: ${topic.keyFormula}`
                  : 'Step-by-step derivation and formula application with unit checks.'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#faf8ff] dark:bg-[#221a3a] border border-[#efeaf9] dark:border-[#2e244d]">
              <div className="text-xs font-semibold text-[#6d28d9] dark:text-[#c4b5fd]">
                03. Exam Checkpoint
              </div>
              <p className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf]">
                Common mistakes and quick self-check questions before moving on.
              </p>
            </div>
          </div>

          {requestedTopicId === topic.id ? (
            <IntegrationBanner
              serviceName="Gemini API"
              title={`Textbook Lesson Prepared: "${topic.title}" (${depth} mode)`}
              description="Your structured lesson outline is ready above, and your topic progress and bookmarks save directly to your StudyVerse account."
              onNavigate={onNavigate}
            />
          ) : (
            <IntegrationBanner
              serviceName="Gemini API"
              title="Textbook AI Lessons"
              description="Click 'Generate Textbook Lesson' to organize textbook concepts, worked examples, and exam checkpoints while saving progress to your StudyVerse account."
              onNavigate={onNavigate}
            />
          )}
        </section>
      </div>
    </div>
  );
}
