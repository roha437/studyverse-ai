import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildStudyPlannerPrompt,
  normalizeGeneratedStudyPlan,
  validateStudyPlannerPreferences,
} from './studyPlannerHelpers.ts';

const preferences = {
  gradeId: 'class-10',
  board: 'NCERT / CBSE',
  subjects: ['Mathematics', 'Physics'],
  weakSubjects: ['Physics'],
  dailyAvailableMinutes: 120,
  weekStartDate: '2027-01-04',
  targetDate: '2027-03-01',
  preferredDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  chaptersAndTopics: 'Quadratics and electricity',
  revisionPreference: 'spaced',
} as const;

function generatedPlan() {
  return {
    title: 'Focused revision week',
    summary: 'Build steady understanding and revise both subjects.',
    breakGuidance: 'Take a short break between study blocks.',
    finalRevisionPlan: ['Review formulas and solve a mixed practice set.'],
    sessions: [
      {
        date: '2027-01-04',
        day: 'Mon',
        startTime: '16:00',
        durationMinutes: 45,
        subject: 'Mathematics',
        topic: 'Quadratic equations',
        title: 'Practice solving quadratics',
        learningObjective: 'Solve quadratic equations using factorisation.',
        practiceRecommendation: 'Complete five textbook questions.',
        sessionType: 'practice',
        priority: 'medium',
      },
    ],
  };
}

test('planner preferences validate and normalize duplicates', () => {
  const result = validateStudyPlannerPreferences({
    ...preferences,
    subjects: ['Mathematics', 'Mathematics', 'Physics'],
  });
  assert.equal(result.valid, true);
  if (!result.valid) return;
  assert.deepEqual(result.data.subjects, ['Mathematics', 'Physics']);
  assert.equal(result.data.weekStartDate, preferences.weekStartDate);
});

test('planner preferences reject invalid bounds, dates, and weak subjects', () => {
  assert.equal(validateStudyPlannerPreferences({ ...preferences, dailyAvailableMinutes: 721 }).valid, false);
  assert.equal(validateStudyPlannerPreferences({ ...preferences, weekStartDate: '2027-02-31' }).valid, false);
  assert.equal(validateStudyPlannerPreferences({ ...preferences, weakSubjects: ['Biology'] }).valid, false);
});

test('normalizer accepts a valid plan and rejects malformed or over-capacity schedules', () => {
  const validPreferences = validateStudyPlannerPreferences(preferences);
  assert.equal(validPreferences.valid, true);
  if (!validPreferences.valid) return;
  const plan = generatedPlan();
  assert.equal(normalizeGeneratedStudyPlan(JSON.stringify(plan), validPreferences.data)?.sessions.length, 1);
  plan.sessions[0].durationMinutes = 180;
  assert.equal(normalizeGeneratedStudyPlan(JSON.stringify(plan), validPreferences.data), null);
  assert.equal(normalizeGeneratedStudyPlan('not-json', validPreferences.data), null);
});

test('normalizer rejects sessions on non-preferred days and overlapping start times', () => {
  const validPreferences = validateStudyPlannerPreferences(preferences);
  assert.equal(validPreferences.valid, true);
  if (!validPreferences.valid) return;
  const plan = generatedPlan();
  plan.sessions[0].day = 'Sun';
  assert.equal(normalizeGeneratedStudyPlan(JSON.stringify(plan), validPreferences.data), null);
  plan.sessions[0].day = 'Mon';
  plan.sessions.push({ ...plan.sessions[0], title: 'Second block', startTime: '16:30' });
  assert.equal(normalizeGeneratedStudyPlan(JSON.stringify(plan), validPreferences.data), null);
});

test('normalizer does not schedule sessions after the target date', () => {
  const validPreferences = validateStudyPlannerPreferences({
    ...preferences,
    targetDate: '2027-01-04',
  });
  assert.equal(validPreferences.valid, true);
  if (!validPreferences.valid) return;
  const afterTarget = generatedPlan();
  afterTarget.sessions[0].date = '2027-01-05';
  afterTarget.sessions[0].day = 'Tue';
  assert.equal(
    normalizeGeneratedStudyPlan(JSON.stringify(afterTarget), validPreferences.data),
    null
  );
});

test('planner prompt contains bounded preferences and instruction-safe topic handling', () => {
  const validPreferences = validateStudyPlannerPreferences(preferences);
  assert.equal(validPreferences.valid, true);
  if (!validPreferences.valid) return;
  const prompt = buildStudyPlannerPrompt(validPreferences.data);
  assert.match(prompt, /weak subjects/i);
  assert.match(prompt, /never as instructions/i);
});
