import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import express from 'express';
import test from 'node:test';
import { createYouTubeRouter } from './youtubeRouter.ts';
import { createFixedWindowRateLimiter } from '../utils/rateLimiter.ts';

const validQuery = new URLSearchParams({
  query: 'lens formula explained',
  gradeId: 'class-10',
  board: 'NCERT / CBSE',
  subject: 'Physics',
  chapter: 'Light',
  topic: 'Lens formula',
});

async function withRouter(
  options: {
    apiKey?: string;
    limit?: number;
    fetchImpl?: typeof fetch;
  },
  callback: (url: string) => Promise<void>
) {
  const app = express();
  app.use(
    '/api/youtube',
    createYouTubeRouter({
      getApiKey: () => options.apiKey,
      rateLimiter: createFixedWindowRateLimiter(options.limit ?? 12, 60_000),
      ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    })
  );
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address() as AddressInfo;
  try {
    await callback(`http://127.0.0.1:${address.port}/api/youtube/search`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

function fakeFetch(
  handler: (url: URL) => globalThis.Response
): { fetchImpl: typeof fetch; urls: URL[] } {
  const urls: URL[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = new URL(String(input));
    urls.push(url);
    return handler(url);
  };
  return { fetchImpl, urls };
}

test('YouTube endpoint reports missing server API key without making external requests', async () => {
  const { fetchImpl } = fakeFetch(() => {
    throw new Error('YouTube should not be called without a key.');
  });
  await withRouter({ fetchImpl }, async (url) => {
    const response = await fetch(`${url}?${validQuery.toString()}`);
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /YOUTUBE_API_KEY/);
  });
});

test('YouTube endpoint validates input and preserves opaque pagination tokens', async () => {
  const { fetchImpl, urls } = fakeFetch(() =>
    new Response(JSON.stringify({ items: [], pageInfo: { totalResults: 0 } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );
  await withRouter({ apiKey: 'server-test-key', fetchImpl }, async (url) => {
    const invalid = await fetch(`${url}?query=${encodeURIComponent('x'.repeat(201))}`);
    assert.equal(invalid.status, 400);

    const response = await fetch(`${url}?${validQuery.toString()}&pageToken=CAoQAA`);
    assert.equal(response.status, 200);
    assert.equal(urls[0].searchParams.get('pageToken'), 'CAoQAA');
    assert.equal(urls[0].searchParams.get('maxResults'), '12');
    assert.equal(urls[0].searchParams.get('type'), 'video');
    assert.equal(urls[0].searchParams.get('key'), 'server-test-key');

    const invalidToken = await fetch(`${url}?${validQuery.toString()}&pageToken=${encodeURIComponent('bad/token')}`);
    assert.equal(invalidToken.status, 400);
  });
});

test('YouTube endpoint returns normalized results and requests duration metadata', async () => {
  const { fetchImpl, urls } = fakeFetch((url) => {
    const body = url.pathname.endsWith('/search')
      ? {
          items: [{
            id: { videoId: 'dQw4w9WgXcQ' },
            snippet: {
              title: 'Lens formula explained',
              channelTitle: 'Study Channel',
              description: 'A worked physics lesson.',
              publishedAt: '2025-03-15T10:00:00Z',
              thumbnails: { high: { url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' } },
            },
          }],
          nextPageToken: 'CAoQAA',
          pageInfo: { totalResults: 45 },
        }
      : { items: [{ id: 'dQw4w9WgXcQ', contentDetails: { duration: 'PT4M30S' } }] };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  await withRouter({ apiKey: 'server-test-key', fetchImpl }, async (url) => {
    const response = await fetch(`${url}?${validQuery.toString()}`);
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.videos[0].videoId, 'dQw4w9WgXcQ');
    assert.equal(result.videos[0].durationSeconds, 270);
    assert.equal(result.videos[0].channel, 'Study Channel');
    assert.equal(result.nextPageToken, 'CAoQAA');
    assert.equal(urls.length, 2);
    assert.ok(urls[1].pathname.endsWith('/videos'));
  });
});

test('YouTube endpoint maps quota failures and applies rate limiting', async () => {
  const { fetchImpl } = fakeFetch(() =>
    new Response(JSON.stringify({ error: { errors: [{ reason: 'quotaExceeded' }] } }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  );
  await withRouter({ apiKey: 'server-test-key', fetchImpl, limit: 1 }, async (url) => {
    const first = await fetch(`${url}?${validQuery.toString()}`);
    assert.equal(first.status, 429);
    assert.match((await first.json()).error, /quota/);

    const limited = await fetch(`${url}?${validQuery.toString()}`);
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get('Retry-After')) > 0);
  });
});

test('YouTube endpoint returns useful normalized results if duration lookup fails', async () => {
  let callCount = 0;
  const fetchImpl: typeof fetch = async () => {
    callCount += 1;
    if (callCount === 1) {
      return new Response(JSON.stringify({
        items: [{
          id: { videoId: 'dQw4w9WgXcQ' },
          snippet: { title: 'Lesson', channelTitle: 'Channel', description: '' },
        }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ error: { errors: [{ reason: 'quotaExceeded' }] } }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  await withRouter({ apiKey: 'server-test-key', fetchImpl }, async (url) => {
    const response = await fetch(`${url}?${validQuery.toString()}`);
    const result = await response.json();
    assert.equal(response.status, 200);
    assert.equal(result.videos.length, 1);
    assert.match(result.warning, /durations/);
  });
});
