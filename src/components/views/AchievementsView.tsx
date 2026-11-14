import { Award, CheckCircle2, Lock } from 'lucide-react';
import type { FocusSessionRecord, NavModuleId, StudyTask } from '../../types/studyverse';
import { IntegrationBanner } from '../common/IntegrationBanner';

interface AchievementsViewProps {
  tasks: StudyTask[];
  focusSessions: FocusSessionRecord[];
  onNavigate: (module: NavModuleId) => void;
}

export function AchievementsView({
  tasks,
  focusSessions,
  onNavigate,
}: AchievementsViewProps) {
  const completedTasksCount = tasks.filter((t) => t.completed).length;

  const milestones = [
    {
      id: 'onboarding',
      title: 'StudyVerse Explorer',
      description: 'Set up your class profile and enter the StudyVerse learning workspace.',
      unlocked: true,
      progressLabel: 'Completed in session',
    },
    {
      id: 'first-task',
      title: 'Planner Momentum',
      description: 'Mark at least one study block completed in the AI Study Planner.',
      unlocked: completedTasksCount >= 1,
      progressLabel: `${completedTasksCount} / 1 task completed`,
    },
    {
      id: 'focus-block',
      title: 'Deep Focus Initiate',
      description: 'Complete a full focus timer session in the Focus & Concentration Center.',
      unlocked: focusSessions.length >= 1,
      progressLabel: `${focusSessions.length} / 1 focus block`,
    },
    {
      id: 'board-streak',
      title: '7-Day Study Consistency',
      description: 'Maintain daily focus activity across 7 consecutive days (requires Supabase sync).',
      unlocked: false,
      progressLabel: 'Requires Supabase persistence',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#1b1430] dark:text-[#f3f0fc]">
            Achievements & Milestones
          </h2>
          <p className="mt-1 text-sm text-[#5b5276] dark:text-[#b0a6cf]">
            Earn milestones from real completed study blocks, focus sessions, and mastery checks.
          </p>
        </div>
        <Award className="w-7 h-7 text-[#6d28d9] dark:text-[#a78bfa] shrink-0" aria-hidden="true" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {milestones.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5 flex items-start gap-4"
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                item.unlocked
                  ? 'bg-[#ede9fe] dark:bg-[#2c214f] text-[#6d28d9] dark:text-[#c4b5fd]'
                  : 'bg-[#f8f6fc] dark:bg-[#221a3a] text-[#8f84b3]'
              }`}
            >
              {item.unlocked ? (
                <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Lock className="w-5 h-5" aria-hidden="true" />
              )}
            </div>
            <div>
              <div className="text-xs font-medium text-[#6d28d9] dark:text-[#c4b5fd]">
                {item.unlocked ? 'Unlocked' : 'Locked'} · {item.progressLabel}
              </div>
              <h3 className="mt-0.5 font-display text-base font-bold text-[#1b1430] dark:text-[#f3f0fc]">
                {item.title}
              </h3>
              <p className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf] leading-relaxed">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <IntegrationBanner
        serviceName="Supabase"
        title="Cross-Session XP & Badge Persistence Ready"
        description="Session milestones update immediately above. Connect Supabase to save streaks, badges, and leaderboard opt-ins permanently."
        onNavigate={onNavigate}
        compact
      />
    </div>
  );
}
