import type { FocusSessionInput, FocusSessionRecord } from '../types/studyverse.ts';

export function normalizeFocusSessionInput(input: FocusSessionInput): FocusSessionInput {
  const startedAt = new Date(input.startedAt);
  const endedAt = new Date(input.endedAt);
  if (
    !input.label.trim() ||
    !input.subject.trim() ||
    Number.isNaN(startedAt.getTime()) ||
    Number.isNaN(endedAt.getTime()) ||
    endedAt.getTime() < startedAt.getTime() ||
    !Number.isFinite(input.durationSeconds) ||
    input.durationSeconds < 0 ||
    input.durationSeconds > 24 * 60 * 60
  ) {
    throw new Error('Invalid focus session details.');
  }
  return {
    ...input,
    label: input.label.trim().slice(0, 160),
    subject: input.subject.trim().slice(0, 100),
    durationSeconds: Math.floor(input.durationSeconds),
  };
}

export function mapFocusSessionRowToRecord(row: Record<string, unknown>): FocusSessionRecord {
  const startedAt = typeof row.started_at === 'string' ? row.started_at : new Date().toISOString();
  const endedAt = typeof row.ended_at === 'string' ? row.ended_at : startedAt;
  const durationSeconds = Number.isFinite(Number(row.duration_seconds))
    ? Math.max(0, Math.floor(Number(row.duration_seconds)))
    : 0;
  const completedAt = new Date(endedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  return {
    id: String(row.id),
    label: String(row.label ?? 'Focus session'),
    subject: String(row.subject ?? 'General study'),
    minutes: Math.floor(durationSeconds / 60),
    completedAt,
    startedAt,
    endedAt,
    durationSeconds,
    status: row.status === 'completed' ? 'completed' : 'interrupted',
  };
}

export function createFocusSessionRecord(
  input: FocusSessionInput,
  id: string
): FocusSessionRecord {
  const normalized = normalizeFocusSessionInput(input);
  return mapFocusSessionRowToRecord({
    id,
    label: normalized.label,
    subject: normalized.subject,
    started_at: normalized.startedAt,
    ended_at: normalized.endedAt,
    duration_seconds: normalized.durationSeconds,
    status: normalized.status,
  });
}

export interface FocusPeriodStats {
  completedMinutes: number;
  interruptedSessions: number;
}

export function getFocusPeriodStats(
  sessions: FocusSessionRecord[],
  now: Date
): { today: FocusPeriodStats; week: FocusPeriodStats } {
  const dateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const todayKey = dateKey(now);
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));

  const aggregate = (filter: (session: FocusSessionRecord) => boolean): FocusPeriodStats => {
    const scoped = sessions.filter(filter);
    return {
      completedMinutes: scoped
        .filter((session) => session.status === 'completed')
        .reduce((total, session) => total + session.minutes, 0),
      interruptedSessions: scoped.filter((session) => session.status === 'interrupted').length,
    };
  };

  return {
    today: aggregate((session) => dateKey(new Date(session.startedAt)) === todayKey),
    week: aggregate((session) => {
      const startedAt = new Date(session.startedAt);
      return startedAt >= weekStart && startedAt <= now;
    }),
  };
}
