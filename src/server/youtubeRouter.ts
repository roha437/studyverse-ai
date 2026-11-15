import { Router } from 'express';
import type { Request, Response as ExpressResponse } from 'express';
import { createFixedWindowRateLimiter } from '../utils/rateLimiter.ts';
import {
  buildYouTubeSearchQuery,
  getYouTubeApiError,
  normalizeYouTubeSearchResponse,
  validateYouTubeSearchRequest,
} from '../utils/youtubeHelpers.ts';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const MAX_RESULTS = 12;

interface YouTubeRouterOptions {
  getApiKey: () => string | undefined;
  rateLimiter: ReturnType<typeof createFixedWindowRateLimiter>;
  fetchImpl?: typeof fetch;
}

class YouTubeApiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'YouTubeApiRequestError';
  }
}

async function callYouTubeApi(
  url: URL,
  apiKey: string,
  fetchImpl: typeof fetch
): Promise<unknown> {
  url.searchParams.set('key', apiKey);
  let response: globalThis.Response;
  try {
    response = await fetchImpl(url, { signal: AbortSignal.timeout(12_000) });
  } catch (error) {
    if (error instanceof Error && /timeout|abort/i.test(error.name + error.message)) {
      throw new YouTubeApiRequestError(504, 'YouTube search timed out. Please retry.');
    }
    throw new YouTubeApiRequestError(502, 'YouTube search is temporarily unavailable.');
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new YouTubeApiRequestError(502, 'YouTube returned an unreadable response.');
  }
  if (!response.ok) {
    const mapped = getYouTubeApiError(body, response.status);
    throw new YouTubeApiRequestError(mapped.status, mapped.message);
  }
  return body;
}

function isConfiguredApiKey(value: string | undefined): value is string {
  const key = value?.trim();
  return Boolean(key && key !== 'MY_YOUTUBE_API_KEY' && !/^(your|replace|placeholder)/i.test(key));
}

export function createYouTubeRouter({
  getApiKey,
  rateLimiter,
  fetchImpl = fetch,
}: YouTubeRouterOptions) {
  const router = Router();

  router.get('/search', async (req: Request, res: ExpressResponse) => {
    const decision = rateLimiter(req.ip || req.socket.remoteAddress || 'unknown');
    if (!decision.allowed) {
      res.setHeader('Retry-After', String(decision.retryAfterSeconds));
      res.status(429).json({ error: 'YouTube search is receiving too many requests. Retry shortly.' });
      return;
    }

    const validated = validateYouTubeSearchRequest(req.query);
    if (!validated.valid) {
      res.status(400).json({ error: validated.error });
      return;
    }
    const apiKey = getApiKey()?.trim();
    if (!isConfiguredApiKey(apiKey)) {
      res.status(503).json({
        error: 'YouTube search is not configured. Set the server-side YOUTUBE_API_KEY to enable it.',
      });
      return;
    }

    const query = buildYouTubeSearchQuery(validated.data);
    const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('maxResults', String(MAX_RESULTS));
    searchUrl.searchParams.set('safeSearch', 'moderate');
    if (validated.data.pageToken) {
      searchUrl.searchParams.set('pageToken', validated.data.pageToken);
    }

    try {
      const searchResponse = await callYouTubeApi(searchUrl, apiKey, fetchImpl);
      if (!searchResponse || typeof searchResponse !== 'object' || Array.isArray(searchResponse)) {
        res.status(502).json({ error: 'YouTube returned an invalid search response.' });
        return;
      }
      const searchRecord = searchResponse as Record<string, unknown>;
      const searchItems = Array.isArray(searchRecord.items) ? searchRecord.items : [];
      const ids = searchItems
        .slice(0, MAX_RESULTS)
        .map((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) return '';
          const id = (item as Record<string, unknown>).id;
          if (!id || typeof id !== 'object' || Array.isArray(id)) return '';
          const videoId = (id as Record<string, unknown>).videoId;
          return typeof videoId === 'string' ? videoId : '';
        })
        .filter((id) => /^[A-Za-z0-9_-]{11}$/.test(id));

      let durationResponse: unknown;
      let warning: string | undefined;
      if (ids.length > 0) {
        const detailsUrl = new URL(`${YOUTUBE_API_BASE}/videos`);
        detailsUrl.searchParams.set('part', 'contentDetails');
        detailsUrl.searchParams.set('id', ids.join(','));
        try {
          durationResponse = await callYouTubeApi(detailsUrl, apiKey, fetchImpl);
        } catch {
          warning = 'Video durations are temporarily unavailable.';
        }
      }

      const normalized = normalizeYouTubeSearchResponse(searchResponse, durationResponse);
      if (!normalized) {
        res.status(502).json({ error: 'YouTube returned an invalid search response.' });
        return;
      }
      res.json({
        ...normalized,
        ...(warning ? { warning } : {}),
      });
    } catch (error) {
      if (error instanceof YouTubeApiRequestError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      res.status(502).json({ error: 'YouTube search is temporarily unavailable.' });
    }
  });

  return router;
}
