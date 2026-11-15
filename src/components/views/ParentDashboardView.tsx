import { Users } from 'lucide-react';
import type {
  FocusSessionRecord,
  NavModuleId,
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
} from '../../utils/curriculumHelpers';
import { computeProgressSummary, computeSubjectAnalytics } from '../../utils/databaseMappers';
import { IntegrationBanner } from '../common/IntegrationBanner';

interface ParentDashboardViewProps {
  profile: StudentProfile;
  tasks: StudyTask[];
  focusSessions: FocusSessionRecord[];
  progressRecords: StudentProgressRecord[];
  quizAttempts: QuizAttemptRecord[];
  testAttempts: TestAttemptRecord[];
  onNavigate: (module: NavModuleId) => void;
}

export function ParentDashboardView({
  profile,
  tasks,
  focusSessions,
  progressRecords,
  quizAttempts,
  testAttempts,
  onNavigate,
}: ParentDashboardViewProps) {
  const currentClass = getClassById(profile.gradeId);
  const subjects = getAvailableSubjects(profile.gradeId, profile.streamId);
  const totalTopicsInClass = subjects.reduce(
    (sum, s) => sum + s.chapters.reduce((csum, ch) => csum + ch.topics.length, 0),
    0
  );
  const plannerSummary = computePlannerSummary(tasks);
  const progressSummary = computeProgressSummary(progressRecords, totalTopicsInClass);
  const subjectAnalytics = computeSubjectAnalytics(
    subjects,
    progressRecords,
    quizAttempts,
    testAttempts,
    tasks
  );
  const focusMinutes = focusSessions.reduce((sum, s) => sum + s.minutes, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-[#6d28d9] dark:text-[#c4b5fd]">
            Parent &amp; Guardian Oversight
          </div>
          <h2 className="mt-1 font-display text-xl font-bold text-[#1b1430] dark:text-[#f3f0fc]">
            Linked Student: {profile.name}
          </h2>
          <p className="mt-1 text-sm text-[#5b5276] dark:text-[#b0a6cf]">
            Guardian: {profile.guardianName} · {currentClass.label}
            {profile.streamId !== 'general' ? ` (${profile.streamId.toUpperCase()})` : ''} ·{' '}
            {profile.board}
          </p>
        </div>
        <Users className="w-7 h-7 text-[#6d28d9] dark:text-[#a78bfa] shrink-0" aria-hidden="true" />
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5">
          <div className="text-xs text-[#776d94] dark:text-[#968cb8]">
            Study Time Tracked vs Goal
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-[#1b1430] dark:text-[#f3f0fc] tabular-nums">
            {progressSummary.totalTrackedMinutes + focusMinutes} / {profile.dailyGoalMinutes} min
          </div>
        </div>
        <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5">
          <div className="text-xs text-[#776d94] dark:text-[#968cb8]">
            Weekly Study Plan Completion
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-[#1b1430] dark:text-[#f3f0fc] tabular-nums">
            {plannerSummary.completedTasks} of {plannerSummary.totalTasks} blocks
          </div>
        </div>
        <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5">
          <div className="text-xs text-[#776d94] dark:text-[#968cb8]">Curriculum Completion</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#1b1430] dark:text-[#f3f0fc] tabular-nums">
            {progressSummary.classCompletionPercentage}% ({quizAttempts.length + testAttempts.length}{' '}
            checks)
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-4">
        <h3 className="font-display text-base font-bold text-[#1b1430] dark:text-[#f3f0fc]">
          Active Subject Progress &amp; Assessment Summary
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#efeaf9] dark:border-[#2a2147] text-xs text-[#776d94] dark:text-[#968cb8]">
                <th className="py-2.5 pr-4 font-semibold">Subject</th>
                <th className="py-2.5 px-4 font-semibold text-right">Topics Done</th>
                <th className="py-2.5 px-4 font-semibold text-right">Avg Quiz/Test</th>
                <th className="py-2.5 pl-4 font-semibold text-right">Planned Tasks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#efeaf9] dark:divide-[#2a2147] text-sm">
              {subjectAnalytics.map((item) => (
                <tr key={item.subjectId}>
                  <td className="py-3 pr-4 font-medium text-[#1b1430] dark:text-[#f3f0fc]">
                    {item.subjectName}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-[#5b5276] dark:text-[#b0a6cf]">
                    {item.completedTopics} / {item.totalTopics}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-[#5b5276] dark:text-[#b0a6cf]">
                    {item.avgScore !== null ? `${item.avgScore}%` : '—'}
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

      <IntegrationBanner
        serviceName="Supabase"
        title="Private Guardian Oversight"
        description="Student progress, quiz attempts, test scores, and study plans load directly from your securely connected StudyVerse account."
        onNavigate={onNavigate}
      />
    </div>
  );
}
