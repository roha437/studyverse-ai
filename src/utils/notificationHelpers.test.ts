import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  mapNotificationRowToItem,
  normalizeNotificationInput,
} from './notificationHelpers.ts';

test('notification input validation trims text and rejects invalid event payloads', () => {
  const normalized = normalizeNotificationInput({
    title: ' Quiz completed ',
    message: ' Score saved. ',
    category: 'system',
    targetModule: 'quizzes',
    eventKey: 'quiz-1',
  });
  assert.equal(normalized.title, 'Quiz completed');
  assert.equal(normalized.message, 'Score saved.');
  assert.throws(() =>
    normalizeNotificationInput({
      title: '',
      message: 'x',
      category: 'system',
      eventKey: 'invalid',
    })
  );
});

test('notification mapping keeps real timestamps and drops invalid navigation targets', () => {
  const item = mapNotificationRowToItem({
    id: 'notice-1',
    title: 'Quiz saved',
    message: 'Your result was recorded.',
    category: 'system',
    read: false,
    created_at: '2026-11-15T10:00:00Z',
    target_module: 'javascript:alert(1)',
  });
  assert.equal(item.timestamp, '2026-11-15T10:00:00Z');
  assert.equal(item.targetModule, undefined);
  assert.equal(item.read, false);
});

test('notification migration restricts every operation to the owner', async () => {
  const migration = await readFile(
    new URL('../../supabase/migrations/202611170002_notification_persistence.sql', import.meta.url),
    'utf8'
  );
  assert.match(migration, /ALTER TABLE public\.notifications ENABLE ROW LEVEL SECURITY/);
  for (const operation of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
    assert.match(migration, new RegExp(`FOR ${operation}[\\s\\S]*auth\\.uid\\(\\) = user_id`));
  }
});
