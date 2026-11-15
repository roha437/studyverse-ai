import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import type { FocusSessionInput } from '../types/studyverse.ts';
import {
  createFocusSessionRecord,
  getFocusPeriodStats,
  normalizeFocusSessionInput,
} from './focusSessionHelpers.ts';

const startedAt = new Date(2026, 10, 16, 10).toISOString();
const endedAt = new Date(2026, 10, 16, 10, 25).toISOString();

const completed: FocusSessionInput = {
  label: 'Review algebra',
  subject: 'Mathematics',
  startedAt,
  endedAt,
  durationSeconds: 1500,
  status: 'completed',
};

test('focus persistence normalization bounds fields and rejects invalid intervals', () => {
  assert.equal(normalizeFocusSessionInput({ ...completed, label: '  Algebra  ' }).label, 'Algebra');
  assert.throws(() =>
    normalizeFocusSessionInput({ ...completed, durationSeconds: -1 })
  );
  assert.throws(() =>
    normalizeFocusSessionInput({ ...completed, endedAt: new Date(2026, 10, 16, 9).toISOString() })
  );
});

test('focus records normalize duration and separate completed from interrupted statistics', () => {
  const saved = createFocusSessionRecord(completed, 'focus-1');
  const interrupted = createFocusSessionRecord(
    { ...completed, label: 'Interrupted revision', durationSeconds: 300, status: 'interrupted' },
    'focus-2'
  );
  assert.equal(saved.minutes, 25);
  assert.equal(saved.status, 'completed');
  const stats = getFocusPeriodStats([saved, interrupted], new Date(2026, 10, 16, 12));
  assert.deepEqual(stats.today, { completedMinutes: 25, interruptedSessions: 1 });
  assert.deepEqual(stats.week, { completedMinutes: 25, interruptedSessions: 1 });
});

test('focus-session migration permits only authenticated users to read and insert their own rows', async () => {
  const migration = await readFile(
    new URL('../../supabase/migrations/202611170001_focus_session_persistence.sql', import.meta.url),
    'utf8'
  );
  assert.match(migration, /ALTER TABLE public\.focus_sessions ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /FOR SELECT[\s\S]*USING \(auth\.uid\(\) = user_id\)/);
  assert.match(migration, /FOR INSERT[\s\S]*WITH CHECK \(auth\.uid\(\) = user_id\)/);
  assert.doesNotMatch(migration, /FOR (?:UPDATE|DELETE)/);
});
