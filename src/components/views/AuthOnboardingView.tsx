import { useState } from 'react';
import { ArrowRight, GraduationCap, ShieldCheck } from 'lucide-react';
import { CURRICULUM_CLASSES, STREAM_OPTIONS } from '../../data/curriculum';
import type { BoardId, GradeLevelId, StreamId, StudentProfile, UserRole } from '../../types/studyverse';
import { isIntermediateGrade, validateOnboardingProfile } from '../../utils/curriculumHelpers';
import { ImageWithFallback } from '../common/ImageWithFallback';

interface AuthOnboardingViewProps {
  initialProfile: StudentProfile;
  onCompleteOnboarding: (profile: StudentProfile, role: UserRole) => void;
}

const BOARDS: BoardId[] = ['NCERT / CBSE', 'State Board', 'Intermediate Board'];

export function AuthOnboardingView({
  initialProfile,
  onCompleteOnboarding,
}: AuthOnboardingViewProps) {
  const [authMode, setAuthMode] = useState<'onboarding' | 'signin'>('onboarding');
  const [role, setRole] = useState<UserRole>('student');
  const [name, setName] = useState(initialProfile.name);
  const [email, setEmail] = useState(initialProfile.email);
  const [gradeId, setGradeId] = useState<GradeLevelId>(initialProfile.gradeId);
  const [streamId, setStreamId] = useState<StreamId>(initialProfile.streamId);
  const [board, setBoard] = useState<BoardId>(initialProfile.board);
  const [guardianName, setGuardianName] = useState(initialProfile.guardianName);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [signinNotice, setSigninNotice] = useState<string | null>(null);

  const handleGradeChange = (nextGrade: GradeLevelId) => {
    setGradeId(nextGrade);
    if (!isIntermediateGrade(nextGrade)) {
      setStreamId('general');
    } else if (streamId === 'general') {
      setStreamId('mpc');
      setBoard('Intermediate Board');
    }
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'signin') {
      if (!email.trim()) {
        setSigninNotice('Enter your registered email address to continue.');
        return;
      }
      setSigninNotice(
        'Supabase Auth is not connected yet. Entering local workspace preview with your selected profile.'
      );
      onCompleteOnboarding(
        {
          ...initialProfile,
          name: name.trim() || 'Student',
          email: email.trim(),
          gradeId,
          streamId,
          board,
          guardianName,
        },
        role
      );
      return;
    }

    const validation = validateOnboardingProfile({ name, gradeId, streamId });
    if (!validation.valid) {
      setErrorMsg(validation.errors.name || validation.errors.streamId || 'Please check fields.');
      return;
    }

    setErrorMsg(null);
    onCompleteOnboarding(
      {
        ...initialProfile,
        name: name.trim(),
        email: email.trim(),
        gradeId,
        streamId,
        board,
        guardianName: guardianName.trim() || 'Parent / Guardian',
      },
      role
    );
  };

  return (
    <div className="min-h-screen bg-[#f8f6fc] dark:bg-[#110d1e] flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-6xl rounded-3xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch shadow-sm">
        <div className="lg:col-span-5 bg-[#f3effb] dark:bg-[#21183d] p-6 sm:p-8 lg:p-10 flex flex-col justify-between gap-6 border-b lg:border-b-0 lg:border-r border-[#e5dff4] dark:border-[#2e244d]">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-[#6d28d9] text-white flex items-center justify-center">
                <GraduationCap className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className="font-display text-xl font-bold text-[#1b1430] dark:text-[#f3f0fc]">
                StudyVerse
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1b1430] dark:text-[#f3f0fc] text-balance leading-tight">
              Structured AI learning for{' '}
              <span className="whitespace-nowrap">Classes 5–10</span> &amp; Intermediate
            </h1>
            <p className="mt-3 text-sm sm:text-base text-[#5b5276] dark:text-[#b0a6cf] leading-relaxed">
              Explore textbook-aligned chapters, review earlier classes, practice numericals, and track
              daily focus sessions from one cohesive workspace.
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden border border-[#e5dff4] dark:border-[#372a5c] aspect-video">
            <ImageWithFallback
              src="/src/assets/images/studyverse_hero_banner_1794676730762.jpg"
              alt="StudyVerse open textbook and geometric learning illustration"
              className="w-full h-full object-cover"
              fallbackTitle="StudyVerse Academic Workspace"
            />
          </div>

          <div className="flex items-start gap-2.5 text-xs text-[#5b5276] dark:text-[#b0a6cf]">
            <ShieldCheck className="w-4 h-4 text-[#6d28d9] dark:text-[#a78bfa] shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Foundation mode active: Supabase Auth, Gemini API, and YouTube Data API connect
              cleanly via Settings without placeholder responses.
            </span>
          </div>
        </div>

        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div
              className="inline-flex p-1 rounded-xl bg-[#f3effb] dark:bg-[#221a3a] border border-[#e5dff4] dark:border-[#2e244d]"
              role="tablist"
              aria-label="Authentication mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'onboarding'}
                onClick={() => setAuthMode('onboarding')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  authMode === 'onboarding'
                    ? 'bg-white dark:bg-[#322657] text-[#5b21b6] dark:text-[#f3f0fc] shadow-xs'
                    : 'text-[#5b5276] dark:text-[#b0a6cf]'
                }`}
              >
                Student Onboarding
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'signin'}
                onClick={() => setAuthMode('signin')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  authMode === 'signin'
                    ? 'bg-white dark:bg-[#322657] text-[#5b21b6] dark:text-[#f3f0fc] shadow-xs'
                    : 'text-[#5b5276] dark:text-[#b0a6cf]'
                }`}
              >
                Sign In
              </button>
            </div>

            <div className="inline-flex p-1 rounded-xl bg-[#f3effb] dark:bg-[#221a3a] border border-[#e5dff4] dark:border-[#2e244d]">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  role === 'student'
                    ? 'bg-white dark:bg-[#322657] text-[#5b21b6] dark:text-[#f3f0fc]'
                    : 'text-[#5b5276] dark:text-[#b0a6cf]'
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setRole('parent')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  role === 'parent'
                    ? 'bg-white dark:bg-[#322657] text-[#5b21b6] dark:text-[#f3f0fc]'
                    : 'text-[#5b5276] dark:text-[#b0a6cf]'
                }`}
              >
                Parent / Guardian
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {authMode === 'onboarding' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="sv-student-name"
                      className="block text-sm font-medium text-[#1b1430] dark:text-[#e9e4f8] mb-1.5"
                    >
                      Student Full Name
                    </label>
                    <input
                      id="sv-student-name"
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setErrorMsg(null);
                      }}
                      placeholder="e.g. Ananya Sharma"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-white dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc] focus:outline-none focus:ring-2 focus:ring-[#6d28d9]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="sv-student-email"
                      className="block text-sm font-medium text-[#1b1430] dark:text-[#e9e4f8] mb-1.5"
                    >
                      Email Address
                    </label>
                    <input
                      id="sv-student-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@studyverse.edu"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-white dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc] focus:outline-none focus:ring-2 focus:ring-[#6d28d9]"
                    />
                  </div>
                </div>

                <div>
                  <span className="block text-sm font-medium text-[#1b1430] dark:text-[#e9e4f8] mb-2">
                    Select Current Class / Year
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {CURRICULUM_CLASSES.map((cls) => {
                      const selected = gradeId === cls.id;
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => handleGradeChange(cls.id)}
                          aria-pressed={selected}
                          className={`px-3 py-2.5 rounded-xl border text-sm font-medium text-center transition-colors cursor-pointer whitespace-nowrap ${
                            selected
                              ? 'bg-[#6d28d9] border-[#6d28d9] text-white'
                              : 'bg-white dark:bg-[#221a3a] border-[#e5dff4] dark:border-[#372a5c] text-[#4c4366] dark:text-[#c4b5fd] hover:bg-[#f5f2ff] dark:hover:bg-[#2a2048]'
                          }`}
                        >
                          {cls.shortLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {isIntermediateGrade(gradeId) ? (
                  <div>
                    <span className="block text-sm font-medium text-[#1b1430] dark:text-[#e9e4f8] mb-2">
                      Intermediate Stream
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {STREAM_OPTIONS.map((opt) => {
                        const selected = streamId === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setStreamId(opt.id);
                              setErrorMsg(null);
                            }}
                            aria-pressed={selected}
                            className={`px-3 py-2 rounded-xl border text-left transition-colors cursor-pointer ${
                              selected
                                ? 'bg-[#ede9fe] dark:bg-[#322657] border-[#6d28d9] text-[#5b21b6] dark:text-[#f3f0fc]'
                                : 'bg-white dark:bg-[#221a3a] border-[#e5dff4] dark:border-[#372a5c] text-[#4c4366] dark:text-[#b0a6cf]'
                            }`}
                          >
                            <div className="text-sm font-semibold">{opt.label}</div>
                            <div className="text-xs opacity-80 truncate">{opt.description}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="sv-board"
                      className="block text-sm font-medium text-[#1b1430] dark:text-[#e9e4f8] mb-1.5"
                    >
                      Curriculum Board
                    </label>
                    <select
                      id="sv-board"
                      value={board}
                      onChange={(e) => setBoard(e.target.value as BoardId)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-white dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc] focus:outline-none focus:ring-2 focus:ring-[#6d28d9]"
                    >
                      {BOARDS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="sv-guardian"
                      className="block text-sm font-medium text-[#1b1430] dark:text-[#e9e4f8] mb-1.5"
                    >
                      Parent / Guardian Name (Optional)
                    </label>
                    <input
                      id="sv-guardian"
                      type="text"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-white dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc] focus:outline-none focus:ring-2 focus:ring-[#6d28d9]"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="sv-signin-email"
                    className="block text-sm font-medium text-[#1b1430] dark:text-[#e9e4f8] mb-1.5"
                  >
                    Account Email
                  </label>
                  <input
                    id="sv-signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setSigninNotice(null);
                    }}
                    placeholder="student@studyverse.edu"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-white dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc] focus:outline-none focus:ring-2 focus:ring-[#6d28d9]"
                  />
                </div>
                <p className="text-xs text-[#5b5276] dark:text-[#b0a6cf]">
                  Supabase authentication will verify credentials once connected. For now, signing in
                  opens the StudyVerse workspace directly.
                </p>
                {signinNotice ? (
                  <p className="text-sm text-[#6d28d9] dark:text-[#c4b5fd] font-medium" role="status">
                    {signinNotice}
                  </p>
                ) : null}
              </div>
            )}

            {errorMsg ? (
              <div
                role="alert"
                className="p-3 rounded-xl bg-[#fef2f2] dark:bg-[#3b151a] border border-[#fecaca] dark:border-[#7f1d1d] text-sm text-[#b91c1c] dark:text-[#fca5a5]"
              >
                {errorMsg}
              </div>
            ) : null}

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
              >
                <span>
                  {role === 'parent' ? 'Enter Parent Portal' : 'Enter StudyVerse Workspace'}
                </span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <span className="text-xs text-[#776d94] dark:text-[#968cb8]">
                Classes 5–10 & Intermediate 1st–2nd Year
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
