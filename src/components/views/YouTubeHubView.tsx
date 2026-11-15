import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  Clock3,
  ExternalLink,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Youtube,
} from 'lucide-react';
import type {
  ActiveStudyContext,
  BoardId,
  BookmarkRecord,
  DbOperationResult,
  NavModuleId,
  StudyTask,
  VideoLearningProgress,
  VideoLearningProgressInput,
  VideoLearningStatus,
} from '../../types/studyverse';
import { CURRICULUM_CLASSES } from '../../data/curriculum';
import { getAvailableSubjects, getClassById, resolveContextDetails } from '../../utils/curriculumHelpers';
import {
  buildYouTubeSearchQuery,
  createVideoBookmarkInput,
  createYouTubeSearchLink,
  formatPublishedDate,
  formatVideoDuration,
  getSafeYouTubeThumbnailUrl,
  isValidYouTubeVideoId,
  type YouTubeSearchRequest,
  type YouTubeSearchResult,
  type YouTubeVideo,
} from '../../utils/youtubeHelpers';
import { ContextBreadcrumbBar } from '../common/ContextBreadcrumbBar';
import { createVideoLearningProgressInput } from '../../utils/videoLearningHelpers';

interface YouTubeHubViewProps {
  context: ActiveStudyContext;
  board: BoardId;
  tasks: StudyTask[];
  bookmarks: BookmarkRecord[];
  isAuthenticated: boolean;
  videoProgress: VideoLearningProgress[];
  videoProgressError: string | null;
  onUpdateVideoProgress: (
    input: VideoLearningProgressInput
  ) => Promise<DbOperationResult<VideoLearningProgress>>;
  onStartQuizFromVideo: (context: ActiveStudyContext, board: BoardId) => void;
  onToggleBookmark: (input: {
    resourceType: 'video';
    resourceId: string;
    title: string;
    metadata: BookmarkRecord['metadata'];
  }) => Promise<DbOperationResult<BookmarkRecord | { removedId: string }>>;
  onNavigate: (module: NavModuleId) => void;
}

type DurationFilter = 'any' | 'short' | 'medium' | 'long';

interface SearchOverrides {
  query?: string;
  subject?: string;
  chapter?: string | null;
  topic?: string | null;
}

const HISTORY_STORAGE_KEY = 'studyverse-youtube-search-history';
const MAX_HISTORY_ITEMS = 6;

function readSearchHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string').slice(0, MAX_HISTORY_ITEMS)
      : [];
  } catch {
    return [];
  }
}

function saveSearchHistory(items: string[]): void {
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Search remains usable when browser storage is disabled.
  }
}

function getBookmarkVideo(bookmark: BookmarkRecord): YouTubeVideo | null {
  if (bookmark.resourceType !== 'video' || !isValidYouTubeVideoId(bookmark.resourceId)) return null;
  return {
    videoId: bookmark.resourceId,
    title: bookmark.title,
    channel: bookmark.metadata.channel ?? bookmark.metadata.subtitle ?? 'YouTube channel',
    thumbnailUrl: getSafeYouTubeThumbnailUrl(bookmark.metadata.thumbnailUrl),
    videoUrl: `https://www.youtube.com/watch?v=${bookmark.resourceId}`,
    description: '',
    publishedAt: null,
    ...(typeof bookmark.metadata.durationSeconds === 'number'
      ? { durationSeconds: bookmark.metadata.durationSeconds }
      : {}),
  };
}

export function YouTubeHubView({
  context,
  board: initialBoard,
  tasks,
  bookmarks,
  isAuthenticated,
  videoProgress,
  videoProgressError,
  onUpdateVideoProgress,
  onStartQuizFromVideo,
  onToggleBookmark,
  onNavigate,
}: YouTubeHubViewProps) {
  const initialDetails = resolveContextDetails(context);
  const [gradeId, setGradeId] = useState(context.gradeId);
  const [board, setBoard] = useState<BoardId>(initialBoard);
  const [subjectId, setSubjectId] = useState(initialDetails.subject.id);
  const [chapterId, setChapterId] = useState(initialDetails.chapter.id);
  const [topicId, setTopicId] = useState(initialDetails.topic.id);
  const [query, setQuery] = useState('');
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('any');
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [lastSearch, setLastSearch] = useState<YouTubeSearchRequest | null>(null);
  const [resultCount, setResultCount] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [configurationMissing, setConfigurationMissing] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchWarning, setSearchWarning] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState(readSearchHistory);
  const [busyBookmarkId, setBusyBookmarkId] = useState<string | null>(null);
  const [bookmarkError, setBookmarkError] = useState<string | null>(null);
  const [bookmarkMessage, setBookmarkMessage] = useState<string | null>(null);
  const [busyProgressVideoId, setBusyProgressVideoId] = useState<string | null>(null);
  const [progressActionError, setProgressActionError] = useState<string | null>(null);
  const [progressActionMessage, setProgressActionMessage] = useState<string | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  const cls = getClassById(gradeId);
  const availableSubjects = getAvailableSubjects(gradeId, context.streamId);
  const subject = availableSubjects.find((item) => item.id === subjectId) ?? availableSubjects[0];
  const chapter = subject?.chapters.find((item) => item.id === chapterId) ?? subject?.chapters[0];
  const topic = chapter?.topics.find((item) => item.id === topicId) ?? chapter?.topics[0];
  const selectedLearningContext: ActiveStudyContext =
    subject && chapter && topic
      ? {
          gradeId,
          streamId: context.streamId,
          subjectId: subject.id,
          chapterId: chapter.id,
          topicId: topic.id,
        }
      : context;
  const videoBookmarks = useMemo(
    () => bookmarks.filter((bookmark) => bookmark.resourceType === 'video'),
    [bookmarks]
  );
  const plannedSearches = useMemo(
    () =>
      tasks
        .filter((task) => !task.completed)
        .slice()
        .sort((a, b) => (a.planDate ?? '').localeCompare(b.planDate ?? ''))
        .slice(0, 4),
    [tasks]
  );

  useEffect(() => () => searchAbortRef.current?.abort(), []);

  useEffect(() => {
    if (!availableSubjects.length) return;
    if (!availableSubjects.some((item) => item.id === subjectId)) {
      const nextSubject = availableSubjects[0];
      setSubjectId(nextSubject.id);
      setChapterId(nextSubject.chapters[0]?.id ?? '');
      setTopicId(nextSubject.chapters[0]?.topics[0]?.id ?? '');
    }
  }, [availableSubjects, subjectId]);

  const handleGradeChange = (nextGrade: typeof gradeId) => {
    const nextSubjects = getAvailableSubjects(nextGrade, context.streamId);
    const nextSubject = nextSubjects[0];
    setGradeId(nextGrade);
    setSubjectId(nextSubject?.id ?? '');
    setChapterId(nextSubject?.chapters[0]?.id ?? '');
    setTopicId(nextSubject?.chapters[0]?.topics[0]?.id ?? '');
  };

  const handleSubjectChange = (nextSubjectId: string) => {
    const nextSubject = availableSubjects.find((item) => item.id === nextSubjectId);
    setSubjectId(nextSubjectId);
    setChapterId(nextSubject?.chapters[0]?.id ?? '');
    setTopicId(nextSubject?.chapters[0]?.topics[0]?.id ?? '');
  };

  const handleChapterChange = (nextChapterId: string) => {
    const nextChapter = subject?.chapters.find((item) => item.id === nextChapterId);
    setChapterId(nextChapterId);
    setTopicId(nextChapter?.topics[0]?.id ?? '');
  };

  const requestForCurrentContext = (overrides: SearchOverrides = {}): YouTubeSearchRequest => {
    const selectedChapter =
      overrides.chapter === null ? undefined : overrides.chapter ?? chapter?.title;
    const selectedTopic = overrides.topic === null ? undefined : overrides.topic ?? topic?.title;
    return {
      query: (overrides.query ?? query).trim(),
      gradeId,
      board,
      ...(overrides.subject ?? subject?.name ? { subject: overrides.subject ?? subject?.name } : {}),
      ...(selectedChapter ? { chapter: selectedChapter } : {}),
      ...(selectedTopic ? { topic: selectedTopic } : {}),
    };
  };

  const runSearch = async (
    request: YouTubeSearchRequest,
    options: { append?: boolean; pageToken?: string } = {}
  ) => {
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setSearching(true);
    setSearchError(null);
    setConfigurationMissing(false);
    setSearchWarning(null);
    setBookmarkMessage(null);
    const baseRequest = { ...request, query: request.query.trim() };
    setLastSearch(baseRequest);
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({
      ...baseRequest,
      pageToken: options.pageToken,
    })) {
      if (typeof value === 'string' && value) params.set(key, value);
    }

    try {
      const response = await fetch(`/api/youtube/search?${params.toString()}`, {
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => ({}))) as Partial<YouTubeSearchResult> & {
        error?: string;
      };
      if (!response.ok) {
        setConfigurationMissing(response.status === 503);
        throw new Error(payload.error ?? 'YouTube search failed.');
      }

      const videos = Array.isArray(payload.videos) ? payload.videos : [];
      setSearchResults((current) => options.append ? [...current, ...videos] : videos);
      setNextPageToken(payload.nextPageToken);
      setResultCount(typeof payload.totalResults === 'number' ? payload.totalResults : videos.length);
      setSearchWarning(payload.warning ?? null);
      setConfigurationMissing(false);
      setSearched(true);
      const historyItem =
        baseRequest.query ||
        [cls.label, baseRequest.subject, baseRequest.chapter, baseRequest.topic]
          .filter(Boolean)
          .join(' ');
      if (historyItem) {
        setSearchHistory((current) => {
          const next = [historyItem, ...current.filter((item) => item !== historyItem)].slice(
            0,
            MAX_HISTORY_ITEMS
          );
          saveSearchHistory(next);
          return next;
        });
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setSearchError(error instanceof Error ? error.message : 'YouTube search failed.');
      }
    } finally {
      if (searchAbortRef.current === controller) {
        searchAbortRef.current = null;
        setSearching(false);
      }
    }
  };

  const handleSearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    const request = requestForCurrentContext();
    setSearched(true);
    void runSearch(request);
  };

  const handleQuickSearch = (searchText: string, overrides: SearchOverrides = {}) => {
    setQuery(searchText);
    void runSearch(requestForCurrentContext({ ...overrides, query: searchText }));
  };

  const handleBookmark = async (video: YouTubeVideo) => {
    const bookmarkInput = createVideoBookmarkInput(video);
    if (!bookmarkInput) {
      setBookmarkError('This video ID is invalid, so it cannot be saved.');
      return;
    }
    setBusyBookmarkId(video.videoId);
    setBookmarkError(null);
    setBookmarkMessage(null);
    try {
      const result = await onToggleBookmark(bookmarkInput);
      if (result.error || !result.data) {
        setBookmarkError(result.error ?? 'Could not update this video bookmark.');
        return;
      }
      setBookmarkMessage(
        'removedId' in result.data
          ? 'Video removed from your saved list.'
          : isAuthenticated
            ? 'Video saved to your account and Personal Library.'
            : 'Video saved for this preview session. Sign in to keep it across devices.'
      );
    } catch {
      setBookmarkError('Could not update this video bookmark. Please try again.');
    } finally {
      setBusyBookmarkId(null);
    }
  };

  const getVideoProgressStatus = (videoId: string): VideoLearningStatus =>
    videoProgress.find((item) => item.videoId === videoId)?.status ?? 'not_started';

  const handleUpdateVideoProgress = async (
    video: YouTubeVideo,
    status: VideoLearningStatus
  ) => {
    const input = createVideoLearningProgressInput(video, selectedLearningContext, board, status);
    if (!input) {
      setProgressActionError('This video could not be saved because its details are invalid.');
      return;
    }
    setBusyProgressVideoId(video.videoId);
    setProgressActionError(null);
    setProgressActionMessage(null);
    try {
      const result = await onUpdateVideoProgress(input);
      if (result.error || !result.data) {
        setProgressActionError(result.error ?? 'Could not save video progress.');
        return;
      }
      setProgressActionMessage(
        isAuthenticated
          ? 'Video progress saved to your account.'
          : 'Video progress saved for this session.'
      );
    } catch (error) {
      setProgressActionError(
        error instanceof Error ? error.message : 'Could not save video progress.'
      );
    } finally {
      setBusyProgressVideoId(null);
    }
  };

  const currentSearchLink = createYouTubeSearchLink(
    buildYouTubeSearchQuery(lastSearch ?? requestForCurrentContext())
  );
  const currentContextSearches = topic
    ? [
        `${topic.title} explained`,
        `${topic.title} solved examples`,
        `${chapter?.title ?? topic.title} revision`,
      ]
    : [];
  const savedVideos = videoBookmarks
    .map(getBookmarkVideo)
    .filter((video): video is YouTubeVideo => video !== null);
  const visibleSearchResults = searchResults.filter((video) => {
    if (durationFilter === 'any') return true;
    if (video.durationSeconds === undefined) return false;
    if (durationFilter === 'short') return video.durationSeconds < 600;
    if (durationFilter === 'medium') return video.durationSeconds >= 600 && video.durationSeconds <= 1_800;
    return video.durationSeconds > 1_800;
  });

  return (
    <div className="space-y-6">
      <ContextBreadcrumbBar
        context={{
          ...context,
          gradeId,
          subjectId: subject?.id ?? context.subjectId,
          chapterId: chapter?.id ?? context.chapterId,
          topicId: topic?.id ?? context.topicId,
        }}
        onNavigate={onNavigate}
      />

      <section className="rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Youtube className="w-6 h-6 text-[#5a45c8] dark:text-[#a78bfa]" aria-hidden="true" />
              <h2 className="font-display text-xl font-bold text-[#1b1831] dark:text-[#f3f0fc]">
                YouTube Learning Hub
              </h2>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-[#6b6684] dark:text-[#b0a6cf]">
              Search real YouTube videos using your StudyVerse class and curriculum context. Results are YouTube search results, not independently syllabus-verified.
            </p>
          </div>
          <span className="rounded-full bg-[#f0ebff] dark:bg-[#221a3a] px-3 py-1 text-xs font-medium text-[#6b6684] dark:text-[#b0a6cf]">
            {isAuthenticated ? 'Bookmarks sync to your account' : 'Guest bookmarks are session-only'}
          </span>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            <label className="text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf]">
              Class / year
              <select value={gradeId} onChange={(event) => handleGradeChange(event.target.value as typeof gradeId)} className="mt-1.5 w-full rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] px-3 py-2.5 text-sm text-[#1b1831] dark:text-[#f3f0fc]">
                {CURRICULUM_CLASSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf]">
              Board
              <select value={board} onChange={(event) => setBoard(event.target.value as BoardId)} className="mt-1.5 w-full rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] px-3 py-2.5 text-sm text-[#1b1831] dark:text-[#f3f0fc]">
                <option value="NCERT / CBSE">NCERT / CBSE</option>
                <option value="State Board">State Board</option>
                <option value="Intermediate Board">Intermediate Board</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf]">
              Subject
              <select value={subject?.id ?? ''} onChange={(event) => handleSubjectChange(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] px-3 py-2.5 text-sm text-[#1b1831] dark:text-[#f3f0fc]">
                {availableSubjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf]">
              Chapter
              <select value={chapter?.id ?? ''} onChange={(event) => handleChapterChange(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] px-3 py-2.5 text-sm text-[#1b1831] dark:text-[#f3f0fc]">
                {subject?.chapters.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf]">
              Topic
              <select value={topic?.id ?? ''} onChange={(event) => setTopicId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] px-3 py-2.5 text-sm text-[#1b1831] dark:text-[#f3f0fc]">
                {chapter?.topics.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#776d94] pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                maxLength={200}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Custom YouTube search phrase"
                placeholder={`${topic?.title ?? 'Search topic'} (optional phrase)`}
                className="w-full rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] pl-10 pr-4 py-3 text-sm text-[#1b1831] dark:text-[#f3f0fc] focus:outline-none focus:ring-2 focus:ring-[#5a45c8]"
              />
            </div>
            <select
              aria-label="Filter video duration"
              value={durationFilter}
              onChange={(event) => setDurationFilter(event.target.value as DurationFilter)}
              className="rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] px-3 py-3 text-sm text-[#1b1831] dark:text-[#f3f0fc]"
            >
              <option value="any">Any duration</option>
              <option value="short">Under 10 min</option>
              <option value="medium">10–30 min</option>
              <option value="long">30+ min</option>
            </select>
            <button type="submit" disabled={searching} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5a45c8] px-5 py-3 text-sm font-semibold text-white hover:bg-[#442cb2] disabled:opacity-60">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
              {searching ? 'Searching...' : 'Search videos'}
            </button>
          </div>
        </form>

        {currentContextSearches.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf]">
              <Sparkles className="h-3.5 w-3.5 text-[#5a45c8]" aria-hidden="true" />
              Quick searches for {topic?.title}
            </div>
            <div className="flex flex-wrap gap-2">
              {currentContextSearches.map((item) => (
                <button key={item} type="button" disabled={searching} onClick={() => handleQuickSearch(item)} className="rounded-full border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] px-3 py-1.5 text-xs text-[#442cb2] dark:text-[#c4b5fd] hover:bg-[#e5deff] disabled:opacity-50">
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {plannedSearches.length > 0 ? (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf]">
              From your upcoming study plan
            </div>
            <div className="flex flex-wrap gap-2">
              {plannedSearches.map((task) => (
                <button key={task.id} type="button" disabled={searching} onClick={() => handleQuickSearch(task.title, { subject: task.subjectName, chapter: null, topic: task.title })} className="max-w-full truncate rounded-full border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] px-3 py-1.5 text-xs text-[#442cb2] dark:text-[#c4b5fd] hover:bg-[#e5deff] disabled:opacity-50">
                  {task.subjectName}: {task.title}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {searchHistory.length > 0 ? (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf]">Recent searches</div>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((item) => (
                <button key={item} type="button" disabled={searching} onClick={() => handleQuickSearch(item)} className="rounded-full bg-[#f0ebff] dark:bg-[#221a3a] px-3 py-1.5 text-xs text-[#6b6684] dark:text-[#b0a6cf] hover:text-[#442cb2] disabled:opacity-50">
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {searchError ? (
        <div role="alert" className="rounded-2xl border border-[#fecaca] dark:border-[#7f1d1d] bg-[#fef2f2] dark:bg-[#3b151a] p-4 text-sm text-[#b91c1c] dark:text-[#fca5a5]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{searchError}</span>
            <button type="button" disabled={searching} onClick={() => lastSearch ? void runSearch(lastSearch) : handleSearch()} className="inline-flex items-center gap-1.5 rounded-lg border border-[#fecaca] px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
            </button>
          </div>
          {configurationMissing ? (
            <div className="mt-3 rounded-xl bg-white/70 dark:bg-black/10 p-3 text-xs leading-relaxed">
              <strong>Server setup required:</strong> add a YouTube Data API v3 key as server-side{' '}
              <code>YOUTUBE_API_KEY</code>. No fake results are shown. You can still search the same curriculum topic directly on YouTube:
              <a href={currentSearchLink} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center gap-1 font-semibold underline">
                Open YouTube search <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>
          ) : null}
        </div>
      ) : null}

      {videoProgressError ? <div role="status" className="rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-3 text-xs text-[#9a3412]">Video progress sync is unavailable: {videoProgressError}</div> : null}
      {progressActionError ? <div role="alert" className="rounded-xl border border-[#fecaca] bg-[#fef2f2] p-3 text-xs text-[#b91c1c]">{progressActionError}</div> : null}
      {progressActionMessage ? <div role="status" className="rounded-xl border border-[#a7f3d0] dark:border-[#047857] bg-[#ecfdf5] dark:bg-[#102d24] p-3 text-xs text-[#047857] dark:text-[#6ee7b7]">{progressActionMessage}</div> : null}
      {bookmarkError ? <div role="alert" className="rounded-xl border border-[#fecaca] bg-[#fef2f2] p-3 text-xs text-[#b91c1c]">{bookmarkError}</div> : null}
      {bookmarkMessage ? <div role="status" className="rounded-xl border border-[#a7f3d0] dark:border-[#047857] bg-[#ecfdf5] dark:bg-[#102d24] p-3 text-xs text-[#047857] dark:text-[#6ee7b7]">{bookmarkMessage}</div> : null}

      {searched && !searching && !searchError ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="font-display text-lg font-bold text-[#1b1831] dark:text-[#f3f0fc]">
                YouTube search results
              </h3>
              <p className="text-xs text-[#776d94] dark:text-[#968cb8]">
                {visibleSearchResults.length} loaded matches · {resultCount.toLocaleString()} YouTube results · Not independently syllabus-verified
              </p>
            </div>
            {lastSearch ? (
              <a href={createYouTubeSearchLink(buildYouTubeSearchQuery(lastSearch))} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#442cb2] dark:text-[#c4b5fd]">
                Search directly on YouTube <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            ) : null}
          </div>
          {searchWarning ? <p role="status" className="rounded-lg bg-[#fffbeb] p-3 text-xs text-[#92400e]">{searchWarning}</p> : null}
          {visibleSearchResults.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d8cff2] dark:border-[#3b2e63] bg-white dark:bg-[#19132b] p-8 text-center">
              <h4 className="font-display text-base font-bold text-[#1b1831] dark:text-[#f3f0fc]">{searchResults.length > 0 ? 'No videos match this duration' : 'No videos found'}</h4>
              <p className="mt-1.5 text-sm text-[#6b6684] dark:text-[#b0a6cf]">{searchResults.length > 0 ? 'Choose Any duration or load more results.' : 'Try a shorter phrase or search the topic directly on YouTube.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleSearchResults.map((video) => {
                const isSaved = videoBookmarks.some((bookmark) => bookmark.resourceId === video.videoId);
                const dateLabel = formatPublishedDate(video.publishedAt);
                return (
                  <article key={video.videoId} className="overflow-hidden rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b]">
                    <a href={video.videoUrl} target="_blank" rel="noopener noreferrer" className="group relative block aspect-video overflow-hidden bg-[#221a3a]" aria-label={`Watch ${video.title} on YouTube`}>
                      {video.thumbnailUrl ? (
                        <img src={video.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[#c4b5fd]"><Youtube className="h-10 w-10" aria-hidden="true" /></div>
                      )}
                      {video.durationSeconds ? <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-semibold text-white">{formatVideoDuration(video.durationSeconds)}</span> : null}
                      <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100">
                        <span className="rounded-full bg-[#5a45c8] p-3"><Play className="h-5 w-5 fill-current" aria-hidden="true" /></span>
                      </span>
                    </a>
                    <div className="space-y-2.5 p-4">
                      <a href={video.videoUrl} target="_blank" rel="noopener noreferrer" className="line-clamp-2 block font-display text-sm font-bold text-[#1b1831] hover:text-[#442cb2] dark:text-[#f3f0fc] dark:hover:text-[#c4b5fd]">
                        {video.title}
                      </a>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6b6684] dark:text-[#b0a6cf]">
                        <span>{video.channel}</span>
                        {dateLabel ? <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" aria-hidden="true" />{dateLabel}</span> : null}
                        {video.durationSeconds ? <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" aria-hidden="true" />{formatVideoDuration(video.durationSeconds)}</span> : null}
                      </div>
                      {video.description ? <p className="line-clamp-3 text-xs leading-relaxed text-[#776d94] dark:text-[#968cb8]">{video.description}</p> : null}
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="sr-only" htmlFor={`hub-video-progress-${video.videoId}`}>Progress for {video.title}</label>
                        <select
                          id={`hub-video-progress-${video.videoId}`}
                          value={getVideoProgressStatus(video.videoId)}
                          disabled={busyProgressVideoId === video.videoId}
                          onChange={(event) => void handleUpdateVideoProgress(video, event.target.value as VideoLearningStatus)}
                          className="min-w-0 flex-1 rounded-lg border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] px-2.5 py-2 text-xs text-[#1b1831] dark:text-[#f3f0fc] disabled:opacity-60"
                        >
                          <option value="not_started">Not Started</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                        {getVideoProgressStatus(video.videoId) === 'completed' ? (
                          <button
                            type="button"
                            onClick={() => onStartQuizFromVideo(selectedLearningContext, board)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#5a45c8] px-2.5 py-2 text-xs font-semibold text-white hover:bg-[#442cb2]"
                          >
                            <Play className="h-3.5 w-3.5" aria-hidden="true" /> Start Quiz
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busyProgressVideoId === video.videoId}
                            onClick={() => void handleUpdateVideoProgress(video, 'completed')}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#a7f3d0] bg-[#ecfdf5] px-2.5 py-2 text-xs font-semibold text-[#047857] disabled:opacity-60"
                          >
                            {busyProgressVideoId === video.videoId ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                            Mark as Completed
                          </button>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-[#ece6ff] dark:border-[#2e244d] pt-2.5">
                        <a href={video.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-[#5a45c8] px-3 py-2 text-xs font-semibold text-white hover:bg-[#442cb2]">
                          <Play className="h-3.5 w-3.5" aria-hidden="true" /> Watch
                        </a>
                        <button type="button" disabled={busyBookmarkId === video.videoId} onClick={() => void handleBookmark(video)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5deff] dark:border-[#372a5c] px-3 py-2 text-xs font-semibold text-[#442cb2] dark:text-[#c4b5fd] disabled:opacity-50">
                          {busyBookmarkId === video.videoId ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : isSaved ? <BookmarkCheck className="h-3.5 w-3.5" aria-hidden="true" /> : <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />}
                          {isSaved ? 'Saved' : 'Save video'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {nextPageToken && lastSearch ? (
            <div className="flex justify-center">
              <button type="button" disabled={searching} onClick={() => void runSearch(lastSearch, { append: true, pageToken: nextPageToken })} className="inline-flex items-center gap-2 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-white dark:bg-[#19132b] px-4 py-2.5 text-sm font-semibold text-[#442cb2] dark:text-[#c4b5fd] disabled:opacity-50">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
                Load more videos
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {savedVideos.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-lg font-bold text-[#1b1831] dark:text-[#f3f0fc]">Saved videos</h3>
              <p className="text-xs text-[#776d94] dark:text-[#968cb8]">Also available in your Personal Library.</p>
            </div>
            <button type="button" onClick={() => onNavigate('library')} className="text-xs font-semibold text-[#442cb2] dark:text-[#c4b5fd]">Open Library</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {savedVideos.map((video) => (
              <div key={video.videoId} className="flex items-center gap-3 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-white dark:bg-[#19132b] p-3">
                {video.thumbnailUrl ? <img src={video.thumbnailUrl} alt="" loading="lazy" className="h-16 w-28 rounded-lg object-cover" /> : <div className="flex h-16 w-28 items-center justify-center rounded-lg bg-[#221a3a] text-[#c4b5fd]"><Youtube className="h-6 w-6" aria-hidden="true" /></div>}
                <div className="min-w-0 flex-1">
                  <a href={video.videoUrl} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-sm font-semibold text-[#1b1831] dark:text-[#f3f0fc] hover:text-[#442cb2]">{video.title}</a>
                  <p className="mt-1 truncate text-xs text-[#776d94] dark:text-[#968cb8]">{video.channel}</p>
                </div>
                <button type="button" disabled={busyBookmarkId === video.videoId} onClick={() => void handleBookmark(video)} aria-label={`Remove saved video ${video.title}`} className="rounded-lg p-2 text-[#8f84b3] hover:bg-[#fef2f2] hover:text-[#b91c1c] disabled:opacity-50">
                  {busyBookmarkId === video.videoId ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-[#fcfaff] dark:bg-[#19132b] p-4 text-xs leading-relaxed text-[#6b6684] dark:text-[#b0a6cf]">
        <strong className="text-[#484554] dark:text-[#d1c9e8]">Search results come from YouTube Data API.</strong>{' '}
        StudyVerse does not scrape YouTube, autoplay videos, or claim results are syllabus-aligned. When API search is not configured, use the direct YouTube search link shown with the setup message.
      </div>
    </div>
  );
}
