import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildYouTubeSearchQuery,
  createVideoBookmarkInput,
  createYouTubeSearchLink,
  formatPublishedDate,
  formatVideoDuration,
  getYouTubeApiError,
  isValidYouTubeVideoId,
  normalizeYouTubePageToken,
  normalizeYouTubeSearchResponse,
  validateYouTubeSearchRequest,
} from './youtubeHelpers.ts';

const searchItem = {
  id: { videoId: 'dQw4w9WgXcQ' },
  snippet: {
    title: 'Physics: Light and lenses',
    channelTitle: 'Study Channel',
    description: 'A short explanation of the lens formula.',
    publishedAt: '2025-03-15T10:00:00Z',
    thumbnails: {
      high: { url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' },
    },
  },
};

test('YouTube search validation bounds the phrase and curriculum fields', () => {
  const valid = validateYouTubeSearchRequest({
    query: 'lens formula explained',
    gradeId: 'class-10',
    board: 'NCERT / CBSE',
    subject: 'Physics',
    chapter: 'Light',
    topic: 'Lens formula',
    pageToken: 'CAoQAA',
  });
  assert.equal(valid.valid, true);
  if (!valid.valid) return;
  assert.match(buildYouTubeSearchQuery(valid.data), /Class 10 NCERT \/ CBSE Physics Light Lens formula/);
  assert.equal(valid.data.pageToken, 'CAoQAA');
  assert.equal(validateYouTubeSearchRequest({ query: 'x'.repeat(201) }).valid, false);
  assert.equal(validateYouTubeSearchRequest({ query: '', subject: '' }).valid, false);
  assert.equal(validateYouTubeSearchRequest({ query: 'lesson', gradeId: 'class-12' }).valid, false);
  assert.equal(
    validateYouTubeSearchRequest({
      query: 'q'.repeat(200),
      subject: 's'.repeat(100),
      chapter: 'c'.repeat(140),
      topic: 't'.repeat(140),
    }).valid,
    false
  );
});

test('YouTube IDs, page tokens, and normalized search videos are strictly bounded', () => {
  assert.equal(isValidYouTubeVideoId('dQw4w9WgXcQ'), true);
  assert.equal(isValidYouTubeVideoId('not/a/video'), false);
  assert.equal(normalizeYouTubePageToken('CAoQAA'), 'CAoQAA');
  assert.equal(normalizeYouTubePageToken('bad/token'), undefined);
  assert.equal(normalizeYouTubePageToken('x'.repeat(501)), undefined);

  const normalized = normalizeYouTubeSearchResponse(
    {
      items: [searchItem, { ...searchItem, id: { videoId: 'bad-id' } }],
      nextPageToken: 'CAoQAA',
      pageInfo: { totalResults: 250 },
    },
    { items: [{ id: 'dQw4w9WgXcQ', contentDetails: { duration: 'PT1H2M3S' } }] }
  );
  assert.equal(normalized?.videos.length, 1);
  assert.equal(normalized?.videos[0].videoUrl, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.equal(normalized?.videos[0].durationSeconds, 3_723);
  assert.equal(normalized?.videos[0].thumbnailUrl, searchItem.snippet.thumbnails.high.url);
  assert.equal(normalized?.nextPageToken, 'CAoQAA');
  assert.equal(normalized?.totalResults, 250);
  assert.equal(normalizeYouTubeSearchResponse({ items: 'invalid' }), null);
});

test('video bookmark helper stores only canonical video metadata and rejects invalid IDs', () => {
  const video = normalizeYouTubeSearchResponse({ items: [searchItem] })?.videos[0];
  assert.ok(video);
  const bookmark = createVideoBookmarkInput({ ...video, durationSeconds: 93 });
  assert.equal(bookmark?.resourceType, 'video');
  assert.equal(bookmark?.resourceId, 'dQw4w9WgXcQ');
  assert.equal(bookmark?.metadata.channel, 'Study Channel');
  assert.equal(bookmark?.metadata.durationSeconds, 93);
  assert.equal(bookmark?.metadata.videoUrl, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.equal(createVideoBookmarkInput({ ...video, videoId: 'invalid' }), null);
});

test('YouTube API failures map quota and configuration errors safely', () => {
  assert.equal(
    getYouTubeApiError(
      { error: { errors: [{ reason: 'quotaExceeded' }] } },
      403
    ).status,
    429
  );
  assert.equal(
    getYouTubeApiError(
      { error: { errors: [{ reason: 'keyInvalid' }] } },
      403
    ).status,
    503
  );
  assert.equal(getYouTubeApiError({}, 503).status, 502);
});

test('video presentation helpers format durations, dates, and fallback search links', () => {
  assert.equal(formatVideoDuration(3_723), '1:02:03');
  assert.equal(formatVideoDuration(93), '1:33');
  assert.ok(formatPublishedDate('2025-03-15T10:00:00Z'));
  assert.equal(formatPublishedDate('invalid'), null);
  assert.match(createYouTubeSearchLink('lens formula explained'), /search_query=lens%20formula%20explained/);

  const searchQuery = buildYouTubeSearchQuery({
    query: 'solved examples',
    gradeId: 'class-10',
    subject: 'Physics',
    chapter: 'Light',
    topic: 'Lens formula',
  });
  const searchUrl = new URL(createYouTubeSearchLink(searchQuery));
  assert.equal(searchUrl.origin, 'https://www.youtube.com');
  assert.equal(searchUrl.pathname, '/results');
  assert.match(searchUrl.searchParams.get('search_query') ?? '', /Class 10 Physics Light Lens formula solved examples/);
});
