import { useState } from 'react';
import { CalendarDays, CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react';
import type { NavModuleId, StudentProfile, StudyTask } from '../../types/studyverse';
import { computePlannerSummary, getAvailableSubjects } from '../../utils/curriculumHelpers';
import { IntegrationBanner } from '../common/IntegrationBanner';

interface StudyPlannerViewProps {
  profile: StudentProfile;
  tasks: StudyTask[];
  onAddTask: (task: Omit<StudyTask, 'id' | 'completed'>) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onNavigate: (module: NavModuleId) => void;
}

const DAYS: StudyTask['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function StudyPlannerView({
  profile,
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onNavigate,
}: StudyPlannerViewProps) {
  const subjects = getAvailableSubjects(profile.gradeId, profile.streamId);
  const [title, setTitle] = useState('');
  const [subjectName, setSubjectName] = useState(subjects[0]?.name ?? 'Mathematics');
  const [day, setDay] = useState<StudyTask['day']>('Mon');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [dayFilter, setDayFilter] = useState<StudyTask['day'] | 'All'>('All');
  const [formError, setFormError] = useState<string | null>(null);

  const summary = computePlannerSummary(tasks);
  const visibleTasks = dayFilter === 'All' ? tasks : tasks.filter((t) => t.day === dayFilter);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3) {
      setFormError('Enter a study task title (at least 3 characters).');
      return;
    }
    setFormError(null);
    onAddTask({
      title: title.trim(),
      subjectName,
      day,
      durationMinutes,
    });
    setTitle('');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5">
          <div className="text-xs text-[#776d94] dark:text-[#968cb8]">Total Planned Time</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#1b1430] dark:text-[#f3f0fc] tabular-nums">
            {summary.totalMinutes} min
          </div>
        </div>
        <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5">
          <div className="text-xs text-[#776d94] dark:text-[#968cb8]">Completed Time</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#059669] dark:text-[#34d399] tabular-nums">
            {summary.completedMinutes} min
          </div>
        </div>
        <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5">
          <div className="text-xs text-[#776d94] dark:text-[#968cb8]">Tasks Completed</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#1b1430] dark:text-[#f3f0fc] tabular-nums">
            {summary.completedTasks} / {summary.totalTasks}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-[#1b1430] dark:text-[#f3f0fc]">
              Add Study Block
            </h2>
            <CalendarDays className="w-5 h-5 text-[#6d28d9] dark:text-[#a78bfa]" aria-hidden="true" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="sv-task-title"
                className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
              >
                Topic or Goal
              </label>
              <input
                id="sv-task-title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setFormError(null);
                }}
                placeholder="e.g. Solve 10 Trigonometry identities"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc] focus:outline-none focus:ring-2 focus:ring-[#6d28d9]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="sv-task-subject"
                  className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
                >
                  Subject
                </label>
                <select
                  id="sv-task-subject"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc]"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="sv-task-day"
                  className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
                >
                  Day
                </label>
                <select
                  id="sv-task-day"
                  value={day}
                  onChange={(e) => setDay(e.target.value as StudyTask['day'])}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc]"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="sv-task-duration"
                className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
              >
                Duration (minutes)
              </label>
              <input
                id="sv-task-duration"
                type="number"
                min={10}
                max={180}
                step={5}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value) || 30)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] font-mono-tabular text-sm text-[#1b1430] dark:text-[#f3f0fc]"
              />
            </div>

            {formError ? (
              <p role="alert" className="text-xs text-[#b91c1c] dark:text-[#fca5a5]">
                {formError}
              </p>
            ) : null}

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Add to Study Plan</span>
            </button>
          </form>
        </section>

        <section className="lg:col-span-7 rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-lg font-bold text-[#1b1430] dark:text-[#f3f0fc]">
              Weekly Schedule
            </h3>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by day">
              {(['All', ...DAYS] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDayFilter(d)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    dayFilter === d
                      ? 'bg-[#6d28d9] text-white'
                      : 'bg-[#f3effb] dark:bg-[#221a3a] text-[#4c4366] dark:text-[#b0a6cf]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {visibleTasks.length === 0 ? (
            <p className="py-6 text-sm text-center text-[#5b5276] dark:text-[#b0a6cf]">
              No study blocks scheduled for {dayFilter}. Add one on the left!
            </p>
          ) : (
            <ul className="divide-y divide-[#efeaf9] dark:divide-[#2a2147]">
              {visibleTasks.map((task) => (
                <li key={task.id} className="py-3.5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onToggleTask(task.id)}
                    className="flex items-start gap-3 text-left flex-1 min-w-0 cursor-pointer"
                  >
                    {task.completed ? (
                      <CheckCircle2
                        className="w-4 h-4 text-[#059669] shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                    ) : (
                      <Circle
                        className="w-4 h-4 text-[#8f84b3] shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                    )}
                    <div className="min-w-0">
                      <div
                        className={`text-sm font-medium ${
                          task.completed
                            ? 'line-through text-[#776d94]'
                            : 'text-[#1b1430] dark:text-[#f3f0fc]'
                        }`}
                      >
                        {task.title}
                      </div>
                      <div className="text-xs text-[#5b5276] dark:text-[#b0a6cf] tabular-nums">
                        {task.subjectName} · {task.day} · {task.durationMinutes} min
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteTask(task.id)}
                    aria-label={`Delete task ${task.title}`}
                    className="p-2 rounded-lg text-[#776d94] hover:text-[#dc2626] hover:bg-[#fef2f2] dark:hover:bg-[#3b151a] transition-colors shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <IntegrationBanner
        serviceName="Gemini API"
        title="AI Auto-Scheduler & Supabase Sync Ready"
        description="Connect Gemini API to automatically balance exam revision schedules by chapter difficulty, and connect Supabase to persist weekly plans."
        onNavigate={onNavigate}
        compact
      />
    </div>
  );
}
