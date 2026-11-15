import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  buildNumericalSolverPrompt,
  buildNumericalVerificationPrompt,
  mapNumericalLabGeminiErrorToResponse,
  normalizeNumericalSolution,
  normalizeNumericalVerification,
  validateNumericalSolvePayload,
  validateNumericalVerificationPayload,
  type NumericalLabOperation,
} from '../utils/numericalLabHelpers.ts';
import { createFixedWindowRateLimiter } from '../utils/rateLimiter.ts';

export type NumericalLabGenerator = (
  operation: NumericalLabOperation,
  prompt: string
) => Promise<string>;

interface NumericalLabRouterOptions {
  getGenerator: () => NumericalLabGenerator | null;
  rateLimiter: ReturnType<typeof createFixedWindowRateLimiter>;
}

function isRateLimited(
  req: Request,
  res: Response,
  rateLimiter: NumericalLabRouterOptions['rateLimiter']
): boolean {
  const decision = rateLimiter(req.ip || req.socket.remoteAddress || 'unknown');
  if (decision.allowed) return false;
  res.setHeader('Retry-After', String(decision.retryAfterSeconds));
  res.status(429).json({ error: 'Numerical Lab is receiving too many requests. Please retry shortly.' });
  return true;
}

export function createNumericalLabRouter({
  getGenerator,
  rateLimiter,
}: NumericalLabRouterOptions) {
  const router = Router();

  router.post('/solve', async (req, res) => {
    if (isRateLimited(req, res, rateLimiter)) return;

    const validated = validateNumericalSolvePayload(req.body);
    if (!validated.valid) {
      res.status(400).json({ error: validated.error });
      return;
    }

    const generate = getGenerator();
    if (!generate) {
      res.status(503).json({
        error: 'Numerical Lab AI is unavailable until a server GEMINI_API_KEY is configured.',
      });
      return;
    }

    try {
      const rawResponse = await generate('solve', buildNumericalSolverPrompt(validated.data));
      const solution = normalizeNumericalSolution(rawResponse);
      if (!solution) {
        res.status(502).json({ error: 'Gemini returned an incomplete solution. Please retry.' });
        return;
      }
      res.json({ solution });
    } catch (error) {
      const mapped = mapNumericalLabGeminiErrorToResponse(error);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  router.post('/verify', async (req, res) => {
    if (isRateLimited(req, res, rateLimiter)) return;

    const validated = validateNumericalVerificationPayload(req.body);
    if (!validated.valid) {
      res.status(400).json({ error: validated.error });
      return;
    }

    const generate = getGenerator();
    if (!generate) {
      res.status(503).json({
        error: 'Numerical Lab AI is unavailable until a server GEMINI_API_KEY is configured.',
      });
      return;
    }

    try {
      const rawResponse = await generate(
        'verify',
        buildNumericalVerificationPrompt(validated.data)
      );
      const verification = normalizeNumericalVerification(
        rawResponse,
        validated.data.studentSteps
      );
      if (!verification) {
        res.status(502).json({
          error: 'Gemini returned an incomplete step review. Please retry.',
        });
        return;
      }
      res.json({ verification });
    } catch (error) {
      const mapped = mapNumericalLabGeminiErrorToResponse(error);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  return router;
}
