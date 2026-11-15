export type NumericalLabOperation = 'solve' | 'verify';
export type NumericalStepAssessment =
  | 'correct'
  | 'incorrect'
  | 'valid-alternative'
  | 'uncertain';

export interface NumericalLearningContext {
  classLabel: string;
  board: string;
  subject: string;
  chapter: string;
  topic: string;
}

export interface NumericalProblemPayload extends NumericalLearningContext {
  problemStatement: string;
  givenValues?: string;
}

export interface NumericalVerificationPayload extends NumericalProblemPayload {
  studentSteps: string;
}

export interface NumericalSolution {
  givenValues: Array<{ name: string; value: string; unit: string }>;
  requiredQuantity: string;
  formula: string;
  formulaExplanation: string;
  unitConversions: Array<{ from: string; to: string; reason: string }>;
  steps: Array<{ calculation: string; explanation: string }>;
  finalAnswer: { value: string; unit: string };
  verification: string;
  commonMistakes: string[];
}

export interface NumericalStepReview {
  stepNumber: number;
  studentStep: string;
  assessment: NumericalStepAssessment;
  justification: string;
  hint: string;
  correction: string;
}

export interface NumericalVerification {
  overallAssessment: string;
  firstIncorrectStep: number | null;
  steps: NumericalStepReview[];
  alternativeApproaches: string[];
}

const MAX_CONTEXT_LENGTH = 160;
const MAX_PROBLEM_LENGTH = 3_000;
const MAX_GIVEN_VALUES_LENGTH = 1_200;
const MAX_STUDENT_STEPS_LENGTH = 4_000;
const MAX_STEPS = 25;
const MAX_RESPONSE_LENGTH = 24_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readRequired(
  value: unknown,
  field: string,
  maxLength: number
): { value: string } | { error: string } {
  if (typeof value !== 'string' || !value.trim()) {
    return { error: `${field} is required.` };
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    return { error: `${field} must be ${maxLength} characters or fewer.` };
  }
  return { value: trimmed };
}

function readOptional(
  value: unknown,
  field: string,
  maxLength: number
): { value?: string } | { error: string } {
  if (value === undefined || value === null || value === '') return {};
  if (typeof value !== 'string') return { error: `${field} must be text.` };
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    return { error: `${field} must be ${maxLength} characters or fewer.` };
  }
  return trimmed ? { value: trimmed } : {};
}

function validateProblemPayload(
  raw: unknown
): { valid: true; data: NumericalProblemPayload } | { valid: false; error: string } {
  if (!isRecord(raw)) {
    return { valid: false, error: 'Request body must be a JSON object.' };
  }

  const context: Partial<NumericalLearningContext> = {};
  for (const field of ['classLabel', 'board', 'subject', 'chapter', 'topic'] as const) {
    const result = readRequired(raw[field], field, MAX_CONTEXT_LENGTH);
    if ('error' in result) return { valid: false, error: result.error };
    context[field] = result.value;
  }

  const problemStatement = readRequired(raw.problemStatement, 'Problem statement', MAX_PROBLEM_LENGTH);
  if ('error' in problemStatement) return { valid: false, error: problemStatement.error };

  const givenValues = readOptional(raw.givenValues, 'Given values', MAX_GIVEN_VALUES_LENGTH);
  if ('error' in givenValues) return { valid: false, error: givenValues.error };

  return {
    valid: true,
    data: {
      ...context as NumericalLearningContext,
      problemStatement: problemStatement.value,
      givenValues: givenValues.value,
    },
  };
}

export function validateNumericalSolvePayload(
  raw: unknown
): { valid: true; data: NumericalProblemPayload } | { valid: false; error: string } {
  return validateProblemPayload(raw);
}

export function validateNumericalVerificationPayload(
  raw: unknown
): { valid: true; data: NumericalVerificationPayload } | { valid: false; error: string } {
  const problem = validateProblemPayload(raw);
  if (!problem.valid) return problem;

  if (!isRecord(raw)) {
    return { valid: false, error: 'Request body must be a JSON object.' };
  }
  const studentSteps = readRequired(raw.studentSteps, 'Your calculation steps', MAX_STUDENT_STEPS_LENGTH);
  if ('error' in studentSteps) return { valid: false, error: studentSteps.error };
  const stepCount = studentSteps.value.split(/\r?\n/).filter((line) => line.trim()).length;
  if (stepCount > MAX_STEPS) {
    return { valid: false, error: `Enter no more than ${MAX_STEPS} calculation steps.` };
  }

  return {
    valid: true,
    data: { ...problem.data, studentSteps: studentSteps.value },
  };
}

function serializeProblemContext(payload: NumericalProblemPayload) {
  return {
    class: payload.classLabel,
    board: payload.board,
    subject: payload.subject,
    chapter: payload.chapter,
    topic: payload.topic,
    problem: payload.problemStatement,
    studentProvidedValues: payload.givenValues ?? null,
  };
}

export function buildNumericalSolverPrompt(payload: NumericalProblemPayload): string {
  return [
    'Solve the student’s numerical problem and return a complete, accurate, student-friendly worked solution.',
    `Learning context and problem data (JSON): ${JSON.stringify(serializeProblemContext(payload))}`,
    'Extract the given values and units from both the problem and student-provided values. Identify the required quantity, select and explain the relevant formula, convert units where needed, and show each calculation in order.',
    'Check arithmetic, units, and physical or mathematical reasonableness. If information is missing or ambiguous, state the assumption or uncertainty instead of inventing a value.',
    'Include common mistakes relevant to this exact problem. The final answer must include units where applicable; use “unitless” when the quantity has no unit.',
  ].join('\n');
}

export function buildNumericalVerificationPrompt(payload: NumericalVerificationPayload): string {
  const steps = payload.studentSteps
    .split(/\r?\n/)
    .map((step) => step.trim())
    .filter(Boolean);

  return [
    'Evaluate the student’s calculation one step at a time and return a fair, evidence-based review.',
    `Learning context and problem data (JSON): ${JSON.stringify(serializeProblemContext(payload))}`,
    `Student calculation steps (JSON array, in order): ${JSON.stringify(steps)}`,
    'Check each step against the problem, units, algebra, arithmetic, and prior steps. Identify the first demonstrably incorrect step by its position.',
    'Do not mark a mathematically equivalent method, valid rearrangement, or consistent unit choice as incorrect. If a step cannot be judged from the supplied information, mark it uncertain rather than incorrect.',
    'For every step, explain the judgment. For an incorrect step, provide a specific justification, a brief hint that does not reveal the answer, and a separate correction. For a valid alternative, explicitly say why it is equivalent.',
    'Use the required-validity signal conservatively: never call a step incorrect without a concrete mathematical, arithmetic, unit, or problem-condition reason.',
  ].join('\n');
}

function readText(value: unknown, maxLength = 2_500): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function readTextArray(value: unknown, maxItems = 12): string[] {
  return Array.isArray(value)
    ? value
        .slice(0, maxItems)
        .map((item) => readText(item, 1_000))
        .filter(Boolean)
    : [];
}

function parseResponse(rawResponse: string): Record<string, unknown> | null {
  const text = rawResponse.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  if (!text || text.length > MAX_RESPONSE_LENGTH) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function normalizeNumericalSolution(rawResponse: string): NumericalSolution | null {
  const parsed = parseResponse(rawResponse);
  if (
    !parsed ||
    !Array.isArray(parsed.givenValues) ||
    !Array.isArray(parsed.unitConversions) ||
    !Array.isArray(parsed.steps) ||
    !Array.isArray(parsed.commonMistakes)
  ) {
    return null;
  }

  const givenValues = Array.isArray(parsed.givenValues)
    ? parsed.givenValues
        .slice(0, 16)
        .map((item) => {
          if (!isRecord(item)) return null;
          const name = readText(item.name, 160);
          const value = readText(item.value, 300);
          const unit = readText(item.unit, 100);
          return name && value && unit ? { name, value, unit } : null;
        })
        .filter((item): item is { name: string; value: string; unit: string } => item !== null)
    : [];
  const unitConversions = Array.isArray(parsed.unitConversions)
    ? parsed.unitConversions
        .slice(0, 12)
        .map((item) => {
          if (!isRecord(item)) return null;
          const from = readText(item.from, 300);
          const to = readText(item.to, 300);
          const reason = readText(item.reason, 500);
          return from && to && reason ? { from, to, reason } : null;
        })
        .filter((item): item is { from: string; to: string; reason: string } => item !== null)
    : [];
  const steps = Array.isArray(parsed.steps)
    ? parsed.steps
        .slice(0, MAX_STEPS)
        .map((item) => {
          if (!isRecord(item)) return null;
          const calculation = readText(item.calculation, 1_000);
          const explanation = readText(item.explanation, 1_000);
          return calculation && explanation ? { calculation, explanation } : null;
        })
        .filter((item): item is { calculation: string; explanation: string } => item !== null)
    : [];
  const finalAnswer = isRecord(parsed.finalAnswer)
    ? {
        value: readText(parsed.finalAnswer.value, 500),
        unit: readText(parsed.finalAnswer.unit, 100),
      }
    : { value: '', unit: '' };
  const solution: NumericalSolution = {
    givenValues,
    requiredQuantity: readText(parsed.requiredQuantity, 300),
    formula: readText(parsed.formula, 500),
    formulaExplanation: readText(parsed.formulaExplanation, 2_000),
    unitConversions,
    steps,
    finalAnswer,
    verification: readText(parsed.verification, 2_000),
    commonMistakes: readTextArray(parsed.commonMistakes),
  };

  if (
    !solution.requiredQuantity ||
    !solution.formula ||
    !solution.formulaExplanation ||
    !solution.steps.length ||
    !solution.finalAnswer.value ||
    !solution.finalAnswer.unit ||
    !solution.verification ||
    !solution.commonMistakes.length
  ) {
    return null;
  }
  return solution;
}

export function normalizeNumericalVerification(
  rawResponse: string,
  studentSteps: string
): NumericalVerification | null {
  const parsed = parseResponse(rawResponse);
  if (!parsed || !Array.isArray(parsed.alternativeApproaches)) return null;

  const inputSteps = studentSteps
    .split(/\r?\n/)
    .map((step) => step.trim())
    .filter(Boolean);
  if (!inputSteps.length || inputSteps.length > MAX_STEPS || !Array.isArray(parsed.steps)) {
    return null;
  }

  const normalizedSteps = parsed.steps.slice(0, MAX_STEPS).map((item, index) => {
    if (!isRecord(item) || index >= inputSteps.length) return null;
    const candidate = item.assessment;
    const validAssessment: NumericalStepAssessment[] = [
      'correct',
      'incorrect',
      'valid-alternative',
      'uncertain',
    ];
    const requestedAssessment = validAssessment.includes(candidate as NumericalStepAssessment)
      ? (candidate as NumericalStepAssessment)
      : 'uncertain';
    const justification =
      readText(item.justification, 1_500) ||
      (requestedAssessment === 'incorrect'
        ? 'There is not enough evidence to confirm this step is incorrect.'
        : '');
    const hint = readText(item.hint, 1_000);
    const correction = readText(item.correction, 1_000);
    const assessment =
      requestedAssessment === 'incorrect' && (!justification || !hint || !correction)
        ? 'uncertain'
        : requestedAssessment;
    return {
      stepNumber: index + 1,
      studentStep: inputSteps[index],
      assessment,
      justification,
      hint,
      correction: assessment === 'incorrect' ? correction : '',
    } satisfies NumericalStepReview;
  });

  if (
    normalizedSteps.some((step) => step === null) ||
    normalizedSteps.length !== inputSteps.length
  ) {
    return null;
  }

  const steps = normalizedSteps as NumericalStepReview[];
  if (steps.some((step) => !step.justification)) return null;
  const firstIncorrectStep = steps.find((step) => step.assessment === 'incorrect')?.stepNumber ?? null;
  const alternativeApproaches = readTextArray(parsed.alternativeApproaches, 8);
  const overallAssessment = readText(parsed.overallAssessment, 2_000);
  if (!overallAssessment) return null;

  return { overallAssessment, firstIncorrectStep, steps, alternativeApproaches };
}

export function mapNumericalLabGeminiErrorToResponse(
  err: unknown
): { status: number; message: string } {
  const message = err instanceof Error ? err.message.toLowerCase() : '';
  const status =
    err && typeof err === 'object' && 'status' in err ? Number(err.status) : undefined;

  if (status === 429 || message.includes('rate limit') || message.includes('quota')) {
    return {
      status: 429,
      message: 'The Numerical Lab is busy right now. Please wait a moment and retry.',
    };
  }
  if (status === 401 || status === 403 || message.includes('api key')) {
    return {
      status: 503,
      message: 'Numerical Lab AI is temporarily unavailable. Please try again later.',
    };
  }
  if (message.includes('timeout') || message.includes('network') || message.includes('fetch failed')) {
    return {
      status: 504,
      message: 'Numerical Lab could not reach Gemini. Check your connection and retry.',
    };
  }
  return {
    status: 502,
    message: 'Numerical Lab could not complete this request. Please retry.',
  };
}
