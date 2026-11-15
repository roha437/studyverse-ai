import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import express from 'express';
import test from 'node:test';
import { createNumericalLabRouter, type NumericalLabGenerator } from './numericalLabRouter.ts';
import { createFixedWindowRateLimiter } from '../utils/rateLimiter.ts';

const basePayload = {
  classLabel: 'Class 10',
  board: 'NCERT / CBSE',
  subject: 'Physics',
  chapter: 'Light',
  topic: 'Lens formula',
  problemStatement: 'An object is placed in front of a lens. Find image distance.',
  givenValues: 'u = -30 cm, f = +15 cm',
};

async function withRouter(
  generator: NumericalLabGenerator | null,
  callback: (baseUrl: string) => Promise<void>,
  requestLimit = 12
) {
  const app = express();
  app.use(express.json());
  app.use(
    '/api/numerical-lab',
    createNumericalLabRouter({
      getGenerator: () => generator,
      rateLimiter: createFixedWindowRateLimiter(requestLimit, 60_000),
    })
  );
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address() as AddressInfo;

  try {
    await callback(`http://127.0.0.1:${address.port}/api/numerical-lab`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

test('Numerical Lab endpoints reject invalid solver and verifier payloads with HTTP 400', async () => {
  await withRouter(async () => '', async (baseUrl) => {
    const invalidSolve = await fetch(`${baseUrl}/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problemStatement: 'Find x.' }),
    });
    assert.equal(invalidSolve.status, 400);

    const invalidVerify = await fetch(`${baseUrl}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...basePayload, studentSteps: '' }),
    });
    assert.equal(invalidVerify.status, 400);
  });
});

test('Numerical Lab solver and verifier endpoints return normalized structured responses', async () => {
  const generator: NumericalLabGenerator = async (operation) =>
    operation === 'solve'
      ? JSON.stringify({
          givenValues: [{ name: 'Focal length', value: '15', unit: 'cm' }],
          requiredQuantity: 'Image distance',
          formula: '1/f = 1/v - 1/u',
          formulaExplanation: 'The lens formula relates the object and image distances.',
          unitConversions: [],
          steps: [{ calculation: 'v = 30 cm', explanation: 'Substitute and solve.' }],
          finalAnswer: { value: '30', unit: 'cm' },
          verification: 'The sign is consistent with a real image.',
          commonMistakes: ['Forgetting the sign convention.'],
        })
      : JSON.stringify({
          overallAssessment: 'The written substitution should be checked.',
          steps: [
            {
              assessment: 'incorrect',
              justification: 'The sign of the object distance is inconsistent with the stated convention.',
              hint: 'Write the signed value for object distance before substitution.',
              correction: 'Substitute u = -30 cm into the lens formula.',
            },
          ],
          alternativeApproaches: [],
        });

  await withRouter(generator, async (baseUrl) => {
    const solveResponse = await fetch(`${baseUrl}/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(basePayload),
    });
    assert.equal(solveResponse.status, 200);
    const solved = (await solveResponse.json()) as { solution?: { finalAnswer?: { unit?: string } } };
    assert.equal(solved.solution?.finalAnswer?.unit, 'cm');

    const verifyResponse = await fetch(`${baseUrl}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...basePayload, studentSteps: '1/15 = 1/v + 1/30' }),
    });
    assert.equal(verifyResponse.status, 200);
    const verified = (await verifyResponse.json()) as {
      verification?: { firstIncorrectStep?: number | null };
    };
    assert.equal(verified.verification?.firstIncorrectStep, 1);
  });
});

test('Numerical Lab endpoints return HTTP 503 when no server-side Gemini generator is configured', async () => {
  await withRouter(null, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(basePayload),
    });
    assert.equal(response.status, 503);
  });
});

test('Numerical Lab API applies the shared request limit across solve and verify routes', async () => {
  await withRouter(async () => '', async (baseUrl) => {
    const first = await fetch(`${baseUrl}/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(first.status, 400);

    const limited = await fetch(`${baseUrl}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get('Retry-After')) > 0);
  }, 1);
});
