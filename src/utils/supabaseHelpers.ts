import type { BoardId, GradeLevelId, StreamId, StudentProfile } from '../types/studyverse';

const VALID_GRADES: GradeLevelId[] = [
  'class-5',
  'class-6',
  'class-7',
  'class-8',
  'class-9',
  'class-10',
  'inter-1',
  'inter-2',
];

const VALID_STREAMS: StreamId[] = ['general', 'mpc', 'bipc', 'cec', 'mec'];
const VALID_BOARDS: BoardId[] = ['NCERT / CBSE', 'State Board', 'Intermediate Board'];

export function isSupabaseEnvConfigured(url?: string, key?: string): boolean {
  return Boolean(url && url.trim().startsWith('http') && key && key.trim().length > 10);
}

export function extractSupabaseHost(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function mergeProfileFromSupabaseUser(
  fallback: StudentProfile,
  email: string | undefined,
  metadata: Record<string, unknown> | undefined
): StudentProfile {
  const meta = metadata ?? {};
  const rawGrade = typeof meta.gradeId === 'string' ? meta.gradeId : fallback.gradeId;
  const gradeId = VALID_GRADES.includes(rawGrade as GradeLevelId)
    ? (rawGrade as GradeLevelId)
    : fallback.gradeId;

  const rawStream = typeof meta.streamId === 'string' ? meta.streamId : fallback.streamId;
  const streamId = VALID_STREAMS.includes(rawStream as StreamId)
    ? (rawStream as StreamId)
    : fallback.streamId;

  const rawBoard = typeof meta.board === 'string' ? meta.board : fallback.board;
  const board = VALID_BOARDS.includes(rawBoard as BoardId)
    ? (rawBoard as BoardId)
    : fallback.board;

  return {
    name:
      typeof meta.name === 'string' && meta.name.trim().length > 0
        ? meta.name.trim()
        : fallback.name,
    email: email && email.trim().length > 0 ? email.trim() : fallback.email,
    gradeId,
    streamId,
    board,
    dailyGoalMinutes:
      typeof meta.dailyGoalMinutes === 'number' && meta.dailyGoalMinutes >= 15
        ? meta.dailyGoalMinutes
        : fallback.dailyGoalMinutes,
    guardianName:
      typeof meta.guardianName === 'string' && meta.guardianName.trim().length > 0
        ? meta.guardianName.trim()
        : fallback.guardianName,
    guardianEmail:
      typeof meta.guardianEmail === 'string' ? meta.guardianEmail.trim() : fallback.guardianEmail,
  };
}

export function validateSignupCredentials(input: {
  email: string;
  password: string;
  confirmPassword: string;
}): { valid: boolean; error: string | null } {
  const email = input.email.trim();
  if (!email || !email.includes('@')) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }
  if (input.password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters long.' };
  }
  if (input.password !== input.confirmPassword) {
    return { valid: false, error: 'Passwords do not match. Please re-enter to confirm.' };
  }
  return { valid: true, error: null };
}

export function validatePasswordUpdate(input: {
  password: string;
  confirmPassword: string;
}): { valid: boolean; error: string | null } {
  if (input.password.length < 6) {
    return { valid: false, error: 'New password must be at least 6 characters long.' };
  }
  if (input.password !== input.confirmPassword) {
    return { valid: false, error: 'New passwords do not match.' };
  }
  return { valid: true, error: null };
}

export function formatAuthErrorMessage(rawMessage?: string | null): string {
  if (!rawMessage || !rawMessage.trim()) {
    return 'Something went wrong with your request. Please try again.';
  }
  const lower = rawMessage.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'Incorrect email or password. Please check your details and try again.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please verify your email address using the link sent to your inbox before signing in.';
  }
  if (lower.includes('user already registered')) {
    return 'An account with this email already exists. Switch to Sign In or reset your password.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many attempts right now. Please wait a moment before trying again.';
  }
  return rawMessage.replace(/supabase/gi, 'StudyVerse').trim();
}

