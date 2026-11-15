import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Youtube,
} from 'lucide-react';
import type {
  ActiveStudyContext,
  BoardId,
  DbOperationResult,
  VideoLearningProgress,
  VideoLearningProgressInput,
  VideoLearningStatus,
} from '../../types/studyverse';
import {
  buildVideoLearningSearchRequest,
  createVideoLearningProgressInput,
} from '../../utils/videoLearningHelpers';
import {
  buildYouTubeSearchQuery,
  createYouTubeSearchLink,
  formatPublishedDate,
  formatVideoDuration,
  getSafeYouTubeThumbnailUrl,
  isValidYouTubeVideoId,
  type YouTubeSearchResult,
  type YouTubeVideo,
} from '../../utils/youtubeHelpers';

interface VideoLearningPanelProps {
  context: ActiveStudyContext;
  board: BoardId;
  initialQuery?: string;
  progress: VideoLearningProgress[];
  progressError?: string | null;
  isAuthenticated: boolean;
  linkedVideoId?: string;
  onUpdateProgress: (
    input: VideoLearningProgressInput
  ) => Promise<DbOperationResult<VideoLearningProgress>>;
  onStartQuiz: (context: ActiveStudyContext, board: BoardId) => void;
  onLinkVideo?: (video: YouTubeVideo) => void;
}

export function VideoLearningPanel({
  context,
  board,
  initialQuery,
  progress,
  progressError,
  isAuthenticated,
  linkedVideoId,
  onUpdateProgress,
  onStartQuiz,
  onLinkVideo,
}: VideoLearningPanelProps) {
  const [query, setQuery] = useState(initialQuery ?? 'lesson explanation');
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [configurationMissing, setConfigurationMissing] = useState(false);
  const [busyVideoId, setBusyVideoId] = useState<string | null>(null);
  const [progressActionError, setProgressActionError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const activeContextKey = [
    context.gradeId,
    context.streamId,
    context.subjectId,
    context.chapterId,
    context.topicId,
    board,
  ].join(':');

  const searchVideos = async (pageToken?: string) => {
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setSearching(true);
    setSearchError(null);
    setConfigurationMissing(false);
    setProgressActionError(null);
    const request = buildVideoLearningSearchRequest(context, board, query);
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...request, pageToken })) {
      if (typeof value === 'string' && value) params.set(key, value);
    }

    try {
      const response = await fetch(`/api/youtube/search?${params.toString()}`, {
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => null)) as
        | (Partial<YouTubeSearchResult> & { error?: string })
        | null;
      if (!response.ok) {
        setConfigurationMissing(response.status === 503);
        throw new Error(payload?.error ?? 'YouTube search failed. Please retry.');
      }
      if (!payload || !Array.isArray(payload.videos)) {
        throw new Error('YouTube returned an invalid response. Please retry.');
      }
      const results = payload.videos.flatMap((value): YouTubeVideo[] => {
        if (!value || typeof value !== 'object') return [];
        const video = value as YouTubeVideo;
        if (
          !isValidYouTubeVideoId(video.videoId) ||
          typeof video.title !== 'string' ||
          !video.title.trim() ||
          typeof video.channel !== 'string' ||
          !video.channel.trim()
        ) {
          return [];
        }
        return [
          {
            videoId: video.videoId,
            title: video.title.slice(0, 300),
            channel: video.channel.slice(0, 120),
            thumbnailUrl: getSafeYouTubeThumbnailUrl(video.thumbnailUrl),
            videoUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
            description: typeof video.description === 'string' ? video.description.slice(0, 700) : '',
            publishedAt:
              typeof video.publishedAt === 'string' && Number.isFinite(Date.parse(video.publishedAt))
                ? new Date(video.publishedAt).toISOString()
                : null,
            ...(Number.isInteger(video.durationSeconds) &&
            video.durationSeconds! > 0 &&
            video.durationSeconds! <= 7 * 24 * 3_600
              ? { durationSeconds: video.durationSeconds }
              : {}),
          },
        ];
      });
      setVideos((current) => (pageToken ? [...current, ...results] : results));
      setNextPageToken(payload.nextPageToken);
      setHasSearched(true);
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

  useEffect(() => {
    setVideos([]);
    setNextPageToken(undefined);
    setHasSearched(false);
    void searchVideos();
    return () => {
      searchAbortRef.current?.abort();
      searchAbortRef.current = null;
    };
    // Search again only when curriculum context changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContextKey]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setVideos([]);
    setNextPageToken(undefined);
    void searchVideos();
  };

  const updateStatus = async (video: YouTubeVideo, status: VideoLearningStatus) => {
    const input = createVideoLearningProgressInput(video, context, board, status);
    if (!input) {
      setProgressActionError('This video could not be saved because its details are invalid.');
      return;
    }
    setBusyVideoId(video.videoId);
    setProgressActionError(null);
    setProgressMessage(null);
    try {
      const result = await onUpdateProgress(input);
      if (result.error || !result.data) {
        setProgressActionError(result.error ?? 'Could not save video progress. Please retry.');
        return;
      }
      setProgressMessage(
        isAuthenticated
          ? 'Video progress saved to your account.'
          : 'Video progress saved for this session.'
      );
    } catch (error) {
      setProgressActionError(
        error instanceof Error ? error.message : 'Could not save video progress. Please retry.'
      );
    } finally {
      setBusyVideoId(null);
    }
  };

  const getStatus = (videoId: string): VideoLearningStatus =>
    progress.find((item) => item.videoId === videoId)?.status ?? 'not_started';

  const currentSearchLink = createYouTubeSearchLink(
    buildYouTubeSearchQuery(buildVideoLearningSearchRequest(context, board, query))
  );

  return (
    <section className="rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Youtube className="h-4 w-4 text-[#dc2626]" aria-hidden="true" />
            <h3 className="font-display text-base font-bold text-[#1b1831] dark:text-[#f3f0fc]">
              Learn through Videos
            </h3>
          </div>
          <p className="mt-1 text-xs text-[#6b6684] dark:text-[#b0a6cf]">
            Real YouTube search results for this curriculum topic. Progress is set manually.
          </p>
        </div>
        <span className="rounded-full bg-[#f0ebff] dark:bg-[#221a3a] px-3 py-1 text-[11px] font-medium text-[#6b6684] dark:text-[#b0a6cf]">
          {isAuthenticated ? 'Progress syncs to your account' : 'Session-only progress'}
        </span>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
        <label className="sr-only" htmlFor="video-learning-query">
          Customize video search
        </label>
        <input
          id="video-learning-query"
          value={query}
          maxLength={200}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Customize recommendations"
          className="min-w-0 flex-1 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] px-3 py-2.5 text-sm text-[#1b1831] dark:text-[#f3f0fc]"
        />
        <button
          type="submit"
          disabled={searching}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5a45c8] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#442cb2] disabled:opacity-60"
        >
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Search className="h-4 w-4" aria-hidden="true" />
          )}
          Search
        </button>
        <button
          type="button"
          disabled={searching}
          onClick={() => void searchVideos()}
          aria-label="Refresh video recommendations"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e5deff] dark:border-[#372a5c] px-3 py-2.5 text-xs font-semibold text-[#6b6684] dark:text-[#e9e4f8] disabled:opacity-60"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sm:hidden">Refresh</span>
        </button>
      </form>

      {progressError ? (
        <p role="status" className="rounded-xl bg-[#fff7ed] p-3 text-xs text-[#9a3412]">
          Saved video progress could not be loaded: {progressError}
        </p>
      ) : null}
      {progressActionError ? (
        <p role="alert" className="rounded-xl bg-[#fef2f2] p-3 text-xs text-[#b91c1c]">
          {progressActionError}
        </p>
      ) : null}
      {progressMessage ? (
        <p role="status" className="rounded-xl bg-[#ecfdf5] p-3 text-xs text-[#047857]">
          {progressMessage}
        </p>
      ) : null}

      {searchError ? (
        <div role="alert" className="rounded-xl border border-[#fecaca] bg-[#fef2f2] p-3 text-xs text-[#b91c1c]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{searchError}</span>
            <button
              type="button"
              disabled={searching}
              onClick={() => void searchVideos()}
              className="inline-flex items-center gap-1 rounded-lg border border-[#fecaca] px-2.5 py-1.5 font-semibold disabled:opacity-50"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              Retry
            </button>
          </div>
          {configurationMissing ? (
            <p className="mt-2">
              YouTube search requires the server-side <code>YOUTUBE_API_KEY</code>. No sample videos
              are shown.{' '}
              <a href={currentSearchLink} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                Open this search on YouTube <ExternalLink className="inline h-3 w-3" aria-hidden="true" />
              </a>
            </p>
          ) : null}
        </div>
      ) : null}

      {searching && videos.length === 0 ? (
        <div role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-[#6b6684] dark:text-[#b0a6cf]">
          <Loader2 className="h-4 w-4 animate-spin text-[#5a45c8]" aria-hidden="true" />
          Searching YouTube for this topic...
        </div>
      ) : hasSearched && videos.length === 0 && !searchError ? (
        <p className="rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] p-5 text-center text-sm text-[#6b6684] dark:text-[#b0a6cf]">
          No YouTube videos were found for this topic. Try customizing the search.
        </p>
      ) : null}

      {videos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {videos.map((video) => {
            const status = getStatus(video.videoId);
            const busy = busyVideoId === video.videoId;
            return (
              <article
                key={video.videoId}
                className="overflow-hidden rounded-xl border border-[#ece6ff] dark:border-[#2e244d] bg-[#fcfaff] dark:bg-[#221a3a]"
              >
                {video.thumbnailUrl ? (
                  <a href={video.videoUrl} target="_blank" rel="noopener noreferrer" aria-label={`Watch ${video.title} on YouTube`}>
                    <img src={video.thumbnailUrl} alt="" loading="lazy" className="aspect-video w-full object-cover" />
                  </a>
                ) : null}
                <div className="space-y-3 p-3">
                  <div className="min-w-0">
                    <a href={video.videoUrl} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-sm font-semibold text-[#1b1831] dark:text-[#f3f0fc] hover:text-[#442cb2]">
                      {video.title}
                    </a>
                    <p className="mt-1 truncate text-xs text-[#776d94] dark:text-[#968cb8]">
                      {video.channel}
                      {video.durationSeconds ? ` · ${formatVideoDuration(video.durationSeconds)}` : ''}
                      {video.publishedAt ? ` · ${formatPublishedDate(video.publishedAt)}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`video-progress-${video.videoId}`}>
                      Progress for {video.title}
                    </label>
                    <select
                      id={`video-progress-${video.videoId}`}
                      value={status}
                      disabled={busy}
                      onChange={(event) => void updateStatus(video, event.target.value as VideoLearningStatus)}
                      className="min-w-0 flex-1 rounded-lg border border-[#e5deff] dark:border-[#372a5c] bg-white dark:bg-[#19132b] px-2.5 py-2 text-xs text-[#1b1831] dark:text-[#f3f0fc] disabled:opacity-60"
                    >
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                    {status !== 'completed' ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void updateStatus(video, 'completed')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#a7f3d0] bg-[#ecfdf5] px-2.5 py-2 text-xs font-semibold text-[#047857] disabled:opacity-60"
                      >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
                        Mark as Completed
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onStartQuiz(context, board)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#5a45c8] px-2.5 py-2 text-xs font-semibold text-white hover:bg-[#442cb2]"
                      >
                        <Play className="h-3.5 w-3.5" aria-hidden="true" />
                        Start Quiz
                      </button>
                    )}
                    {onLinkVideo ? (
                      <button
                        type="button"
                        onClick={() => onLinkVideo(video)}
                        aria-pressed={linkedVideoId === video.videoId}
                        className="rounded-lg border border-[#e5deff] dark:border-[#372a5c] px-2.5 py-2 text-xs font-semibold text-[#6b6684] dark:text-[#e9e4f8]"
                      >
                        {linkedVideoId === video.videoId ? 'Linked to session' : 'Link to session'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
      {nextPageToken ? (
        <button
          type="button"
          disabled={searching}
          onClick={() => void searchVideos(nextPageToken)}
          className="w-full rounded-xl border border-[#e5deff] dark:border-[#372a5c] px-4 py-2.5 text-xs font-semibold text-[#6b6684] dark:text-[#e9e4f8] disabled:opacity-60"
        >
          {searching ? 'Loading...' : 'Load more videos'}
        </button>
      ) : null}
      <p className="text-[11px] leading-relaxed text-[#7b7194] dark:text-[#968cb8]">
        Video progress is student-reported. StudyVerse does not track YouTube watch time or verify
        video completion.
      </p>
    </section>
  );
}
