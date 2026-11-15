import test from 'node:test';
import assert from 'node:assert/strict';
import type { StudentProfile } from '../types/studyverse';
import {
  extractSupabaseHost,
  formatAuthErrorMessage,
  isSupabaseEnvConfigured,
  mergeProfileFromSupabaseUser,
  validatePasswordUpdate,
  validateSignupCredentials,
} from './supabaseHelpers';

const BASE_PROFILE: StudentProfile = {
  name: 'Ananya Sharma',
  email: 'ananya@studyverse.edu',
  gradeId: 'class-10',
  streamId: 'general',
  board: 'NCERT / CBSE',
  dailyGoalMinutes: 90,
  guardianName: 'Rajesh Sharma',
  guardianEmail: 'rajesh@example.com',
};

test('isSupabaseEnvConfigured validates URL and publishable key', () => {
  assert.equal(
    isSupabaseEnvConfigured(
      'https://studyverse-test.supabase.co',
      'test-publishable-key-long-enough'
    ),
    true
  );
  assert.equal(isSupabaseEnvConfigured('', 'sb_publishable_1234567890'), false);
  assert.equal(isSupabaseEnvConfigured('https://example.supabase.co', 'short'), false);
  assert.equal(
    isSupabaseEnvConfigured(
      'https://your-project-ref.supabase.co',
      'test-publishable-key-long-enough'
    ),
    false
  );
  assert.equal(
    isSupabaseEnvConfigured(
      'https://studyverse-test.supabase.co',
      'your-supabase-publishable-key'
    ),
    false
  );
});

test('extractSupabaseHost extracts project domain safely', () => {
  assert.equal(
    extractSupabaseHost('https://studyverse-test.supabase.co'),
    'studyverse-test.supabase.co'
  );
  assert.equal(extractSupabaseHost('not-a-url'), null);
});

test('mergeProfileFromSupabaseUser applies valid metadata and guards invalid values', () => {
  const merged = mergeProfileFromSupabaseUser(BASE_PROFILE, 'roshan@example.com', {
    name: 'Roshan Teja',
    gradeId: 'inter-1',
    streamId: 'mpc',
    board: 'Intermediate Board',
    dailyGoalMinutes: 120,
    guardianName: 'Suresh',
  });
  assert.equal(merged.name, 'Roshan Teja');
  assert.equal(merged.email, 'roshan@example.com');
  assert.equal(merged.gradeId, 'inter-1');
  assert.equal(merged.streamId, 'mpc');
  assert.equal(merged.board, 'Intermediate Board');
  assert.equal(merged.dailyGoalMinutes, 120);

  const guarded = mergeProfileFromSupabaseUser(BASE_PROFILE, undefined, {
    gradeId: 'invalid-grade',
    dailyGoalMinutes: 2,
  });
  assert.equal(guarded.gradeId, 'class-10');
  assert.equal(guarded.dailyGoalMinutes, 90);
});

test('validateSignupCredentials and validatePasswordUpdate enforce email, min length, and match', () => {
  assert.equal(
    validateSignupCredentials({ email: 'bad-email', password: 'secret', confirmPassword: 'secret' })
      .valid,
    false
  );
  assert.equal(
    validateSignupCredentials({
      email: 'student@studyverse.edu',
      password: '123',
      confirmPassword: '123',
    }).valid,
    false
  );
  assert.equal(
    validateSignupCredentials({
      email: 'student@studyverse.edu',
      password: 'password123',
      confirmPassword: 'password456',
    }).valid,
    false
  );
  assert.equal(
    validateSignupCredentials({
      email: 'student@studyverse.edu',
      password: 'password123',
      confirmPassword: 'password123',
    }).valid,
    true
  );
  assert.equal(
    validatePasswordUpdate({ password: 'newpassword1', confirmPassword: 'newpassword1' }).valid,
    true
  );
  assert.equal(
    validatePasswordUpdate({ password: 'newpassword1', confirmPassword: 'mismatch' }).valid,
    false
  );
});

test('formatAuthErrorMessage returns student-friendly copy and strips technical names', () => {
  assert.match(formatAuthErrorMessage('Invalid login credentials'), /Incorrect email or password/);
  assert.match(formatAuthErrorMessage('Email not confirmed'), /verify your email/);
  assert.equal(
    formatAuthErrorMessage('Supabase service error').includes('Supabase'),
    false
  );
});

