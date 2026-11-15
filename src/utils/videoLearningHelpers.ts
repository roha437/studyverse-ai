import type {
  ActiveStudyContext,
  BoardId,
  GradeLevelId,
  VideoLearningProgress,
  VideoLearningProgressInput,
  VideoLearningStatus,
} from '../types/studyverse.ts';
import { resolveContextDetails } from './curriculumHelpers';
import {
  getSafeYouTubeThumbnailUrl,
  isValidYouTubeVideoId,
  type YouTubeSearchRequest,
  type YouTubeVideo,
} from './youtubeHelpers';

const GRADES: GradeLevelId[] = [
  'class-5',
  'class-6',
  'class-7',
  'class-8',
  'class-9',
  'class-10',
  'inter-1',
  'inter-2',
];
const BOARDS: BoardId[] = ['NCERT / CBSE', 'State Board', 'Intermediate Board'];
const STATUSES: VideoLearningStatus[] = ['not_started', 'in_progress', 'completed'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function boundedText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text ? text.slice(0, maxLength) : null;
}

export function isVideoLearningStatus(value: unknown): value is VideoLearningStatus {
  return typeof value === 'string' && STATUSES.includes(value as VideoLearningStatus);
}

export function createVideoLearningProgressInput(
  video: YouTubeVideo,
  context: ActiveStudyContext,
  board: BoardId,
  status: VideoLearningStatus
): VideoLearningProgressInput | null {
  if (!isValidYouTubeVideoId(video.videoId) || !BOARDS.includes(board) || !isVideoLearningStatus(status)) {
    return null;
  }
  const { cls, subject, chapter, topic } = resolveContextDetails(context);
  const title = boundedText(video.title, 300);
  const channel = boundedText(video.channel, 120);
  if (!title || !channel) return null;
  return {
    videoId: video.videoId,
    title,
    channel,
    thumbnailUrl: getSafeYouTubeThumbnailUrl(video.thumbnailUrl),
    classLevel: cls.id,
    board,
    subject: subject.name,
    chapter: `${chapter.number}: ${chapter.title}`.slice(0, 180),
    topic: topic.title.slice(0, 180),
    status,
  };
}

export function normalizeVideoLearningProgressRow(
  value: unknown
): VideoLearningProgress | null {
  if (!isRecord(value)) return null;
  const videoId = value.video_id;
  const classLevel = value.class_level;
  const board = value.board;
  const status = value.status;
  const title = boundedText(value.title, 300);
  const channel = boundedText(value.channel, 120);
  const subject = boundedText(value.subject, 100);
  const chapter = boundedText(value.chapter, 180);
  const topic = boundedText(value.topic, 180);
  if (
    !isValidYouTubeVideoId(videoId) ||
    typeof classLevel !== 'string' ||
    !GRADES.includes(classLevel as GradeLevelId) ||
    typeof board !== 'string' ||
    !BOARDS.includes(board as BoardId) ||
    !isVideoLearningStatus(status) ||
    !title ||
    !channel ||
    !subject ||
    !chapter ||
    !topic
  ) {
    return null;
  }
  return {
    id: typeof value.id === 'string' ? value.id : `video-progress-${videoId}`,
    ...(typeof value.user_id === 'string' ? { userId: value.user_id } : {}),
    videoId,
    title,
    channel,
    thumbnailUrl: getSafeYouTubeThumbnailUrl(value.thumbnail_url),
    classLevel: classLevel as GradeLevelId,
    board: board as BoardId,
    subject,
    chapter,
    topic,
    status,
    updatedAt:
      typeof value.updated_at === 'string' && Number.isFinite(Date.parse(value.updated_at))
        ? new Date(value.updated_at).toISOString()
        : new Date(0).toISOString(),
  };
}

export function buildVideoLearningSearchRequest(
  context: ActiveStudyContext,
  board: BoardId,
  query: string
): YouTubeSearchRequest {
  const { cls, subject, chapter, topic } = resolveContextDetails(context);
  return {
    query: query.trim().slice(0, 200),
    gradeId: cls.id,
    board,
    subject: subject.name,
    chapter: `${chapter.number}: ${chapter.title}`,
    topic: topic.title,
  };
}
