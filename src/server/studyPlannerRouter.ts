import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  buildStudyPlannerPrompt,
  mapStudyPlannerGeminiErrorToResponse,
  normalizeGeneratedStudyPlan,
  validateStudyPlannerPreferences,
} from '../utils/studyPlannerHelpers.ts';
import { createFixedWindowRateLimiter } from '../utils/rateLimiter.ts';

export type StudyPlannerGenerator = (prompt: string) => Promise<string>;

interface StudyPlannerRouterOptions {
  getGenerator: () => StudyPlannerGenerator | null;
  rateLimiter: ReturnType<typeof createFixedWindowRateLimiter>;
  timeoutMs?: number;
}

export function createStudyPlannerRouter({
  getGenerator,
  rateLimiter,
  timeoutMs = 45_000,
}: StudyPlannerRouterOptions) {
  const router = Router();

  router.post('/generate', async (req: Request, res: Response) => {
    const decision = rateLimiter(req.ip || req.socket.remoteAddress || 'unknown');
    if (!decision.allowed) {
      res.setHeader('Retry-After', String(decision.retryAfterSeconds));
      res.status(429).json({ error: 'Study plan generation is receiving too many requests. Retry shortly.' });
      return;
    }

    const validated = validateStudyPlannerPreferences(req.body);
    if (!validated.valid) {
      res.status(400).json({ error: validated.error });
      return;
    }
    const generate = getGenerator();
    if (!generate) {
      res.status(503).json({
        error: 'AI Study Planner is unavailable until a server GEMINI_API_KEY is configured.',
      });
      return;
    }

    try {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const rawResponse = await Promise.race([
        generate(buildStudyPlannerPrompt(validated.data)),
        new Promise<string>((_resolve, reject) => {
          timeout = setTimeout(() => reject(new Error('Study planner request timeout.')), timeoutMs);
        }),
      ]).finally(() => {
        if (timeout) clearTimeout(timeout);
      });
      const plan = normalizeGeneratedStudyPlan(rawResponse, validated.data);
      if (!plan) {
        res.status(502).json({ error: 'Gemini returned an invalid study plan. Please retry.' });
        return;
      }
      res.json({ plan });
    } catch (error) {
      const mapped = mapStudyPlannerGeminiErrorToResponse(error);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  return router;
}
