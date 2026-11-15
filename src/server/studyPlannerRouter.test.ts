import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import express from 'express';
import test from 'node:test';
import { createStudyPlannerRouter, type StudyPlannerGenerator } from './studyPlannerRouter.ts';
import { createFixedWindowRateLimiter } from '../utils/rateLimiter.ts';

const payload = {
  gradeId: 'class-10',
  board: 'NCERT / CBSE',
  subjects: ['Mathematics'],
  weakSubjects: [],
  dailyAvailableMinutes: 90,
  weekStartDate: '2027-01-04',
  targetDate: '2027-03-01',
  preferredDays: ['Mon', 'Tue'],
  chaptersAndTopics: '',
  revisionPreference: 'balanced',
};

const plan = {
  title: 'Mathematics practice week',
  summary: 'Build confidence with a short, balanced schedule.',
  breakGuidance: 'Take a break between study sessions.',
  finalRevisionPlan: ['Review formulas and solve mixed questions.'],
  sessions: [{
    date: '2027-01-04',
    day: 'Mon',
    durationMinutes: 45,
    subject: 'Mathematics',
    topic: 'Algebra',
    title: 'Practice algebra',
    learningObjective: 'Solve linear equations accurately.',
    practiceRecommendation: 'Try five textbook questions.',
    sessionType: 'practice',
    priority: 'medium',
  }],
};

async function withRouter(
  generator: StudyPlannerGenerator | null,
  limit: number,
  callback: (baseUrl: string) => Promise<void>,
  timeoutMs?: number
) {
  const app = express();
  app.use(express.json());
  app.use(
    '/api/study-planner',
    createStudyPlannerRouter({
      getGenerator: () => generator,
      rateLimiter: createFixedWindowRateLimiter(limit, 60_000),
      ...(timeoutMs ? { timeoutMs } : {}),
    })
  );
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address() as AddressInfo;
  try {
    await callback(`http://127.0.0.1:${address.port}/api/study-planner/generate`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

test('study planner endpoint validates input and normalizes generated plans', async () => {
  await withRouter(async () => JSON.stringify(plan), 12, async (url) => {
    const invalid = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, dailyAvailableMinutes: 0 }),
    });
    assert.equal(invalid.status, 400);

    const valid = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    assert.equal(valid.status, 200);
    const result = (await valid.json()) as { plan?: { sessions?: unknown[] } };
    assert.equal(result.plan?.sessions?.length, 1);
  });
});

test('study planner endpoint returns safe provider and invalid response errors', async () => {
  await withRouter(null, 12, async (url) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    assert.equal(response.status, 503);
  });
  await withRouter(async () => 'bad-json', 12, async (url) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    assert.equal(response.status, 502);
  });
});

test('study planner endpoint applies request limiting', async () => {
  await withRouter(async () => JSON.stringify(plan), 1, async (url) => {
    const request = () => fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    assert.equal((await request()).status, 200);
    const limited = await request();
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get('Retry-After')) > 0);
  });
});

test('study planner endpoint returns a gateway timeout when Gemini exceeds its deadline', async () => {
  await withRouter(
    async () => new Promise((resolve) => setTimeout(() => resolve(JSON.stringify(plan)), 20)),
    12,
    async (url) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      assert.equal(response.status, 504);
    },
    1
  );
});
