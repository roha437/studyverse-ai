import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Calculator,
  CheckCircle2,
  Layers,
  Loader2,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import type { ActiveStudyContext, NavModuleId } from '../../types/studyverse';
import { resolveContextDetails } from '../../utils/curriculumHelpers';
import {
  normalizeNumericalSolution,
  normalizeNumericalVerification,
  type NumericalProblemPayload,
  type NumericalSolution,
  type NumericalVerification,
  type NumericalVerificationPayload,
} from '../../utils/numericalLabHelpers';
import { ContextBreadcrumbBar } from '../common/ContextBreadcrumbBar';

interface NumericalLabViewProps {
  context: ActiveStudyContext;
  board: string;
  onNavigate: (module: NavModuleId) => void;
}

type NumericalRequest =
  | { operation: 'solve'; payload: NumericalProblemPayload }
  | { operation: 'verify'; payload: NumericalVerificationPayload };
type LabMode = 'solver' | 'formula-vault' | 'formula-recall';

export function NumericalLabView({ context, board, onNavigate }: NumericalLabViewProps) {
  const { cls, subject, chapter, topic } = resolveContextDetails(context);
  const [problemStatement, setProblemStatement] = useState('');
  const [givenValues, setGivenValues] = useState('');
  const [studentAttempt, setStudentAttempt] = useState('');
  const [solution, setSolution] = useState<NumericalSolution | null>(null);
  const [verification, setVerification] = useState<NumericalVerification | null>(null);
  const [activeAction, setActiveAction] = useState<'solve' | 'verify' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryRequest, setRetryRequest] = useState<NumericalRequest | null>(null);
  const [wasCancelled, setWasCancelled] = useState(false);
  const [shownHints, setShownHints] = useState<Record<number, boolean>>({});
  const [shownCorrections, setShownCorrections] = useState<Record<number, boolean>>({});
  const [labMode, setLabMode] = useState<LabMode>('solver');
  const abortControllerRef = useRef<AbortController | null>(null);

  const contextKey = [
    cls.label,
    board,
    context.streamId,
    subject.name,
    chapter.id,
    topic.id,
  ].join('|');

  useEffect(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setProblemStatement('');
    setGivenValues('');
    setStudentAttempt('');
    setSolution(null);
    setVerification(null);
    setActiveAction(null);
    setErrorMessage(null);
    setRetryRequest(null);
    setWasCancelled(false);
    setShownHints({});
    setShownCorrections({});
    setLabMode('solver');
  }, [contextKey]);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    },
    []
  );

  const buildProblemPayload = (): NumericalProblemPayload => ({
    classLabel: cls.label,
    board,
    subject: subject.name,
    chapter: chapter.title,
    topic: topic.title,
    problemStatement: problemStatement.trim(),
    givenValues: givenValues.trim() || undefined,
  });

  const resetResultsForInputChange = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setActiveAction(null);
    setSolution(null);
    setVerification(null);
    setErrorMessage(null);
    setRetryRequest(null);
    setWasCancelled(false);
    setShownHints({});
    setShownCorrections({});
  };

  const runRequest = async (request: NumericalRequest) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setActiveAction(request.operation);
    setErrorMessage(null);
    setRetryRequest(request);
    setWasCancelled(false);
    if (request.operation === 'solve') setSolution(null);
    else {
      setVerification(null);
      setShownHints({});
      setShownCorrections({});
    }

    try {
      const response = await fetch(`/api/numerical-lab/${request.operation}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(request.payload),
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          data &&
          typeof data === 'object' &&
          'error' in data &&
          typeof data.error === 'string'
            ? data.error
            : 'Numerical Lab could not complete this request. Please retry.';
        throw new Error(message);
      }

      const result =
        data && typeof data === 'object'
          ? (data as Record<string, unknown>)[request.operation]
          : undefined;
      if (!result || typeof result !== 'object') {
        throw new Error('The AI response was incomplete. Please retry.');
      }

      if (request.operation === 'solve') {
        const normalized = normalizeNumericalSolution(JSON.stringify(result));
        if (!normalized) throw new Error('The solution response was incomplete. Please retry.');
        setSolution(normalized);
      } else {
        const normalized = normalizeNumericalVerification(
          JSON.stringify(result),
          request.payload.studentSteps
        );
        if (!normalized) throw new Error('The step review was incomplete. Please retry.');
        setVerification(normalized);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Numerical Lab could not complete this request. Please retry.'
      );
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setActiveAction(null);
      }
    }
  };

  const handleSolve = () => {
    if (!problemStatement.trim()) {
      setErrorMessage('Enter a problem statement before requesting a solution.');
      return;
    }
    void runRequest({ operation: 'solve', payload: buildProblemPayload() });
  };

  const handleVerifySteps = () => {
    if (!problemStatement.trim()) {
      setErrorMessage('Enter the problem statement before checking your steps.');
      return;
    }
    if (!studentAttempt.trim()) {
      setErrorMessage('Add your calculation steps before requesting verification.');
      return;
    }
    void runRequest({
      operation: 'verify',
      payload: { ...buildProblemPayload(), studentSteps: studentAttempt.trim() },
    });
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setActiveAction(null);
    setWasCancelled(true);
    setErrorMessage(null);
  };

  const handleProblemChange = (value: string) => {
    resetResultsForInputChange();
    setProblemStatement(value);
  };

  const handleGivenValuesChange = (value: string) => {
    resetResultsForInputChange();
    setGivenValues(value);
  };

  const handleStudentAttemptChange = (value: string) => {
    resetResultsForInputChange();
    setStudentAttempt(value);
  };

  const statusClass = (assessment: string) => {
    if (assessment === 'incorrect') return 'text-[#b91c1c] dark:text-[#fca5a5]';
    if (assessment === 'valid-alternative') return 'text-[#047857] dark:text-[#6ee7b7]';
    if (assessment === 'uncertain') return 'text-[#a16207] dark:text-[#fcd34d]';
    return 'text-[#047857] dark:text-[#6ee7b7]';
  };

  return (
    <div className="space-y-6">
      <ContextBreadcrumbBar context={context} onNavigate={onNavigate} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#6b6684] dark:text-[#b0a6cf]">
          Review curriculum formulas or work through a problem in {cls.label} {subject.name}.
        </p>
        <div
          role="tablist"
          aria-label="Numerical Lab tools"
          className="inline-flex w-fit flex-wrap gap-1 rounded-full border border-[#e5deff] bg-white p-1 dark:border-[#372a5c] dark:bg-[#19132b]"
        >
          {(
            [
              { id: 'solver', label: 'Solver', Icon: Calculator },
              { id: 'formula-vault', label: 'Formula Vault', Icon: BookOpen },
              { id: 'formula-recall', label: 'Formula Recall', Icon: Layers },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              id={`numerical-tab-${id}`}
              role="tab"
              aria-controls={`numerical-panel-${id}`}
              aria-selected={labMode === id}
              onClick={() => {
                if (labMode === 'solver' && id !== 'solver' && activeAction) handleCancel();
                setLabMode(id);
              }}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                labMode === id
                  ? 'bg-[#5a45c8] text-white'
                  : 'text-[#6b6684] hover:bg-[#f0ebff] dark:text-[#b0a6cf] dark:hover:bg-[#221a3a]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {labMode === 'solver' ? (
      <div
        id="numerical-panel-solver"
        role="tabpanel"
        aria-labelledby="numerical-tab-solver"
        aria-label="Numerical solver"
        className="grid grid-cols-1 gap-6 lg:grid-cols-12"
      >
        <section className="lg:col-span-7 rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-[#1b1831] dark:text-[#f3f0fc]">
                Numerical Solving Laboratory
              </h2>
              <p className="text-xs text-[#6b6684] dark:text-[#b0a6cf]">
                AI-powered problem solving for {cls.label} · {subject.name}
              </p>
            </div>
            <Calculator className="w-5 h-5 text-[#5a45c8] dark:text-[#a78bfa]" aria-hidden="true" />
          </div>

          <div>
            <label
              htmlFor="sv-num-problem"
              className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
            >
              Problem Statement
            </label>
            <textarea
              id="sv-num-problem"
              rows={4}
              required
              maxLength={3_000}
              value={problemStatement}
              onChange={(event) => handleProblemChange(event.target.value)}
              placeholder={`Paste or type a numerical from ${topic.title}...`}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc] focus:outline-none focus:ring-2 focus:ring-[#5a45c8]"
            />
            <div className="mt-1 text-right text-[11px] text-[#776d94] dark:text-[#968cb8]">
              {problemStatement.length}/3,000
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="sv-num-given"
                className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
              >
                Given Quantities &amp; Units (optional)
              </label>
              <textarea
                id="sv-num-given"
                rows={3}
                maxLength={1_200}
                value={givenValues}
                onChange={(event) => handleGivenValuesChange(event.target.value)}
                placeholder="e.g. u = 20 m/s, θ = 30°, g = 9.8 m/s²"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] font-mono-tabular text-xs text-[#1b1831] dark:text-[#f3f0fc] focus:outline-none focus:ring-2 focus:ring-[#5a45c8]"
              />
            </div>

            <div>
              <label
                htmlFor="sv-num-attempt"
                className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
              >
                Your Step-by-Step Working
              </label>
              <textarea
                id="sv-num-attempt"
                rows={3}
                maxLength={4_000}
                value={studentAttempt}
                onChange={(event) => handleStudentAttemptChange(event.target.value)}
                placeholder="Put each calculation on a new line..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] font-mono-tabular text-xs text-[#1b1831] dark:text-[#f3f0fc] focus:outline-none focus:ring-2 focus:ring-[#5a45c8]"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              disabled={activeAction !== null}
              onClick={handleSolve}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#5a45c8] hover:bg-[#442cb2] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              {activeAction === 'solve' ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="w-4 h-4" aria-hidden="true" />
              )}
              {activeAction === 'solve' ? 'Solving...' : 'Solve with AI'}
            </button>
            <button
              type="button"
              disabled={activeAction !== null}
              onClick={handleVerifySteps}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#5a45c8] text-[#442cb2] dark:text-[#c4b5fd] disabled:opacity-60 text-sm font-semibold transition-colors cursor-pointer"
            >
              {activeAction === 'verify' ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              )}
              {activeAction === 'verify' ? 'Checking steps...' : 'Check My Steps'}
            </button>
          </div>

          {activeAction ? (
            <div role="status" aria-live="polite" className="flex items-center justify-between gap-3 text-xs text-[#6b6684] dark:text-[#b0a6cf]">
              <span>
                {activeAction === 'solve'
                  ? 'Gemini is working through the problem...'
                  : 'Gemini is checking each step carefully...'}
              </span>
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#e5deff] dark:border-[#372a5c] font-semibold cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
                Cancel
              </button>
            </div>
          ) : null}

          {errorMessage ? (
            <div
              role="alert"
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#fef2f2] dark:bg-[#3b151a] border border-[#fecaca] dark:border-[#7f1d1d] text-xs text-[#b91c1c] dark:text-[#fca5a5]"
            >
              <span>{errorMessage}</span>
              {retryRequest ? (
                <button
                  type="button"
                  onClick={() => void runRequest(retryRequest)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#fca5a5] font-semibold whitespace-nowrap cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  Retry
                </button>
              ) : null}
            </div>
          ) : null}

          {wasCancelled ? (
            <div
              role="status"
              className="p-3 rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] border border-[#e5deff] dark:border-[#2e244d] text-xs text-[#6b6684] dark:text-[#b0a6cf]"
            >
              Request cancelled.
            </div>
          ) : null}
        </section>

        <section className="lg:col-span-5 space-y-5">
          <div className="rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-3">
            <h3 className="font-display text-base font-bold text-[#1b1831] dark:text-[#f3f0fc]">
              Topic Reference Sheet
            </h3>
            <div className="p-3.5 rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] border border-[#ece6ff] dark:border-[#2e244d]">
              <div className="text-xs font-medium text-[#776d94] dark:text-[#968cb8]">
                Active Topic Formula
              </div>
              <div className="mt-1 font-mono-tabular text-sm font-semibold text-[#442cb2] dark:text-[#c4b5fd]">
                {topic.keyFormula || 'Select a formula-tagged topic in Explorer'}
              </div>
            </div>
            <ul className="text-xs text-[#6b6684] dark:text-[#b0a6cf] space-y-1.5 list-disc pl-4">
              <li>Convert all measurements into consistent SI units before substituting.</li>
              <li>Check sign conventions (optics, vectors, thermodynamics) prior to calculation.</li>
              <li>Verify dimensional consistency on both sides of the equation.</li>
            </ul>
          </div>

          {solution ? (
            <div className="rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5 space-y-4">
              <h3 className="font-display text-base font-bold text-[#1b1831] dark:text-[#f3f0fc]">
                AI Worked Solution
              </h3>
              <div>
                <h4 className="text-xs font-semibold text-[#5a45c8] dark:text-[#c4b5fd]">Given values</h4>
                {solution.givenValues.length ? (
                  <ul className="mt-1 space-y-1 text-sm text-[#484554] dark:text-[#e9e4f8]">
                    {solution.givenValues.map((given, index) => (
                      <li key={`${given.name}-${index}`}>
                        <span className="font-semibold">{given.name}:</span> {given.value} {given.unit}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-[#484554] dark:text-[#e9e4f8]">
                    No separate given values were identified; see the problem statement.
                  </p>
                )}
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[#5a45c8] dark:text-[#c4b5fd]">Required quantity</h4>
                <p className="mt-1 text-sm text-[#484554] dark:text-[#e9e4f8]">{solution.requiredQuantity}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#fcfaff] dark:bg-[#221a3a]">
                <h4 className="text-xs font-semibold text-[#5a45c8] dark:text-[#c4b5fd]">Formula</h4>
                <p className="mt-1 font-mono-tabular text-sm font-semibold text-[#1b1831] dark:text-[#f3f0fc]">
                  {solution.formula}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#6b6684] dark:text-[#b0a6cf]">
                  {solution.formulaExplanation}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[#5a45c8] dark:text-[#c4b5fd]">Unit conversions</h4>
                {solution.unitConversions.length ? (
                  <ul className="mt-1 space-y-1 text-xs text-[#484554] dark:text-[#e9e4f8]">
                    {solution.unitConversions.map((conversion, index) => (
                      <li key={`${conversion.from}-${index}`}>
                        {conversion.from} → {conversion.to} ({conversion.reason})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-[#6b6684] dark:text-[#b0a6cf]">
                    No unit conversion is needed.
                  </p>
                )}
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[#5a45c8] dark:text-[#c4b5fd]">Step-by-step calculations</h4>
                <ol className="mt-2 space-y-3 list-decimal pl-5">
                  {solution.steps.map((step, index) => (
                    <li key={`${index}-${step.calculation}`} className="text-sm text-[#484554] dark:text-[#e9e4f8]">
                      <div className="font-mono-tabular font-semibold">{step.calculation}</div>
                      <p className="mt-0.5 text-xs leading-5">{step.explanation}</p>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="p-3 rounded-xl bg-[#ecfdf5] dark:bg-[#102d24] border border-[#a7f3d0] dark:border-[#047857]">
                <h4 className="text-xs font-semibold text-[#047857] dark:text-[#6ee7b7]">Final answer</h4>
                <p className="mt-1 text-lg font-bold text-[#047857] dark:text-[#6ee7b7]">
                  {solution.finalAnswer.value} {solution.finalAnswer.unit}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[#5a45c8] dark:text-[#c4b5fd]">Verification check</h4>
                <p className="mt-1 text-xs leading-5 text-[#484554] dark:text-[#e9e4f8]">{solution.verification}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[#5a45c8] dark:text-[#c4b5fd]">Common mistakes</h4>
                <ul className="mt-1 space-y-1 list-disc pl-4 text-xs leading-5 text-[#484554] dark:text-[#e9e4f8]">
                  {solution.commonMistakes.map((mistake, index) => (
                    <li key={`${index}-${mistake}`}>{mistake}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          {verification ? (
            <div className="rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5 space-y-4">
              <h3 className="font-display text-base font-bold text-[#1b1831] dark:text-[#f3f0fc]">
                Step Verification
              </h3>
              {verification.firstIncorrectStep ? (
                <div className="p-3 rounded-xl bg-[#fff7ed] dark:bg-[#382410] border border-[#fed7aa] dark:border-[#9a3412] text-sm text-[#9a3412] dark:text-[#fdba74]">
                  First incorrect step identified: {verification.firstIncorrectStep}. Review its
                  justification and hint below.
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#ecfdf5] dark:bg-[#102d24] border border-[#a7f3d0] dark:border-[#047857] text-sm text-[#047857] dark:text-[#6ee7b7]">
                  No demonstrably incorrect step was identified. Check any steps marked uncertain.
                </div>
              )}
              <p className="text-sm leading-6 text-[#484554] dark:text-[#e9e4f8]">
                {verification.overallAssessment}
              </p>
              <ol className="space-y-3 list-decimal pl-5">
                {verification.steps.map((step) => (
                  <li key={step.stepNumber} className="text-sm text-[#484554] dark:text-[#e9e4f8]">
                    <div className="font-mono-tabular">{step.studentStep}</div>
                    <div className={`mt-1 text-xs font-semibold capitalize ${statusClass(step.assessment)}`}>
                      {step.assessment.replace(/-/g, ' ')}
                    </div>
                    <p className="mt-1 text-xs leading-5">{step.justification}</p>
                    {step.assessment === 'incorrect' ? (
                      <div className="mt-2 space-y-2">
                        {shownHints[step.stepNumber] ? (
                          <div className="p-2.5 rounded-lg bg-[#fcfaff] dark:bg-[#221a3a] text-xs leading-5">
                            <span className="font-semibold">Hint:</span> {step.hint}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setShownHints((previous) => ({
                                ...previous,
                                [step.stepNumber]: true,
                              }))
                            }
                            className="px-3 py-1.5 rounded-lg border border-[#e5deff] dark:border-[#372a5c] text-xs font-semibold cursor-pointer"
                          >
                            Show hint first
                          </button>
                        )}
                        {shownHints[step.stepNumber] ? (
                          shownCorrections[step.stepNumber] ? (
                            <div className="p-2.5 rounded-lg bg-[#ecfdf5] dark:bg-[#102d24] text-xs leading-5">
                              <span className="font-semibold">Correction:</span> {step.correction}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setShownCorrections((previous) => ({
                                  ...previous,
                                  [step.stepNumber]: true,
                                }))
                              }
                              className="px-3 py-1.5 rounded-lg bg-[#5a45c8] text-white text-xs font-semibold cursor-pointer"
                            >
                              Reveal correction
                            </button>
                          )
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ol>
              {verification.alternativeApproaches.length ? (
                <div>
                  <h4 className="text-xs font-semibold text-[#5a45c8] dark:text-[#c4b5fd]">
                    Valid alternative approaches
                  </h4>
                  <ul className="mt-1 space-y-1 list-disc pl-4 text-xs leading-5 text-[#484554] dark:text-[#e9e4f8]">
                    {verification.alternativeApproaches.map((approach, index) => (
                      <li key={`${index}-${approach}`}>{approach}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {!solution && !verification ? (
            <div className="rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5 text-xs leading-5 text-[#6b6684] dark:text-[#b0a6cf]">
              Your selected learning context—{cls.label}, {board}, {subject.name}, {chapter.title},
              and {topic.title}—is included with each AI request.
            </div>
          ) : null}
        </section>
      </div>
      ) : (
        <FormulaLearningTools
          key={`${contextKey}:${labMode}`}
          mode={labMode}
          classLabel={cls.label}
          board={board}
          subjectName={subject.name}
          chapterTitle={chapter.title}
          topics={chapter.topics}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}

interface FormulaReference {
  id: string;
  title: string;
  keyFormula?: string;
  summary: string;
}

interface FormulaLearningToolsProps {
  mode: Exclude<LabMode, 'solver'>;
  classLabel: string;
  board: string;
  subjectName: string;
  chapterTitle: string;
  topics: FormulaReference[];
  onNavigate: (module: NavModuleId) => void;
}

function FormulaLearningTools({
  mode,
  classLabel,
  board,
  subjectName,
  chapterTitle,
  topics,
  onNavigate,
}: FormulaLearningToolsProps) {
  const [formulaIndex, setFormulaIndex] = useState(0);
  const [formulaRevealed, setFormulaRevealed] = useState(false);
  const [recallStats, setRecallStats] = useState({ remembered: 0, review: 0 });
  const formulaTopics = topics.filter(
    (chapterTopic): chapterTopic is FormulaReference & { keyFormula: string } =>
      Boolean(chapterTopic.keyFormula?.trim())
  );
  const activeFormulaTopic = formulaTopics[formulaIndex];

  const recordFormulaRecall = (remembered: boolean) => {
    setRecallStats((previous) => ({
      remembered: previous.remembered + Number(remembered),
      review: previous.review + Number(!remembered),
    }));
    setFormulaIndex((previous) =>
      formulaTopics.length ? (previous + 1) % formulaTopics.length : 0
    );
    setFormulaRevealed(false);
  };

  if (mode === 'formula-vault') {
    return (
      <section
        id={`numerical-panel-${mode}`}
        role="tabpanel"
        aria-labelledby={`numerical-tab-${mode}`}
        className="rounded-3xl border border-[#e5deff] bg-white p-6 dark:border-[#2e244d] dark:bg-[#19132b] sm:p-8"
      >
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-[#f0ebff] p-3 text-[#5a45c8] dark:bg-[#2c214f] dark:text-[#c4b5fd]">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-[#1b1831] dark:text-[#f3f0fc]">
              Formula Vault
            </h2>
            <p className="mt-1 text-sm text-[#6b6684] dark:text-[#b0a6cf]">
              Curriculum references for {classLabel} · {board} · {subjectName} · {chapterTitle}.
            </p>
          </div>
        </div>
        {formulaTopics.length ? (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {formulaTopics.map((formulaTopic) => (
              <article
                key={formulaTopic.id}
                className="rounded-2xl border border-[#e5deff] bg-[#fcfaff] p-5 dark:border-[#372a5c] dark:bg-[#221a3a]"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-[#5a45c8] dark:text-[#c4b5fd]">
                  {formulaTopic.title}
                </p>
                <p className="mt-3 break-words font-mono-tabular text-lg font-semibold text-[#1b1831] dark:text-[#f3f0fc]">
                  {formulaTopic.keyFormula}
                </p>
                <p className="mt-3 text-xs leading-5 text-[#6b6684] dark:text-[#b0a6cf]">
                  {formulaTopic.summary}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-[#d8cff2] p-6 text-center">
            <p className="text-sm font-semibold text-[#1b1831] dark:text-[#f3f0fc]">
              No formula references are available for this chapter yet.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('explorer')}
              className="mt-3 rounded-full bg-[#5a45c8] px-4 py-2 text-sm font-semibold text-white cursor-pointer"
            >
              Browse curriculum
            </button>
          </div>
        )}
      </section>
    );
  }

  return (
    <section
      id={`numerical-panel-${mode}`}
      role="tabpanel"
      aria-labelledby={`numerical-tab-${mode}`}
      aria-live="polite"
      className="rounded-3xl border border-[#e5deff] bg-white p-6 dark:border-[#2e244d] dark:bg-[#19132b] sm:p-8"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5a45c8] dark:text-[#c4b5fd]">
            Formula Recall · {classLabel} · {subjectName}
          </p>
          <h2 className="mt-2 font-display text-xl font-bold text-[#1b1831] dark:text-[#f3f0fc]">
            Practice remembering key relations
          </h2>
          <p className="mt-1 text-sm text-[#6b6684] dark:text-[#b0a6cf]">
            This self-check uses only formulas already listed in the selected curriculum chapter.
          </p>
        </div>
        <div className="hidden rounded-2xl bg-[#f0ebff] p-3 text-[#5a45c8] dark:bg-[#2c214f] dark:text-[#c4b5fd] sm:block">
          <Layers className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>

      {activeFormulaTopic ? (
        <div className="mx-auto mt-8 max-w-2xl rounded-3xl border border-[#e5deff] bg-[#fcfaff] p-6 text-center dark:border-[#372a5c] dark:bg-[#221a3a] sm:p-10">
          <div className="text-xs font-medium text-[#6b6684] dark:text-[#b0a6cf]">
            Formula {formulaIndex + 1} of {formulaTopics.length} · {chapterTitle}
          </div>
          <h3 className="mt-5 font-display text-lg font-bold text-[#1b1831] dark:text-[#f3f0fc]">
            Can you recall the key formula for {activeFormulaTopic.title}?
          </h3>
          {formulaRevealed ? (
            <div className="mt-5 rounded-2xl bg-[#f0ebff] p-5 dark:bg-[#19132b]">
              <p className="font-mono-tabular text-xl font-bold text-[#442cb2] dark:text-[#ddd6fe]">
                {activeFormulaTopic.keyFormula}
              </p>
            </div>
          ) : (
            <p className="mt-5 text-sm text-[#6b6684] dark:text-[#b0a6cf]">
              Try to retrieve it from memory before revealing the curriculum reference.
            </p>
          )}
          {formulaRevealed ? (
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => recordFormulaRecall(true)}
                className="inline-flex items-center gap-2 rounded-full bg-[#5a45c8] px-5 py-2.5 text-sm font-semibold text-white cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                I recalled it
              </button>
              <button
                type="button"
                onClick={() => recordFormulaRecall(false)}
                className="inline-flex items-center gap-2 rounded-full border border-[#e5deff] px-5 py-2.5 text-sm font-semibold text-[#484554] dark:border-[#372a5c] dark:text-[#e9e4f8] cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Review again
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setFormulaRevealed(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#5a45c8] px-5 py-2.5 text-sm font-semibold text-white cursor-pointer"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Reveal formula
            </button>
          )}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-[#d8cff2] p-6 text-center">
          <p className="text-sm font-semibold text-[#1b1831] dark:text-[#f3f0fc]">
            No formula recall cards are available for this chapter yet.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('explorer')}
            className="mt-3 rounded-full bg-[#5a45c8] px-4 py-2 text-sm font-semibold text-white cursor-pointer"
          >
            Browse curriculum
          </button>
        </div>
      )}
      <p className="mt-5 text-center text-xs text-[#6b6684] dark:text-[#b0a6cf]" role="status">
        {recallStats.remembered} recalled · {recallStats.review} marked for review this round
      </p>
    </section>
  );
}
