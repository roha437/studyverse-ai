import { Users } from 'lucide-react';
import type {
  FocusSessionRecord,
  NavModuleId,
  StudentProfile,
  StudyTask,
} from '../../types/studyverse';
import {
  computePlannerSummary,
  getAvailableSubjects,
  getClassById,
} from '../../utils/curriculumHelpers';
import { IntegrationBanner } from '../common/IntegrationBanner';

interface ParentDashboardViewProps {
  profile: StudentProfile;
  tasks: StudyTask[];
  focusSessions: FocusSessionRecord[];
  onNavigate: (module: NavModuleId) => void;
}

export function ParentDashboardView({
  profile,
  tasks,
  focusSessions,
  onNavigate,
}: ParentDashboardViewProps) {
  const currentClass = getClassById(profile.gradeId);
  const subjects = getAvailableSubjects(profile.gradeId, profile.streamId);
  const plannerSummary = computePlannerSummary(tasks);
  const focusMinutes = focusSessions.reduce((sum, s) => sum + s.minutes, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-[#6d28d9] dark:text-[#c4b5fd]">
            Parent & Guardian Oversight
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
            Focus Logged (Current Session)
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-[#1b1430] dark:text-[#f3f0fc] tabular-nums">
            {focusMinutes} / {profile.dailyGoalMinutes} min
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
          <div className="text-xs text-[#776d94] dark:text-[#968cb8]">Enrolled Subjects</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#1b1430] dark:text-[#f3f0fc] tabular-nums">
            {subjects.length} subjects
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-4">
        <h3 className="font-display text-base font-bold text-[#1b1430] dark:text-[#f3f0fc]">
          Active Subject Curriculum & Schedule
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#efeaf9] dark:border-[#2a2147] text-xs text-[#776d94] dark:text-[#968cb8]">
                <th className="py-2.5 pr-4 font-semibold">Subject</th>
                <th className="py-2.5 px-4 font-semibold">Curriculum Units</th>
                <th className="py-2.5 pl-4 font-semibold text-right">Planned Tasks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#efeaf9] dark:divide-[#2a2147] text-sm">
              {subjects.map((subj) => {
                const count = tasks.filter((t) =>
                  subj.name.toLowerCase().includes(t.subjectName.toLowerCase())
                ).length;
                return (
                  <tr key={subj.id}>
                    <td className="py-3 pr-4 font-medium text-[#1b1430] dark:text-[#f3f0fc]">
                      {subj.name}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#5b5276] dark:text-[#b0a6cf]">
                      {subj.chapters.map((c) => c.title).join(' · ')}
                    </td>
                    <td className="py-3 pl-4 text-right tabular-nums text-[#1b1430] dark:text-[#f3f0fc]">
                      {count}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <IntegrationBanner
        serviceName="Supabase"
        title="Guardian Account Linking & Weekly Digests Ready"
        description="Connect Supabase Auth and Row-Level Security policies to allow parents to sign in independently and review verified quiz scores, daily study consistency, and mentor activity."
        onNavigate={onNavigate}
      />
    </div>
  );
}
