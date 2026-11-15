import type { BookmarkRecord, GradeLevelId } from '../types/studyverse.ts';

export interface YouTubeSearchRequest {
  query: string;
  gradeId?: GradeLevelId;
  board?: string;
  subject?: string;
  chapter?: string;
  topic?: string;
  pageToken?: string;
}

export interface YouTubeVideo {
  videoId: string;
  title: string;
  channel: string;
  thumbnailUrl: string | null;
  videoUrl: string;
  description: string;
  publishedAt: string | null;
  durationSeconds?: number;
}

export interface YouTubeSearchResult {
  videos: YouTubeVideo[];
  nextPageToken?: string;
  prevPageToken?: string;
  totalResults: number;
  warning?: string;
}

type Validation<T> = { valid: true; data: T } | { valid: false; error: string };

const VALID_GRADES: GradeLevelId[] = [
  'class-5',
  'class-6',
  'class-7',
  'class-8',
  'class-9',
  'class-10',
  'inter-1',
  'inter-2',
];
const VALID_BOARDS = ['NCERT / CBSE', 'State Board', 'Intermediate Board'];
const MAX_PAGE_TOKEN_LENGTH = 500;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function boundedText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  return text ? text.slice(0, maxLength) : undefined;
}

export function isValidYouTubeVideoId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{11}$/.test(value);
}

export function normalizeYouTubePageToken(value: unknown): string | undefined {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > MAX_PAGE_TOKEN_LENGTH ||
    !/^[A-Za-z0-9_=-]+$/.test(value)
  ) {
    return undefined;
  }
  return value;
}

export function validateYouTubeSearchRequest(value: unknown): Validation<YouTubeSearchRequest> {
  if (!isRecord(value)) return { valid: false, error: 'Search filters are required.' };
  const query = boundedText(value.query, 200) ?? '';
  const gradeId = value.gradeId;
  const board = boundedText(value.board, 40);
  const subject = boundedText(value.subject, 100);
  const chapter = boundedText(value.chapter, 140);
  const topic = boundedText(value.topic, 140);

  if (value.query !== undefined && typeof value.query !== 'string') {
    return { valid: false, error: 'Search query must be text.' };
  }
  if (typeof value.query === 'string' && value.query.trim().length > 200) {
    return { valid: false, error: 'Search query must be 200 characters or fewer.' };
  }
  if (gradeId !== undefined && (typeof gradeId !== 'string' || !VALID_GRADES.includes(gradeId as GradeLevelId))) {
    return { valid: false, error: 'Choose a supported class or year.' };
  }
  if (value.board !== undefined && (!board || !VALID_BOARDS.includes(board))) {
    return { valid: false, error: 'Choose a supported education board.' };
  }
  for (const [field, original, normalized] of [
    ['subject', value.subject, subject],
    ['chapter', value.chapter, chapter],
    ['topic', value.topic, topic],
  ] as const) {
    if (original !== undefined && (typeof original !== 'string' || !normalized)) {
      return { valid: false, error: `${field} must be non-empty text.` };
    }
    if (typeof original === 'string' && original.length > (field === 'subject' ? 100 : 140)) {
      return { valid: false, error: `${field} is too long.` };
    }
  }
  if (value.pageToken !== undefined && !normalizeYouTubePageToken(value.pageToken)) {
    return { valid: false, error: 'The YouTube page token is invalid.' };
  }
  if (!query && !subject && !chapter && !topic) {
    return { valid: false, error: 'Enter a search phrase or select a curriculum topic.' };
  }

  const request: YouTubeSearchRequest = {
    query,
    ...(typeof gradeId === 'string' ? { gradeId: gradeId as GradeLevelId } : {}),
    ...(board ? { board } : {}),
    ...(subject ? { subject } : {}),
    ...(chapter ? { chapter } : {}),
    ...(topic ? { topic } : {}),
    ...(normalizeYouTubePageToken(value.pageToken)
      ? { pageToken: normalizeYouTubePageToken(value.pageToken) }
      : {}),
  };
  const finalQuery = buildYouTubeSearchQuery(request);
  if (finalQuery.length > 400) {
    return { valid: false, error: 'The combined curriculum search is too long.' };
  }
  return { valid: true, data: request };
}

export function buildYouTubeSearchQuery(request: YouTubeSearchRequest): string {
  const gradeLabel = request.gradeId
    ? request.gradeId.startsWith('inter-')
      ? `Intermediate ${request.gradeId === 'inter-1' ? '1st' : '2nd'} Year`
      : `Class ${request.gradeId.slice('class-'.length)}`
    : undefined;
  const fragments = [
    gradeLabel,
    request.board,
    request.subject,
    request.chapter,
    request.topic,
    request.query,
  ]
    .map((fragment) => fragment?.trim())
    .filter((fragment): fragment is string => Boolean(fragment));
  const uniqueFragments = fragments.filter(
    (fragment, index) =>
      fragments.findIndex((candidate) => candidate.toLowerCase() === fragment.toLowerCase()) ===
      index
  );
  return uniqueFragments.join(' ');
}

function parseIsoDuration(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value);
  if (!match) return undefined;
  const seconds =
    Number(match[1] ?? 0) * 3_600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
  return Number.isInteger(seconds) && seconds > 0 && seconds <= 7 * 24 * 3_600
    ? seconds
    : undefined;
}

export function getSafeYouTubeThumbnailUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['i.ytimg.com', 'img.youtube.com'].includes(url.hostname)
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function validPublishedAt(value: unknown): string | null {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

function parseDurationMap(value: unknown): Map<string, number> {
  const durations = new Map<string, number>();
  if (!isRecord(value) || !Array.isArray(value.items)) return durations;
  for (const item of value.items) {
    if (!isRecord(item) || !isRecord(item.contentDetails)) continue;
    const id = typeof item.id === 'string' ? item.id : '';
    const duration = parseIsoDuration(item.contentDetails.duration);
    if (isValidYouTubeVideoId(id) && duration !== undefined) durations.set(id, duration);
  }
  return durations;
}

export function normalizeYouTubeSearchResponse(
  value: unknown,
  durationResponse?: unknown
): YouTubeSearchResult | null {
  if (!isRecord(value) || !Array.isArray(value.items)) return null;
  const durations = parseDurationMap(durationResponse);
  const videos: YouTubeVideo[] = [];
  for (const item of value.items.slice(0, 12)) {
    if (!isRecord(item) || !isRecord(item.id) || !isRecord(item.snippet)) continue;
    const videoId = item.id.videoId;
    const snippet = item.snippet;
    const title = boundedText(snippet.title, 300);
    const channel = boundedText(snippet.channelTitle, 120);
    if (!isValidYouTubeVideoId(videoId) || !title || !channel) continue;

    const thumbnails = isRecord(snippet.thumbnails) ? snippet.thumbnails : {};
    const thumbnailUrl =
      getSafeYouTubeThumbnailUrl(isRecord(thumbnails.maxres) ? thumbnails.maxres.url : undefined) ??
      getSafeYouTubeThumbnailUrl(isRecord(thumbnails.high) ? thumbnails.high.url : undefined) ??
      getSafeYouTubeThumbnailUrl(isRecord(thumbnails.medium) ? thumbnails.medium.url : undefined) ??
      getSafeYouTubeThumbnailUrl(isRecord(thumbnails.default) ? thumbnails.default.url : undefined);
    videos.push({
      videoId,
      title,
      channel,
      thumbnailUrl,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      description: boundedText(snippet.description, 700) ?? '',
      publishedAt: validPublishedAt(snippet.publishedAt),
      ...(durations.has(videoId) ? { durationSeconds: durations.get(videoId)! } : {}),
    });
  }

  const pageInfo = isRecord(value.pageInfo) ? value.pageInfo : {};
  const totalResults =
    typeof pageInfo.totalResults === 'number' && Number.isFinite(pageInfo.totalResults)
      ? Math.max(0, Math.min(1_000_000, Math.floor(pageInfo.totalResults)))
      : videos.length;
  const nextPageToken = normalizeYouTubePageToken(value.nextPageToken);
  const prevPageToken = normalizeYouTubePageToken(value.prevPageToken);
  return {
    videos,
    ...(nextPageToken ? { nextPageToken } : {}),
    ...(prevPageToken ? { prevPageToken } : {}),
    totalResults,
  };
}

export function getYouTubeApiError(value: unknown, status: number): {
  status: number;
  message: string;
} {
  const reasons =
    isRecord(value) && isRecord(value.error) && Array.isArray(value.error.errors)
      ? value.error.errors
          .filter(isRecord)
          .map((error) => (typeof error.reason === 'string' ? error.reason : ''))
      : [];
  if (reasons.some((reason) => /quotaExceeded|dailyLimitExceeded|rateLimitExceeded/i.test(reason))) {
    return { status: 429, message: 'YouTube search quota is temporarily exhausted. Please try again later.' };
  }
  if (reasons.some((reason) => /keyInvalid|ipRefererBlocked|accessNotConfigured/i.test(reason))) {
    return { status: 503, message: 'YouTube search is not configured correctly on the server.' };
  }
  if (reasons.some((reason) => /invalidPageToken/i.test(reason))) {
    return { status: 400, message: 'That YouTube results page is no longer available. Search again.' };
  }
  if (status === 429) return { status: 429, message: 'YouTube is receiving too many searches. Please retry shortly.' };
  if (status >= 500) return { status: 502, message: 'YouTube search is temporarily unavailable.' };
  return { status: 502, message: 'YouTube could not complete this search.' };
}

export function createVideoBookmarkInput(video: YouTubeVideo): {
  resourceType: 'video';
  resourceId: string;
  title: string;
  metadata: BookmarkRecord['metadata'];
} | null {
  if (!isValidYouTubeVideoId(video.videoId) || !video.title.trim() || !video.channel.trim()) {
    return null;
  }
  return {
    resourceType: 'video',
    resourceId: video.videoId,
    title: video.title.slice(0, 300),
    metadata: {
      channel: video.channel.slice(0, 120),
      thumbnailUrl: getSafeYouTubeThumbnailUrl(video.thumbnailUrl) ?? undefined,
      videoUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
      ...(Number.isInteger(video.durationSeconds) &&
      video.durationSeconds! > 0 &&
      video.durationSeconds! <= 7 * 24 * 3_600
        ? { durationSeconds: video.durationSeconds }
        : {}),
    },
  };
}

export function createYouTubeSearchLink(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim().slice(0, 400))}`;
}

export function formatVideoDuration(durationSeconds: number): string {
  const seconds = Math.max(0, Math.floor(durationSeconds));
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainder = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function formatPublishedDate(value: string | null): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(
    timestamp
  );
}
