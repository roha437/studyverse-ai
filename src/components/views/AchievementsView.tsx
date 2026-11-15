import { Award, CheckCircle2, Lock } from 'lucide-react';
import type {
  AchievementRecord,
  FocusSessionRecord,
  NavModuleId,
  NoteRecord,
  QuizAttemptRecord,
  StudentProgressRecord,
  StudyTask,
  TestAttemptRecord,
} from '../../types/studyverse';

interface AchievementsViewProps {
  tasks: StudyTask[];
  focusSessions: FocusSessionRecord[];
  progressRecords: StudentProgressRecord[];
  notes: NoteRecord[];
  quizAttempts: QuizAttemptRecord[];
  testAttempts: TestAttemptRecord[];
  achievements: AchievementRecord[];
  onNavigate: (module: NavModuleId) => void;
}

export function AchievementsView({
  tasks,
  focusSessions,
  progressRecords,
  notes,
  quizAttempts,
  testAttempts,
  achievements,
  onNavigate,
}: AchievementsViewProps) {
  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const completedTopicsCount = progressRecords.filter((p) => p.completionPercentage >= 100).length;
  const totalAssessments = quizAttempts.length + testAttempts.length;

  const isPersisted = (code: string) => achievements.find((a) => a.achievementCode === code);

  const milestones = [
    {
      code: 'onboarding',
      title: 'StudyVerse Explorer',
      description: 'Set up your class profile and enter the StudyVerse learning workspace.',
      unlocked: true,
      progressLabel: 'Completed',
    },
    {
      code: 'first-lesson',
      title: 'Curriculum Scholar',
      description: 'Complete at least one textbook topic in Curriculum Explorer or AI Lessons.',
      unlocked: completedTopicsCount >= 1 || Boolean(isPersisted('first-lesson')),
      progressLabel: `${completedTopicsCount} / 1 topic completed`,
    },
    {
      code: 'first-task',
      title: 'Planner Momentum',
      description: 'Mark at least one study block completed in the Study Planner.',
      unlocked: completedTasksCount >= 1 || Boolean(isPersisted('first-task')),
      progressLabel: `${completedTasksCount} / 1 task completed`,
    },
    {
      code: 'first-note',
      title: 'Revision Architect',
      description: 'Create and save a structured study note in Notes Studio.',
      unlocked: notes.length >= 1 || Boolean(isPersisted('first-note')),
      progressLabel: `${notes.length} / 1 note saved`,
    },
    {
      code: 'first-quiz',
      title: 'Assessment Challenger',
      description: 'Submit and record a curriculum quiz or chapter test attempt.',
      unlocked: totalAssessments >= 1 || Boolean(isPersisted('first-quiz')),
      progressLabel: `${totalAssessments} / 1 assessment completed`,
    },
    {
      code: 'focus-block',
      title: 'Deep Focus Initiate',
      description: 'Complete a full focus timer session in the Focus & Concentration Center.',
      unlocked: focusSessions.length >= 1 || Boolean(isPersisted('focus-block')),
      progressLabel: `${focusSessions.length} / 1 focus block`,
    },
  ];

  const unlockedCount = milestones.filter((m) => m.unlocked).length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#1b1430] dark:text-[#f3f0fc]">
            Achievements &amp; Milestones
          </h2>
          <p className="mt-1 text-sm text-[#5b5276] dark:text-[#b0a6cf] tabular-nums">
            {unlockedCount} of {milestones.length} milestones unlocked from real study activity
            {achievements.length > 0 ? ` · ${achievements.length} saved to your account` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('quizzes')}
            className="px-4 py-2 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-xs font-semibold text-[#5b21b6] dark:text-[#c4b5fd] hover:bg-[#ede9fe] transition-colors cursor-pointer"
          >
            Take Practice Quiz
          </button>
          <Award className="w-7 h-7 text-[#6d28d9] dark:text-[#a78bfa] shrink-0" aria-hidden="true" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {milestones.map((item) => {
          const synced = isPersisted(item.code);
          return (
            <div
              key={item.code}
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
                  {synced ? ` · Synced ${new Date(synced.unlockedAt).toLocaleDateString()}` : ''}
                </div>
                <h3 className="mt-0.5 font-display text-base font-bold text-[#1b1430] dark:text-[#f3f0fc]">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf] leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
