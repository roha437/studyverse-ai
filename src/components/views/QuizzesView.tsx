import { useCallback, useEffect, useRef, useState } from 'react';
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
  AssessmentDifficulty,
  AssessmentQuestion,
  BoardId,
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
import { formatSecondsToTimer } from '../../utils/curriculumHelpers';
import {
  getRemainingTestSeconds,
  getTimedTestDurationSeconds,
  restoreSavedTimedAssessment,
} from '../../utils/mockTestHelpers';
import { ContextBreadcrumbBar } from '../common/ContextBreadcrumbBar';

type PendingQuizPayload = Omit<QuizAttemptRecord, 'id' | 'userId' | 'createdAt'>;
type PendingTestPayload = Omit<TestAttemptRecord, 'id' | 'userId' | 'createdAt'>;

interface QuizzesViewProps {
  context: ActiveStudyContext;
  board: BoardId;
  onNavigate: (module: NavModuleId) => void;
  quizAttempts: QuizAttemptRecord[];
  testAttempts: TestAttemptRecord[];
  dbStatus?: DatabaseSyncStatus;
  isAuthenticated?: boolean;
  userId?: string | null;
  onSaveQuizAttempt: (input: PendingQuizPayload) => Promise<DbOperationResult<QuizAttemptRecord>>;
  onSaveTestAttempt: (input: PendingTestPayload) => Promise<DbOperationResult<TestAttemptRecord>>;
}

export function QuizzesView({
  context,
  board,
  onNavigate,
  quizAttempts,
  testAttempts,
  dbStatus = 'local_preview',
  isAuthenticated = false,
  userId,
  onSaveQuizAttempt,
  onSaveTestAttempt,
}: QuizzesViewProps) {
  const { cls, subject, chapter, topic } = resolveContextDetails(context);
  const [assessmentType, setAssessmentType] = useState<'practice' | 'chapter-test' | 'timed'>(
    'practice'
  );
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<AssessmentDifficulty>('Board Standard');

  const [activeQuestions, setActiveQuestions] = useState<AssessmentQuestion[] | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [deadlineAt, setDeadlineAt] = useState<number | null>(null);
  const [markedQuestionIds, setMarkedQuestionIds] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<ReturnType<
    typeof evaluateQuizAnswers
  > | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingQuizPayload, setPendingQuizPayload] = useState<PendingQuizPayload | null>(null);
  const [pendingTestPayload, setPendingTestPayload] = useState<PendingTestPayload | null>(null);
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);
  const autoSubmitRef = useRef<() => void>(() => undefined);
  const autoSubmittingRef = useRef(false);
  const contextKey = [
    context.gradeId,
    context.streamId,
    context.subjectId,
    context.chapterId,
    context.topicId,
    board,
  ].join(':');
  const timedTestStorageKey = `studyverse-active-test-${userId ?? 'guest'}-${encodeURIComponent(contextKey)}`;
  const clearTimedTestStorage = useCallback(() => {
    try {
      window.localStorage.removeItem(timedTestStorageKey);
    } catch {
      setSaveError('Browser storage is unavailable; this timed test may not be restorable after refresh.');
    }
  }, [timedTestStorageKey]);

  useEffect(() => {
    if (!activeQuestions || submittedResult || assessmentType === 'timed') return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeQuestions, assessmentType, submittedResult]);

  useEffect(() => {
    setActiveQuestions(null);
    setSelectedAnswers({});
    setSubmittedResult(null);
    setElapsedSeconds(0);
    setSecondsRemaining(null);
    setDeadlineAt(null);
    setMarkedQuestionIds([]);
    setCurrentQuestionIndex(0);
    setShowSubmitConfirmation(false);
    setTimeExpired(false);
    autoSubmittingRef.current = false;
    setSaveMessage(null);
    setSaveError(null);
    setPendingQuizPayload(null);
    setPendingTestPayload(null);
    if (typeof window === 'undefined') return;

    try {
      const saved = window.localStorage.getItem(timedTestStorageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Record<string, unknown>;
      const questionBank = (['Foundation', 'Board Standard', 'Challenge'] as const).flatMap(
        (tier) => getCurriculumQuestionsForContext(subject, chapter, topic, 20, tier)
      );
      const restored = restoreSavedTimedAssessment(
        parsed,
        contextKey,
        questionBank
      );
      if (!restored) {
        clearTimedTestStorage();
        return;
      }
      const questionById = new Map(questionBank.map((question) => [question.id, question]));
      const restoredQuestions = restored.questionIds
        .map((id) => questionById.get(id))
        .filter((question): question is AssessmentQuestion => Boolean(question));
      if (restoredQuestions.length !== restored.questionIds.length) {
        clearTimedTestStorage();
        return;
      }
      setActiveQuestions(restoredQuestions);
      setSelectedAnswers(restored.selectedAnswers);
      setDeadlineAt(restored.deadlineAt);
      setSecondsRemaining(getRemainingTestSeconds(restored.deadlineAt));
      setMarkedQuestionIds(restored.markedQuestionIds);
      setCurrentQuestionIndex(restored.currentQuestionIndex);
      setElapsedSeconds(restored.elapsedSeconds);
      setAssessmentType('timed');
      setDifficulty(restored.difficulty);
      setQuestionCount(restored.questionCount);
    } catch {
      clearTimedTestStorage();
    }
  }, [clearTimedTestStorage, contextKey, timedTestStorageKey]);

  const handleStartCheck = () => {
    const questions = getCurriculumQuestionsForContext(
      subject,
      chapter,
      topic,
      questionCount,
      difficulty
    );
    if (questions.length === 0) {
      setActiveQuestions(null);
      setSelectedAnswers({});
      setSubmittedResult(null);
      setSaveError(
        `No curated ${difficulty.toLowerCase()} questions are currently available for ${topic.title}. Choose another difficulty or topic.`
      );
      return;
    }
    setActiveQuestions(questions);
    setSelectedAnswers({});
    setSubmittedResult(null);
    setElapsedSeconds(0);
    setSecondsRemaining(
      assessmentType === 'timed'
        ? getTimedTestDurationSeconds(questions.length)
        : null
    );
    setDeadlineAt(
      assessmentType === 'timed'
        ? Date.now() + getTimedTestDurationSeconds(questions.length) * 1000
        : null
    );
    setMarkedQuestionIds([]);
    setCurrentQuestionIndex(0);
    setShowSubmitConfirmation(false);
    setTimeExpired(false);
    autoSubmittingRef.current = false;
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
    try {
      if (quizPayload) {
        const res = await onSaveQuizAttempt(quizPayload);
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
      } else if (testPayload) {
        const res = await onSaveTestAttempt(testPayload);
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
      }
    } catch {
      setSaveError('The attempt could not be saved. Check your connection and retry.');
    } finally {
      setSaving(false);
    }
  };

  const commitSubmit = async () => {
    if (!activeQuestions || saving) return;
    if (submittedResult) return;
    setShowSubmitConfirmation(false);
    const evaluated = evaluateQuizAnswers(activeQuestions, selectedAnswers);
    setSubmittedResult(evaluated);

    const completedAt = new Date().toISOString();

    if (assessmentType === 'practice') {
      const quizPayload: PendingQuizPayload = {
        classLevel: context.gradeId,
        subject: subject.name,
        chapterId: chapter.id,
        topicId: topic.id,
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
          topicId: topic.id,
          difficulty,
        },
        completedAt,
      };
      setPendingQuizPayload(null);
      setPendingTestPayload(testPayload);
      await persistAttemptPayload(null, testPayload);
    }
  };

  const handleSubmitCheck = () => {
    if (!activeQuestions || saving || submittedResult) return;
    if (assessmentType === 'timed') {
      setShowSubmitConfirmation(true);
      return;
    }
    void commitSubmit();
  };

  autoSubmitRef.current = () => {
    if (!autoSubmittingRef.current) {
      autoSubmittingRef.current = true;
      setTimeExpired(true);
      void commitSubmit();
    }
  };

  useEffect(() => {
    if (
      !activeQuestions ||
      submittedResult ||
      assessmentType !== 'timed' ||
      deadlineAt === null
    ) {
      return;
    }
    const updateCountdown = () => {
      const remaining = getRemainingTestSeconds(deadlineAt);
      setSecondsRemaining(remaining);
      setElapsedSeconds(Math.max(0, getTimedTestDurationSeconds(activeQuestions.length) - remaining));
      if (remaining === 0) autoSubmitRef.current();
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 250);
    return () => window.clearInterval(timer);
  }, [activeQuestions, assessmentType, deadlineAt, submittedResult]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (submittedResult) {
      clearTimedTestStorage();
      return;
    }
    if (!activeQuestions || assessmentType !== 'timed' || deadlineAt === null) return;
    const savedState = {
      contextKey,
      difficulty,
      questionCount,
      questionIds: activeQuestions.map((question) => question.id),
      deadlineAt,
      elapsedSeconds,
      selectedAnswers,
      markedQuestionIds,
      currentQuestionIndex,
    };
    try {
      window.localStorage.setItem(timedTestStorageKey, JSON.stringify(savedState));
    } catch {
      setSaveError('Browser storage is unavailable; this timed test may not be restorable after refresh.');
    }
  }, [
    activeQuestions,
    assessmentType,
    contextKey,
    clearTimedTestStorage,
    currentQuestionIndex,
    deadlineAt,
    difficulty,
    elapsedSeconds,
    markedQuestionIds,
    questionCount,
    selectedAnswers,
    submittedResult,
    timedTestStorageKey,
  ]);

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
  const visibleQuestions =
    activeQuestions && assessmentType === 'timed' && !submittedResult
      ? [activeQuestions[Math.min(currentQuestionIndex, activeQuestions.length - 1)]]
      : activeQuestions ?? [];

  return (
    <div className="space-y-6">
      <ContextBreadcrumbBar context={context} onNavigate={onNavigate} />

      <div className="grid grid-cols-1 lg:grid-cols-12 items-start gap-6">
        <section className="lg:col-span-5 rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold text-[#1b1831] dark:text-[#f3f0fc]">
              Quiz &amp; Test Builder
            </h2>
            <p className="mt-1 text-xs text-[#6b6684] dark:text-[#b0a6cf]">
              {cls.label} · {board} · {subject.name} · {chapter.title} · {topic.title}
            </p>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf]">
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
                  disabled={Boolean(activeQuestions)}
                  onClick={() => setAssessmentType(item.id)}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                    assessmentType === item.id
                      ? 'bg-[#e5deff] dark:bg-[#2c214f] border-[#5a45c8] text-[#442cb2] dark:text-[#f3f0fc]'
                      : 'bg-[#fcfaff] dark:bg-[#221a3a] border-[#e5deff] dark:border-[#2e244d] text-[#484554] dark:text-[#b0a6cf]'
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
                className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
              >
                Question Set Size
              </label>
              <select
                id="sv-quiz-count"
                value={questionCount}
                disabled={Boolean(activeQuestions)}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc] tabular-nums"
              >
                <option value={3}>3 Syllabus Checks</option>
                <option value={5}>Up to 5 Questions</option>
                <option value={10}>Up to 10 Questions</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="sv-quiz-difficulty"
                className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
              >
                Difficulty Tier
              </label>
              <select
                id="sv-quiz-difficulty"
                value={difficulty}
                disabled={Boolean(activeQuestions)}
                onChange={(e) =>
                  setDifficulty(
                    e.target.value as AssessmentDifficulty
                  )
                }
                className="w-full px-3 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc]"
              >
                <option value="Foundation">Easy · Foundation</option>
                <option value="Board Standard">Medium · Board Standard</option>
                <option value="Challenge">Hard · Challenge</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={Boolean(activeQuestions)}
            onClick={handleStartCheck}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#5a45c8] hover:bg-[#442cb2] disabled:opacity-50 text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            <Play className="w-4 h-4" aria-hidden="true" />
            <span>
              Start {assessmentType === 'practice' ? 'Syllabus Quiz' : 'Curriculum Test'}
            </span>
          </button>
          {saveError && !activeQuestions ? (
            <p role="alert" className="text-xs text-[#b91c1c] dark:text-[#fca5a5]">
              {saveError}
            </p>
          ) : null}

          <div className="pt-4 border-t border-[#ece6ff] dark:border-[#2a2147] space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#1b1831] dark:text-[#f3f0fc]">
              <span>Recent Saved Attempts ({recentHistory.length})</span>
              {isLoadingSavedAttempts ? (
                <span className="inline-flex items-center gap-1 text-[#5a45c8] dark:text-[#c4b5fd] font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  <span>Loading...</span>
                </span>
              ) : null}
            </div>
            {isLoadingSavedAttempts && recentHistory.length === 0 ? (
              <div
                role="status"
                className="p-3 rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] border border-[#ece6ff] dark:border-[#2e244d] text-xs text-[#6b6684] dark:text-[#b0a6cf] flex items-center gap-2"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5a45c8]" aria-hidden="true" />
                <span>Loading your saved quiz and test results...</span>
              </div>
            ) : recentHistory.length === 0 ? (
              <p className="text-xs text-[#6b6684] dark:text-[#b0a6cf]">
                Complete a quiz or chapter test to record your score history.
              </p>
            ) : (
              <ul className="divide-y divide-[#ece6ff] dark:divide-[#2a2147] text-xs">
                {recentHistory.map((item) => {
                  const isExpanded = expandedAttemptId === item.id;
                  return (
                    <li key={item.id} className="py-2.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-[#1b1831] dark:text-[#f3f0fc] truncate">
                            {item.kind}: {item.label}
                          </div>
                          <div className="text-[#776d94] dark:text-[#968cb8] tabular-nums">
                            Time: {item.duration} · {formatAttemptTimestamp(item.completedAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono-tabular font-semibold text-[#5a45c8] dark:text-[#c4b5fd]">
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
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-[11px] font-medium text-[#6b6684] dark:text-[#b0a6cf] hover:text-[#1b1831] dark:hover:text-[#f3f0fc] cursor-pointer"
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
                        <div className="rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] border border-[#ece6ff] dark:border-[#2e244d] p-3 space-y-2">
                          {item.answers.map((ans, idx) => (
                            <div
                              key={`${item.id}-${ans.questionId}-${idx}`}
                              className="text-[11px] leading-relaxed border-b last:border-b-0 border-[#ece6ff] dark:border-[#2e244d] pb-2 last:pb-0"
                            >
                              <div className="flex items-start justify-between gap-2 font-semibold text-[#1b1831] dark:text-[#f3f0fc]">
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
                              <div className="mt-1 text-[#6b6684] dark:text-[#b0a6cf]">
                                Your answer:{' '}
                                <span className="font-medium text-[#1b1831] dark:text-[#f3f0fc]">
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

        <section className="lg:col-span-7 rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-5">
          <div className="flex items-start justify-between gap-4 border-b border-[#ece6ff] dark:border-[#2a2147] pb-4">
            <div>
              <div className="text-xs font-medium text-[#5a45c8] dark:text-[#c4b5fd]">
                {activeQuestions ? 'Active Curriculum Check' : 'Assessment Blueprint'}
              </div>
              <h3 className="mt-1 font-display text-lg font-bold text-[#1b1831] dark:text-[#f3f0fc]">
                {topic.title} ({difficulty})
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#6b6684] dark:text-[#b0a6cf]">
              {activeQuestions ? (
                <>
                  <Clock className="w-4 h-4 text-[#5a45c8]" aria-hidden="true" />
                  <span>{elapsedSeconds}s</span>
                </>
              ) : (
                <CheckSquare className="w-5 h-5 text-[#5a45c8] dark:text-[#a78bfa]" aria-hidden="true" />
              )}
            </div>
          </div>

          {activeQuestions && assessmentType === 'timed' && !submittedResult ? (
            <div className="rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf]">
                  Question {currentQuestionIndex + 1} of {activeQuestions.length} · 2 minutes per question
                </span>
                <span
                  role="timer"
                  aria-live="polite"
                  className={`font-mono-tabular text-sm font-bold ${
                    (secondsRemaining ?? 0) <= 60
                      ? 'text-[#dc2626] dark:text-[#fca5a5]'
                      : 'text-[#5a45c8] dark:text-[#c4b5fd]'
                  }`}
                >
                  {formatSecondsToTimer(secondsRemaining ?? 0)}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Test question navigation">
                {activeQuestions.map((question, index) => {
                  const isMarked = markedQuestionIds.includes(question.id);
                  const hasAnswer = selectedAnswers[question.id] !== undefined;
                  return (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => setCurrentQuestionIndex(index)}
                      aria-current={currentQuestionIndex === index ? 'step' : undefined}
                      aria-label={`Question ${index + 1}${hasAnswer ? ', answered' : ', unanswered'}${isMarked ? ', marked for review' : ''}`}
                      className={`h-9 min-w-9 rounded-lg border px-2 text-xs font-semibold ${
                        currentQuestionIndex === index
                          ? 'border-[#5a45c8] bg-[#5a45c8] text-white'
                          : isMarked
                            ? 'border-[#f59e0b] bg-[#fffbeb] text-[#92400e] dark:bg-[#3f2c12] dark:text-[#fcd34d]'
                            : hasAnswer
                              ? 'border-[#10b981] bg-[#ecfdf5] text-[#065f46] dark:bg-[#102d24] dark:text-[#34d399]'
                              : 'border-[#e5deff] bg-white text-[#6b6684] dark:border-[#372a5c] dark:bg-[#19132b] dark:text-[#b0a6cf]'
                      } cursor-pointer`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex((index) => Math.max(0, index - 1))}
                    className="rounded-lg border border-[#e5deff] dark:border-[#372a5c] px-3 py-1.5 text-xs font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={currentQuestionIndex >= activeQuestions.length - 1}
                    onClick={() =>
                      setCurrentQuestionIndex((index) => Math.min(activeQuestions.length - 1, index + 1))
                    }
                    className="rounded-lg border border-[#e5deff] dark:border-[#372a5c] px-3 py-1.5 text-xs font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setMarkedQuestionIds((current) =>
                      current.includes(activeQuestions[currentQuestionIndex].id)
                        ? current.filter((id) => id !== activeQuestions[currentQuestionIndex].id)
                        : [...current, activeQuestions[currentQuestionIndex].id]
                    )
                  }
                  className="rounded-lg bg-[#fffbeb] dark:bg-[#3f2c12] px-3 py-1.5 text-xs font-semibold text-[#92400e] dark:text-[#fcd34d] cursor-pointer"
                >
                  {markedQuestionIds.includes(activeQuestions[currentQuestionIndex].id)
                    ? 'Remove Review Mark'
                    : 'Mark for Review'}
                </button>
              </div>
            </div>
          ) : null}

          {!activeQuestions ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] border border-[#ece6ff] dark:border-[#2e244d]">
                  <div className="text-xs text-[#776d94] dark:text-[#968cb8]">Mode</div>
                  <div className="mt-1 text-sm font-semibold text-[#1b1831] dark:text-[#f3f0fc] capitalize">
                    {assessmentType.replace('-', ' ')}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] border border-[#ece6ff] dark:border-[#2e244d]">
                  <div className="text-xs text-[#776d94] dark:text-[#968cb8]">Assessment Type</div>
                  <div className="mt-1 text-sm font-semibold text-[#1b1831] dark:text-[#f3f0fc]">
                    {assessmentType === 'practice' ? 'Topic Practice Quiz' : 'Chapter Assessment'}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] border border-[#ece6ff] dark:border-[#2e244d]">
                  <div className="text-xs text-[#776d94] dark:text-[#968cb8]">Saved Attempts</div>
                  <div className="mt-1 text-sm font-semibold text-[#1b1831] dark:text-[#f3f0fc] tabular-nums">
                    {isLoadingSavedAttempts
                      ? 'Loading...'
                      : `${quizAttempts.length + testAttempts.length} recorded`}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#ece6ff] dark:border-[#2e244d] bg-[#fcfaff] dark:bg-[#221a3a] p-4 text-xs leading-relaxed text-[#6b6684] dark:text-[#b0a6cf]">
                Only curated question-bank items for this topic and difficulty are used. Coverage is
                limited, so StudyVerse will not invent syllabus questions when no reviewed items are
                available.
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {visibleQuestions.map((q, index) => {
                const chosen = selectedAnswers[q.id];
                const questionNumber =
                  assessmentType === 'timed' && !submittedResult
                    ? currentQuestionIndex + 1
                    : index + 1;
                return (
                  <fieldset
                    key={q.id}
                    className="p-4 rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] border border-[#ece6ff] dark:border-[#2e244d] space-y-2.5"
                  >
                    <legend className="text-sm font-semibold text-[#1b1831] dark:text-[#f3f0fc]">
                      {questionNumber}. {q.prompt}
                    </legend>
                    <div className="space-y-1.5">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = chosen === optIdx;
                        const isCorrectOpt = optIdx === q.correctIndex;
                        let borderStyle =
                          'border-[#e5deff] dark:border-[#372a5c] bg-white dark:bg-[#19132b]';
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
                            'border-[#5a45c8] bg-[#e5deff] dark:bg-[#2c214f] text-[#442cb2] dark:text-[#f3f0fc]';
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
                      <p className="text-xs text-[#6b6684] dark:text-[#b0a6cf] pt-1">
                        Rationale: {q.explanation}
                      </p>
                    ) : null}
                  </fieldset>
                );
              })}

              {submittedResult ? (
                <div role="status" className="rounded-xl border border-[#c4b5fd] bg-[#f5f3ff] dark:bg-[#2c214f] p-4">
                  <div className="text-sm font-bold text-[#442cb2] dark:text-[#ddd6fe]">
                    Result: {submittedResult.correctAnswers}/{submittedResult.totalQuestions} correct · {submittedResult.scorePercentage}%
                  </div>
                  {timeExpired ? (
                    <p className="mt-1 text-xs text-[#6b6684] dark:text-[#c4b5fd]">
                      Time expired. Your answers were automatically submitted.
                    </p>
                  ) : null}
                  {markedQuestionIds.length ? (
                    <p className="mt-1 text-xs text-[#6b6684] dark:text-[#c4b5fd]">
                      Marked for review: {markedQuestionIds.length} {markedQuestionIds.length === 1 ? 'question' : 'questions'}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {showSubmitConfirmation ? (
                <div role="alertdialog" aria-labelledby="sv-submit-confirm-title" className="rounded-xl border border-[#fcd34d] bg-[#fffbeb] dark:border-[#78350f] dark:bg-[#2f2310] p-4">
                  <h4 id="sv-submit-confirm-title" className="text-sm font-bold text-[#92400e] dark:text-[#fcd34d]">
                    Submit this test now?
                  </h4>
                  <p className="mt-1 text-xs text-[#78350f] dark:text-[#fcd34d]">
                    {activeQuestions.length - Object.keys(selectedAnswers).length} unanswered · {markedQuestionIds.length} marked for review. You can still cancel and continue.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void commitSubmit()}
                      disabled={saving}
                      className="rounded-lg bg-[#5a45c8] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
                    >
                      Confirm Submit
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSubmitConfirmation(false)}
                      className="rounded-lg border border-[#e5deff] dark:border-[#78350f] px-3 py-1.5 text-xs font-semibold text-[#78350f] dark:text-[#fcd34d] cursor-pointer"
                    >
                      Continue Test
                    </button>
                  </div>
                </div>
              ) : null}

              {saving ? (
                <div
                  role="status"
                  className="p-3 rounded-xl bg-[#f0ebff] dark:bg-[#221a3a] border border-[#e5deff] dark:border-[#372a5c] text-xs font-medium text-[#442cb2] dark:text-[#c4b5fd] flex items-center gap-2"
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
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5a45c8] hover:bg-[#442cb2] disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <span>{saving ? 'Grading & Saving...' : assessmentType === 'timed' ? 'Submit Mock Test' : 'Submit & Save Attempt'}</span>
                  </button>
                ) : (
                  <>
                    {saveError && hasUnsavedPendingAttempt ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void handleRetrySaveAttempt()}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5a45c8] hover:bg-[#442cb2] disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer"
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
                          ? 'border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-[#1b1831] dark:text-[#f3f0fc]'
                          : 'bg-[#5a45c8] hover:bg-[#442cb2] text-white'
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
