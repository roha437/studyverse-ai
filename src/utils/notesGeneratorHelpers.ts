import type { NoteType } from '../types/studyverse';

export interface GenerateNotesPayload {
  classLabel: string;
  board: string;
  streamLabel?: string;
  subject: string;
  chapter: string;
  topic: string;
  topicSummary?: string;
  keyFormula?: string;
  noteFormat: NoteType;
  customFocus?: string;
}

export interface GeneratedNoteResult {
  title: string;
  summary: string;
  keyPoints: string[];
  formula?: string;
}

const ALLOWED_FORMATS: NoteType[] = ['summary', 'formulas', 'qa', 'mindmap', 'custom'];

export function validateGenerateNotesPayload(
  raw: unknown
): { valid: true; data: GenerateNotesPayload } | { valid: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object.' };
  }
  const obj = raw as Record<string, unknown>;
  const classLabel = typeof obj.classLabel === 'string' ? obj.classLabel.trim() : '';
  const board = typeof obj.board === 'string' ? obj.board.trim() : '';
  const subject = typeof obj.subject === 'string' ? obj.subject.trim() : '';
  const chapter = typeof obj.chapter === 'string' ? obj.chapter.trim() : '';
  const topic = typeof obj.topic === 'string' ? obj.topic.trim() : '';
  const rawFormat = typeof obj.noteFormat === 'string' ? obj.noteFormat.trim() : 'summary';

  if (!classLabel || !board || !subject || !chapter || !topic) {
    return {
      valid: false,
      error: 'Class, curriculum board, subject, chapter, and topic are required to generate AI notes.',
    };
  }

  const noteFormat: NoteType = ALLOWED_FORMATS.includes(rawFormat as NoteType)
    ? (rawFormat as NoteType)
    : 'summary';

  return {
    valid: true,
    data: {
      classLabel,
      board,
      streamLabel:
        typeof obj.streamLabel === 'string' && obj.streamLabel.trim()
          ? obj.streamLabel.trim()
          : undefined,
      subject,
      chapter,
      topic,
      topicSummary:
        typeof obj.topicSummary === 'string' && obj.topicSummary.trim()
          ? obj.topicSummary.trim()
          : undefined,
      keyFormula:
        typeof obj.keyFormula === 'string' && obj.keyFormula.trim()
          ? obj.keyFormula.trim()
          : undefined,
      noteFormat,
      customFocus:
        typeof obj.customFocus === 'string' && obj.customFocus.trim()
          ? obj.customFocus.trim()
          : undefined,
    },
  };
}

export function getNoteFormatGuidance(noteFormat: NoteType): string {
  switch (noteFormat) {
    case 'formulas':
      return 'Format as a Formula & Equation Sheet: summarize what the formulas govern, and in keyPoints list each formula/rule, exact variable meanings with SI units, sign conventions, and common exam pitfalls.';
    case 'qa':
      return 'Format as Exam Q&A Revision Notes: write a concise topic overview in summary, and in keyPoints provide 5–6 high-yield board exam questions paired directly with crisp model answers (e.g. "Q: ... — A: ...").';
    case 'mindmap':
      return 'Format as a Concept Outline / Mind Map: explain the central concept in summary, and in keyPoints provide structured hierarchical branches ("Branch -> Sub-point: explanation") showing how definitions, causes, and applications connect.';
    case 'custom':
      return 'Format as custom structured study notes tailored closely to the student emphasis.';
    default:
      return 'Format as a Concise Textbook Summary: provide a clear, student-friendly explanation in summary and 5–7 crisp, high-yield revision bullets in keyPoints.';
  }
}

export function buildNotesPrompt(payload: GenerateNotesPayload): string {
  const lines = [
    `Student Level: ${payload.classLabel}${payload.streamLabel ? ` (${payload.streamLabel} stream)` : ''}`,
    `Curriculum Board: ${payload.board}`,
    `Subject: ${payload.subject}`,
    `Chapter: ${payload.chapter}`,
    `Topic: ${payload.topic}`,
  ];
  if (payload.topicSummary) {
    lines.push(`Textbook Context: ${payload.topicSummary}`);
  }
  if (payload.keyFormula) {
    lines.push(`Reference Formula: ${payload.keyFormula}`);
  }
  if (payload.customFocus) {
    lines.push(`Student Focus Emphasis: ${payload.customFocus}`);
  }
  lines.push(`Requested Format Guidance: ${getNoteFormatGuidance(payload.noteFormat)}`);
  lines.push(
    'Keep the language accurate, clear, age-appropriate for this class and board, and strictly grounded in the syllabus topic.'
  );
  return lines.join('\n');
}

export function normalizeGeneratedNotePayload(
  rawText: string,
  fallback: { topic: string; keyFormula?: string; noteFormat: NoteType }
): GeneratedNoteResult | null {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  const cleanedJson = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleanedJson) as Record<string, unknown>;
  } catch {
    return null;
  }

  const rawTitle = typeof parsed.title === 'string' ? parsed.title.trim() : '';
  const rawSummary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
  const rawPoints = Array.isArray(parsed.keyPoints)
    ? parsed.keyPoints
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => item.length > 0)
    : [];

  if (!rawSummary && rawPoints.length === 0) {
    return null;
  }

  const formatSuffix =
    fallback.noteFormat === 'formulas'
      ? 'Formula Sheet'
      : fallback.noteFormat === 'qa'
        ? 'Exam Q&A'
        : fallback.noteFormat === 'mindmap'
          ? 'Concept Outline'
          : 'Study Notes';

  const title = rawTitle || `${fallback.topic} — ${formatSuffix}`;
  const summary = rawSummary || rawPoints[0] || '';
  const formula =
    typeof parsed.formula === 'string' && parsed.formula.trim()
      ? parsed.formula.trim()
      : fallback.keyFormula;

  return {
    title,
    summary,
    keyPoints: rawPoints,
    formula,
  };
}

export function mapGeminiErrorToResponse(err: unknown): { status: number; message: string } {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : 'Unknown AI generation error';
  const lower = raw.toLowerCase();

  if (lower.includes('api_key_invalid') || lower.includes('api key not valid') || lower.includes('permission_denied') || lower.includes('403')) {
    return {
      status: 502,
      message: 'AI note generation could not authenticate with Gemini. Please check your GEMINI_API_KEY configuration in Settings > Secrets.',
    };
  }
  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
    return {
      status: 429,
      message: 'AI note generation is temporarily busy due to rate limits. Please wait a few seconds and try again.',
    };
  }
  if (lower.includes('404') || lower.includes('not_found')) {
    return {
      status: 502,
      message: 'The configured AI model is unavailable right now. Please try again shortly.',
    };
  }
  if (lower.includes('fetch failed') || lower.includes('network') || lower.includes('enotfound') || lower.includes('timeout')) {
    return {
      status: 504,
      message: 'Could not reach the AI service due to a network timeout. Please try again.',
    };
  }
  return {
    status: 500,
    message: 'Could not generate AI notes right now. Please try again in a moment.',
  };
}
