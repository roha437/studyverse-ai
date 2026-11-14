import { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, Timer } from 'lucide-react';
import type { FocusSessionRecord, NavModuleId } from '../../types/studyverse';
import { formatSecondsToTimer } from '../../utils/curriculumHelpers';
import { ImageWithFallback } from '../common/ImageWithFallback';
import { IntegrationBanner } from '../common/IntegrationBanner';

interface FocusCenterViewProps {
  sessions: FocusSessionRecord[];
  onLogFocusSession: (label: string, minutes: number) => void;
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
  onLogFocusSession,
  onNavigate,
}: FocusCenterViewProps) {
  const [selectedPresetId, setSelectedPresetId] = useState('pomodoro');
  const [sessionGoal, setSessionGoal] = useState('Complete chapter review without distractions');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  const activePreset = PRESETS.find((p) => p.id === selectedPresetId) ?? PRESETS[0];

  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          onLogFocusSession(sessionGoal || activePreset.label, activePreset.minutes);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning, activePreset.label, activePreset.minutes, onLogFocusSession, sessionGoal]);

  const handleSelectPreset = (presetId: string, minutes: number) => {
    setIsRunning(false);
    setSelectedPresetId(presetId);
    setSecondsLeft(minutes * 60);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSecondsLeft(activePreset.minutes * 60);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <section className="lg:col-span-7 rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 sm:p-8 flex flex-col justify-between gap-6">
          <div>
            <div className="text-xs font-medium text-[#6d28d9] dark:text-[#c4b5fd]">
              Focus & Concentration Center
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold text-[#1b1430] dark:text-[#f3f0fc]">
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
                      ? 'bg-[#ede9fe] dark:bg-[#2c214f] text-[#5b21b6] dark:text-[#f3f0fc] border border-[#6d28d9]'
                      : 'bg-[#f8f6fc] dark:bg-[#221a3a] text-[#4c4366] dark:text-[#b0a6cf] border border-[#e5dff4] dark:border-[#2e244d]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="py-6 text-center rounded-2xl bg-[#faf8ff] dark:bg-[#221a3a] border border-[#efeaf9] dark:border-[#2e244d]">
            <div
              data-testid="focus-timer-display"
              className="font-mono-tabular text-5xl sm:text-6xl font-bold tracking-tight text-[#1b1430] dark:text-[#f3f0fc]"
            >
              {formatSecondsToTimer(secondsLeft)}
            </div>
            <div className="mt-2 text-xs font-medium text-[#5b5276] dark:text-[#b0a6cf]">
              {isRunning ? 'Focus session running' : 'Ready to start'} · {activePreset.label}
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsRunning((prev) => !prev)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
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
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-white dark:bg-[#2b204d] text-[#4c4366] dark:text-[#e9e4f8] hover:bg-[#ede9fe] text-sm font-medium transition-colors whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="sv-focus-goal"
              className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
            >
              Current Study Intention
            </label>
            <input
              id="sv-focus-goal"
              type="text"
              value={sessionGoal}
              onChange={(e) => setSessionGoal(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc] focus:outline-none focus:ring-2 focus:ring-[#6d28d9]"
            />
          </div>
        </section>

        <section className="lg:col-span-5 flex flex-col gap-5">
          <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] overflow-hidden">
            <div className="aspect-video">
              <ImageWithFallback
                src="/src/assets/images/focus_sanctuary_visual_1794676731056.jpg"
                alt="Calm evening study desk with warm lamp and notebook"
                className="w-full h-full object-cover"
                fallbackTitle="Focus Sanctuary"
              />
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="font-display text-base font-bold text-[#1b1430] dark:text-[#f3f0fc]">
                  Completed This Session
                </h3>
                <Timer className="w-4 h-4 text-[#6d28d9] dark:text-[#a78bfa]" aria-hidden="true" />
              </div>

              {sessions.length === 0 ? (
                <p className="text-xs text-[#5b5276] dark:text-[#b0a6cf]">
                  No focus blocks completed in this browser session yet. Complete a timer cycle to
                  log it here.
                </p>
              ) : (
                <ul className="space-y-2">
                  {sessions.map((s) => (
                    <li
                      key={s.id}
                      className="p-2.5 rounded-xl bg-[#faf8ff] dark:bg-[#221a3a] flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="font-medium text-[#1b1430] dark:text-[#f3f0fc] truncate">
                        {s.label}
                      </span>
                      <span className="font-mono-tabular text-[#6d28d9] dark:text-[#c4b5fd] shrink-0">
                        {s.minutes} min · {s.completedAt}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <IntegrationBanner
            serviceName="Supabase"
            title="Long-Term Streak Sync Ready"
            description="Timer countdown works locally in real time. Connect Supabase to persist daily study hours across devices."
            onNavigate={onNavigate}
            compact
            stacked
          />
        </section>
      </div>
    </div>
  );
}
