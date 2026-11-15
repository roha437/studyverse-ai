import { useEffect, useState } from 'react';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import type {
  DatabaseSyncStatus,
  DbOperationResult,
  NavModuleId,
  StudentProfile,
  StudyPlanPriority,
  StudyPlanStatus,
  StudyTask,
} from '../../types/studyverse';
import { computePlannerSummary, getAvailableSubjects } from '../../utils/curriculumHelpers';
import {
  formatPlanDateLabel,
  getNextIsoDateForWeekday,
  weekdayFromIsoDate,
} from '../../utils/databaseMappers';
import { IntegrationBanner } from '../common/IntegrationBanner';

interface StudyPlannerViewProps {
  profile: StudentProfile;
  tasks: StudyTask[];
  dbStatus?: DatabaseSyncStatus;
  dbError?: string | null;
  isAuthenticated?: boolean;
  onAddTask: (task: Omit<StudyTask, 'id' | 'completed'>) => Promise<DbOperationResult<StudyTask>>;
  onUpdateTask: (
    id: string,
    task: Omit<StudyTask, 'id'>
  ) => Promise<DbOperationResult<StudyTask>>;
  onToggleTask: (id: string) => Promise<DbOperationResult<StudyTask>>;
  onDeleteTask: (id: string) => Promise<DbOperationResult<{ id: string }>>;
  onUpdateProfile?: (nextProfile: StudentProfile) => Promise<DbOperationResult<StudentProfile>>;
  onRetrySync?: () => void;
  onNavigate: (module: NavModuleId) => void;
}

const DAYS: StudyTask['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function StudyPlannerView({
  profile,
  tasks,
  dbStatus = 'local_preview',
  dbError = null,
  isAuthenticated = false,
  onAddTask,
  onUpdateTask,
  onToggleTask,
  onDeleteTask,
  onUpdateProfile,
  onRetrySync,
  onNavigate,
}: StudyPlannerViewProps) {
  const subjects = getAvailableSubjects(profile.gradeId, profile.streamId);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subjectName, setSubjectName] = useState(subjects[0]?.name ?? 'Mathematics');
  const [day, setDay] = useState<StudyTask['day']>('Mon');
  const [planDate, setPlanDate] = useState<string>(() => getNextIsoDateForWeekday('Mon'));
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [priority, setPriority] = useState<StudyPlanPriority>('medium');
  const [status, setStatus] = useState<StudyPlanStatus>('pending');
  const [taskDescription, setTaskDescription] = useState('');
  const [dayFilter, setDayFilter] = useState<StudyTask['day'] | 'All'>('All');

  const [dailyGoalInput, setDailyGoalInput] = useState(profile.dailyGoalMinutes);
  const [savingGoal, setSavingGoal] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [retryOperation, setRetryOperation] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    setDailyGoalInput(profile.dailyGoalMinutes);
  }, [profile.dailyGoalMinutes]);

  useEffect(() => {
    if (subjects.length > 0 && !subjects.some((s) => s.name === subjectName)) {
      setSubjectName(subjects[0].name);
    }
  }, [subjects, subjectName]);

  const summary = computePlannerSummary(tasks);
  const visibleTasks = dayFilter === 'All' ? tasks : tasks.filter((t) => t.day === dayFilter);
  const isLoadingPlans = dbStatus === 'loading';

  const resetForm = () => {
    setEditingTaskId(null);
    setTitle('');
    setSubjectName(subjects[0]?.name ?? 'Mathematics');
    setDay('Mon');
    setPlanDate(getNextIsoDateForWeekday('Mon'));
    setDurationMinutes(30);
    setPriority('medium');
    setStatus('pending');
    setTaskDescription('');
  };

  const handleDayChange = (nextDay: StudyTask['day']) => {
    setDay(nextDay);
    setPlanDate(getNextIsoDateForWeekday(nextDay));
    setActionError(null);
  };

  const handlePlanDateChange = (nextDate: string) => {
    setPlanDate(nextDate);
    if (nextDate) {
      setDay(weekdayFromIsoDate(nextDate));
    }
    setActionError(null);
  };

  const startEditingTask = (task: StudyTask) => {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setSubjectName(task.subjectName);
    setDay(task.day);
    setPlanDate(task.planDate || getNextIsoDateForWeekday(task.day));
    setDurationMinutes(task.durationMinutes);
    setPriority(task.priority ?? 'medium');
    setStatus(task.status ?? (task.completed ? 'completed' : 'pending'));
    setTaskDescription(task.taskDescription ?? '');
    setActionError(null);
    setActionMessage(null);
    setRetryOperation(null);
  };

  const executeSaveTask = async () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 3) {
      setActionError('Enter a study task title (at least 3 characters).');
      setRetryOperation(null);
      return;
    }

    const effectiveDate = planDate.trim() || getNextIsoDateForWeekday(day);
    const effectiveDay = weekdayFromIsoDate(effectiveDate);
    const boundedDuration = Math.max(5, Math.min(600, Math.round(durationMinutes || 30)));

    setSubmitting(true);
    setActionError(null);
    setActionMessage(null);

    if (editingTaskId) {
      const targetId = editingTaskId;
      const res = await onUpdateTask(targetId, {
        title: trimmedTitle,
        subjectName,
        day: effectiveDay,
        planDate: effectiveDate,
        durationMinutes: boundedDuration,
        priority,
        status,
        completed: status === 'completed',
        taskDescription: taskDescription.trim(),
      });
      setSubmitting(false);

      if (res.error || !res.data) {
        setActionError(res.error ?? 'Could not update this study block.');
        setRetryOperation(() => executeSaveTask);
        return;
      }

      setRetryOperation(null);
      resetForm();
      setActionMessage(
        isAuthenticated
          ? `Study block "${res.data.title}" updated in your account.`
          : `Study block "${res.data.title}" updated in preview mode.`
      );
      return;
    }

    const res = await onAddTask({
      title: trimmedTitle,
      subjectName,
      day: effectiveDay,
      planDate: effectiveDate,
      durationMinutes: boundedDuration,
      priority,
      status,
      taskDescription: taskDescription.trim(),
    });
    setSubmitting(false);

    if (res.error || !res.data) {
      setActionError(res.error ?? 'Could not save this study block.');
      setRetryOperation(() => executeSaveTask);
      return;
    }

    setRetryOperation(null);
    resetForm();
    setActionMessage(
      isAuthenticated
        ? `Study block "${res.data.title}" saved to your account.`
        : `Study block "${res.data.title}" added in preview mode.`
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeSaveTask();
  };

  const handleToggle = async (id: string) => {
    setBusyTaskId(id);
    setActionError(null);
    setActionMessage(null);
    const res = await onToggleTask(id);
    setBusyTaskId(null);

    if (res.error || !res.data) {
      setActionError(res.error ?? 'Could not update task completion status.');
      setRetryOperation(() => () => handleToggle(id));
      return;
    }

    setRetryOperation(null);
    setActionMessage(
      res.data.completed
        ? `Marked "${res.data.title}" completed${isAuthenticated ? ' in your account.' : ' in preview mode.'}`
        : `Marked "${res.data.title}" pending${isAuthenticated ? ' in your account.' : ' in preview mode.'}`
    );
  };

  const handleDelete = async (id: string, taskTitle: string) => {
    setBusyTaskId(id);
    setActionError(null);
    setActionMessage(null);
    const res = await onDeleteTask(id);
    setBusyTaskId(null);

    if (res.error) {
      setActionError(res.error);
      setRetryOperation(() => () => handleDelete(id, taskTitle));
      return;
    }

    if (editingTaskId === id) {
      resetForm();
    }
    setRetryOperation(null);
    setActionMessage(
      isAuthenticated
        ? `Deleted "${taskTitle}" from your study plan.`
        : `Removed "${taskTitle}" in preview mode.`
    );
  };

  const handleSaveDailyGoal = async () => {
    if (!onUpdateProfile) return;
    const boundedGoal = Math.max(15, Math.min(720, Math.round(dailyGoalInput || 90)));
    setSavingGoal(true);
    setActionError(null);
    setActionMessage(null);

    const res = await onUpdateProfile({
      ...profile,
      dailyGoalMinutes: boundedGoal,
    });
    setSavingGoal(false);

    if (res.error || !res.data) {
      setActionError(res.error ?? 'Could not save your daily study goal.');
      setRetryOperation(() => handleSaveDailyGoal);
      return;
    }

    setDailyGoalInput(res.data.dailyGoalMinutes);
    setRetryOperation(null);
    setActionMessage(
      isAuthenticated
        ? `Daily study goal saved (${res.data.dailyGoalMinutes} min/day).`
        : `Daily study goal updated in preview mode (${res.data.dailyGoalMinutes} min/day).`
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5">
          <div className="text-xs text-[#776d94] dark:text-[#968cb8]">Total Planned Time</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#1b1430] dark:text-[#f3f0fc] tabular-nums">
            {summary.totalMinutes} min
          </div>
          <div className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf] tabular-nums">
            Daily goal: {profile.dailyGoalMinutes} min/day
          </div>
        </div>
        <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5">
          <div className="text-xs text-[#776d94] dark:text-[#968cb8]">Completed Time</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#059669] dark:text-[#34d399] tabular-nums">
            {summary.completedMinutes} min
          </div>
          <div className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf] tabular-nums">
            {summary.remainingMinutes} min remaining
          </div>
        </div>
        <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5">
          <div className="text-xs text-[#776d94] dark:text-[#968cb8]">Tasks Completed</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#1b1430] dark:text-[#f3f0fc] tabular-nums">
            {summary.completedTasks} / {summary.totalTasks}
          </div>
          <div className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf]">
            {isAuthenticated ? 'Synced with your account' : 'Preview session'}
          </div>
        </div>
      </div>

      {dbStatus === 'error' && dbError ? (
        <div
          role="alert"
          className="rounded-2xl border border-[#fecaca] dark:border-[#7f1d1d] bg-[#fef2f2] dark:bg-[#3b151a] p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#b91c1c] dark:text-[#fca5a5]"
        >
          <span>{dbError}</span>
          {onRetrySync ? (
            <button
              type="button"
              onClick={onRetrySync}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#19132b] border border-[#fecaca] dark:border-[#7f1d1d] font-semibold cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Retry Sync</span>
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 items-start gap-6">
        <section className="lg:col-span-5 rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-[#1b1430] dark:text-[#f3f0fc]">
              {editingTaskId ? 'Edit Study Block' : 'Add Study Block'}
            </h2>
            <div className="flex items-center gap-2">
              {editingTaskId ? (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setActionError(null);
                    setRetryOperation(null);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#e5dff4] dark:border-[#372a5c] text-xs font-medium text-[#5b5276] dark:text-[#b0a6cf] hover:text-[#1b1430] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Cancel</span>
                </button>
              ) : null}
              <CalendarDays className="w-5 h-5 text-[#6d28d9] dark:text-[#a78bfa]" aria-hidden="true" />
            </div>
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
                  setActionError(null);
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
                  {!subjects.some((s) => s.name === subjectName) && subjectName ? (
                    <option value={subjectName}>{subjectName}</option>
                  ) : null}
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
                  onChange={(e) => handleDayChange(e.target.value as StudyTask['day'])}
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="sv-task-date"
                  className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
                >
                  Target Date
                </label>
                <input
                  id="sv-task-date"
                  type="date"
                  value={planDate}
                  onChange={(e) => handlePlanDateChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] font-mono-tabular text-sm text-[#1b1430] dark:text-[#f3f0fc]"
                />
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
                  min={5}
                  max={600}
                  step={5}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value) || 30)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] font-mono-tabular text-sm text-[#1b1430] dark:text-[#f3f0fc]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="sv-task-priority"
                  className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
                >
                  Priority
                </label>
                <select
                  id="sv-task-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as StudyPlanPriority)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="sv-task-status"
                  className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
                >
                  Status
                </label>
                <select
                  id="sv-task-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StudyPlanStatus)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc]"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="sv-task-desc"
                className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
              >
                Notes / Textbook Pages (optional)
              </label>
              <input
                id="sv-task-desc"
                type="text"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="e.g. Exercise 4.3 Questions 1–6"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc]"
              />
            </div>

            {actionError ? (
              <div
                role="alert"
                className="p-3 rounded-xl bg-[#fef2f2] dark:bg-[#3b151a] border border-[#fecaca] dark:border-[#7f1d1d] text-xs text-[#b91c1c] dark:text-[#fca5a5] flex items-center justify-between gap-2"
              >
                <span>{actionError}</span>
                {retryOperation ? (
                  <button
                    type="button"
                    disabled={submitting || savingGoal || busyTaskId !== null}
                    onClick={() => void retryOperation()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-[#19132b] border border-[#fecaca] dark:border-[#7f1d1d] font-semibold shrink-0 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" aria-hidden="true" />
                    <span>Retry</span>
                  </button>
                ) : null}
              </div>
            ) : null}

            {actionMessage ? (
              <div
                role="status"
                className="p-3 rounded-xl bg-[#ecfdf5] dark:bg-[#102d24] border border-[#a7f3d0] dark:border-[#047857] text-xs font-semibold text-[#059669] dark:text-[#34d399]"
              >
                {actionMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] disabled:opacity-60 text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : editingTaskId ? (
                <Check className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Plus className="w-4 h-4" aria-hidden="true" />
              )}
              <span>
                {submitting
                  ? editingTaskId
                    ? 'Updating Study Block...'
                    : 'Saving Study Block...'
                  : editingTaskId
                    ? 'Save Changes'
                    : 'Add to Study Plan'}
              </span>
            </button>
          </form>

          {onUpdateProfile ? (
            <div className="pt-4 border-t border-[#efeaf9] dark:border-[#2a2147] space-y-2">
              <label
                htmlFor="sv-planner-daily-goal"
                className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf]"
              >
                Daily Study Goal (minutes/day)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="sv-planner-daily-goal"
                  type="number"
                  min={15}
                  max={720}
                  step={5}
                  value={dailyGoalInput}
                  onChange={(e) => setDailyGoalInput(Number(e.target.value) || 90)}
                  className="flex-1 px-3 py-2 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] font-mono-tabular text-sm text-[#1b1430] dark:text-[#f3f0fc]"
                />
                <button
                  type="button"
                  disabled={savingGoal}
                  onClick={() => void handleSaveDailyGoal()}
                  className="px-3.5 py-2 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#f3effb] dark:bg-[#221a3a] text-xs font-semibold text-[#5b21b6] dark:text-[#c4b5fd] hover:bg-[#ede9fe] disabled:opacity-60 whitespace-nowrap cursor-pointer"
                >
                  {savingGoal ? 'Saving...' : 'Save Goal'}
                </button>
              </div>
            </div>
          ) : null}
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

          {isLoadingPlans ? (
            <div
              role="status"
              className="py-8 flex items-center justify-center gap-2 text-sm text-[#5b5276] dark:text-[#b0a6cf]"
            >
              <Loader2 className="w-4 h-4 animate-spin text-[#6d28d9]" aria-hidden="true" />
              <span>Loading your saved study plans...</span>
            </div>
          ) : visibleTasks.length === 0 ? (
            <p className="py-6 text-sm text-center text-[#5b5276] dark:text-[#b0a6cf]">
              No study blocks scheduled for {dayFilter}. Add one on the left!
            </p>
          ) : (
            <ul className="divide-y divide-[#efeaf9] dark:divide-[#2a2147]">
              {visibleTasks.map((task) => {
                const isBusy = busyTaskId === task.id;
                const isEditing = editingTaskId === task.id;
                return (
                  <li key={task.id} className="py-3.5 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={isBusy}
                      aria-label={`${task.completed ? 'Mark pending' : 'Mark completed'}: ${task.title}`}
                      onClick={() => void handleToggle(task.id)}
                      className="flex items-start gap-3 text-left flex-1 min-w-0 cursor-pointer disabled:opacity-60"
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
                          {task.subjectName} · {formatPlanDateLabel(task.planDate, task.day)} ·{' '}
                          {task.durationMinutes} min
                          {task.priority ? ` · ${task.priority} priority` : ''}
                          {task.status === 'in_progress' ? ' · in progress' : ''}
                        </div>
                        {task.taskDescription ? (
                          <div className="text-xs text-[#776d94] dark:text-[#968cb8] mt-0.5">
                            {task.taskDescription}
                          </div>
                        ) : null}
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => startEditingTask(task)}
                        aria-label={`Edit task ${task.title}`}
                        className={`p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
                          isEditing
                            ? 'bg-[#ede9fe] dark:bg-[#2c214f] text-[#6d28d9] dark:text-[#c4b5fd]'
                            : 'text-[#776d94] hover:text-[#6d28d9] hover:bg-[#f3effb] dark:hover:bg-[#221a3a]'
                        }`}
                      >
                        <Pencil className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleDelete(task.id, task.title)}
                        aria-label={`Delete task ${task.title}`}
                        className="p-2 rounded-lg text-[#776d94] hover:text-[#dc2626] hover:bg-[#fef2f2] dark:hover:bg-[#3b151a] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <IntegrationBanner
        serviceName="Gemini API"
        title="Smart Revision Scheduling"
        description="Plan your weekly chapters and study durations above—all study blocks save directly to your StudyVerse account."
        onNavigate={onNavigate}
        compact
      />
    </div>
  );
}
