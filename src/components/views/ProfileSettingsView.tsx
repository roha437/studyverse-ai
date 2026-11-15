import { useEffect, useState } from 'react';
import { AlertCircle, Check, RefreshCw, Settings, ShieldCheck } from 'lucide-react';
import { CURRICULUM_CLASSES, STREAM_OPTIONS } from '../../data/curriculum';
import type {
  BoardId,
  DatabaseSyncStatus,
  DbOperationResult,
  GradeLevelId,
  StreamId,
  StudentProfile,
} from '../../types/studyverse';
import { isIntermediateGrade } from '../../utils/curriculumHelpers';

interface ProfileSettingsViewProps {
  profile: StudentProfile;
  onUpdateProfile: (next: StudentProfile) => Promise<DbOperationResult<StudentProfile>>;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  authUserEmail?: string | null;
  dbStatus: DatabaseSyncStatus;
  dbError: string | null;
  onRetryDbSync: () => void;
}

export function ProfileSettingsView({
  profile,
  onUpdateProfile,
  darkMode,
  onToggleDarkMode,
  authUserEmail = null,
  dbStatus,
  dbError,
  onRetryDbSync,
}: ProfileSettingsViewProps) {
  const [formState, setFormState] = useState<StudentProfile>(profile);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setFormState(profile);
  }, [profile]);

  const handleGradeChange = (gradeId: GradeLevelId) => {
    const streamId: StreamId = isIntermediateGrade(gradeId)
      ? formState.streamId === 'general'
        ? 'mpc'
        : formState.streamId
      : 'general';
    setFormState({ ...formState, gradeId, streamId });
    setSavedMessage(null);
    setSaveError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMessage(null);
    setSaveError(null);

    const res = await onUpdateProfile(formState);
    setSaving(false);

    if (res.error) {
      setSaveError(res.error);
    } else if (authUserEmail) {
      setSavedMessage('Profile saved to your StudyVerse account');
    } else {
      setSavedMessage('Profile updated in your current preview session');
    }
  };

  const syncStatusLabel = (() => {
    switch (dbStatus) {
      case 'ready':
        return 'Your account is securely connected';
      case 'loading':
        return 'Syncing your study workspace...';
      case 'migrations_required':
      case 'error':
        return 'Cloud sync paused (local mode active)';
      case 'local_preview':
        return 'Preview mode (not signed in)';
      default:
        return 'Local workspace mode';
    }
  })();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="font-display text-lg font-bold text-[#1b1831] dark:text-[#f3f0fc]">
                Student Profile &amp; Academic Preferences
              </h2>
              <p className="text-xs text-[#6b6684] dark:text-[#b0a6cf]">
                {authUserEmail
                  ? 'Changes save directly to your StudyVerse profile and update your active curriculum.'
                  : 'Updates apply immediately to your active curriculum in this session.'}
              </p>
            </div>
            <Settings className="w-5 h-5 text-[#5a45c8] dark:text-[#a78bfa]" aria-hidden="true" />
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="sv-prof-name"
                  className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
                >
                  Student Name
                </label>
                <input
                  id="sv-prof-name"
                  type="text"
                  value={formState.name}
                  onChange={(e) => {
                    setFormState({ ...formState, name: e.target.value });
                    setSavedMessage(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc]"
                />
              </div>
              <div>
                <label
                  htmlFor="sv-prof-email"
                  className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
                >
                  Student Email
                </label>
                <input
                  id="sv-prof-email"
                  type="email"
                  value={formState.email}
                  onChange={(e) => {
                    setFormState({ ...formState, email: e.target.value });
                    setSavedMessage(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="sv-prof-grade"
                  className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
                >
                  Class / Year
                </label>
                <select
                  id="sv-prof-grade"
                  value={formState.gradeId}
                  onChange={(e) => handleGradeChange(e.target.value as GradeLevelId)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc]"
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
                  className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
                >
                  Board
                </label>
                <select
                  id="sv-prof-board"
                  value={formState.board}
                  onChange={(e) => {
                    setFormState({ ...formState, board: e.target.value as BoardId });
                    setSavedMessage(null);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc]"
                >
                  <option value="NCERT / CBSE">NCERT / CBSE</option>
                  <option value="State Board">State Board</option>
                  <option value="Intermediate Board">Intermediate Board</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="sv-prof-goal"
                  className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
                >
                  Daily Goal (min)
                </label>
                <input
                  id="sv-prof-goal"
                  type="number"
                  min={15}
                  max={720}
                  step={15}
                  value={formState.dailyGoalMinutes}
                  onChange={(e) => {
                    setFormState({
                      ...formState,
                      dailyGoalMinutes: Number(e.target.value) || 60,
                    });
                    setSavedMessage(null);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] font-mono-tabular text-sm text-[#1b1831] dark:text-[#f3f0fc]"
                />
              </div>
            </div>

            {isIntermediateGrade(formState.gradeId) ? (
              <div>
                <label
                  htmlFor="sv-prof-stream"
                  className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
                >
                  Intermediate Stream
                </label>
                <select
                  id="sv-prof-stream"
                  value={formState.streamId}
                  onChange={(e) => {
                    setFormState({ ...formState, streamId: e.target.value as StreamId });
                    setSavedMessage(null);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc]"
                >
                  {STREAM_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label} — {opt.description}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label
                  htmlFor="sv-prof-academic-goal"
                  className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
                >
                  Academic Goal
                </label>
                <input
                  id="sv-prof-academic-goal"
                  type="text"
                  value={formState.academicGoal ?? ''}
                  onChange={(e) => {
                    setFormState({ ...formState, academicGoal: e.target.value });
                    setSavedMessage(null);
                  }}
                  placeholder="e.g. Score 95%+ in Board Science & Maths"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc]"
                />
              </div>
              <div>
                <label
                  htmlFor="sv-prof-target-marks"
                  className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
                >
                  Target Marks (%)
                </label>
                <input
                  id="sv-prof-target-marks"
                  type="number"
                  min={0}
                  max={100}
                  value={formState.targetMarks ?? ''}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setFormState({
                      ...formState,
                      targetMarks: val === '' ? null : Number(val),
                    });
                    setSavedMessage(null);
                  }}
                  placeholder="95"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] font-mono-tabular text-sm text-[#1b1831] dark:text-[#f3f0fc]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="sv-prof-exam-date"
                  className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
                >
                  Upcoming Exam Date
                </label>
                <input
                  id="sv-prof-exam-date"
                  type="date"
                  value={formState.examDate ?? ''}
                  onChange={(e) => {
                    setFormState({ ...formState, examDate: e.target.value });
                    setSavedMessage(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc]"
                />
              </div>
              <div>
                <label
                  htmlFor="sv-prof-language"
                  className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
                >
                  Preferred Language
                </label>
                <select
                  id="sv-prof-language"
                  value={formState.preferredLanguage ?? 'English'}
                  onChange={(e) => {
                    setFormState({ ...formState, preferredLanguage: e.target.value });
                    setSavedMessage(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc]"
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Telugu">Telugu</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Bilingual (English + Regional)">Bilingual</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="sv-prof-gname"
                  className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
                >
                  Parent / Guardian Name
                </label>
                <input
                  id="sv-prof-gname"
                  type="text"
                  value={formState.guardianName}
                  onChange={(e) => {
                    setFormState({ ...formState, guardianName: e.target.value });
                    setSavedMessage(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc]"
                />
              </div>
              <div>
                <label
                  htmlFor="sv-prof-gemail"
                  className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
                >
                  Parent / Guardian Email
                </label>
                <input
                  id="sv-prof-gemail"
                  type="email"
                  value={formState.guardianEmail}
                  onChange={(e) => {
                    setFormState({ ...formState, guardianEmail: e.target.value });
                    setSavedMessage(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc]"
                />
              </div>
            </div>

            {saveError ? (
              <div
                role="alert"
                className="p-3 rounded-xl bg-[#fef2f2] dark:bg-[#3b151a] border border-[#fecaca] dark:border-[#7f1d1d] text-xs text-[#b91c1c] dark:text-[#fca5a5] flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{saveError}</span>
              </div>
            ) : null}

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5a45c8] hover:bg-[#442cb2] disabled:opacity-60 text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
              >
                <span>{saving ? 'Saving...' : 'Save Profile'}</span>
              </button>

              {savedMessage ? (
                <span
                  role="status"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#059669] dark:text-[#34d399]"
                >
                  <Check className="w-4 h-4" aria-hidden="true" />
                  <span>{savedMessage}</span>
                </span>
              ) : null}
            </div>
          </form>
        </section>

        <section className="lg:col-span-5 space-y-5">
          <div className="rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-base font-bold text-[#1b1831] dark:text-[#f3f0fc]">
                Appearance Theme
              </h3>
              <p className="text-xs text-[#6b6684] dark:text-[#b0a6cf]">
                Switch between Lavender Light and Deep Plum Dark modes.
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="px-4 py-2 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#f7f5ff] dark:bg-[#221a3a] text-xs font-semibold text-[#442cb2] dark:text-[#c4b5fd] hover:bg-[#e5deff] transition-colors whitespace-nowrap cursor-pointer"
            >
              {darkMode ? 'Switch to Light' : 'Switch to Dark'}
            </button>
          </div>

          <div className="rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#5a45c8] dark:text-[#a78bfa]" aria-hidden="true" />
                <h3 className="font-display text-base font-bold text-[#1b1831] dark:text-[#f3f0fc]">
                  StudyVerse Account
                </h3>
              </div>
              <span
                className={`text-xs font-semibold ${
                  dbStatus === 'ready'
                    ? 'text-[#059669] dark:text-[#34d399]'
                    : 'text-[#5a45c8] dark:text-[#c4b5fd]'
                }`}
              >
                {authUserEmail ? 'Signed In' : 'Preview Mode'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] border border-[#ece6ff] dark:border-[#2e244d] space-y-2 text-xs text-[#6b6684] dark:text-[#b0a6cf]">
              <div>
                <span className="font-medium text-[#1b1831] dark:text-[#f3f0fc]">Account: </span>
                {authUserEmail ?? 'Guest preview session'}
              </div>
              <div>
                <span className="font-medium text-[#1b1831] dark:text-[#f3f0fc]">Status: </span>
                {syncStatusLabel}
              </div>
              <p className="leading-relaxed pt-1">
                {authUserEmail
                  ? 'Your profile preferences, study plans, saved notes, bookmarks, and quiz scores belong exclusively to your account.'
                  : 'Sign in or create a StudyVerse student account from the profile menu to save your progress across sessions.'}
              </p>
            </div>

            {authUserEmail && dbStatus === 'error' && dbError ? (
              <div className="p-3.5 rounded-xl bg-[#fffbeb] dark:bg-[#2f2310] border border-[#fde68a] dark:border-[#78350f] text-xs text-[#92400e] dark:text-[#fcd34d] space-y-2">
                <p className="leading-relaxed">{dbError}</p>
                <button
                  type="button"
                  onClick={onRetryDbSync}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#1b1831] border border-[#fde68a] dark:border-[#78350f] font-semibold cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Retry Sync</span>
                </button>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
