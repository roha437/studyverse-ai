import { useState } from 'react';
import { ArrowLeft, ArrowRight, GraduationCap, KeyRound, ShieldCheck } from 'lucide-react';
import { CURRICULUM_CLASSES, STREAM_OPTIONS } from '../../data/curriculum';
import type { BoardId, GradeLevelId, StreamId, StudentProfile, UserRole } from '../../types/studyverse';
import { isIntermediateGrade, validateOnboardingProfile } from '../../utils/curriculumHelpers';
import { isSupabaseConfigured, supabase } from '../../utils/supabase';
import {
  formatAuthErrorMessage,
  mergeProfileFromSupabaseUser,
  validatePasswordUpdate,
  validateSignupCredentials,
} from '../../utils/supabaseHelpers';
import { upsertUserProfile } from '../../utils/studyverseDb';
import { ImageWithFallback } from '../common/ImageWithFallback';

interface AuthOnboardingViewProps {
  initialProfile: StudentProfile;
  onCompleteOnboarding: (profile: StudentProfile, role: UserRole) => void;
  isPasswordRecovery?: boolean;
  onCompletePasswordRecovery?: () => void;
}

const BOARDS: BoardId[] = ['NCERT / CBSE', 'State Board', 'Intermediate Board'];

export function AuthOnboardingView({
  initialProfile,
  onCompleteOnboarding,
  isPasswordRecovery = false,
  onCompletePasswordRecovery,
}: AuthOnboardingViewProps) {
  const [authMode, setAuthMode] = useState<'onboarding' | 'signin' | 'forgot'>('onboarding');
  const [role, setRole] = useState<UserRole>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gradeId, setGradeId] = useState<GradeLevelId>(initialProfile.gradeId);
  const [streamId, setStreamId] = useState<StreamId>(initialProfile.streamId);
  const [board, setBoard] = useState<BoardId>(initialProfile.board);
  const [guardianName, setGuardianName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSwitchMode = (nextMode: 'onboarding' | 'signin' | 'forgot') => {
    setAuthMode(nextMode);
    setErrorMsg(null);
    setStatusNotice(null);
  };

  const handlePasswordRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusNotice(null);

    const check = validatePasswordUpdate({ password, confirmPassword });
    if (!check.valid) {
      setErrorMsg(check.error);
      return;
    }

    if (!supabase) {
      setErrorMsg('Account services are unavailable right now.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (error) {
      setErrorMsg(formatAuthErrorMessage(error.message));
      return;
    }

    setPassword('');
    setConfirmPassword('');
    setStatusNotice('Your password has been updated. Entering your StudyVerse workspace...');
    if (onCompletePasswordRecovery) {
      onCompletePasswordRecovery();
    } else {
      handleSwitchMode('signin');
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusNotice(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('Enter the email address registered with your StudyVerse account.');
      return;
    }

    if (!supabase) {
      setErrorMsg('Password reset is unavailable right now. Please try again later.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    });
    setIsSubmitting(false);

    if (error) {
      setErrorMsg(formatAuthErrorMessage(error.message));
      return;
    }

    setStatusNotice(
      `If an account exists for ${trimmedEmail}, we have sent a password reset link to your inbox.`
    );
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setStatusNotice(null);

    if (!supabase) {
      setErrorMsg('Google sign-in is unavailable right now.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });
    setIsSubmitting(false);

    if (error) {
      setErrorMsg(
        'Google sign-in is not available right now. Please sign in with your email and password or continue without an account.'
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusNotice(null);

    if (authMode === 'signin') {
      if (!email.trim()) {
        setErrorMsg('Enter your registered email address to sign in.');
        return;
      }
      if (!password.trim()) {
        setErrorMsg('Enter your password to sign in to your StudyVerse account.');
        return;
      }
      if (!supabase) {
        setErrorMsg('Account sign-in is currently unavailable. Use "Continue Without Account" to preview StudyVerse.');
        return;
      }

      setIsSubmitting(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setIsSubmitting(false);

      if (error) {
        setErrorMsg(formatAuthErrorMessage(error.message));
        return;
      }
      if (data.user) {
        const hydrated = mergeProfileFromSupabaseUser(
          initialProfile,
          data.user.email,
          data.user.user_metadata
        );
        onCompleteOnboarding(hydrated, role);
      }
      return;
    }

    const validation = validateOnboardingProfile({ name, gradeId, streamId });
    if (!validation.valid) {
      setErrorMsg(validation.errors.name || validation.errors.streamId || 'Please check your details.');
      return;
    }

    const credCheck = validateSignupCredentials({ email, password, confirmPassword });
    if (!credCheck.valid) {
      setErrorMsg(credCheck.error);
      return;
    }

    const nextProfile: StudentProfile = {
      ...initialProfile,
      name: name.trim(),
      email: email.trim(),
      gradeId,
      streamId,
      board,
      guardianName: guardianName.trim() || 'Parent / Guardian',
    };

    if (!supabase) {
      onCompleteOnboarding(nextProfile, role);
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        data: {
          name: nextProfile.name,
          full_name: nextProfile.name,
          gradeId: nextProfile.gradeId,
          class_level: nextProfile.gradeId,
          streamId: nextProfile.streamId,
          stream: nextProfile.streamId,
          board: nextProfile.board,
          curriculum_board: nextProfile.board,
          dailyGoalMinutes: nextProfile.dailyGoalMinutes,
          daily_study_minutes: nextProfile.dailyGoalMinutes,
          guardianName: nextProfile.guardianName,
          guardian_name: nextProfile.guardianName,
          guardianEmail: nextProfile.guardianEmail,
          preferred_language: nextProfile.preferredLanguage ?? 'English',
        },
      },
    });

    if (error) {
      setIsSubmitting(false);
      setErrorMsg(formatAuthErrorMessage(error.message));
      return;
    }

    if (data.user && data.session) {
      await upsertUserProfile(data.user.id, nextProfile);
      setIsSubmitting(false);
      onCompleteOnboarding(nextProfile, role);
      return;
    }

    setIsSubmitting(false);
    setStatusNotice(
      'Your StudyVerse student account has been created! Please check your email to confirm your address, or click "Continue Without Account" below to explore right away.'
    );
  };

  const handleLocalPreviewEntry = () => {
    setErrorMsg(null);
    const safeName = name.trim() || initialProfile.name;
    const validation = validateOnboardingProfile({
      name: safeName,
      gradeId,
      streamId,
    });
    if (!validation.valid) {
      setErrorMsg(validation.errors.name || validation.errors.streamId || 'Please check your class selection.');
      return;
    }
    onCompleteOnboarding(
      {
        ...initialProfile,
        name: safeName,
        email: email.trim() || initialProfile.email,
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
              daily focus sessions from one cohesive StudyVerse workspace.
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
              {isSupabaseConfigured
                ? 'Your account is securely connected. Save your class progress, notes, study plans, and quiz history across devices.'
                : 'StudyVerse Learning Workspace — customize your class, track study plans, and practice textbook topics.'}
            </span>
          </div>
        </div>

        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
          {isPasswordRecovery ? (
            <form onSubmit={handlePasswordRecoverySubmit} className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#ede9fe] dark:bg-[#2c214f] text-[#6d28d9] dark:text-[#c4b5fd] flex items-center justify-center">
                  <KeyRound className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-[#1b1430] dark:text-[#f3f0fc]">
                    Set a New Password
                  </h2>
                  <p className="text-xs text-[#5b5276] dark:text-[#b0a6cf]">
                    Choose a strong password for your StudyVerse account.
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="sv-recovery-password"
                  className="block text-sm font-medium text-[#1b1430] dark:text-[#e9e4f8] mb-1.5"
                >
                  New Password
                </label>
                <input
                  id="sv-recovery-password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="At least 6 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-white dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc] focus:outline-none focus:ring-2 focus:ring-[#6d28d9]"
                />
              </div>

              <div>
                <label
                  htmlFor="sv-recovery-confirm"
                  className="block text-sm font-medium text-[#1b1430] dark:text-[#e9e4f8] mb-1.5"
                >
                  Confirm New Password
                </label>
                <input
                  id="sv-recovery-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="Re-enter your new password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-white dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc] focus:outline-none focus:ring-2 focus:ring-[#6d28d9]"
                />
              </div>

              {statusNotice ? (
                <p className="text-sm text-[#6d28d9] dark:text-[#c4b5fd] font-medium" role="status">
                  {statusNotice}
                </p>
              ) : null}

              {errorMsg ? (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-[#fef2f2] dark:bg-[#3b151a] border border-[#fecaca] dark:border-[#7f1d1d] text-sm text-[#b91c1c] dark:text-[#fca5a5]"
                >
                  {errorMsg}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] disabled:opacity-60 text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
              >
                <span>{isSubmitting ? 'Updating...' : 'Update Password'}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div
                  className="inline-flex p-1 rounded-xl bg-[#f3effb] dark:bg-[#221a3a] border border-[#e5dff4] dark:border-[#2e244d]"
                  role="tablist"
                  aria-label="Account mode"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={authMode === 'onboarding'}
                    onClick={() => handleSwitchMode('onboarding')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      authMode === 'onboarding'
                        ? 'bg-white dark:bg-[#322657] text-[#5b21b6] dark:text-[#f3f0fc] shadow-xs'
                        : 'text-[#5b5276] dark:text-[#b0a6cf]'
                    }`}
                  >
                    Create Student Account
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={authMode === 'signin' || authMode === 'forgot'}
                    onClick={() => handleSwitchMode('signin')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      authMode === 'signin' || authMode === 'forgot'
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

              {authMode === 'forgot' ? (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  <div>
                    <h2 className="font-display text-lg font-bold text-[#1b1430] dark:text-[#f3f0fc]">
                      Reset Your StudyVerse Password
                    </h2>
                    <p className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf]">
                      Enter your account email and we will send you a secure reset link.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="sv-forgot-email"
                      className="block text-sm font-medium text-[#1b1430] dark:text-[#e9e4f8] mb-1.5"
                    >
                      Registered Email Address
                    </label>
                    <input
                      id="sv-forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErrorMsg(null);
                        setStatusNotice(null);
                      }}
                      placeholder="student@studyverse.edu"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-white dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc] focus:outline-none focus:ring-2 focus:ring-[#6d28d9]"
                    />
                  </div>

                  {statusNotice ? (
                    <div
                      role="status"
                      className="p-3 rounded-xl bg-[#f5f2ff] dark:bg-[#221a3a] border border-[#ddd6fe] dark:border-[#372a5c] text-sm text-[#5b21b6] dark:text-[#c4b5fd]"
                    >
                      {statusNotice}
                    </div>
                  ) : null}

                  {errorMsg ? (
                    <div
                      role="alert"
                      className="p-3 rounded-xl bg-[#fef2f2] dark:bg-[#3b151a] border border-[#fecaca] dark:border-[#7f1d1d] text-sm text-[#b91c1c] dark:text-[#fca5a5]"
                    >
                      {errorMsg}
                    </div>
                  ) : null}

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] disabled:opacity-60 text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <span>{isSubmitting ? 'Sending Link...' : 'Send Reset Link'}</span>
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSwitchMode('signin')}
                        className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] text-xs font-semibold text-[#4c4366] dark:text-[#c4b5fd] hover:bg-[#f5f2ff] dark:hover:bg-[#221a3a] transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Back to Sign In</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleLocalPreviewEntry}
                      className="text-xs font-semibold text-[#6d28d9] dark:text-[#c4b5fd] hover:underline cursor-pointer"
                    >
                      Continue Without Account
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
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
                            onChange={(e) => {
                              setEmail(e.target.value);
                              setErrorMsg(null);
                            }}
                            placeholder="student@studyverse.edu"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-white dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc] focus:outline-none focus:ring-2 focus:ring-[#6d28d9]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label
                            htmlFor="sv-onboard-password"
                            className="block text-sm font-medium text-[#1b1430] dark:text-[#e9e4f8] mb-1.5"
                          >
                            Password
                          </label>
                          <input
                            id="sv-onboard-password"
                            type="password"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              setErrorMsg(null);
                            }}
                            placeholder="At least 6 characters"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-white dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc] focus:outline-none focus:ring-2 focus:ring-[#6d28d9]"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="sv-onboard-confirm-password"
                            className="block text-sm font-medium text-[#1b1430] dark:text-[#e9e4f8] mb-1.5"
                          >
                            Confirm Password
                          </label>
                          <input
                            id="sv-onboard-confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => {
                              setConfirmPassword(e.target.value);
                              setErrorMsg(null);
                            }}
                            placeholder="Re-enter your password"
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
                                className={`px-3 py-2 rounded-xl border text-sm font-medium text-center transition-colors cursor-pointer whitespace-nowrap ${
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
                          Email Address
                        </label>
                        <input
                          id="sv-signin-email"
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setStatusNotice(null);
                            setErrorMsg(null);
                          }}
                          placeholder="student@studyverse.edu"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-white dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc] focus:outline-none focus:ring-2 focus:ring-[#6d28d9]"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <label
                            htmlFor="sv-signin-password"
                            className="block text-sm font-medium text-[#1b1430] dark:text-[#e9e4f8]"
                          >
                            Password
                          </label>
                          <button
                            type="button"
                            onClick={() => handleSwitchMode('forgot')}
                            className="text-xs font-semibold text-[#6d28d9] dark:text-[#c4b5fd] hover:underline cursor-pointer"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <input
                          id="sv-signin-password"
                          type="password"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setErrorMsg(null);
                          }}
                          placeholder="Enter your StudyVerse password"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-white dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc] focus:outline-none focus:ring-2 focus:ring-[#6d28d9]"
                        />
                      </div>

                      <div className="pt-1">
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => void handleGoogleSignIn()}
                          className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] hover:bg-[#f3effb] dark:hover:bg-[#2a2048] text-sm font-medium text-[#1b1430] dark:text-[#f3f0fc] transition-colors cursor-pointer"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                          </svg>
                          <span>Continue with Google</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {statusNotice ? (
                    <div
                      role="status"
                      className="p-3 rounded-xl bg-[#f5f2ff] dark:bg-[#221a3a] border border-[#ddd6fe] dark:border-[#372a5c] text-sm text-[#5b21b6] dark:text-[#c4b5fd]"
                    >
                      {statusNotice}
                    </div>
                  ) : null}

                  {errorMsg ? (
                    <div
                      role="alert"
                      className="p-3 rounded-xl bg-[#fef2f2] dark:bg-[#3b151a] border border-[#fecaca] dark:border-[#7f1d1d] text-sm text-[#b91c1c] dark:text-[#fca5a5]"
                    >
                      {errorMsg}
                    </div>
                  ) : null}

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] disabled:opacity-60 text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <span>
                          {isSubmitting
                            ? 'Please wait...'
                            : authMode === 'signin'
                              ? 'Sign In'
                              : role === 'parent'
                                ? 'Create Parent Account'
                                : 'Create Student Account'}
                        </span>
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={handleLocalPreviewEntry}
                        className="px-4 py-3 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] text-xs font-semibold text-[#4c4366] dark:text-[#c4b5fd] hover:bg-[#f5f2ff] dark:hover:bg-[#221a3a] transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Continue Without Account
                      </button>
                    </div>

                    <span className="text-xs text-[#776d94] dark:text-[#968cb8]">
                      Classes 5–10 &amp; Intermediate 1st–2nd Year
                    </span>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
