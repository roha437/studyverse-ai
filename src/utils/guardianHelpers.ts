import type {
  GuardianStudentLink,
  GuardianStudentSummary,
  StudentGuardianLink,
} from '../types/studyverse.ts';
import { sanitizeBoardId, sanitizeGradeId, sanitizeStreamId } from './databaseMappers.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function safeNumber(value: unknown, maximum = 1_000_000): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(maximum, Math.round(parsed))) : 0;
}

export function generateGuardianInvitationCode(): string {
  if (!globalThis.crypto?.getRandomValues) throw new Error('Secure random number generation is unavailable.');
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return hex.match(/.{8}/g)!.join('-');
}

export function normalizeGuardianInvitationCode(code: string): string {
  const normalized = code.trim().toLowerCase().replace(/[\s-]/g, '');
  if (!/^[a-f0-9]{32}$/.test(normalized)) {
    throw new Error('Enter the complete 32-character invitation code.');
  }
  return normalized;
}

export async function hashGuardianInvitationCode(code: string): Promise<string> {
  const normalized = normalizeGuardianInvitationCode(code);
  if (!globalThis.crypto?.subtle) throw new Error('Secure invitation hashing is unavailable.');
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(normalized)
  );
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function mapGuardianStudentRow(value: unknown): GuardianStudentLink | null {
  if (!isRecord(value)) return null;
  const linkId = typeof value.link_id === 'string' ? value.link_id : '';
  const studentId = typeof value.student_id === 'string' ? value.student_id : '';
  const fullName = typeof value.full_name === 'string' ? value.full_name.trim().slice(0, 100) : '';
  if (!linkId || !studentId || !fullName) return null;
  return {
    linkId,
    studentId,
    fullName,
    classLevel: sanitizeGradeId(value.class_level),
    stream: sanitizeStreamId(value.stream),
    board: sanitizeBoardId(value.curriculum_board),
    linkedAt: typeof value.linked_at === 'string' ? value.linked_at : '',
  };
}

export function mapStudentGuardianRow(value: unknown): StudentGuardianLink | null {
  if (!isRecord(value)) return null;
  const linkId = typeof value.link_id === 'string' ? value.link_id : '';
  const guardianId = typeof value.guardian_id === 'string' ? value.guardian_id : '';
  const fullName = typeof value.full_name === 'string' ? value.full_name.trim().slice(0, 100) : '';
  if (!linkId || !guardianId || !fullName) return null;
  return {
    linkId,
    guardianId,
    fullName,
    linkedAt: typeof value.linked_at === 'string' ? value.linked_at : '',
  };
}

export function normalizeGuardianStudentSummary(value: unknown): GuardianStudentSummary | null {
  if (!isRecord(value) || !isRecord(value.student)) return null;
  const student = value.student;
  const name = typeof student.name === 'string' ? student.name.trim().slice(0, 100) : '';
  if (!name) return null;
  const section = (key: string) => (isRecord(value[key]) ? value[key] : {});
  const progress = section('progress');
  const studyPlan = section('studyPlan');
  const quizzes = section('quizzes');
  const tests = section('tests');
  const focus = section('focus');
  const recentAssessments = Array.isArray(value.recentAssessments)
    ? value.recentAssessments
        .filter(isRecord)
        .slice(0, 10)
        .filter(
          (item) =>
            (item.kind === 'quiz' || item.kind === 'test') &&
            typeof item.subject === 'string' &&
            typeof item.completed_at === 'string'
        )
        .map((item) => ({
          subject: String(item.subject).slice(0, 100),
          score: safeNumber(item.score, 100),
          completedAt: String(item.completed_at),
          kind: item.kind as 'quiz' | 'test',
        }))
    : [];
  const achievements = Array.isArray(value.achievements)
    ? value.achievements
        .filter(isRecord)
        .slice(0, 20)
        .filter((item) => typeof item.title === 'string')
        .map((item) => ({
          title: String(item.title).slice(0, 120),
          unlockedAt: typeof item.unlockedAt === 'string' ? item.unlockedAt : '',
        }))
    : [];
  return {
    student: {
      name,
      classLevel: sanitizeGradeId(student.classLevel),
      stream: sanitizeStreamId(student.stream),
      board: sanitizeBoardId(student.board),
      dailyGoalMinutes: safeNumber(student.dailyGoalMinutes, 720),
    },
    progress: {
      trackedTopics: safeNumber(progress.trackedTopics),
      completedTopics: safeNumber(progress.completedTopics),
      averageMastery: safeNumber(progress.averageMastery, 100),
      trackedMinutes: safeNumber(progress.trackedMinutes),
    },
    studyPlan: {
      totalSessions: safeNumber(studyPlan.totalSessions),
      completedSessions: safeNumber(studyPlan.completedSessions),
      completedMinutes: safeNumber(studyPlan.completedMinutes),
    },
    quizzes: {
      attempts: safeNumber(quizzes.attempts),
      averageScore: safeNumber(quizzes.averageScore, 100),
    },
    tests: {
      attempts: safeNumber(tests.attempts),
      averageScore: safeNumber(tests.averageScore, 100),
    },
    focus: {
      completedSessions: safeNumber(focus.completedSessions),
      completedMinutes: safeNumber(focus.completedMinutes),
      interruptedSessions: safeNumber(focus.interruptedSessions),
    },
    recentAssessments,
    achievements,
  };
}
