import {
  ArrowRight,
  BookOpen,
  Bot,
  CalendarDays,
  CheckCircle2,
  Circle,
  Compass,
  Timer,
} from 'lucide-react';
import type {
  ActiveStudyContext,
  FocusSessionRecord,
  NavModuleId,
  StudentProfile,
  StudyTask,
} from '../../types/studyverse';
import {
  computePlannerSummary,
  getAvailableSubjects,
  getClassById,
  resolveContextDetails,
} from '../../utils/curriculumHelpers';
import { ImageWithFallback } from '../common/ImageWithFallback';
import { IntegrationBanner } from '../common/IntegrationBanner';

interface DashboardViewProps {
  profile: StudentProfile;
  context: ActiveStudyContext;
  tasks: StudyTask[];
  focusSessions: FocusSessionRecord[];
  onToggleTask: (taskId: string) => void;
  onNavigate: (module: NavModuleId) => void;
  onSelectSubjectContext: (subjectId: string) => void;
}

export function DashboardView({
  profile,
  context,
  tasks,
  focusSessions,
  onToggleTask,
  onNavigate,
  onSelectSubjectContext,
}: DashboardViewProps) {
  const currentClass = getClassById(profile.gradeId);
  const subjects = getAvailableSubjects(profile.gradeId, profile.streamId);
  const { subject, chapter, topic } = resolveContextDetails(context);
  const plannerSummary = computePlannerSummary(tasks);
  const sessionMinutesToday = focusSessions.reduce((sum, s) => sum + s.minutes, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-6">
          <div>
            <div className="text-xs font-medium text-[#6d28d9] dark:text-[#c4b5fd] mb-2">
              {currentClass.label}
              {profile.streamId !== 'general' ? ` · ${profile.streamId.toUpperCase()}` : ''}
              {' · '}
              {profile.board}
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#1b1430] dark:text-[#f3f0fc] text-balance">
              Welcome back, {profile.name}
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#5b5276] dark:text-[#b0a6cf] max-w-xl leading-relaxed">
              Active focus topic: {subject.name} — {chapter.title} ({topic.title}). Jump straight
              into your lesson, ask Aria, or browse your class curriculum.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('explorer')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              <Compass className="w-4 h-4" aria-hidden="true" />
              <span>Explore Curriculum</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('aria')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#f8f6fc] dark:bg-[#221a3a] text-[#4c4366] dark:text-[#e9e4f8] hover:bg-[#ede9fe] dark:hover:bg-[#2d224d] text-sm font-medium transition-colors whitespace-nowrap cursor-pointer"
            >
              <Bot className="w-4 h-4 text-[#6d28d9] dark:text-[#a78bfa]" aria-hidden="true" />
              <span>Open AI Teacher Aria</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 min-h-[200px] bg-[#f3effb] dark:bg-[#21183d]">
          <ImageWithFallback
            src="/src/assets/images/studyverse_hero_banner_1794676730762.jpg"
            alt="StudyVerse open textbook and geometric learning workspace"
            className="w-full h-full object-cover"
            fallbackTitle="StudyVerse Workspace"
          />
        </div>
      </section>

      <section
        aria-label="Workspace summary metrics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5">
          <div className="text-xs font-medium text-[#776d94] dark:text-[#968cb8]">Active Class</div>
          <div className="mt-1 font-display text-xl font-bold text-[#1b1430] dark:text-[#f3f0fc]">
            {currentClass.label}
          </div>
          <div className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf] tabular-nums">
            {subjects.length} active subjects
          </div>
        </div>

        <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5">
          <div className="text-xs font-medium text-[#776d94] dark:text-[#968cb8]">
            Focus Logged (This Session)
          </div>
          <div className="mt-1 font-display text-xl font-bold text-[#1b1430] dark:text-[#f3f0fc] tabular-nums">
            {sessionMinutesToday} min
          </div>
          <div className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf] tabular-nums">
            Daily target: {profile.dailyGoalMinutes} min
          </div>
        </div>

        <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5">
          <div className="text-xs font-medium text-[#776d94] dark:text-[#968cb8]">
            Study Plan Tasks
          </div>
          <div className="mt-1 font-display text-xl font-bold text-[#1b1430] dark:text-[#f3f0fc] tabular-nums">
            {plannerSummary.completedTasks} / {plannerSummary.totalTasks}
          </div>
          <div className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf] tabular-nums">
            {plannerSummary.remainingMinutes} min remaining
          </div>
        </div>

        <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5">
          <div className="text-xs font-medium text-[#776d94] dark:text-[#968cb8]">
            Cloud & AI Services
          </div>
          <div className="mt-1 font-display text-xl font-bold text-[#1b1430] dark:text-[#f3f0fc]">
            Foundation Mode
          </div>
          <div className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf]">
            Ready to connect APIs in Settings
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-[#1b1430] dark:text-[#f3f0fc]">
                {currentClass.label} Subjects
              </h3>
              <p className="text-xs text-[#5b5276] dark:text-[#b0a6cf]">
                Select any subject to open its textbook chapters and AI workspaces
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('explorer')}
              className="text-xs font-semibold text-[#6d28d9] dark:text-[#c4b5fd] hover:underline whitespace-nowrap cursor-pointer"
            >
              View All Classes
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {subjects.map((subj) => {
              const topicCount = subj.chapters.reduce((acc, ch) => acc + ch.topics.length, 0);
              return (
                <button
                  key={subj.id}
                  type="button"
                  onClick={() => {
                    onSelectSubjectContext(subj.id);
                    onNavigate('explorer');
                  }}
                  className="text-left p-4 rounded-xl border border-[#e5dff4] dark:border-[#2e244d] bg-[#faf8ff] dark:bg-[#221a3a] hover:border-[#c4b5fd] dark:hover:border-[#6d28d9] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono-tabular text-[#6d28d9] dark:text-[#c4b5fd]">
                      {subj.code}
                    </span>
                    <ArrowRight
                      className="w-4 h-4 text-[#776d94] group-hover:text-[#6d28d9] transition-colors"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="mt-1.5 font-display text-base font-semibold text-[#1b1430] dark:text-[#f3f0fc]">
                    {subj.name}
                  </div>
                  <div className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf] tabular-nums">
                    {subj.chapters.length} {subj.chapters.length === 1 ? 'chapter' : 'chapters'} ·{' '}
                    {topicCount} {topicCount === 1 ? 'topic' : 'topics'}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="lg:col-span-5 rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-[#1b1430] dark:text-[#f3f0fc]">
                  Upcoming Study Plan
                </h3>
                <p className="text-xs text-[#5b5276] dark:text-[#b0a6cf]">
                  Session checklist synced with Study Planner
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('planner')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#6d28d9] dark:text-[#c4b5fd] hover:underline whitespace-nowrap cursor-pointer"
              >
                <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Planner</span>
              </button>
            </div>

            <ul className="divide-y divide-[#efeaf9] dark:divide-[#2a2147]">
              {tasks.slice(0, 4).map((task) => (
                <li key={task.id} className="py-3 first:pt-0 last:pb-0">
                  <button
                    type="button"
                    onClick={() => onToggleTask(task.id)}
                    className="w-full flex items-start gap-3 text-left cursor-pointer group"
                  >
                    {task.completed ? (
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
                        {task.subjectName} · {task.day} · {task.durationMinutes} min
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-3 border-t border-[#efeaf9] dark:border-[#2a2147] flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('focus')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#f3effb] dark:bg-[#221a3a] text-[#5b21b6] dark:text-[#c4b5fd] text-xs font-semibold hover:bg-[#ede9fe] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Timer className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Start Focus Timer</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('lessons')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#f3effb] dark:bg-[#221a3a] text-[#5b21b6] dark:text-[#c4b5fd] text-xs font-semibold hover:bg-[#ede9fe] transition-colors whitespace-nowrap cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Open AI Lessons</span>
            </button>
          </div>
        </section>
      </div>

      <IntegrationBanner
        serviceName="Supabase"
        title="Connect Backend & AI Services When Ready"
        description="This dashboard runs on clean foundation state with real curriculum navigation and session focus tracking. Connect Supabase, Gemini API, YouTube API, and GitHub securely when ready."
        onNavigate={onNavigate}
        compact
      />
    </div>
  );
}
