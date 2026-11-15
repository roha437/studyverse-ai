import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Bot,
  Calculator,
  CalendarDays,
  CheckCircle2,
  Circle,
  Compass,
  FileText,
  Loader2,
  Timer,
  Youtube,
} from 'lucide-react';
import type {
  ActiveStudyContext,
  DatabaseSyncStatus,
  DbOperationResult,
  FocusSessionRecord,
  NavModuleId,
  NoteRecord,
  QuizAttemptRecord,
  StudentProfile,
  StudentProgressRecord,
  StudyTask,
  TestAttemptRecord,
} from '../../types/studyverse';
import {
  computePlannerSummary,
  getAvailableSubjects,
  getClassById,
  resolveContextDetails,
} from '../../utils/curriculumHelpers';
import {
  computeDashboardMetrics,
  computeSubjectAnalytics,
  formatAttemptTimestamp,
  formatPlanDateLabel,
} from '../../utils/databaseMappers';
import { ImageWithFallback } from '../common/ImageWithFallback';
import { IntegrationBanner } from '../common/IntegrationBanner';

interface DashboardViewProps {
  profile: StudentProfile;
  context: ActiveStudyContext;
  tasks: StudyTask[];
  focusSessions: FocusSessionRecord[];
  progressRecords: StudentProgressRecord[];
  notes: NoteRecord[];
  quizAttempts: QuizAttemptRecord[];
  testAttempts: TestAttemptRecord[];
  dbStatus: DatabaseSyncStatus;
  onToggleTask: (taskId: string) => Promise<DbOperationResult<StudyTask>>;
  onNavigate: (module: NavModuleId) => void;
  onSelectSubjectContext: (subjectId: string) => void;
}

export function DashboardView({
  profile,
  context,
  tasks,
  focusSessions,
  progressRecords,
  notes,
  quizAttempts,
  testAttempts,
  dbStatus,
  onToggleTask,
  onNavigate,
  onSelectSubjectContext,
}: DashboardViewProps) {
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [taskToggleError, setTaskToggleError] = useState<string | null>(null);

  const currentClass = getClassById(profile.gradeId);
  const subjects = getAvailableSubjects(profile.gradeId, profile.streamId);
  const totalTopicsInClass = subjects.reduce(
    (sum, subj) => sum + subj.chapters.reduce((csum, ch) => csum + ch.topics.length, 0),
    0
  );
  const { subject, chapter, topic } = resolveContextDetails(context);
  const plannerSummary = computePlannerSummary(tasks);
  const metrics = computeDashboardMetrics({
    dailyGoalMinutes: profile.dailyGoalMinutes,
    progressRecords,
    focusSessions,
    quizAttempts,
    testAttempts,
    tasks,
    totalTopicsInClass,
  });
  const subjectAnalytics = computeSubjectAnalytics(
    subjects,
    progressRecords,
    quizAttempts,
    testAttempts,
    tasks
  );

  const handleTaskToggle = async (taskId: string) => {
    if (busyTaskId) return;
    setBusyTaskId(taskId);
    setTaskToggleError(null);
    const res = await onToggleTask(taskId);
    setBusyTaskId(null);
    if (res.error) {
      setTaskToggleError(res.error);
    }
  };

  const cloudStatusLabel = (() => {
    switch (dbStatus) {
      case 'ready':
        return 'Account Connected';
      case 'migrations_required':
        return 'Local Session';
      case 'loading':
        return 'Syncing Data...';
      case 'error':
        return 'Sync Paused';
      case 'local_preview':
        return 'Preview Mode';
      default:
        return 'Local Mode';
    }
  })();

  const recentNotes = [...notes]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#5b21b6]/30 dark:border-[#372a5c] bg-gradient-to-br from-[#3b1578] via-[#5b21b6] to-[#6d28d9] text-white overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch shadow-sm">
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-[#e9d5ff]">
              <span>{currentClass.label}</span>
              {profile.streamId !== 'general' ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{profile.streamId.toUpperCase()}</span>
                </>
              ) : null}
              <span aria-hidden="true">·</span>
              <span>{profile.board}</span>
              {typeof profile.targetMarks === 'number' ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">Target {profile.targetMarks}%</span>
                </>
              ) : null}
            </div>

            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white text-balance leading-tight">
              Welcome back, {profile.name}
            </h2>

            <p className="text-sm sm:text-base text-[#ede9fe] max-w-xl leading-relaxed">
              {profile.academicGoal?.trim()
                ? profile.academicGoal
                : `Active study focus: ${subject.name} — ${chapter.title} (${topic.title}).`}
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-[#ddd6fe]">
                  Continue Where You Left Off
                </div>
                <div className="text-sm font-semibold text-white truncate">
                  {subject.name} · Ch. {chapter.number}: {topic.title}
                </div>
              </div>
              <div className="text-xs font-mono-tabular text-[#ede9fe] whitespace-nowrap shrink-0">
                Est. {topic.estimatedMinutes} min
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => onNavigate('lessons')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-[#f5f2ff] text-[#4c1d95] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" aria-hidden="true" />
                <span>Continue Lesson</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('aria')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/25 bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Bot className="w-4 h-4" aria-hidden="true" />
                <span>Ask AI Teacher Aria</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('explorer')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 hover:bg-white/10 text-[#ede9fe] hover:text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Compass className="w-4 h-4" aria-hidden="true" />
                <span>Browse Curriculum</span>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 relative min-h-[220px] lg:min-h-full bg-[#2b1457]">
          <ImageWithFallback
            src="/src/assets/images/studyverse_hero_banner_1794676730762.jpg"
            alt="StudyVerse open textbook and geometric learning workspace"
            className="w-full h-full object-cover"
            fallbackTitle="StudyVerse Workspace"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#160933]/90 via-[#160933]/30 to-transparent"
          />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
            <div className="text-xs font-medium text-[#ddd6fe]">
              {topic.keyFormula ? 'Key Relation in Focus' : 'Active Syllabus Chapter'}
            </div>
            <div className="mt-1 font-display text-base font-bold text-white truncate">
              {topic.keyFormula || chapter.title}
            </div>
            <div className="mt-0.5 text-xs text-[#e9d5ff] truncate">
              {chapter.textbookUnit} · {subjects.length} subjects in {currentClass.shortLabel}
            </div>
          </div>
        </div>
      </section>

      <section
        aria-label="Workspace summary metrics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5 flex flex-col justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-[#776d94] dark:text-[#968cb8]">
              Curriculum Progress
            </div>
            <div className="mt-1.5 flex items-baseline justify-between gap-2">
              <span className="font-display text-2xl font-bold text-[#1b1430] dark:text-[#f3f0fc] tabular-nums">
                {metrics.progressSummary.classCompletionPercentage}%
              </span>
              <span className="text-xs font-mono-tabular text-[#5b5276] dark:text-[#b0a6cf]">
                {metrics.progressSummary.completedTopics}/{totalTopicsInClass} topics
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            <div
              className="w-full h-1.5 rounded-full bg-[#efeaf9] dark:bg-[#2a2147] overflow-hidden"
              aria-hidden="true"
            >
              <div
                className="h-full bg-[#6d28d9] dark:bg-[#8b5cf6] transition-all"
                style={{ width: `${metrics.progressSummary.classCompletionPercentage}%` }}
              />
            </div>
            <div className="text-xs text-[#5b5276] dark:text-[#b0a6cf] tabular-nums">
              {subjects.length} active subjects in {currentClass.label}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5 flex flex-col justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-[#776d94] dark:text-[#968cb8]">
              Daily Study Time
            </div>
            <div className="mt-1.5 flex items-baseline justify-between gap-2">
              <span className="font-display text-2xl font-bold text-[#1b1430] dark:text-[#f3f0fc] tabular-nums">
                {metrics.totalStudyMinutes} min
              </span>
              <span className="text-xs font-mono-tabular text-[#5b5276] dark:text-[#b0a6cf]">
                Goal {profile.dailyGoalMinutes}m
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            <div
              className="w-full h-1.5 rounded-full bg-[#efeaf9] dark:bg-[#2a2147] overflow-hidden"
              aria-hidden="true"
            >
              <div
                className="h-full bg-[#059669] dark:bg-[#34d399] transition-all"
                style={{ width: `${metrics.goalProgressPct}%` }}
              />
            </div>
            <div className="text-xs text-[#5b5276] dark:text-[#b0a6cf] tabular-nums">
              {focusSessions.length} focus blocks · {metrics.progressSummary.averageMastery}% mastery
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5 flex flex-col justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-[#776d94] dark:text-[#968cb8]">
              Assessment Mastery
            </div>
            <div className="mt-1.5 flex items-baseline justify-between gap-2">
              <span className="font-display text-2xl font-bold text-[#1b1430] dark:text-[#f3f0fc] tabular-nums">
                {metrics.averageScore !== null ? `${metrics.averageScore}%` : 'No attempts'}
              </span>
              <button
                type="button"
                onClick={() => onNavigate('quizzes')}
                className="text-xs font-semibold text-[#6d28d9] dark:text-[#c4b5fd] hover:underline whitespace-nowrap cursor-pointer"
              >
                Practice
              </button>
            </div>
          </div>
          <div className="text-xs text-[#5b5276] dark:text-[#b0a6cf] tabular-nums">
            {quizAttempts.length} {quizAttempts.length === 1 ? 'quiz' : 'quizzes'} ·{' '}
            {testAttempts.length} {testAttempts.length === 1 ? 'test' : 'tests'} recorded
          </div>
        </div>

        <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5 flex flex-col justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-[#776d94] dark:text-[#968cb8]">
              Study Plan &amp; Notes
            </div>
            <div className="mt-1.5 flex items-baseline justify-between gap-2">
              <span className="font-display text-2xl font-bold text-[#1b1430] dark:text-[#f3f0fc] tabular-nums">
                {plannerSummary.completedTasks} / {plannerSummary.totalTasks}
              </span>
              <span className="text-xs font-medium text-[#6d28d9] dark:text-[#c4b5fd]">
                {cloudStatusLabel}
              </span>
            </div>
          </div>
          <div className="text-xs text-[#5b5276] dark:text-[#b0a6cf] tabular-nums">
            {plannerSummary.remainingMinutes} min planned · {notes.length} saved{' '}
            {notes.length === 1 ? 'note' : 'notes'}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">
          <section className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="font-display text-lg font-bold text-[#1b1430] dark:text-[#f3f0fc]">
                  {currentClass.label} Subjects
                </h3>
                <p className="text-xs text-[#5b5276] dark:text-[#b0a6cf]">
                  Select any subject to open its textbook chapters and track topic mastery
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('explorer')}
                className="text-xs font-semibold text-[#6d28d9] dark:text-[#c4b5fd] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                View All Classes
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {subjectAnalytics.map((subj) => (
                <button
                  key={subj.subjectId}
                  type="button"
                  onClick={() => {
                    onSelectSubjectContext(subj.subjectId);
                    onNavigate('explorer');
                  }}
                  className="text-left p-4 rounded-xl border border-[#e5dff4] dark:border-[#2e244d] bg-[#faf8ff] dark:bg-[#221a3a] hover:border-[#6d28d9] dark:hover:border-[#8b5cf6] transition-colors cursor-pointer group flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono-tabular text-[#6d28d9] dark:text-[#c4b5fd]">
                        {subj.subjectCode}
                      </span>
                      <ArrowRight
                        className="w-4 h-4 text-[#776d94] group-hover:text-[#6d28d9] dark:group-hover:text-[#c4b5fd] transition-colors"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="mt-1.5 font-display text-base font-semibold text-[#1b1430] dark:text-[#f3f0fc]">
                      {subj.subjectName}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs text-[#5b5276] dark:text-[#b0a6cf] tabular-nums">
                      <span>
                        {subj.chaptersCount} {subj.chaptersCount === 1 ? 'chapter' : 'chapters'} ·{' '}
                        {subj.completedTopics}/{subj.totalTopics} topics
                      </span>
                      {subj.avgScore !== null ? (
                        <span className="font-semibold text-[#5b21b6] dark:text-[#c4b5fd]">
                          {subj.avgScore}%
                        </span>
                      ) : null}
                    </div>
                    <div
                      className="w-full h-1.5 rounded-full bg-[#e5dff4] dark:bg-[#2e244d] overflow-hidden"
                      aria-hidden="true"
                    >
                      <div
                        className="h-full bg-[#6d28d9] dark:bg-[#8b5cf6] transition-all"
                        style={{ width: `${subj.completionPct}%` }}
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#efeaf9] dark:divide-[#2a2147]">
              <div className="space-y-3 pb-5 md:pb-0 md:pr-6">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-base font-bold text-[#1b1430] dark:text-[#f3f0fc]">
                    Saved Notes ({notes.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => onNavigate('notes')}
                    className="text-xs font-semibold text-[#6d28d9] dark:text-[#c4b5fd] hover:underline whitespace-nowrap cursor-pointer"
                  >
                    Notes Studio
                  </button>
                </div>

                {recentNotes.length === 0 ? (
                  <p className="text-xs text-[#5b5276] dark:text-[#b0a6cf] leading-relaxed">
                    No saved study notes yet. Generate AI notes or write revision summaries in Notes
                    Studio.
                  </p>
                ) : (
                  <ul className="divide-y divide-[#efeaf9] dark:divide-[#2a2147]">
                    {recentNotes.map((note) => (
                      <li key={note.id} className="py-2.5 first:pt-0 last:pb-0">
                        <div className="text-xs font-medium text-[#1b1430] dark:text-[#f3f0fc] truncate">
                          {note.title}
                        </div>
                        <div className="text-[11px] text-[#5b5276] dark:text-[#b0a6cf] mt-0.5">
                          {note.subject} · {note.noteType}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-3 pt-4 md:pt-0 md:pl-6">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-base font-bold text-[#1b1430] dark:text-[#f3f0fc]">
                    Recent Scores ({metrics.totalAssessments})
                  </h3>
                  <button
                    type="button"
                    onClick={() => onNavigate('analytics')}
                    className="text-xs font-semibold text-[#6d28d9] dark:text-[#c4b5fd] hover:underline whitespace-nowrap cursor-pointer"
                  >
                    Analytics
                  </button>
                </div>

                {metrics.recentAssessments.length === 0 ? (
                  <p className="text-xs text-[#5b5276] dark:text-[#b0a6cf] leading-relaxed">
                    No quiz or chapter test scores recorded yet. Run a curriculum check in Quizzes.
                  </p>
                ) : (
                  <ul className="divide-y divide-[#efeaf9] dark:divide-[#2a2147]">
                    {metrics.recentAssessments.map((item) => (
                      <li
                        key={item.id}
                        className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-[#1b1430] dark:text-[#f3f0fc] truncate">
                            {item.kind}: {item.label}
                          </div>
                          <div className="text-[11px] text-[#776d94] dark:text-[#968cb8]">
                            {formatAttemptTimestamp(item.completedAt)}
                          </div>
                        </div>
                        <span className="font-mono-tabular text-xs font-semibold text-[#6d28d9] dark:text-[#c4b5fd] shrink-0">
                          {item.percentage}%
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <section className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-lg font-bold text-[#1b1430] dark:text-[#f3f0fc]">
                  Upcoming Study Plan
                </h3>
                <p className="text-xs text-[#5b5276] dark:text-[#b0a6cf] tabular-nums">
                  {plannerSummary.completedTasks} of {plannerSummary.totalTasks} completed ·{' '}
                  {plannerSummary.remainingMinutes} min remaining
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('planner')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#6d28d9] dark:text-[#c4b5fd] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Full Planner</span>
              </button>
            </div>

            {taskToggleError ? (
              <div
                role="alert"
                className="p-3 rounded-xl bg-[#fef2f2] dark:bg-[#3b151a] border border-[#fecaca] dark:border-[#7f1d1d] text-xs text-[#b91c1c] dark:text-[#fca5a5]"
              >
                {taskToggleError}
              </div>
            ) : null}

            {metrics.upcomingTasks.length === 0 ? (
              <div className="py-4 text-xs text-[#5b5276] dark:text-[#b0a6cf] space-y-2">
                <p>No study tasks scheduled yet. Add a study block in your planner.</p>
                <button
                  type="button"
                  onClick={() => onNavigate('planner')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6d28d9] dark:text-[#c4b5fd] hover:underline cursor-pointer"
                >
                  <span>Schedule First Study Block</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-[#efeaf9] dark:divide-[#2a2147]">
                {metrics.upcomingTasks.slice(0, 5).map((task) => {
                  const isBusy = busyTaskId === task.id;
                  return (
                    <li key={task.id} className="py-3 first:pt-0 last:pb-0">
                      <button
                        type="button"
                        disabled={isBusy}
                        aria-label={`${task.completed ? 'Mark pending' : 'Mark completed'}: ${task.title}`}
                        onClick={() => void handleTaskToggle(task.id)}
                        className="w-full flex items-start gap-3 text-left cursor-pointer group disabled:opacity-60"
                      >
                        {isBusy ? (
                          <Loader2
                            className="w-4 h-4 animate-spin text-[#6d28d9] shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                        ) : task.completed ? (
                          <CheckCircle2
                            className="w-4 h-4 text-[#059669] shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                        ) : (
                          <Circle
                            className="w-4 h-4 text-[#8f84b3] group-hover:text-[#6d28d9] shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-sm font-medium ${
                              task.completed
                                ? 'line-through text-[#776d94] dark:text-[#8f84b3]'
                                : 'text-[#1b1430] dark:text-[#f3f0fc]'
                            }`}
                          >
                            {task.title}
                          </div>
                          <div className="text-xs text-[#5b5276] dark:text-[#b0a6cf] mt-0.5 tabular-nums">
                            {task.subjectName} · {formatPlanDateLabel(task.planDate, task.day)} ·{' '}
                            {task.durationMinutes} min
                            {task.priority ? ` · ${task.priority}` : ''}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-4">
            <div>
              <h3 className="font-display text-base font-bold text-[#1b1430] dark:text-[#f3f0fc]">
                Learning Workspace Shortcuts
              </h3>
              <p className="text-xs text-[#5b5276] dark:text-[#b0a6cf]">
                Launch focused study tools aligned to {topic.title}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onNavigate('focus')}
                className="text-left p-3.5 rounded-xl border border-[#e5dff4] dark:border-[#2e244d] bg-[#faf8ff] dark:bg-[#221a3a] hover:border-[#6d28d9] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-[#5b21b6] dark:text-[#c4b5fd]">
                  <Timer className="w-4 h-4" aria-hidden="true" />
                  <span>Focus Timer</span>
                </div>
                <div className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf] tabular-nums">
                  {focusSessions.length} completed today
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('notes')}
                className="text-left p-3.5 rounded-xl border border-[#e5dff4] dark:border-[#2e244d] bg-[#faf8ff] dark:bg-[#221a3a] hover:border-[#6d28d9] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-[#5b21b6] dark:text-[#c4b5fd]">
                  <FileText className="w-4 h-4" aria-hidden="true" />
                  <span>AI Notes Studio</span>
                </div>
                <div className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf] tabular-nums">
                  {notes.length} saved notes
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('numerical-lab')}
                className="text-left p-3.5 rounded-xl border border-[#e5dff4] dark:border-[#2e244d] bg-[#faf8ff] dark:bg-[#221a3a] hover:border-[#6d28d9] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-[#5b21b6] dark:text-[#c4b5fd]">
                  <Calculator className="w-4 h-4" aria-hidden="true" />
                  <span>Numerical Lab</span>
                </div>
                <div className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf]">
                  Step-by-step solving
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('youtube')}
                className="text-left p-3.5 rounded-xl border border-[#e5dff4] dark:border-[#2e244d] bg-[#faf8ff] dark:bg-[#221a3a] hover:border-[#6d28d9] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-[#5b21b6] dark:text-[#c4b5fd]">
                  <Youtube className="w-4 h-4" aria-hidden="true" />
                  <span>YouTube Hub</span>
                </div>
                <div className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf]">
                  Curated chapter lectures
                </div>
              </button>
            </div>
          </section>
        </div>
      </div>

      <IntegrationBanner
        serviceName="Supabase"
        title="Your StudyVerse Workspace"
        description={
          dbStatus === 'ready'
            ? 'Your account is securely connected. All chapter progress, saved notes, study plans, and quiz scores stay synced to your profile.'
            : 'Explore textbook chapters, run practice quizzes, and plan daily study blocks. Sign in anytime from Account & Settings to save across devices.'
        }
        onNavigate={onNavigate}
        compact
      />
    </div>
  );
}
