import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildNumericalSolverPrompt,
  buildNumericalVerificationPrompt,
  normalizeNumericalSolution,
  normalizeNumericalVerification,
  validateNumericalSolvePayload,
  validateNumericalVerificationPayload,
  type NumericalProblemPayload,
} from './numericalLabHelpers.ts';

const problem: NumericalProblemPayload = {
  classLabel: 'Class 10',
  board: 'NCERT / CBSE',
  subject: 'Physics',
  chapter: 'Light - Reflection and Refraction',
  topic: 'Lens formula',
  problemStatement: 'An object is 30 cm from a convex lens with focal length 15 cm. Find the image distance.',
  givenValues: 'u = -30 cm, f = +15 cm',
};

const solverResponse = {
  givenValues: [
    { name: 'Object distance', value: '-30', unit: 'cm' },
    { name: 'Focal length', value: '+15', unit: 'cm' },
  ],
  requiredQuantity: 'Image distance (v)',
  formula: '1/f = 1/v - 1/u',
  formulaExplanation: 'The thin lens formula relates focal length, object distance, and image distance.',
  unitConversions: [],
  steps: [
    { calculation: '1/15 = 1/v - 1/(-30)', explanation: 'Substitute the signed distances in centimetres.' },
    { calculation: '1/v = 1/15 - 1/30 = 1/30', explanation: 'Rearrange and combine the fractions.' },
    { calculation: 'v = 30 cm', explanation: 'Take the reciprocal to find the image distance.' },
  ],
  finalAnswer: { value: '30', unit: 'cm' },
  verification: 'The positive image distance indicates a real image on the opposite side of the lens.',
  commonMistakes: ['Dropping the sign convention for object distance.'],
};

test('numerical payload validators require bounded curriculum and problem context', () => {
  assert.equal(validateNumericalSolvePayload(problem).valid, true);
  assert.equal(
    validateNumericalSolvePayload({ ...problem, board: '' }).valid,
    false
  );
  assert.equal(
    validateNumericalSolvePayload({ ...problem, problemStatement: 'x'.repeat(3_001) }).valid,
    false
  );
  assert.equal(
    validateNumericalVerificationPayload({ ...problem, studentSteps: '   ' }).valid,
    false
  );
  assert.equal(
    validateNumericalVerificationPayload({
      ...problem,
      studentSteps: Array.from({ length: 26 }, (_, index) => `Step ${index + 1}`).join('\n'),
    }).valid,
    false
  );
});

test('numerical prompts include selected curriculum context and conservative step-review guidance', () => {
  assert.match(buildNumericalSolverPrompt(problem), /"board":"NCERT \/ CBSE"/);
  assert.match(buildNumericalSolverPrompt(problem), /"subject":"Physics"/);

  const verificationPayload = {
    ...problem,
    studentSteps: '1/f = 1/v - 1/u\n1/15 = 1/v + 1/30',
  };
  const prompt = buildNumericalVerificationPrompt(verificationPayload);
  assert.match(prompt, /identify the first demonstrably incorrect step/i);
  assert.match(prompt, /Do not mark a mathematically equivalent method/i);
});

test('numerical solution normalization requires complete structured calculations', () => {
  const solution = normalizeNumericalSolution(JSON.stringify(solverResponse));
  assert.equal(solution?.steps.length, 3);
  assert.equal(solution?.finalAnswer.unit, 'cm');
  assert.equal(normalizeNumericalSolution('not JSON'), null);
  assert.equal(
    normalizeNumericalSolution(JSON.stringify({ ...solverResponse, commonMistakes: [] })),
    null
  );
});

test('step review identifies the first justified error and downgrades unsupported error claims', () => {
  const studentSteps = '1/15 = 1/v + 1/30\n1/v = 1/30\nv = 30 cm';
  const review = normalizeNumericalVerification(
    JSON.stringify({
      overallAssessment: 'The sign substitution in step 1 needs review.',
      steps: [
        {
          assessment: 'incorrect',
          justification: 'Using u = -30 cm in 1/f = 1/v - 1/u gives 1/v - 1/(-30), which is 1/v + 1/30 only after transposition; the written equality mixes the signs.',
          hint: 'Substitute the signed object distance before moving terms.',
          correction: 'Write 1/15 = 1/v + 1/30, then subtract 1/30 from both sides.',
        },
        {
          assessment: 'correct',
          justification: 'This follows from the corrected equation.',
          hint: '',
          correction: '',
        },
        {
          assessment: 'correct',
          justification: 'Taking the reciprocal preserves the value and unit.',
          hint: '',
          correction: '',
        },
      ],
      alternativeApproaches: ['Solve using a common denominator first.'],
    }),
    studentSteps
  );

  assert.equal(review?.firstIncorrectStep, 1);
  assert.equal(review?.steps[0].assessment, 'incorrect');
  assert.equal(review?.steps[0].hint.length > 0, true);
  assert.equal(review?.steps[0].correction.length > 0, true);

  const unsupportedClaim = normalizeNumericalVerification(
    JSON.stringify({
      overallAssessment: 'Review the first step.',
      steps: [
        { assessment: 'incorrect', justification: '', hint: '', correction: '' },
        { assessment: 'correct', justification: 'The arithmetic is valid.' },
      ],
      alternativeApproaches: [],
    }),
    '2 + 2 = 4\nThis is four'
  );
  assert.equal(unsupportedClaim?.firstIncorrectStep, null);
  assert.equal(unsupportedClaim?.steps[0].assessment, 'uncertain');
});
