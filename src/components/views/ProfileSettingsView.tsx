import { useState } from 'react';
import { Check, PlugZap, Settings } from 'lucide-react';
import { CURRICULUM_CLASSES, INTEGRATION_READINESS, STREAM_OPTIONS } from '../../data/curriculum';
import type { BoardId, GradeLevelId, StreamId, StudentProfile } from '../../types/studyverse';
import { isIntermediateGrade } from '../../utils/curriculumHelpers';

interface ProfileSettingsViewProps {
  profile: StudentProfile;
  onUpdateProfile: (next: StudentProfile) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export function ProfileSettingsView({
  profile,
  onUpdateProfile,
  darkMode,
  onToggleDarkMode,
}: ProfileSettingsViewProps) {
  const [formState, setFormState] = useState<StudentProfile>(profile);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleGradeChange = (gradeId: GradeLevelId) => {
    const streamId: StreamId = isIntermediateGrade(gradeId)
      ? formState.streamId === 'general'
        ? 'mpc'
        : formState.streamId
      : 'general';
    setFormState({ ...formState, gradeId, streamId });
    setSavedFeedback(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(formState);
    setSavedFeedback(true);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="font-display text-lg font-bold text-[#1b1430] dark:text-[#f3f0fc]">
                Student Profile & Academic Preferences
              </h2>
              <p className="text-xs text-[#5b5276] dark:text-[#b0a6cf]">
                Updates apply immediately to your active curriculum and study planner.
              </p>
            </div>
            <Settings className="w-5 h-5 text-[#6d28d9] dark:text-[#a78bfa]" aria-hidden="true" />
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="sv-prof-name"
                  className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
                >
                  Student Name
                </label>
                <input
                  id="sv-prof-name"
                  type="text"
                  value={formState.name}
                  onChange={(e) => {
                    setFormState({ ...formState, name: e.target.value });
                    setSavedFeedback(false);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc]"
                />
              </div>
              <div>
                <label
                  htmlFor="sv-prof-email"
                  className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
                >
                  Student Email
                </label>
                <input
                  id="sv-prof-email"
                  type="email"
                  value={formState.email}
                  onChange={(e) => {
                    setFormState({ ...formState, email: e.target.value });
                    setSavedFeedback(false);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="sv-prof-grade"
                  className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
                >
                  Class / Year
                </label>
                <select
                  id="sv-prof-grade"
                  value={formState.gradeId}
                  onChange={(e) => handleGradeChange(e.target.value as GradeLevelId)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc]"
                >
                  {CURRICULUM_CLASSES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="sv-prof-board"
                  className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
                >
                  Board
                </label>
                <select
                  id="sv-prof-board"
                  value={formState.board}
                  onChange={(e) => {
                    setFormState({ ...formState, board: e.target.value as BoardId });
                    setSavedFeedback(false);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc]"
                >
                  <option value="NCERT / CBSE">NCERT / CBSE</option>
                  <option value="State Board">State Board</option>
                  <option value="Intermediate Board">Intermediate Board</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="sv-prof-goal"
                  className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
                >
                  Daily Goal (min)
                </label>
                <input
                  id="sv-prof-goal"
                  type="number"
                  min={15}
                  max={360}
                  step={15}
                  value={formState.dailyGoalMinutes}
                  onChange={(e) => {
                    setFormState({
                      ...formState,
                      dailyGoalMinutes: Number(e.target.value) || 60,
                    });
                    setSavedFeedback(false);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] font-mono-tabular text-sm text-[#1b1430] dark:text-[#f3f0fc]"
                />
              </div>
            </div>

            {isIntermediateGrade(formState.gradeId) ? (
              <div>
                <label
                  htmlFor="sv-prof-stream"
                  className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
                >
                  Intermediate Stream
                </label>
                <select
                  id="sv-prof-stream"
                  value={formState.streamId}
                  onChange={(e) => {
                    setFormState({ ...formState, streamId: e.target.value as StreamId });
                    setSavedFeedback(false);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc]"
                >
                  {STREAM_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label} — {opt.description}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="sv-prof-gname"
                  className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
                >
                  Parent / Guardian Name
                </label>
                <input
                  id="sv-prof-gname"
                  type="text"
                  value={formState.guardianName}
                  onChange={(e) => {
                    setFormState({ ...formState, guardianName: e.target.value });
                    setSavedFeedback(false);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc]"
                />
              </div>
              <div>
                <label
                  htmlFor="sv-prof-gemail"
                  className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
                >
                  Parent / Guardian Email
                </label>
                <input
                  id="sv-prof-gemail"
                  type="email"
                  value={formState.guardianEmail}
                  onChange={(e) => {
                    setFormState({ ...formState, guardianEmail: e.target.value });
                    setSavedFeedback(false);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc]"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
              >
                <span>Save Session Profile</span>
              </button>

              {savedFeedback ? (
                <span
                  role="status"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#059669] dark:text-[#34d399]"
                >
                  <Check className="w-4 h-4" aria-hidden="true" />
                  <span>Profile updated in current session</span>
                </span>
              ) : null}
            </div>
          </form>
        </section>

        <section className="lg:col-span-5 space-y-5">
          <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-base font-bold text-[#1b1430] dark:text-[#f3f0fc]">
                Appearance Theme
              </h3>
              <p className="text-xs text-[#5b5276] dark:text-[#b0a6cf]">
                Switch between Lavender Light and Deep Plum Dark modes.
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="px-4 py-2 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#f8f6fc] dark:bg-[#221a3a] text-xs font-semibold text-[#5b21b6] dark:text-[#c4b5fd] hover:bg-[#ede9fe] transition-colors whitespace-nowrap cursor-pointer"
            >
              {darkMode ? 'Switch to Light' : 'Switch to Dark'}
            </button>
          </div>

          <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold text-[#1b1430] dark:text-[#f3f0fc]">
                External Service Integrations
              </h3>
              <PlugZap className="w-4 h-4 text-[#6d28d9] dark:text-[#a78bfa]" aria-hidden="true" />
            </div>
            <p className="text-xs text-[#5b5276] dark:text-[#b0a6cf]">
              These services will be connected separately via secure environment configuration.
            </p>

            <div className="space-y-3">
              {INTEGRATION_READINESS.map((svc) => (
                <div
                  key={svc.id}
                  className="p-3.5 rounded-xl bg-[#faf8ff] dark:bg-[#221a3a] border border-[#efeaf9] dark:border-[#2e244d]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[#1b1430] dark:text-[#f3f0fc]">
                      {svc.name}
                    </span>
                    <span className="text-xs font-medium text-[#6d28d9] dark:text-[#c4b5fd]">
                      Not Connected
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf] leading-relaxed">
                    {svc.purpose}
                  </p>
                  <div className="mt-2 font-mono-tabular text-[11px] text-[#776d94] dark:text-[#968cb8]">
                    Env keys: {svc.envVars.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
