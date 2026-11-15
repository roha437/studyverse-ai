import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  generateGuardianInvitationCode,
  hashGuardianInvitationCode,
  mapGuardianStudentRow,
  normalizeGuardianInvitationCode,
  normalizeGuardianStudentSummary,
} from './guardianHelpers.ts';

test('guardian invitation codes are high-entropy formatted tokens and are hashed before persistence', async () => {
  const code = generateGuardianInvitationCode();
  assert.match(code, /^[a-f0-9]{8}(?:-[a-f0-9]{8}){3}$/);
  assert.equal(normalizeGuardianInvitationCode(code).length, 32);
  assert.equal(await hashGuardianInvitationCode(code), await hashGuardianInvitationCode(code));
  assert.throws(() => normalizeGuardianInvitationCode('short'));
});

test('guardian data mappers whitelist permitted linked-student summary fields', () => {
  const student = mapGuardianStudentRow({
    link_id: 'link-1',
    student_id: 'student-1',
    full_name: 'Student One',
    class_level: 'class-10',
    stream: 'general',
    curriculum_board: 'NCERT / CBSE',
    linked_at: '2026-11-15T10:00:00Z',
  });
  assert.equal(student?.fullName, 'Student One');

  const summary = normalizeGuardianStudentSummary({
    student: {
      name: 'Student One',
      classLevel: 'class-10',
      stream: 'general',
      board: 'NCERT / CBSE',
      dailyGoalMinutes: 90,
      privateNotes: ['must not be exposed'],
    },
    progress: { trackedTopics: 2, completedTopics: 1, averageMastery: 50, trackedMinutes: 20 },
    studyPlan: { totalSessions: 2, completedSessions: 1, completedMinutes: 30 },
    quizzes: { attempts: 1, averageScore: 50 },
    tests: { attempts: 0, averageScore: 0 },
    focus: { completedSessions: 1, completedMinutes: 25, interruptedSessions: 0 },
    recentAssessments: [],
    achievements: [],
    notes: ['must not be exposed'],
  });
  assert.equal(summary?.progress.completedTopics, 1);
  assert.equal('notes' in (summary ?? {}), false);
  assert.equal('privateNotes' in (summary?.student ?? {}), false);
});

test('guardian migration keeps invitations, summaries, and revocation scoped to authorized identities', async () => {
  const migration = await readFile(
    new URL('../../supabase/migrations/202611170004_guardian_linking.sql', import.meta.url),
    'utf8'
  );
  assert.match(migration, /token_hash text NOT NULL UNIQUE CHECK \(token_hash ~ '\^\[0-9a-f\]\{64\}\$'\)/);
  assert.match(migration, /claimed_by IS NULL[\s\S]*expires_at > now\(\)[\s\S]*FOR UPDATE/);
  assert.match(migration, /account_role = 'student'/);
  assert.match(migration, /account_role = 'parent'/);
  assert.match(migration, /NEW\.account_role IS DISTINCT FROM OLD\.account_role AND auth\.uid\(\) IS NOT NULL/);
  assert.match(migration, /BEFORE UPDATE OF account_role ON public\.profiles/);
  assert.match(migration, /p_consent_given IS DISTINCT FROM TRUE/);
  assert.match(migration, /consented_at timestamptz NOT NULL/);
  assert.match(migration, /guardian_id = auth\.uid\(\)[\s\S]*student_id = p_student_id[\s\S]*revoked_at IS NULL/);
  assert.match(migration, /student_id = auth\.uid\(\) OR guardian_id = auth\.uid\(\)/);
  assert.match(migration, /GRANT SELECT ON public\.guardian_invitations, public\.guardian_student_links TO authenticated/);
  assert.doesNotMatch(migration, /GRANT (?:INSERT|UPDATE|DELETE|ALL) ON public\.guardian_(?:invitations|student_links) TO authenticated/);
  assert.doesNotMatch(migration, /FROM public\.(?:notes|messages|chat_history)\b/i);
});

test('profile migration prevents client delete/recreate while preserving profile creation', async () => {
  const migration = await readFile(
    new URL(
      '../../supabase/migrations/202611170005_profile_account_role_integrity.sql',
      import.meta.url
    ),
    'utf8'
  );
  assert.match(migration, /DROP POLICY IF EXISTS "profiles_delete_own" ON public\.profiles/);
  assert.match(
    migration,
    /REVOKE DELETE ON TABLE public\.profiles FROM PUBLIC, anon, authenticated/
  );
  assert.doesNotMatch(migration, /CREATE POLICY[\s\S]*profiles[\s\S]*FOR DELETE/i);
  assert.doesNotMatch(migration, /REVOKE (?:ALL|INSERT)[\s\S]*public\.profiles/i);
  assert.doesNotMatch(migration, /DROP POLICY IF EXISTS "profiles_insert_own"/i);
});
