import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveDefaultContext } from './curriculumHelpers';
import {
  buildVideoLearningSearchRequest,
  createVideoLearningProgressInput,
  normalizeVideoLearningProgressRow,
} from './videoLearningHelpers';

const video = {
  videoId: 'abcdefghijk',
  title: 'Fractions explained',
  channel: 'Study Channel',
  thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg',
  videoUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
  description: '',
  publishedAt: null,
};

test('video learning progress captures the selected curriculum context', () => {
  const context = resolveDefaultContext('class-10', 'general');
  const progress = createVideoLearningProgressInput(video, context, 'NCERT / CBSE', 'completed');
  assert.ok(progress);
  assert.equal(progress.classLevel, 'class-10');
  assert.equal(progress.board, 'NCERT / CBSE');
  assert.equal(progress.status, 'completed');
  assert.equal(progress.videoId, video.videoId);

  const request = buildVideoLearningSearchRequest(context, 'NCERT / CBSE', 'worked example');
  assert.equal(request.gradeId, 'class-10');
  assert.equal(request.board, 'NCERT / CBSE');
  assert.equal(request.query, 'worked example');
  assert.ok(request.subject);
  assert.ok(request.chapter);
  assert.ok(request.topic);
});

test('video progress row normalization rejects invalid IDs and statuses', () => {
  const row = {
    id: 'record-1',
    video_id: video.videoId,
    title: video.title,
    channel: video.channel,
    thumbnail_url: video.thumbnailUrl,
    class_level: 'class-10',
    board: 'NCERT / CBSE',
    subject: 'Mathematics',
    chapter: '1: Real Numbers',
    topic: 'Euclid’s Division Lemma',
    status: 'in_progress',
    updated_at: '2027-01-01T10:00:00Z',
  };
  assert.equal(normalizeVideoLearningProgressRow(row)?.status, 'in_progress');
  assert.equal(normalizeVideoLearningProgressRow({ ...row, video_id: 'bad-id' }), null);
  assert.equal(normalizeVideoLearningProgressRow({ ...row, status: 'watched' }), null);
});
