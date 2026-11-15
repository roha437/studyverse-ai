import { useEffect, useMemo, useState } from 'react';
import {
  ExternalLink,
  Loader2,
  Play,
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
  getSafeYouTubeThumbnailUrl,
  isValidYouTubeVideoId,
  type YouTubeSearchRequest,
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
  const [lastSearch, setLastSearch] = useState<YouTubeSearchRequest | null>(null);
  const [searched, setSearched] = useState(false);
  const [searchHistory, setSearchHistory] = useState(readSearchHistory);
  const [busyBookmarkId, setBusyBookmarkId] = useState<string | null>(null);
  const [bookmarkError, setBookmarkError] = useState<string | null>(null);
  const [bookmarkMessage, setBookmarkMessage] = useState<string | null>(null);
  const [busyProgressVideoId, setBusyProgressVideoId] = useState<string | null>(null);
  const [progressActionError, setProgressActionError] = useState<string | null>(null);
  const [progressActionMessage, setProgressActionMessage] = useState<string | null>(null);

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

  const runSearch = (request: YouTubeSearchRequest) => {
    setBookmarkMessage(null);
    const baseRequest = { ...request, query: request.query.trim() };
    setLastSearch(baseRequest);
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
    window.open(
      createYouTubeSearchLink(buildYouTubeSearchQuery(baseRequest)),
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleSearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    const request = requestForCurrentContext();
    void runSearch(request);
  };

  const handleQuickSearch = (searchText: string, overrides: SearchOverrides = {}) => {
    setQuery(searchText);
    runSearch(requestForCurrentContext({ ...overrides, query: searchText }));
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
            <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5a45c8] px-5 py-3 text-sm font-semibold text-white hover:bg-[#442cb2]">
              <Search className="h-4 w-4" aria-hidden="true" />
              Search videos
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
                <button key={item} type="button" onClick={() => handleQuickSearch(item)} className="rounded-full border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] px-3 py-1.5 text-xs text-[#442cb2] dark:text-[#c4b5fd] hover:bg-[#e5deff]">
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
                <button key={task.id} type="button" onClick={() => handleQuickSearch(task.title, { subject: task.subjectName, chapter: null, topic: task.title })} className="max-w-full truncate rounded-full border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] px-3 py-1.5 text-xs text-[#442cb2] dark:text-[#c4b5fd] hover:bg-[#e5deff]">
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
                <button key={item} type="button" onClick={() => handleQuickSearch(item)} className="rounded-full bg-[#f0ebff] dark:bg-[#221a3a] px-3 py-1.5 text-xs text-[#6b6684] dark:text-[#b0a6cf] hover:text-[#442cb2]">
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {videoProgressError ? <div role="status" className="rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-3 text-xs text-[#9a3412]">Video progress sync is unavailable: {videoProgressError}</div> : null}
      {progressActionError ? <div role="alert" className="rounded-xl border border-[#fecaca] bg-[#fef2f2] p-3 text-xs text-[#b91c1c]">{progressActionError}</div> : null}
      {progressActionMessage ? <div role="status" className="rounded-xl border border-[#a7f3d0] dark:border-[#047857] bg-[#ecfdf5] dark:bg-[#102d24] p-3 text-xs text-[#047857] dark:text-[#6ee7b7]">{progressActionMessage}</div> : null}
      {bookmarkError ? <div role="alert" className="rounded-xl border border-[#fecaca] bg-[#fef2f2] p-3 text-xs text-[#b91c1c]">{bookmarkError}</div> : null}
      {bookmarkMessage ? <div role="status" className="rounded-xl border border-[#a7f3d0] dark:border-[#047857] bg-[#ecfdf5] dark:bg-[#102d24] p-3 text-xs text-[#047857] dark:text-[#6ee7b7]">{bookmarkMessage}</div> : null}

      {searched ? (
        <section className="space-y-4">
          <div className="rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5 sm:p-6">
            <div>
              <h3 className="font-display text-lg font-bold text-[#1b1831] dark:text-[#f3f0fc]">
                Your YouTube search is ready
              </h3>
              <p className="mt-1 text-sm text-[#6b6684] dark:text-[#b0a6cf]">
                Open YouTube to browse real videos for the selected class and curriculum topic. StudyVerse does not scrape or fabricate video results.
              </p>
            </div>
            <a href={currentSearchLink} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#5a45c8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#442cb2]" aria-label="Watch videos on YouTube search results">
              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              Watch on YouTube
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
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
                  <a href={video.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#5a45c8] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#442cb2]">
                    <Play className="h-3.5 w-3.5" aria-hidden="true" /> Watch on YouTube
                  </a>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <label className="sr-only" htmlFor={`hub-saved-video-progress-${video.videoId}`}>Progress for {video.title}</label>
                    <select
                      id={`hub-saved-video-progress-${video.videoId}`}
                      value={getVideoProgressStatus(video.videoId)}
                      disabled={busyProgressVideoId === video.videoId}
                      onChange={(event) => void handleUpdateVideoProgress(video, event.target.value as VideoLearningStatus)}
                      className="min-w-0 flex-1 rounded-lg border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] px-2 py-1.5 text-xs text-[#1b1831] dark:text-[#f3f0fc] disabled:opacity-60"
                    >
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                    {getVideoProgressStatus(video.videoId) === 'completed' ? (
                      <button
                        type="button"
                        onClick={() => onStartQuizFromVideo(selectedLearningContext, board)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#e5deff] dark:border-[#372a5c] px-2 py-1.5 text-xs font-semibold text-[#442cb2] dark:text-[#c4b5fd]"
                      >
                        Start Quiz
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busyProgressVideoId === video.videoId}
                        onClick={() => void handleUpdateVideoProgress(video, 'completed')}
                        className="rounded-lg border border-[#a7f3d0] bg-[#ecfdf5] px-2 py-1.5 text-xs font-semibold text-[#047857] disabled:opacity-60"
                      >
                        Mark complete
                      </button>
                    )}
                  </div>
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
        <strong className="text-[#484554] dark:text-[#d1c9e8]">Search uses YouTube’s public results page.</strong>{' '}
        Search terms include the selected class, subject, chapter, and topic when available. StudyVerse does not scrape YouTube or claim results are syllabus-aligned.
      </div>
    </div>
  );
}
