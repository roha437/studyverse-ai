import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { getCurriculumQuestionsForContext } from '../../data/assessments';
import type {
  ActiveStudyContext,
  AssessmentQuestion,
  DatabaseSyncStatus,
  DbOperationResult,
  NavModuleId,
  QuizAnswerItem,
  QuizAttemptRecord,
  TestAttemptRecord,
} from '../../types/studyverse';
import { resolveContextDetails } from '../../utils/curriculumHelpers';
import {
  deriveGradeLabel,
  evaluateQuizAnswers,
  formatAttemptTimestamp,
} from '../../utils/databaseMappers';
import { ContextBreadcrumbBar } from '../common/ContextBreadcrumbBar';
import { IntegrationBanner } from '../common/IntegrationBanner';

type PendingQuizPayload = Omit<QuizAttemptRecord, 'id' | 'userId' | 'createdAt'>;
type PendingTestPayload = Omit<TestAttemptRecord, 'id' | 'userId' | 'createdAt'>;

interface QuizzesViewProps {
  context: ActiveStudyContext;
  onNavigate: (module: NavModuleId) => void;
  quizAttempts: QuizAttemptRecord[];
  testAttempts: TestAttemptRecord[];
  dbStatus?: DatabaseSyncStatus;
  isAuthenticated?: boolean;
  onSaveQuizAttempt: (input: PendingQuizPayload) => Promise<DbOperationResult<QuizAttemptRecord>>;
  onSaveTestAttempt: (input: PendingTestPayload) => Promise<DbOperationResult<TestAttemptRecord>>;
}

export function QuizzesView({
  context,
  onNavigate,
  quizAttempts,
  testAttempts,
  dbStatus = 'local_preview',
  isAuthenticated = false,
  onSaveQuizAttempt,
  onSaveTestAttempt,
}: QuizzesViewProps) {
  const { cls, subject, chapter, topic } = resolveContextDetails(context);
  const [assessmentType, setAssessmentType] = useState<'practice' | 'chapter-test' | 'timed'>(
    'practice'
  );
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<'Foundation' | 'Board Standard' | 'Challenge'>(
    'Board Standard'
  );

  const [activeQuestions, setActiveQuestions] = useState<AssessmentQuestion[] | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [submittedResult, setSubmittedResult] = useState<ReturnType<
    typeof evaluateQuizAnswers
  > | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingQuizPayload, setPendingQuizPayload] = useState<PendingQuizPayload | null>(null);
  const [pendingTestPayload, setPendingTestPayload] = useState<PendingTestPayload | null>(null);
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeQuestions || submittedResult) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeQuestions, submittedResult]);

  useEffect(() => {
    setActiveQuestions(null);
    setSelectedAnswers({});
    setSubmittedResult(null);
    setElapsedSeconds(0);
    setSaveMessage(null);
    setSaveError(null);
    setPendingQuizPayload(null);
    setPendingTestPayload(null);
  }, [topic.id]);

  const handleStartCheck = () => {
    const questions = getCurriculumQuestionsForContext(subject, chapter, topic, questionCount);
    setActiveQuestions(questions);
    setSelectedAnswers({});
    setSubmittedResult(null);
    setElapsedSeconds(0);
    setSaveMessage(null);
    setSaveError(null);
    setPendingQuizPayload(null);
    setPendingTestPayload(null);
  };

  const persistAttemptPayload = async (
    quizPayload: PendingQuizPayload | null,
    testPayload: PendingTestPayload | null
  ) => {
    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    if (quizPayload) {
      const res = await onSaveQuizAttempt(quizPayload);
      setSaving(false);
      if (res.error) {
        setSaveError(res.error);
      } else {
        setPendingQuizPayload(null);
        setSaveMessage(
          isAuthenticated
            ? `Quiz attempt saved to your account (${quizPayload.correctAnswers}/${quizPayload.totalQuestions} · ${quizPayload.scorePercentage}%)`
            : `Quiz graded in preview mode (${quizPayload.correctAnswers}/${quizPayload.totalQuestions} · ${quizPayload.scorePercentage}%). Sign in to save attempts permanently.`
        );
      }
      return;
    }

    if (testPayload) {
      const res = await onSaveTestAttempt(testPayload);
      setSaving(false);
      if (res.error) {
        setSaveError(res.error);
      } else {
        setPendingTestPayload(null);
        setSaveMessage(
          isAuthenticated
            ? `Test attempt saved to your account (${testPayload.obtainedMarks}/${testPayload.totalMarks} marks · ${testPayload.result.gradeLabel})`
            : `Test graded in preview mode (${testPayload.obtainedMarks}/${testPayload.totalMarks} marks · ${testPayload.result.gradeLabel}). Sign in to save attempts permanently.`
        );
      }
      return;
    }

    setSaving(false);
  };

  const handleSubmitCheck = async () => {
    if (!activeQuestions || saving) return;
    const evaluated = evaluateQuizAnswers(activeQuestions, selectedAnswers);
    setSubmittedResult(evaluated);

    const completedAt = new Date().toISOString();

    if (assessmentType === 'practice') {
      const quizPayload: PendingQuizPayload = {
        classLevel: context.gradeId,
        subject: subject.name,
        chapterId: chapter.id,
        quizType: 'practice',
        difficulty,
        totalQuestions: evaluated.totalQuestions,
        correctAnswers: evaluated.correctAnswers,
        scorePercentage: evaluated.scorePercentage,
        answers: evaluated.answers,
        durationSeconds: elapsedSeconds,
        completedAt,
      };
      setPendingQuizPayload(quizPayload);
      setPendingTestPayload(null);
      await persistAttemptPayload(quizPayload, null);
    } else {
      const totalMarks = evaluated.totalQuestions * 2;
      const obtainedMarks = evaluated.correctAnswers * 2;
      const testPayload: PendingTestPayload = {
        title: `${chapter.title} (${assessmentType === 'timed' ? 'Timed Mock' : 'Chapter Test'})`,
        classLevel: context.gradeId,
        subject: subject.name,
        testType: assessmentType,
        totalMarks,
        obtainedMarks,
        durationSeconds: elapsedSeconds,
        answers: evaluated.answers,
        result: {
          percentage: evaluated.scorePercentage,
          gradeLabel: deriveGradeLabel(evaluated.scorePercentage),
          chapterId: chapter.id,
          difficulty,
        },
        completedAt,
      };
      setPendingQuizPayload(null);
      setPendingTestPayload(testPayload);
      await persistAttemptPayload(null, testPayload);
    }
  };

  const handleRetrySaveAttempt = async () => {
    if (saving || (!pendingQuizPayload && !pendingTestPayload)) return;
    await persistAttemptPayload(pendingQuizPayload, pendingTestPayload);
  };

  const recentHistory: Array<{
    id: string;
    kind: 'Quiz' | 'Test';
    label: string;
    scoreLabel: string;
    duration: string;
    completedAt: string;
    answers: QuizAnswerItem[];
  }> = [
    ...quizAttempts.map((q) => ({
      id: q.id,
      kind: 'Quiz' as const,
      label: `${q.subject} · ${q.difficulty}`,
      scoreLabel: `${q.correctAnswers}/${q.totalQuestions} (${Math.round(q.scorePercentage)}%)`,
      duration: `${q.durationSeconds}s`,
      completedAt: q.completedAt,
      answers: q.answers,
    })),
    ...testAttempts.map((t) => ({
      id: t.id,
      kind: 'Test' as const,
      label: t.title,
      scoreLabel: `${t.obtainedMarks}/${t.totalMarks} (${Math.round(t.result.percentage)}%)`,
      duration: `${t.durationSeconds}s`,
      completedAt: t.completedAt,
      answers: t.answers,
    })),
  ]
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 8);

  const isLoadingSavedAttempts = dbStatus === 'loading';
  const hasUnsavedPendingAttempt = Boolean(pendingQuizPayload || pendingTestPayload);

  return (
    <div className="space-y-6">
      <ContextBreadcrumbBar context={context} onNavigate={onNavigate} />

      <div className="grid grid-cols-1 lg:grid-cols-12 items-start gap-6">
        <section className="lg:col-span-5 rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold text-[#1b1430] dark:text-[#f3f0fc]">
              Quiz &amp; Test Builder
            </h2>
            <p className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf]">
              {cls.label} · {subject.name} · {chapter.title}
            </p>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf]">
              Assessment Mode
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'practice', label: 'Topic Practice' },
                  { id: 'chapter-test', label: 'Chapter Test' },
                  { id: 'timed', label: 'Timed Mock' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAssessmentType(item.id)}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                    assessmentType === item.id
                      ? 'bg-[#ede9fe] dark:bg-[#2c214f] border-[#6d28d9] text-[#5b21b6] dark:text-[#f3f0fc]'
                      : 'bg-[#faf8ff] dark:bg-[#221a3a] border-[#e5dff4] dark:border-[#2e244d] text-[#4c4366] dark:text-[#b0a6cf]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="sv-quiz-count"
                className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
              >
                Question Set Size
              </label>
              <select
                id="sv-quiz-count"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc] tabular-nums"
              >
                <option value={3}>3 Syllabus Checks</option>
                <option value={5}>Up to 5 Questions</option>
                <option value={10}>Up to 10 (AI Full Set)</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="sv-quiz-difficulty"
                className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
              >
                Difficulty Tier
              </label>
              <select
                id="sv-quiz-difficulty"
                value={difficulty}
                onChange={(e) =>
                  setDifficulty(
                    e.target.value as 'Foundation' | 'Board Standard' | 'Challenge'
                  )
                }
                className="w-full px-3 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc]"
              >
                <option value="Foundation">Foundation</option>
                <option value="Board Standard">Board Standard</option>
                <option value="Challenge">Challenge</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartCheck}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            <Play className="w-4 h-4" aria-hidden="true" />
            <span>
              Start {assessmentType === 'practice' ? 'Syllabus Quiz' : 'Curriculum Test'}
            </span>
          </button>

          <div className="pt-4 border-t border-[#efeaf9] dark:border-[#2a2147] space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#1b1430] dark:text-[#f3f0fc]">
              <span>Recent Saved Attempts ({recentHistory.length})</span>
              {isLoadingSavedAttempts ? (
                <span className="inline-flex items-center gap-1 text-[#6d28d9] dark:text-[#c4b5fd] font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  <span>Loading...</span>
                </span>
              ) : null}
            </div>
            {isLoadingSavedAttempts && recentHistory.length === 0 ? (
              <div
                role="status"
                className="p-3 rounded-xl bg-[#faf8ff] dark:bg-[#221a3a] border border-[#efeaf9] dark:border-[#2e244d] text-xs text-[#5b5276] dark:text-[#b0a6cf] flex items-center gap-2"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6d28d9]" aria-hidden="true" />
                <span>Loading your saved quiz and test results...</span>
              </div>
            ) : recentHistory.length === 0 ? (
              <p className="text-xs text-[#5b5276] dark:text-[#b0a6cf]">
                Complete a quiz or chapter test to record your score history.
              </p>
            ) : (
              <ul className="divide-y divide-[#efeaf9] dark:divide-[#2a2147] text-xs">
                {recentHistory.map((item) => {
                  const isExpanded = expandedAttemptId === item.id;
                  return (
                    <li key={item.id} className="py-2.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-[#1b1430] dark:text-[#f3f0fc] truncate">
                            {item.kind}: {item.label}
                          </div>
                          <div className="text-[#776d94] dark:text-[#968cb8] tabular-nums">
                            Time: {item.duration} · {formatAttemptTimestamp(item.completedAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono-tabular font-semibold text-[#6d28d9] dark:text-[#c4b5fd]">
                            {item.scoreLabel}
                          </span>
                          {item.answers.length > 0 ? (
                            <button
                              type="button"
                              aria-expanded={isExpanded}
                              aria-label={`${isExpanded ? 'Hide' : 'Inspect'} saved answers for ${item.kind}: ${item.label}`}
                              onClick={() =>
                                setExpandedAttemptId((prev) => (prev === item.id ? null : item.id))
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-[11px] font-medium text-[#5b5276] dark:text-[#b0a6cf] hover:text-[#1b1430] dark:hover:text-[#f3f0fc] cursor-pointer"
                            >
                              <span>{isExpanded ? 'Hide' : 'Details'}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" aria-hidden="true" />
                              ) : (
                                <ChevronDown className="w-3 h-3" aria-hidden="true" />
                              )}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {isExpanded && item.answers.length > 0 ? (
                        <div className="rounded-xl bg-[#faf8ff] dark:bg-[#221a3a] border border-[#efeaf9] dark:border-[#2e244d] p-3 space-y-2">
                          {item.answers.map((ans, idx) => (
                            <div
                              key={`${item.id}-${ans.questionId}-${idx}`}
                              className="text-[11px] leading-relaxed border-b last:border-b-0 border-[#efeaf9] dark:border-[#2e244d] pb-2 last:pb-0"
                            >
                              <div className="flex items-start justify-between gap-2 font-semibold text-[#1b1430] dark:text-[#f3f0fc]">
                                <span>
                                  {idx + 1}. {ans.prompt}
                                </span>
                                <span
                                  className={
                                    ans.isCorrect
                                      ? 'text-[#059669] dark:text-[#34d399] shrink-0'
                                      : 'text-[#dc2626] dark:text-[#fca5a5] shrink-0'
                                  }
                                >
                                  {ans.isCorrect ? 'Correct' : 'Incorrect'}
                                </span>
                              </div>
                              <div className="mt-1 text-[#5b5276] dark:text-[#b0a6cf]">
                                Your answer:{' '}
                                <span className="font-medium text-[#1b1430] dark:text-[#f3f0fc]">
                                  {ans.selectedOption ??
                                    (ans.options && ans.selectedIndex >= 0
                                      ? ans.options[ans.selectedIndex]
                                      : null) ??
                                    'Not answered'}
                                </span>
                              </div>
                              {!ans.isCorrect && (ans.correctOption || (ans.options && ans.options[ans.correctIndex])) ? (
                                <div className="text-[#059669] dark:text-[#34d399]">
                                  Correct answer:{' '}
                                  <span className="font-medium">
                                    {ans.correctOption ?? ans.options?.[ans.correctIndex]}
                                  </span>
                                </div>
                              ) : null}
                              {ans.explanation ? (
                                <div className="mt-0.5 text-[#776d94] dark:text-[#968cb8]">
                                  {ans.explanation}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <section className="lg:col-span-7 rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-5">
          <div className="flex items-start justify-between gap-4 border-b border-[#efeaf9] dark:border-[#2a2147] pb-4">
            <div>
              <div className="text-xs font-medium text-[#6d28d9] dark:text-[#c4b5fd]">
                {activeQuestions ? 'Active Curriculum Check' : 'Assessment Blueprint'}
              </div>
              <h3 className="mt-1 font-display text-lg font-bold text-[#1b1430] dark:text-[#f3f0fc]">
                {topic.title} ({difficulty})
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#5b5276] dark:text-[#b0a6cf]">
              {activeQuestions ? (
                <>
                  <Clock className="w-4 h-4 text-[#6d28d9]" aria-hidden="true" />
                  <span>{elapsedSeconds}s</span>
                </>
              ) : (
                <CheckSquare className="w-5 h-5 text-[#6d28d9] dark:text-[#a78bfa]" aria-hidden="true" />
              )}
            </div>
          </div>

          {!activeQuestions ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-[#faf8ff] dark:bg-[#221a3a] border border-[#efeaf9] dark:border-[#2e244d]">
                  <div className="text-xs text-[#776d94] dark:text-[#968cb8]">Mode</div>
                  <div className="mt-1 text-sm font-semibold text-[#1b1430] dark:text-[#f3f0fc] capitalize">
                    {assessmentType.replace('-', ' ')}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#faf8ff] dark:bg-[#221a3a] border border-[#efeaf9] dark:border-[#2e244d]">
                  <div className="text-xs text-[#776d94] dark:text-[#968cb8]">Assessment Type</div>
                  <div className="mt-1 text-sm font-semibold text-[#1b1430] dark:text-[#f3f0fc]">
                    {assessmentType === 'practice' ? 'Topic Practice Quiz' : 'Chapter Assessment'}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#faf8ff] dark:bg-[#221a3a] border border-[#efeaf9] dark:border-[#2e244d]">
                  <div className="text-xs text-[#776d94] dark:text-[#968cb8]">Saved Attempts</div>
                  <div className="mt-1 text-sm font-semibold text-[#1b1430] dark:text-[#f3f0fc] tabular-nums">
                    {isLoadingSavedAttempts
                      ? 'Loading...'
                      : `${quizAttempts.length + testAttempts.length} recorded`}
                  </div>
                </div>
              </div>

              <IntegrationBanner
                serviceName="Gemini API"
                title="Syllabus Practice & Chapter Tests"
                description="Click 'Start Syllabus Quiz' above to run textbook concept checks and save your scores directly to your StudyVerse profile."
                onNavigate={onNavigate}
              />
            </>
          ) : (
            <div className="space-y-4">
              {activeQuestions.map((q, index) => {
                const chosen = selectedAnswers[q.id];
                return (
                  <fieldset
                    key={q.id}
                    className="p-4 rounded-xl bg-[#faf8ff] dark:bg-[#221a3a] border border-[#efeaf9] dark:border-[#2e244d] space-y-2.5"
                  >
                    <legend className="text-sm font-semibold text-[#1b1430] dark:text-[#f3f0fc]">
                      {index + 1}. {q.prompt}
                    </legend>
                    <div className="space-y-1.5">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = chosen === optIdx;
                        const isCorrectOpt = optIdx === q.correctIndex;
                        let borderStyle =
                          'border-[#e5dff4] dark:border-[#372a5c] bg-white dark:bg-[#19132b]';
                        if (submittedResult) {
                          if (isCorrectOpt) {
                            borderStyle =
                              'border-[#10b981] bg-[#ecfdf5] dark:bg-[#102d24] text-[#065f46] dark:text-[#34d399]';
                          } else if (isSelected && !isCorrectOpt) {
                            borderStyle =
                              'border-[#ef4444] bg-[#fef2f2] dark:bg-[#3b151a] text-[#991b1b] dark:text-[#fca5a5]';
                          }
                        } else if (isSelected) {
                          borderStyle =
                            'border-[#6d28d9] bg-[#ede9fe] dark:bg-[#2c214f] text-[#5b21b6] dark:text-[#f3f0fc]';
                        }

                        return (
                          <label
                            key={optIdx}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-colors ${borderStyle}`}
                          >
                            <input
                              type="radio"
                              name={q.id}
                              checked={isSelected}
                              disabled={Boolean(submittedResult)}
                              onChange={() =>
                                setSelectedAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                              }
                            />
                            <span className="flex-1">{opt}</span>
                            {submittedResult && isCorrectOpt ? (
                              <CheckCircle2 className="w-4 h-4 text-[#059669]" aria-hidden="true" />
                            ) : null}
                            {submittedResult && isSelected && !isCorrectOpt ? (
                              <XCircle className="w-4 h-4 text-[#dc2626]" aria-hidden="true" />
                            ) : null}
                          </label>
                        );
                      })}
                    </div>
                    {submittedResult ? (
                      <p className="text-xs text-[#5b5276] dark:text-[#b0a6cf] pt-1">
                        Rationale: {q.explanation}
                      </p>
                    ) : null}
                  </fieldset>
                );
              })}

              {saving ? (
                <div
                  role="status"
                  className="p-3 rounded-xl bg-[#f3effb] dark:bg-[#221a3a] border border-[#e5dff4] dark:border-[#372a5c] text-xs font-medium text-[#5b21b6] dark:text-[#c4b5fd] flex items-center gap-2"
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  <span>Saving your attempt, answers, and score...</span>
                </div>
              ) : null}

              {saveError ? (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-[#fef2f2] dark:bg-[#3b151a] border border-[#fecaca] dark:border-[#7f1d1d] text-xs text-[#b91c1c] dark:text-[#fca5a5]"
                >
                  {saveError}
                </div>
              ) : null}

              {saveMessage ? (
                <div
                  role="status"
                  className="p-3 rounded-xl bg-[#ecfdf5] dark:bg-[#102d24] border border-[#a7f3d0] dark:border-[#047857] text-xs font-semibold text-[#059669] dark:text-[#34d399]"
                >
                  {saveMessage}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                {!submittedResult ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSubmitCheck()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <span>{saving ? 'Grading & Saving...' : 'Submit & Save Attempt'}</span>
                  </button>
                ) : (
                  <>
                    {saveError && hasUnsavedPendingAttempt ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void handleRetrySaveAttempt()}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{saving ? 'Retrying Save...' : 'Retry Save'}</span>
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleStartCheck}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 ${
                        saveError && hasUnsavedPendingAttempt
                          ? 'border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-[#1b1430] dark:text-[#f3f0fc]'
                          : 'bg-[#6d28d9] hover:bg-[#5b21b6] text-white'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Retake Assessment</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
