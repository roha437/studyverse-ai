import { BarChart3 } from 'lucide-react';
import type {
  FocusSessionRecord,
  NavModuleId,
  StudentProfile,
  StudyTask,
} from '../../types/studyverse';
import { computePlannerSummary, getAvailableSubjects } from '../../utils/curriculumHelpers';
import { IntegrationBanner } from '../common/IntegrationBanner';

interface AnalyticsViewProps {
  profile: StudentProfile;
  tasks: StudyTask[];
  focusSessions: FocusSessionRecord[];
  onNavigate: (module: NavModuleId) => void;
}

export function AnalyticsView({
  profile,
  tasks,
  focusSessions,
  onNavigate,
}: AnalyticsViewProps) {
  const subjects = getAvailableSubjects(profile.gradeId, profile.streamId);
  const plannerSummary = computePlannerSummary(tasks);
  const sessionMinutes = focusSessions.reduce((sum, s) => sum + s.minutes, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5">
          <div className="text-xs text-[#776d94] dark:text-[#968cb8]">
            Focus Time (Current Session)
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-[#1b1430] dark:text-[#f3f0fc] tabular-nums">
            {sessionMinutes} min
          </div>
          <div className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf] tabular-nums">
            {focusSessions.length} completed blocks
          </div>
        </div>

        <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5">
          <div className="text-xs text-[#776d94] dark:text-[#968cb8]">
            Planned Tasks Completed
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-[#1b1430] dark:text-[#f3f0fc] tabular-nums">
            {plannerSummary.completedTasks} / {plannerSummary.totalTasks}
          </div>
          <div className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf] tabular-nums">
            {plannerSummary.completedMinutes} min completed
          </div>
        </div>

        <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5">
          <div className="text-xs text-[#776d94] dark:text-[#968cb8]">
            Historical DB Telemetry
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-[#1b1430] dark:text-[#f3f0fc]">
            Awaiting Supabase
          </div>
          <div className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf]">
            No synthetic score history shown
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#1b1430] dark:text-[#f3f0fc]">
              Subject Mastery Breakdown
            </h2>
            <p className="text-xs text-[#5b5276] dark:text-[#b0a6cf]">
              Live quiz scores and chapter completion percentages populate here once Supabase is
              connected.
            </p>
          </div>
          <BarChart3 className="w-5 h-5 text-[#6d28d9] dark:text-[#a78bfa]" aria-hidden="true" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#efeaf9] dark:border-[#2a2147] text-xs text-[#776d94] dark:text-[#968cb8]">
                <th className="py-2.5 pr-4 font-semibold">Subject</th>
                <th className="py-2.5 px-4 font-semibold">Code</th>
                <th className="py-2.5 px-4 font-semibold text-right">Chapters</th>
                <th className="py-2.5 pl-4 font-semibold text-right">Planned Tasks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#efeaf9] dark:divide-[#2a2147] text-sm">
              {subjects.map((subj) => {
                const matchingTasks = tasks.filter((t) =>
                  subj.name.toLowerCase().includes(t.subjectName.toLowerCase())
                ).length;
                return (
                  <tr key={subj.id}>
                    <td className="py-3 pr-4 font-medium text-[#1b1430] dark:text-[#f3f0fc]">
                      {subj.name}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-xs text-[#5b5276] dark:text-[#b0a6cf]">
                      {subj.code}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-[#5b5276] dark:text-[#b0a6cf]">
                      {subj.chapters.length}
                    </td>
                    <td className="py-3 pl-4 text-right tabular-nums text-[#1b1430] dark:text-[#f3f0fc]">
                      {matchingTasks}
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
        title="Multi-Week Analytics Sync Ready"
        description="Connect Supabase to aggregate quiz accuracy trends, chapter completion streaks, and weekly focus time charts."
        onNavigate={onNavigate}
      />
    </div>
  );
}
