import { BarChart3 } from 'lucide-react';
import type {
  FocusSessionRecord,
  NavModuleId,
  QuizAttemptRecord,
  StudentProfile,
  StudentProgressRecord,
  StudyTask,
  TestAttemptRecord,
} from '../../types/studyverse';
import { computePlannerSummary, getAvailableSubjects } from '../../utils/curriculumHelpers';
import { computeProgressSummary, computeSubjectAnalytics } from '../../utils/databaseMappers';

interface AnalyticsViewProps {
  profile: StudentProfile;
  tasks: StudyTask[];
  focusSessions: FocusSessionRecord[];
  progressRecords: StudentProgressRecord[];
  quizAttempts: QuizAttemptRecord[];
  testAttempts: TestAttemptRecord[];
  onNavigate: (module: NavModuleId) => void;
}

export function AnalyticsView({
  profile,
  tasks,
  focusSessions,
  progressRecords,
  quizAttempts,
  testAttempts,
  onNavigate,
}: AnalyticsViewProps) {
  const subjects = getAvailableSubjects(profile.gradeId, profile.streamId);
  const totalTopicsInClass = subjects.reduce(
    (sum, s) => sum + s.chapters.reduce((csum, ch) => csum + ch.topics.length, 0),
    0
  );
  const plannerSummary = computePlannerSummary(tasks);
  const progressSummary = computeProgressSummary(progressRecords, totalTopicsInClass);
  const subjectBreakdown = computeSubjectAnalytics(
    subjects,
    progressRecords,
    quizAttempts,
    testAttempts,
    tasks
  );
  const sessionMinutes = focusSessions.reduce((sum, s) => sum + s.minutes, 0);

  const allScores = [
    ...quizAttempts.map((q) => q.scorePercentage),
    ...testAttempts.map((t) => t.result.percentage),
  ];
  const averageScore =
    allScores.length > 0
      ? Math.round(allScores.reduce((sum, val) => sum + val, 0) / allScores.length)
      : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5">
          <div className="text-xs text-[#776d94] dark:text-[#968cb8]">Curriculum Completion</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#1b1430] dark:text-[#f3f0fc] tabular-nums">
            {progressSummary.classCompletionPercentage}%
          </div>
          <div className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf] tabular-nums">
            {progressSummary.completedTopics} / {totalTopicsInClass} topics completed
          </div>
        </div>

        <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5">
          <div className="text-xs text-[#776d94] dark:text-[#968cb8]">Assessment Average</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#1b1430] dark:text-[#f3f0fc] tabular-nums">
            {averageScore !== null ? `${averageScore}%` : 'No attempts'}
          </div>
          <div className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf] tabular-nums">
            {quizAttempts.length} {quizAttempts.length === 1 ? 'quiz' : 'quizzes'} ·{' '}
            {testAttempts.length} {testAttempts.length === 1 ? 'test' : 'tests'}
          </div>
        </div>

        <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5">
          <div className="text-xs text-[#776d94] dark:text-[#968cb8]">Planned Tasks Completed</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#1b1430] dark:text-[#f3f0fc] tabular-nums">
            {plannerSummary.completedTasks} / {plannerSummary.totalTasks}
          </div>
          <div className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf] tabular-nums">
            {plannerSummary.completedMinutes} min completed
          </div>
        </div>

        <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5">
          <div className="text-xs text-[#776d94] dark:text-[#968cb8]">Tracked Study Time</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#1b1430] dark:text-[#f3f0fc] tabular-nums">
            {progressSummary.totalTrackedMinutes + sessionMinutes} min
          </div>
          <div className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf] tabular-nums">
            {focusSessions.length} focus sessions · {progressSummary.averageMastery}% avg mastery
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#1b1430] dark:text-[#f3f0fc]">
              Subject Mastery Breakdown
            </h2>
            <p className="text-xs text-[#5b5276] dark:text-[#b0a6cf]">
              Aggregated from persisted topic progress, quiz attempts, test attempts, and study plans.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('quizzes')}
              className="px-3 py-1.5 rounded-xl bg-[#f3effb] dark:bg-[#221a3a] text-xs font-semibold text-[#5b21b6] dark:text-[#c4b5fd] hover:bg-[#ede9fe] cursor-pointer"
            >
              Take Quiz
            </button>
            <BarChart3 className="w-5 h-5 text-[#6d28d9] dark:text-[#a78bfa]" aria-hidden="true" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#efeaf9] dark:border-[#2a2147] text-xs text-[#776d94] dark:text-[#968cb8]">
                <th className="py-2.5 pr-4 font-semibold">Subject</th>
                <th className="py-2.5 px-4 font-semibold">Code</th>
                <th className="py-2.5 px-4 font-semibold text-right">Topics Done</th>
                <th className="py-2.5 px-4 font-semibold text-right">Avg Score</th>
                <th className="py-2.5 pl-4 font-semibold text-right">Planned Tasks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#efeaf9] dark:divide-[#2a2147] text-sm">
              {subjectBreakdown.map((item) => (
                <tr key={item.subjectId}>
                  <td className="py-3 pr-4 font-medium text-[#1b1430] dark:text-[#f3f0fc]">
                    {item.subjectName}
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-xs text-[#5b5276] dark:text-[#b0a6cf]">
                    {item.subjectCode}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-[#5b5276] dark:text-[#b0a6cf]">
                    {item.completedTopics} / {item.totalTopics} ({item.completionPct}%)
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-[#5b5276] dark:text-[#b0a6cf]">
                    {item.avgScore !== null ? `${item.avgScore}% (${item.assessmentsCount})` : '—'}
                  </td>
                  <td className="py-3 pl-4 text-right tabular-nums text-[#1b1430] dark:text-[#f3f0fc]">
                    {item.plannedTasks}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
