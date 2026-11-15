import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Timer } from 'lucide-react';
import type {
  DbOperationResult,
  FocusSessionInput,
  FocusSessionRecord,
  NavModuleId,
} from '../../types/studyverse';
import { formatSecondsToTimer } from '../../utils/curriculumHelpers';
import { getFocusPeriodStats } from '../../utils/focusSessionHelpers';
import { ImageWithFallback } from '../common/ImageWithFallback';
import { IntegrationBanner } from '../common/IntegrationBanner';

interface FocusCenterViewProps {
  sessions: FocusSessionRecord[];
  subjectLabel: string;
  loadError?: string | null;
  onLogFocusSession: (input: FocusSessionInput) => Promise<DbOperationResult<FocusSessionRecord>>;
  onNavigate: (module: NavModuleId) => void;
}

const PRESETS = [
  { id: 'pomodoro', label: '25 min Pomodoro', minutes: 25 },
  { id: 'deep-work', label: '50 min Deep Study', minutes: 50 },
  { id: 'short-break', label: '5 min Short Break', minutes: 5 },
  { id: 'quick-sprint', label: '15 min Revision Sprint', minutes: 15 },
];

export function FocusCenterView({
  sessions,
  subjectLabel,
  loadError,
  onLogFocusSession,
  onNavigate,
}: FocusCenterViewProps) {
  const [selectedPresetId, setSelectedPresetId] = useState('pomodoro');
  const [sessionGoal, setSessionGoal] = useState('Complete chapter review without distractions');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const startedAtRef = useRef<string | null>(null);
  const initialDurationRef = useRef(25 * 60);
  const onLogFocusSessionRef = useRef(onLogFocusSession);
  onLogFocusSessionRef.current = onLogFocusSession;

  const activePreset = PRESETS.find((p) => p.id === selectedPresetId) ?? PRESETS[0];
  const timerStateRef = useRef({
    secondsLeft,
    sessionGoal,
    presetLabel: activePreset.label,
    subjectLabel,
  });
  timerStateRef.current = {
    secondsLeft,
    sessionGoal,
    presetLabel: activePreset.label,
    subjectLabel,
  };
  const focusStats = getFocusPeriodStats(sessions, new Date());

  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning]);

  const finishSession = useCallback(
    async (status: FocusSessionInput['status'], durationSeconds: number) => {
      const startedAt = startedAtRef.current;
      if (!startedAt) return;
      startedAtRef.current = null;
      const result = await onLogFocusSessionRef.current({
        label: sessionGoal.trim() || activePreset.label,
        subject: subjectLabel,
        startedAt,
        endedAt: new Date().toISOString(),
        durationSeconds,
        status,
      });
      if (result.error) setSaveError(result.error);
      else setSaveError(null);
    },
    [activePreset.label, sessionGoal, subjectLabel]
  );

  useEffect(() => {
    if (!isRunning || secondsLeft !== 0) return;
    setIsRunning(false);
    void finishSession('completed', initialDurationRef.current);
  }, [finishSession, isRunning, secondsLeft]);

  useEffect(
    () => () => {
      const startedAt = startedAtRef.current;
      if (!startedAt) return;
      const current = timerStateRef.current;
      const elapsed = Math.max(0, initialDurationRef.current - current.secondsLeft);
      startedAtRef.current = null;
      void onLogFocusSessionRef.current({
        label: current.sessionGoal.trim() || current.presetLabel,
        subject: current.subjectLabel,
        startedAt,
        endedAt: new Date().toISOString(),
        durationSeconds: elapsed,
        status: 'interrupted',
      });
    },
    []
  );

  const handleSelectPreset = (presetId: string, minutes: number) => {
    if (startedAtRef.current) {
      void finishSession('interrupted', Math.max(0, initialDurationRef.current - secondsLeft));
    }
    setIsRunning(false);
    setSelectedPresetId(presetId);
    setSecondsLeft(minutes * 60);
    initialDurationRef.current = minutes * 60;
  };

  const handleReset = () => {
    if (startedAtRef.current) {
      void finishSession('interrupted', Math.max(0, initialDurationRef.current - secondsLeft));
    }
    setIsRunning(false);
    setSecondsLeft(activePreset.minutes * 60);
  };

  const handleToggleTimer = () => {
    if (!isRunning && !startedAtRef.current) {
      startedAtRef.current = new Date().toISOString();
      initialDurationRef.current = activePreset.minutes * 60;
      setSaveError(null);
    }
    setIsRunning((previous) => !previous);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <section className="lg:col-span-7 rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 sm:p-8 flex flex-col justify-between gap-6">
          <div>
            <div className="text-xs font-medium text-[#5a45c8] dark:text-[#c4b5fd]">
              Focus & Concentration Center
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold text-[#1b1831] dark:text-[#f3f0fc]">
              Distraction-Free Study Timer
            </h2>

            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Timer presets">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id, preset.minutes)}
                  aria-pressed={selectedPresetId === preset.id}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    selectedPresetId === preset.id
                      ? 'bg-[#e5deff] dark:bg-[#2c214f] text-[#442cb2] dark:text-[#f3f0fc] border border-[#5a45c8]'
                      : 'bg-[#f7f5ff] dark:bg-[#221a3a] text-[#484554] dark:text-[#b0a6cf] border border-[#e5deff] dark:border-[#2e244d]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="py-6 text-center rounded-2xl bg-[#fcfaff] dark:bg-[#221a3a] border border-[#ece6ff] dark:border-[#2e244d]">
            <div
              data-testid="focus-timer-display"
              className="font-mono-tabular text-5xl sm:text-6xl font-bold tracking-tight text-[#1b1831] dark:text-[#f3f0fc]"
            >
              {formatSecondsToTimer(secondsLeft)}
            </div>
            <div className="mt-2 text-xs font-medium text-[#6b6684] dark:text-[#b0a6cf]">
            {isRunning ? 'Focus session running' : 'Ready to start'} · {activePreset.label}
            {' · '}{subjectLabel}
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleToggleTimer}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5a45c8] hover:bg-[#442cb2] text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
              >
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4" aria-hidden="true" />
                    <span>Pause Timer</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" aria-hidden="true" />
                    <span>Start Timer</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleReset}
                aria-label="Reset focus timer"
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-white dark:bg-[#2b204d] text-[#484554] dark:text-[#e9e4f8] hover:bg-[#e5deff] text-sm font-medium transition-colors whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="sv-focus-goal"
              className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
            >
              Current Study Intention
            </label>
            <input
              id="sv-focus-goal"
              type="text"
              value={sessionGoal}
              onChange={(e) => setSessionGoal(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc] focus:outline-none focus:ring-2 focus:ring-[#5a45c8]"
            />
          </div>
        </section>

        <section className="lg:col-span-5 flex flex-col gap-5">
          <div className="rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] overflow-hidden">
            <div className="aspect-video">
              <ImageWithFallback
                src="/src/assets/images/focus_sanctuary_visual_1794676731056.jpg"
                alt="Calm evening study desk with warm lamp and notebook"
                className="w-full h-full object-cover"
                fallbackTitle="Focus Sanctuary"
              />
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[#8f84b3]">Today</div>
                  <div className="mt-1 text-sm font-bold text-[#1b1831] dark:text-[#f3f0fc]">
                    {focusStats.today.completedMinutes} min completed
                  </div>
                  <div className="text-[10px] text-[#6d6483] dark:text-[#b0a6cf]">
                    {focusStats.today.interruptedSessions} interrupted
                  </div>
                </div>
                <div className="rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[#8f84b3]">This week</div>
                  <div className="mt-1 text-sm font-bold text-[#1b1831] dark:text-[#f3f0fc]">
                    {focusStats.week.completedMinutes} min completed
                  </div>
                  <div className="text-[10px] text-[#6d6483] dark:text-[#b0a6cf]">
                    {focusStats.week.interruptedSessions} interrupted
                  </div>
                </div>
              </div>
              {loadError || saveError ? (
                <div role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  {saveError || loadError}
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="font-display text-base font-bold text-[#1b1831] dark:text-[#f3f0fc]">
                  Completed This Session
                </h3>
                <Timer className="w-4 h-4 text-[#5a45c8] dark:text-[#a78bfa]" aria-hidden="true" />
              </div>

              {sessions.length === 0 ? (
                <p className="text-xs text-[#6b6684] dark:text-[#b0a6cf]">
                  No focus sessions have been recorded yet. Completed and interrupted sessions will
                  appear here.
                </p>
              ) : (
                <ul className="space-y-2">
                  {sessions.map((s) => (
                    <li
                      key={s.id}
                      className="p-2.5 rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="font-medium text-[#1b1831] dark:text-[#f3f0fc] truncate">
                        {s.label}
                      </span>
                      <span className="font-mono-tabular text-[#5a45c8] dark:text-[#c4b5fd] shrink-0">
                        {s.minutes} min · {s.completedAt} · {s.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <IntegrationBanner
            serviceName="Supabase"
            title="Study Session Tracking"
            description="Your focus timer runs live in real time. Sign in to your StudyVerse account to keep track of study sessions across devices."
            onNavigate={onNavigate}
            compact
            stacked
          />
        </section>
      </div>
    </div>
  );
}
