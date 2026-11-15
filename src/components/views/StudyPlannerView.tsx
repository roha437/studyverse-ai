import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Youtube,
  X,
} from 'lucide-react';
import type {
  ActiveStudyContext,
  BoardId,
  DatabaseSyncStatus,
  DbOperationResult,
  GradeLevelId,
  NavModuleId,
  StudentProfile,
  StudyPlanPriority,
  StudyPlanMetadata,
  StudyPlanStatus,
  StudyPlannerDay,
  StudyPlannerPreferences,
  StudySessionType,
  StudyTask,
  VideoLearningProgress,
  VideoLearningProgressInput,
} from '../../types/studyverse';
import {
  computePlannerSummary,
  getAvailableSubjects,
  getClassById,
  resolveDefaultContext,
} from '../../utils/curriculumHelpers';
import {
  formatPlanDateLabel,
  getNextIsoDateForWeekday,
  weekdayFromIsoDate,
} from '../../utils/databaseMappers';
import {
  type GeneratedStudyPlan,
  type GeneratedStudySession,
  normalizeGeneratedStudyPlan,
} from '../../utils/studyPlannerHelpers';
import { IntegrationBanner } from '../common/IntegrationBanner';
import { VideoLearningPanel } from '../common/VideoLearningPanel';
import type { YouTubeVideo } from '../../utils/youtubeHelpers';

interface StudyPlannerViewProps {
  profile: StudentProfile;
  tasks: StudyTask[];
  dbStatus?: DatabaseSyncStatus;
  dbError?: string | null;
  isAuthenticated?: boolean;
  videoProgress: VideoLearningProgress[];
  videoProgressError: string | null;
  onUpdateVideoProgress: (
    input: VideoLearningProgressInput
  ) => Promise<DbOperationResult<VideoLearningProgress>>;
  onStartQuizFromVideo: (context: ActiveStudyContext, board: BoardId) => void;
  onAddTask: (task: Omit<StudyTask, 'id' | 'completed'>) => Promise<DbOperationResult<StudyTask>>;
  onSaveGeneratedPlan: (
    tasks: Array<Omit<StudyTask, 'id' | 'completed'>>
  ) => Promise<DbOperationResult<StudyTask[]>>;
  onUpdateTask: (
    id: string,
    task: Omit<StudyTask, 'id'>
  ) => Promise<DbOperationResult<StudyTask>>;
  onToggleTask: (id: string) => Promise<DbOperationResult<StudyTask>>;
  onDeleteTask: (id: string) => Promise<DbOperationResult<{ id: string }>>;
  onUpdateProfile?: (nextProfile: StudentProfile) => Promise<DbOperationResult<StudentProfile>>;
  onRetrySync?: () => void;
  onNavigate: (module: NavModuleId) => void;
}

const DAYS: StudyTask['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const GRADES: GradeLevelId[] = [
  'class-5',
  'class-6',
  'class-7',
  'class-8',
  'class-9',
  'class-10',
  'inter-1',
  'inter-2',
];
const BOARDS: BoardId[] = ['NCERT / CBSE', 'State Board', 'Intermediate Board'];
const WEEKDAY_NAMES: Record<StudyPlannerDay, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

interface PlannerDraftSession extends GeneratedStudySession {
  taskId?: string;
  linkedVideo?: StudyPlanMetadata['linkedVideo'];
}

function localIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function currentWeekStart(): string {
  const date = new Date();
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return localIsoDate(date);
}

function addIsoDays(dateValue: string, days: number): string {
  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localIsoDate(date);
}

function createPlanGroupId(): string {
  return globalThis.crypto?.randomUUID?.() ??
    `ai-plan-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getTaskVideoContext(task: StudyTask, profile: StudentProfile): ActiveStudyContext {
  const gradeId = task.plannerMetadata?.plannerPreferences?.gradeId ?? profile.gradeId;
  const base = resolveDefaultContext(gradeId, profile.streamId);
  const subjects = getAvailableSubjects(gradeId, base.streamId);
  const subject =
    subjects.find(
      (item) => item.name.toLocaleLowerCase() === task.subjectName.toLocaleLowerCase()
    ) ?? subjects[0];
  if (!subject) return base;

  const chapter =
    subject.chapters.find((item) => item.id === task.chapterId) ??
    subject.chapters.find((item) =>
      item.topics.some(
        (topic) =>
          topic.title.toLocaleLowerCase() ===
          (task.plannerMetadata?.topic ?? task.title).toLocaleLowerCase()
      )
    ) ??
    subject.chapters[0];
  const topic =
    chapter.topics.find(
      (item) =>
        item.title.toLocaleLowerCase() ===
        (task.plannerMetadata?.topic ?? task.title).toLocaleLowerCase()
    ) ?? chapter.topics[0];
  return {
    gradeId,
    streamId: base.streamId,
    subjectId: subject.id,
    chapterId: chapter.id,
    topicId: topic.id,
  };
}

export function StudyPlannerView({
  profile,
  tasks,
  dbStatus = 'local_preview',
  dbError = null,
  isAuthenticated = false,
  videoProgress,
  videoProgressError,
  onUpdateVideoProgress,
  onStartQuizFromVideo,
  onAddTask,
  onSaveGeneratedPlan,
  onUpdateTask,
  onToggleTask,
  onDeleteTask,
  onUpdateProfile,
  onRetrySync,
  onNavigate,
}: StudyPlannerViewProps) {
  const subjects = getAvailableSubjects(profile.gradeId, profile.streamId);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subjectName, setSubjectName] = useState(subjects[0]?.name ?? 'Mathematics');
  const [day, setDay] = useState<StudyTask['day']>('Mon');
  const [planDate, setPlanDate] = useState<string>(() => getNextIsoDateForWeekday('Mon'));
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [priority, setPriority] = useState<StudyPlanPriority>('medium');
  const [status, setStatus] = useState<StudyPlanStatus>('pending');
  const [taskDescription, setTaskDescription] = useState('');
  const [dayFilter, setDayFilter] = useState<StudyTask['day'] | 'All'>('All');
  const [videoPanelTaskId, setVideoPanelTaskId] = useState<string | null>(null);

  const [dailyGoalInput, setDailyGoalInput] = useState(profile.dailyGoalMinutes);
  const [savingGoal, setSavingGoal] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [retryOperation, setRetryOperation] = useState<(() => Promise<void>) | null>(null);
  const [plannerGradeId, setPlannerGradeId] = useState<GradeLevelId>(profile.gradeId);
  const [plannerBoard, setPlannerBoard] = useState<BoardId>(profile.board);
  const [plannerSubjects, setPlannerSubjects] = useState<string[]>(() =>
    getAvailableSubjects(profile.gradeId, profile.streamId).slice(0, 4).map((subject) => subject.name)
  );
  const [plannerWeakSubjects, setPlannerWeakSubjects] = useState<string[]>([]);
  const [plannerDailyMinutes, setPlannerDailyMinutes] = useState(profile.dailyGoalMinutes);
  const [plannerWeekStart, setPlannerWeekStart] = useState(currentWeekStart);
  const [plannerTargetDate, setPlannerTargetDate] = useState(
    () => profile.examDate || addIsoDays(currentWeekStart(), 21)
  );
  const [plannerPreferredDays, setPlannerPreferredDays] = useState<StudyPlannerDay[]>([
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
  ]);
  const [plannerTopics, setPlannerTopics] = useState('');
  const [plannerRevisionPreference, setPlannerRevisionPreference] =
    useState<StudyPlannerPreferences['revisionPreference']>('balanced');
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationNotice, setGenerationNotice] = useState<string | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedStudyPlan | null>(null);
  const [draftSessions, setDraftSessions] = useState<PlannerDraftSession[]>([]);
  const [savedPlanGroupId, setSavedPlanGroupId] = useState<string | null>(null);
  const [savingGeneratedPlan, setSavingGeneratedPlan] = useState(false);
  const generationAbortRef = useRef<AbortController | null>(null);
  const plannerSubjectsAvailable = getAvailableSubjects(plannerGradeId, profile.streamId);

  useEffect(() => {
    setDailyGoalInput(profile.dailyGoalMinutes);
    setPlannerDailyMinutes(profile.dailyGoalMinutes);
  }, [profile.dailyGoalMinutes]);

  useEffect(() => () => generationAbortRef.current?.abort(), []);

  useEffect(() => {
    const allowed = new Set(
      getAvailableSubjects(plannerGradeId, profile.streamId).map((subject) => subject.name)
    );
    setPlannerSubjects((current) => current.filter((subject) => allowed.has(subject)));
    setPlannerWeakSubjects((current) => current.filter((subject) => allowed.has(subject)));
  }, [plannerGradeId, profile.streamId]);

  useEffect(() => {
    if (subjects.length > 0 && !subjects.some((s) => s.name === subjectName)) {
      setSubjectName(subjects[0].name);
    }
  }, [subjects, subjectName]);

  const summary = computePlannerSummary(tasks);
  const visibleTasks = dayFilter === 'All' ? tasks : tasks.filter((t) => t.day === dayFilter);
  const isLoadingPlans = dbStatus === 'loading';
  const savedPlanGroups = useMemo(() => {
    const groups = new Map<string, StudyTask[]>();
    for (const task of tasks) {
      const groupId = task.plannerMetadata?.source === 'ai'
        ? task.plannerMetadata.planGroupId
        : undefined;
      if (!groupId) continue;
      groups.set(groupId, [...(groups.get(groupId) ?? []), task]);
    }
    return [...groups.entries()].map(([id, sessions]) => ({
      id,
      sessions: sessions.sort(
        (a, b) =>
          (a.planDate ?? '').localeCompare(b.planDate ?? '') ||
          (a.plannerMetadata?.sessionOrder ?? 0) - (b.plannerMetadata?.sessionOrder ?? 0)
      ),
      metadata: sessions[0]?.plannerMetadata,
    }));
  }, [tasks]);
  const overdueTasks = tasks.filter(
    (task) => !task.completed && Boolean(task.planDate) && task.planDate! < localIsoDate(new Date())
  );
  const upcomingTasks = tasks
    .filter(
      (task) =>
        !task.completed &&
        Boolean(task.planDate) &&
        task.planDate! >= localIsoDate(new Date()) &&
        task.planDate! <= addIsoDays(localIsoDate(new Date()), 7)
    )
    .sort((a, b) => (a.planDate ?? '').localeCompare(b.planDate ?? ''))
    .slice(0, 5);

  const collectPlannerPreferences = (): StudyPlannerPreferences => ({
    gradeId: plannerGradeId,
    board: plannerBoard,
    subjects: plannerSubjects,
    weakSubjects: plannerWeakSubjects,
    dailyAvailableMinutes: plannerDailyMinutes,
    weekStartDate: plannerWeekStart,
    targetDate: plannerTargetDate,
    preferredDays: plannerPreferredDays,
    chaptersAndTopics: plannerTopics,
    revisionPreference: plannerRevisionPreference,
  });

  const generateAiPlan = async (preferences = collectPlannerPreferences()) => {
    generationAbortRef.current?.abort();
    const controller = new AbortController();
    generationAbortRef.current = controller;
    setGeneratingPlan(true);
    setGenerationError(null);
    setGenerationNotice(null);
    try {
      const response = await fetch('/api/study-planner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
        signal: controller.signal,
      });
      const result = (await response.json().catch(() => ({}))) as {
        plan?: GeneratedStudyPlan;
        error?: string;
      };
      if (!response.ok || !result.plan) {
        throw new Error(result.error ?? 'Could not generate a study plan.');
      }
      setGeneratedPlan(result.plan);
      setDraftSessions(result.plan.sessions);
      setSavedPlanGroupId(null);
    } catch (error) {
      if (controller.signal.aborted) {
        setGenerationNotice('Plan generation cancelled.');
      } else {
        setGenerationError(
          error instanceof Error ? error.message : 'Could not generate a study plan.'
        );
      }
    } finally {
      if (generationAbortRef.current === controller) {
        generationAbortRef.current = null;
        setGeneratingPlan(false);
      }
    }
  };

  const handleCancelGeneration = () => {
    generationAbortRef.current?.abort();
  };

  const updateDraftSession = (index: number, patch: Partial<PlannerDraftSession>) => {
    setDraftSessions((current) =>
      current.map((session, sessionIndex) =>
        sessionIndex === index ? { ...session, ...patch } : session
      )
    );
  };

  const resumeSavedPlan = (groupId: string) => {
    const group = savedPlanGroups.find((item) => item.id === groupId);
    if (!group || !group.sessions.length) return;
    const metadata = group.metadata;
    const sessions: PlannerDraftSession[] = group.sessions.map((task) => ({
      taskId: task.id,
      date: task.planDate ?? getNextIsoDateForWeekday(task.day),
      day: task.day,
      ...(task.plannerMetadata?.startTime
        ? { startTime: task.plannerMetadata.startTime }
        : {}),
      durationMinutes: task.durationMinutes,
      subject: task.subjectName,
      topic: task.plannerMetadata?.topic ?? task.title,
      title: task.title,
      learningObjective: task.plannerMetadata?.learningObjective ?? task.taskDescription ?? '',
      practiceRecommendation: task.plannerMetadata?.practiceRecommendation ?? '',
      sessionType: task.plannerMetadata?.sessionType ?? 'learning',
      priority: task.priority ?? 'medium',
      linkedVideo: task.plannerMetadata?.linkedVideo,
    }));
    setGeneratedPlan({
      title: metadata?.planTitle ?? 'Saved AI Study Plan',
      summary: metadata?.planSummary ?? 'Resume and adjust your saved study sessions.',
      breakGuidance: metadata?.breakGuidance ?? 'Take short breaks between focused study sessions.',
      finalRevisionPlan: metadata?.finalRevisionPlan ?? ['Review key ideas and practice questions.'],
      sessions: sessions.map(({ taskId: _taskId, ...session }) => session),
    });
    setDraftSessions(sessions);
    setSavedPlanGroupId(groupId);
    if (metadata?.plannerPreferences) {
      const preferences = metadata.plannerPreferences;
      setPlannerGradeId(preferences.gradeId);
      setPlannerBoard(preferences.board);
      setPlannerSubjects(preferences.subjects);
      setPlannerWeakSubjects(preferences.weakSubjects);
      setPlannerDailyMinutes(preferences.dailyAvailableMinutes);
      setPlannerWeekStart(preferences.weekStartDate);
      setPlannerTargetDate(preferences.targetDate);
      setPlannerPreferredDays(preferences.preferredDays);
      setPlannerTopics(preferences.chaptersAndTopics);
      setPlannerRevisionPreference(preferences.revisionPreference);
    }
    setGenerationError(null);
    setGenerationNotice(`Resumed "${metadata?.planTitle ?? 'saved plan'}".`);
  };

  const handleSaveGeneratedPlan = async () => {
    if (!generatedPlan || draftSessions.length < 1) return;
    const prefs = collectPlannerPreferences();
    const normalizedPlan = normalizeGeneratedStudyPlan(
      JSON.stringify({ ...generatedPlan, sessions: draftSessions }),
      prefs
    );
    if (!normalizedPlan) {
      setGenerationError(
        'Review the sessions: dates, subjects, durations, objectives, or daily totals are invalid.'
      );
      return;
    }
    const sessionsToSave = normalizedPlan.sessions.map((session, index) => ({
      ...session,
      ...(draftSessions[index]?.linkedVideo
        ? { linkedVideo: draftSessions[index].linkedVideo }
        : {}),
      ...(draftSessions[index]?.taskId ? { taskId: draftSessions[index].taskId } : {}),
    }));
    const groupId = savedPlanGroupId ?? createPlanGroupId();
    const originalTasks = savedPlanGroupId
      ? savedPlanGroups.find((group) => group.id === savedPlanGroupId)?.sessions ?? []
      : [];
    const metadataBase = {
      source: 'ai' as const,
      planGroupId: groupId,
      planTitle: normalizedPlan.title,
      planSummary: normalizedPlan.summary,
      weekStartDate: prefs.weekStartDate,
      targetDate: prefs.targetDate,
      dailyAvailableMinutes: prefs.dailyAvailableMinutes,
      breakGuidance: normalizedPlan.breakGuidance,
      finalRevisionPlan: normalizedPlan.finalRevisionPlan,
      board: prefs.board,
      classLabel: getClassById(prefs.gradeId).label,
      plannerPreferences: prefs,
    };
    const toTask = (session: PlannerDraftSession, index: number): Omit<StudyTask, 'id'> => ({
      title: session.title,
      subjectName: session.subject,
      day: session.day,
      planDate: session.date,
      durationMinutes: session.durationMinutes,
      priority: session.priority,
      status: 'pending',
      completed: false,
      taskDescription: [
        session.learningObjective,
        `Practice: ${session.practiceRecommendation}`,
      ].filter(Boolean).join('\n'),
      plannerMetadata: {
        ...metadataBase,
        topic: session.topic,
        learningObjective: session.learningObjective,
        practiceRecommendation: session.practiceRecommendation,
        sessionType: session.sessionType,
        sessionOrder: index,
        ...(session.linkedVideo ? { linkedVideo: session.linkedVideo } : {}),
        ...(session.startTime ? { startTime: session.startTime } : {}),
      },
    });

    setSavingGeneratedPlan(true);
    setGenerationError(null);
    setGenerationNotice(null);
    const savedSessions: PlannerDraftSession[] = [];
    try {
      if (!savedPlanGroupId) {
        const result = await onSaveGeneratedPlan(sessionsToSave.map(toTask));
        if (result.error || !result.data) throw new Error(result.error ?? 'Could not save this plan.');
        result.data.forEach((task, index) => {
          savedSessions.push({ ...sessionsToSave[index], taskId: task.id });
        });
      } else {
        const retainedIds = new Set(sessionsToSave.map((session) => session.taskId).filter(Boolean));
        for (const task of originalTasks) {
          if (retainedIds.has(task.id)) continue;
          const result = await onDeleteTask(task.id);
          if (result.error) {
            throw new Error(`Some earlier changes may already be saved. ${result.error}`);
          }
        }
        for (const [index, session] of sessionsToSave.entries()) {
          if (session.taskId) {
            const existing = originalTasks.find((task) => task.id === session.taskId);
            const nextTask = toTask(session, index);
            const result = await onUpdateTask(session.taskId, {
              ...nextTask,
              status: existing?.status ?? (existing?.completed ? 'completed' : 'pending'),
              completed: existing?.completed ?? false,
              completedAt: existing?.completedAt ?? null,
            });
            if (result.error || !result.data) {
              throw new Error(
                `Some earlier changes may already be saved. ${result.error ?? 'Could not update a session.'}`
              );
            }
            savedSessions.push({ ...session, taskId: result.data.id });
          } else {
            const result = await onAddTask(toTask(session, index));
            if (result.error || !result.data) {
              throw new Error(
                `Some earlier changes may already be saved. ${result.error ?? 'Could not add a session.'}`
              );
            }
            savedSessions.push({ ...session, taskId: result.data.id });
          }
        }
      }
      setDraftSessions(savedSessions);
      setGeneratedPlan(normalizedPlan);
      setSavedPlanGroupId(groupId);
      setGenerationNotice(
        isAuthenticated
          ? 'Your AI study plan is saved to your account.'
          : 'Your AI study plan is saved in this preview session. Sign in to keep it across devices.'
      );
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : 'Could not save this study plan.'
      );
    } finally {
      setSavingGeneratedPlan(false);
    }
  };

  const resetForm = () => {
    setEditingTaskId(null);
    setTitle('');
    setSubjectName(subjects[0]?.name ?? 'Mathematics');
    setDay('Mon');
    setPlanDate(getNextIsoDateForWeekday('Mon'));
    setDurationMinutes(30);
    setPriority('medium');
    setStatus('pending');
    setTaskDescription('');
  };

  const handleDayChange = (nextDay: StudyTask['day']) => {
    setDay(nextDay);
    setPlanDate(getNextIsoDateForWeekday(nextDay));
    setActionError(null);
  };

  const handlePlanDateChange = (nextDate: string) => {
    setPlanDate(nextDate);
    if (nextDate) {
      setDay(weekdayFromIsoDate(nextDate));
    }
    setActionError(null);
  };

  const startEditingTask = (task: StudyTask) => {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setSubjectName(task.subjectName);
    setDay(task.day);
    setPlanDate(task.planDate || getNextIsoDateForWeekday(task.day));
    setDurationMinutes(task.durationMinutes);
    setPriority(task.priority ?? 'medium');
    setStatus(task.status ?? (task.completed ? 'completed' : 'pending'));
    setTaskDescription(task.taskDescription ?? '');
    setActionError(null);
    setActionMessage(null);
    setRetryOperation(null);
  };

  const executeSaveTask = async () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 3) {
      setActionError('Enter a study task title (at least 3 characters).');
      setRetryOperation(null);
      return;
    }

    const effectiveDate = planDate.trim() || getNextIsoDateForWeekday(day);
    const effectiveDay = weekdayFromIsoDate(effectiveDate);
    const boundedDuration = Math.max(5, Math.min(600, Math.round(durationMinutes || 30)));

    setSubmitting(true);
    setActionError(null);
    setActionMessage(null);

    if (editingTaskId) {
      const targetId = editingTaskId;
      const res = await onUpdateTask(targetId, {
        title: trimmedTitle,
        subjectName,
        day: effectiveDay,
        planDate: effectiveDate,
        durationMinutes: boundedDuration,
        priority,
        status,
        completed: status === 'completed',
        taskDescription: taskDescription.trim(),
        plannerMetadata: tasks.find((task) => task.id === targetId)?.plannerMetadata,
      });
      setSubmitting(false);

      if (res.error || !res.data) {
        setActionError(res.error ?? 'Could not update this study block.');
        setRetryOperation(() => executeSaveTask);
        return;
      }

      setRetryOperation(null);
      resetForm();
      setActionMessage(
        isAuthenticated
          ? `Study block "${res.data.title}" updated in your account.`
          : `Study block "${res.data.title}" updated in preview mode.`
      );
      return;
    }

    const res = await onAddTask({
      title: trimmedTitle,
      subjectName,
      day: effectiveDay,
      planDate: effectiveDate,
      durationMinutes: boundedDuration,
      priority,
      status,
      taskDescription: taskDescription.trim(),
    });
    setSubmitting(false);

    if (res.error || !res.data) {
      setActionError(res.error ?? 'Could not save this study block.');
      setRetryOperation(() => executeSaveTask);
      return;
    }

    setRetryOperation(null);
    resetForm();
    setActionMessage(
      isAuthenticated
        ? `Study block "${res.data.title}" saved to your account.`
        : `Study block "${res.data.title}" added in preview mode.`
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeSaveTask();
  };

  const handleToggle = async (id: string) => {
    setBusyTaskId(id);
    setActionError(null);
    setActionMessage(null);
    const res = await onToggleTask(id);
    setBusyTaskId(null);

    if (res.error || !res.data) {
      setActionError(res.error ?? 'Could not update task completion status.');
      setRetryOperation(() => () => handleToggle(id));
      return;
    }

    setRetryOperation(null);
    setActionMessage(
      res.data.completed
        ? `Marked "${res.data.title}" completed${isAuthenticated ? ' in your account.' : ' in preview mode.'}`
        : `Marked "${res.data.title}" pending${isAuthenticated ? ' in your account.' : ' in preview mode.'}`
    );
  };

  const handleLinkVideo = async (task: StudyTask, video: YouTubeVideo) => {
    setBusyTaskId(task.id);
    setActionError(null);
    setActionMessage(null);
    const { id: _id, ...taskInput } = task;
    let result: DbOperationResult<StudyTask>;
    try {
      result = await onUpdateTask(task.id, {
        ...taskInput,
        plannerMetadata: {
          ...task.plannerMetadata,
          linkedVideo: {
            videoId: video.videoId,
            title: video.title,
            channel: video.channel,
            videoUrl: video.videoUrl,
          },
        },
      });
    } catch (error) {
      setBusyTaskId(null);
      setActionError(
        error instanceof Error ? error.message : 'Could not link this video to the study session.'
      );
      return;
    }
    setBusyTaskId(null);
    if (result.error || !result.data) {
      setActionError(result.error ?? 'Could not link this video to the study session.');
      return;
    }
    setDraftSessions((current) =>
      current.map((session) =>
        session.taskId === task.id
          ? {
              ...session,
              linkedVideo: {
                videoId: video.videoId,
                title: video.title,
                channel: video.channel,
                videoUrl: video.videoUrl,
              },
            }
          : session
      )
    );
    setActionMessage(
      isAuthenticated
        ? `Linked "${video.title}" to "${task.title}" in your study plan.`
        : `Linked "${video.title}" to "${task.title}" for this session.`
    );
  };

  const handleDelete = async (id: string, taskTitle: string) => {
    setBusyTaskId(id);
    setActionError(null);
    setActionMessage(null);
    const res = await onDeleteTask(id);
    setBusyTaskId(null);

    if (res.error) {
      setActionError(res.error);
      setRetryOperation(() => () => handleDelete(id, taskTitle));
      return;
    }

    if (editingTaskId === id) {
      resetForm();
    }
    setRetryOperation(null);
    setActionMessage(
      isAuthenticated
        ? `Deleted "${taskTitle}" from your study plan.`
        : `Removed "${taskTitle}" in preview mode.`
    );
  };

  const handleSaveDailyGoal = async () => {
    if (!onUpdateProfile) return;
    const boundedGoal = Math.max(15, Math.min(720, Math.round(dailyGoalInput || 90)));
    setSavingGoal(true);
    setActionError(null);
    setActionMessage(null);

    const res = await onUpdateProfile({
      ...profile,
      dailyGoalMinutes: boundedGoal,
    });
    setSavingGoal(false);

    if (res.error || !res.data) {
      setActionError(res.error ?? 'Could not save your daily study goal.');
      setRetryOperation(() => handleSaveDailyGoal);
      return;
    }

    setDailyGoalInput(res.data.dailyGoalMinutes);
    setRetryOperation(null);
    setActionMessage(
      isAuthenticated
        ? `Daily study goal saved (${res.data.dailyGoalMinutes} min/day).`
        : `Daily study goal updated in preview mode (${res.data.dailyGoalMinutes} min/day).`
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5">
          <div className="text-xs text-[#776d94] dark:text-[#968cb8]">Total Planned Time</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#1b1831] dark:text-[#f3f0fc] tabular-nums">
            {summary.totalMinutes} min
          </div>
          <div className="mt-1 text-xs text-[#6b6684] dark:text-[#b0a6cf] tabular-nums">
            Daily goal: {profile.dailyGoalMinutes} min/day
          </div>
        </div>
        <div className="rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5">
          <div className="text-xs text-[#776d94] dark:text-[#968cb8]">Completed Time</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#059669] dark:text-[#34d399] tabular-nums">
            {summary.completedMinutes} min
          </div>
          <div className="mt-1 text-xs text-[#6b6684] dark:text-[#b0a6cf] tabular-nums">
            {summary.remainingMinutes} min remaining
          </div>
        </div>
        <div className="rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5">
          <div className="text-xs text-[#776d94] dark:text-[#968cb8]">Tasks Completed</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#1b1831] dark:text-[#f3f0fc] tabular-nums">
            {summary.completedTasks} / {summary.totalTasks}
          </div>
          <div className="mt-1 text-xs text-[#6b6684] dark:text-[#b0a6cf]">
            {isAuthenticated ? 'Synced with your account' : 'Preview session'}
          </div>
        </div>
      </div>

      {dbStatus === 'error' && dbError ? (
        <div
          role="alert"
          className="rounded-2xl border border-[#fecaca] dark:border-[#7f1d1d] bg-[#fef2f2] dark:bg-[#3b151a] p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#b91c1c] dark:text-[#fca5a5]"
        >
          <span>{dbError}</span>
          {onRetrySync ? (
            <button
              type="button"
              onClick={onRetrySync}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#19132b] border border-[#fecaca] dark:border-[#7f1d1d] font-semibold cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Retry Sync</span>
            </button>
          ) : null}
        </div>
      ) : null}

      <section className="rounded-2xl border border-[#d9c9fb] dark:border-[#3d2c68] bg-gradient-to-br from-white to-[#f7f2ff] dark:from-[#19132b] dark:to-[#211839] p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#5a45c8] dark:text-[#c4b5fd]" aria-hidden="true" />
              <h2 className="font-display text-lg font-bold text-[#1b1831] dark:text-[#f3f0fc]">
                AI Study Plan
              </h2>
            </div>
            <p className="mt-1 text-sm text-[#6b6684] dark:text-[#b0a6cf]">
              Build a realistic weekly timetable around your subjects, time, and exam goals.
            </p>
          </div>
          <span className="rounded-full bg-[#e5deff] dark:bg-[#30234f] px-3 py-1 text-xs font-semibold text-[#442cb2] dark:text-[#c4b5fd]">
            Gemini-powered
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div>
            <label htmlFor="sv-ai-plan-grade" className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5">Class / Year</label>
            <select id="sv-ai-plan-grade" value={plannerGradeId} onChange={(event) => {
              const nextGrade = event.target.value as GradeLevelId;
              setPlannerGradeId(nextGrade);
              setPlannerSubjects(getAvailableSubjects(nextGrade, profile.streamId).slice(0, 4).map((subject) => subject.name));
              setPlannerWeakSubjects([]);
            }} className="w-full px-3 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-white dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc]">
              {GRADES.map((grade) => <option key={grade} value={grade}>{getClassById(grade).label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="sv-ai-plan-board" className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5">Board</label>
            <select id="sv-ai-plan-board" value={plannerBoard} onChange={(event) => setPlannerBoard(event.target.value as BoardId)} className="w-full px-3 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-white dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc]">
              {BOARDS.map((boardOption) => <option key={boardOption} value={boardOption}>{boardOption}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="sv-ai-plan-minutes" className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5">Available study time per day</label>
            <input id="sv-ai-plan-minutes" type="number" min={15} max={720} step={15} value={plannerDailyMinutes} onChange={(event) => setPlannerDailyMinutes(Number(event.target.value))} className="w-full px-3 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-white dark:bg-[#221a3a] font-mono-tabular text-sm text-[#1b1831] dark:text-[#f3f0fc]" />
          </div>
          <div>
            <label htmlFor="sv-ai-plan-week" className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5">Plan week starts</label>
            <input id="sv-ai-plan-week" type="date" value={plannerWeekStart} onChange={(event) => setPlannerWeekStart(event.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-white dark:bg-[#221a3a] font-mono-tabular text-sm text-[#1b1831] dark:text-[#f3f0fc]" />
          </div>
          <div>
            <label htmlFor="sv-ai-plan-target" className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5">Exam / target date</label>
            <input id="sv-ai-plan-target" type="date" value={plannerTargetDate} onChange={(event) => setPlannerTargetDate(event.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-white dark:bg-[#221a3a] font-mono-tabular text-sm text-[#1b1831] dark:text-[#f3f0fc]" />
          </div>
          <div>
            <label htmlFor="sv-ai-plan-revision" className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5">Revision preference</label>
            <select id="sv-ai-plan-revision" value={plannerRevisionPreference} onChange={(event) => setPlannerRevisionPreference(event.target.value as StudyPlannerPreferences['revisionPreference'])} className="w-full px-3 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-white dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc]">
              <option value="spaced">Spaced repetition</option>
              <option value="balanced">Balanced learning + revision</option>
              <option value="exam-focused">Exam-focused revision</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="sv-ai-plan-topics" className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5">Chapters / topics (optional)</label>
            <input id="sv-ai-plan-topics" type="text" maxLength={1500} value={plannerTopics} onChange={(event) => setPlannerTopics(event.target.value)} placeholder="e.g. Quadratic equations, Electricity, Chemical reactions" className="w-full px-3 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-white dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc]" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <fieldset className="rounded-xl border border-[#e5deff] dark:border-[#372a5c] p-3">
            <legend className="px-1 text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf]">Subjects (select weak subjects too)</legend>
            {plannerSubjectsAvailable.length === 0 ? (
              <p className="text-xs text-[#776d94] dark:text-[#968cb8]">No subjects are available for this class and stream.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {plannerSubjectsAvailable.map((subject) => {
                  const selected = plannerSubjects.includes(subject.name);
                  const weak = plannerWeakSubjects.includes(subject.name);
                  return (
                    <div key={subject.id} className="flex items-center gap-2 text-xs text-[#484554] dark:text-[#d1c9e8]">
                      <label className="flex min-w-0 flex-1 items-center gap-2">
                        <input type="checkbox" checked={selected} onChange={(event) => {
                          setPlannerSubjects((current) => event.target.checked
                            ? [...current, subject.name]
                            : current.filter((name) => name !== subject.name));
                          if (!event.target.checked) setPlannerWeakSubjects((current) => current.filter((name) => name !== subject.name));
                        }} />
                        <span className="truncate">{subject.name}</span>
                      </label>
                      {selected ? (
                        <label className="inline-flex items-center gap-1 whitespace-nowrap text-[11px]">
                          <input type="checkbox" checked={weak} onChange={(event) => setPlannerWeakSubjects((current) => event.target.checked
                            ? [...current, subject.name]
                            : current.filter((name) => name !== subject.name))} />
                          Weak
                        </label>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </fieldset>
          <fieldset className="rounded-xl border border-[#e5deff] dark:border-[#372a5c] p-3">
            <legend className="px-1 text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf]">Preferred study days</legend>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((studyDay) => (
                <label key={studyDay} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs cursor-pointer ${plannerPreferredDays.includes(studyDay) ? 'bg-[#e5deff] dark:bg-[#30234f] text-[#442cb2] dark:text-[#c4b5fd]' : 'bg-[#f0ebff] dark:bg-[#221a3a] text-[#6b6684] dark:text-[#b0a6cf]'}`}>
                  <input type="checkbox" checked={plannerPreferredDays.includes(studyDay)} onChange={(event) => setPlannerPreferredDays((current) => event.target.checked
                    ? [...current, studyDay]
                    : current.filter((dayOption) => dayOption !== studyDay))} />
                  {WEEKDAY_NAMES[studyDay].slice(0, 3)}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {generationError ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#fecaca] dark:border-[#7f1d1d] bg-[#fef2f2] dark:bg-[#3b151a] p-3 text-sm text-[#b91c1c] dark:text-[#fca5a5]">
            <span>{generationError}</span>
            <button type="button" disabled={generatingPlan} onClick={() => void generateAiPlan()} className="inline-flex items-center gap-1.5 rounded-lg border border-[#fecaca] px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50">
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Retry
            </button>
          </div>
        ) : null}
        {generationNotice ? <div role="status" className="rounded-xl border border-[#a7f3d0] dark:border-[#047857] bg-[#ecfdf5] dark:bg-[#102d24] p-3 text-sm text-[#047857] dark:text-[#6ee7b7]">{generationNotice}</div> : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={generatingPlan || savingGeneratedPlan || plannerSubjects.length === 0 || plannerPreferredDays.length === 0} onClick={() => void generateAiPlan()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5a45c8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#442cb2] disabled:opacity-60">
            {generatingPlan ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Sparkles className="w-4 h-4" aria-hidden="true" />}
            {generatingPlan ? 'Generating your week...' : savedPlanGroupId ? 'Regenerate plan' : 'Generate AI plan'}
          </button>
          {generatingPlan ? <button type="button" onClick={handleCancelGeneration} className="inline-flex items-center gap-2 rounded-xl border border-[#e5deff] dark:border-[#372a5c] px-4 py-2.5 text-sm font-semibold text-[#6b6684] dark:text-[#d1c9e8]"><X className="w-4 h-4" aria-hidden="true" /> Cancel</button> : null}
        </div>

        {generatedPlan ? (
          <div className="space-y-4 border-t border-[#e5deff] dark:border-[#372a5c] pt-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-[#1b1831] dark:text-[#f3f0fc]">{generatedPlan.title}</h3>
                <p className="mt-1 text-sm text-[#6b6684] dark:text-[#b0a6cf]">{generatedPlan.summary}</p>
              </div>
              {savedPlanGroupId ? (() => {
                const activeGroup = savedPlanGroups.find((group) => group.id === savedPlanGroupId);
                const completed = activeGroup?.sessions.filter((task) => task.completed).length ?? 0;
                const total = draftSessions.filter((session) => session.taskId).length;
                return total > 0 ? (
                  <div className="min-w-[150px] text-right">
                    <div className="text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf]">Completion</div>
                    <div className="mt-1 text-sm font-bold text-[#059669] dark:text-[#34d399]">{Math.round((completed / total) * 100)}% · {completed}/{total}</div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#e5deff] dark:bg-[#372a5c]"><div className="h-full bg-[#10b981]" style={{ width: `${Math.round((completed / total) * 100)}%` }} /></div>
                  </div>
                ) : null;
              })() : null}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {draftSessions.map((session, index) => (
                <article key={session.taskId ?? `draft-${index}`} className="rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-white/80 dark:bg-[#19132b] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5a45c8] dark:text-[#c4b5fd]"><Clock3 className="w-3.5 h-3.5" aria-hidden="true" /> Session {index + 1}</span>
                    <button type="button" onClick={() => setDraftSessions((current) => current.filter((_, sessionIndex) => sessionIndex !== index))} aria-label={`Remove ${session.title}`} className="rounded-lg p-1.5 text-[#776d94] hover:bg-[#fef2f2] hover:text-[#b91c1c]"><Trash2 className="w-4 h-4" aria-hidden="true" /></button>
                  </div>
                  <input aria-label="Session title" value={session.title} onChange={(event) => updateDraftSession(index, { title: event.target.value })} className="w-full rounded-lg border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] px-3 py-2 text-sm font-semibold text-[#1b1831] dark:text-[#f3f0fc]" />
                  <div className="grid grid-cols-2 gap-2">
                    <select aria-label="Session subject" value={session.subject} onChange={(event) => updateDraftSession(index, { subject: event.target.value })} className="min-w-0 rounded-lg border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] px-2.5 py-2 text-xs text-[#1b1831] dark:text-[#f3f0fc]">
                      {plannerSubjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                    </select>
                    <input aria-label="Session topic" value={session.topic} onChange={(event) => updateDraftSession(index, { topic: event.target.value })} className="min-w-0 rounded-lg border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] px-2.5 py-2 text-xs text-[#1b1831] dark:text-[#f3f0fc]" />
                    <input aria-label="Session date" type="date" value={session.date} onChange={(event) => event.target.value && updateDraftSession(index, { date: event.target.value, day: weekdayFromIsoDate(event.target.value) })} className="min-w-0 rounded-lg border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] px-2 py-2 font-mono-tabular text-xs text-[#1b1831] dark:text-[#f3f0fc]" />
                    <input aria-label="Duration in minutes" type="number" min={15} max={180} step={5} value={session.durationMinutes} onChange={(event) => updateDraftSession(index, { durationMinutes: Number(event.target.value) })} className="min-w-0 rounded-lg border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] px-2.5 py-2 font-mono-tabular text-xs text-[#1b1831] dark:text-[#f3f0fc]" />
                    <input aria-label="Session start time" type="time" value={session.startTime ?? ''} onChange={(event) => updateDraftSession(index, { startTime: event.target.value || undefined })} className="min-w-0 rounded-lg border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] px-2 py-2 font-mono-tabular text-xs text-[#1b1831] dark:text-[#f3f0fc]" />
                    <select aria-label="Session priority" value={session.priority} onChange={(event) => updateDraftSession(index, { priority: event.target.value as StudyPlanPriority })} className="min-w-0 rounded-lg border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] px-2 py-2 text-xs text-[#1b1831] dark:text-[#f3f0fc]">
                      <option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option>
                    </select>
                  </div>
                  <select aria-label="Session type" value={session.sessionType} onChange={(event) => updateDraftSession(index, { sessionType: event.target.value as StudySessionType })} className="w-full rounded-lg border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] px-2.5 py-2 text-xs text-[#1b1831] dark:text-[#f3f0fc]">
                    <option value="learning">Learning</option><option value="practice">Practice</option><option value="revision">Revision</option><option value="final-revision">Final revision</option>
                  </select>
                  <textarea aria-label="Learning objective" rows={2} value={session.learningObjective} onChange={(event) => updateDraftSession(index, { learningObjective: event.target.value })} placeholder="Learning objective" className="w-full resize-y rounded-lg border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] px-2.5 py-2 text-xs text-[#1b1831] dark:text-[#f3f0fc]" />
                  <textarea aria-label="Practice recommendation" rows={2} value={session.practiceRecommendation} onChange={(event) => updateDraftSession(index, { practiceRecommendation: event.target.value })} placeholder="Practice questions or quiz recommendation" className="w-full resize-y rounded-lg border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] px-2.5 py-2 text-xs text-[#1b1831] dark:text-[#f3f0fc]" />
                </article>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setDraftSessions((current) => [...current, {
                date: plannerWeekStart,
                day: weekdayFromIsoDate(plannerWeekStart),
                durationMinutes: 30,
                subject: plannerSubjects[0] ?? '',
                topic: 'New topic',
                title: 'New study session',
                learningObjective: 'Define a learning goal for this session.',
                practiceRecommendation: 'Add a practice question or quiz.',
                sessionType: 'learning',
                priority: 'medium',
              }])} className="inline-flex items-center gap-1.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] px-3.5 py-2 text-xs font-semibold text-[#442cb2] dark:text-[#c4b5fd]"><Plus className="w-4 h-4" aria-hidden="true" /> Add session</button>
              <button type="button" disabled={savingGeneratedPlan || draftSessions.length < 1} onClick={() => void handleSaveGeneratedPlan()} className="inline-flex items-center gap-2 rounded-xl bg-[#059669] px-4 py-2 text-xs font-semibold text-white hover:bg-[#047857] disabled:opacity-60">
                {savingGeneratedPlan ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Check className="w-4 h-4" aria-hidden="true" />}
                {savingGeneratedPlan ? 'Saving plan...' : savedPlanGroupId ? 'Update saved plan' : 'Save plan'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-[#f0ebff] dark:bg-[#221a3a] p-3 text-[#6b6684] dark:text-[#b0a6cf]"><strong className="text-[#484554] dark:text-[#d1c9e8]">Break guidance:</strong> {generatedPlan.breakGuidance}</div>
              <div className="rounded-xl bg-[#f0ebff] dark:bg-[#221a3a] p-3 text-[#6b6684] dark:text-[#b0a6cf]"><strong className="text-[#484554] dark:text-[#d1c9e8]">Final revision:</strong> {generatedPlan.finalRevisionPlan.join(' · ')}</div>
            </div>
          </div>
        ) : null}

        {savedPlanGroups.length > 0 ? (
          <div className="space-y-2 border-t border-[#e5deff] dark:border-[#372a5c] pt-4">
            <h3 className="text-sm font-bold text-[#1b1831] dark:text-[#f3f0fc]">Saved AI plans</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {savedPlanGroups.map((group) => {
                const completed = group.sessions.filter((task) => task.completed).length;
                return (
                  <div key={group.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-white/70 dark:bg-[#19132b] p-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[#1b1831] dark:text-[#f3f0fc]">{group.metadata?.planTitle ?? 'AI study plan'}</div>
                      <div className="text-xs text-[#776d94] dark:text-[#968cb8]">{completed}/{group.sessions.length} sessions complete · {group.metadata?.weekStartDate ?? group.sessions[0]?.planDate}</div>
                    </div>
                    <button type="button" onClick={() => resumeSavedPlan(group.id)} className="shrink-0 rounded-lg border border-[#e5deff] dark:border-[#372a5c] px-3 py-1.5 text-xs font-semibold text-[#442cb2] dark:text-[#c4b5fd]">Resume</button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      {(overdueTasks.length > 0 || upcomingTasks.length > 0) ? (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {overdueTasks.length > 0 ? (
            <div className="rounded-2xl border border-[#fecaca] dark:border-[#7f1d1d] bg-[#fff7f7] dark:bg-[#2b171d] p-4">
              <h3 className="text-sm font-bold text-[#b91c1c] dark:text-[#fca5a5]">Overdue tasks · {overdueTasks.length}</h3>
              <p className="mt-1 text-xs text-[#7f1d1d] dark:text-[#fecaca]">{overdueTasks.slice(0, 3).map((task) => task.title).join(' · ')}</p>
            </div>
          ) : null}
          {upcomingTasks.length > 0 ? (
            <div className="rounded-2xl border border-[#c4b5fd] dark:border-[#4c1d95] bg-[#fcfaff] dark:bg-[#211839] p-4">
              <h3 className="text-sm font-bold text-[#442cb2] dark:text-[#c4b5fd]">Upcoming tasks · {upcomingTasks.length}</h3>
              <p className="mt-1 text-xs text-[#6b6684] dark:text-[#b0a6cf]">{upcomingTasks.slice(0, 3).map((task) => `${formatPlanDateLabel(task.planDate, task.day)}: ${task.title}`).join(' · ')}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 items-start gap-6">
        <section className="lg:col-span-5 rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-[#1b1831] dark:text-[#f3f0fc]">
              {editingTaskId ? 'Edit Study Block' : 'Add Study Block'}
            </h2>
            <div className="flex items-center gap-2">
              {editingTaskId ? (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setActionError(null);
                    setRetryOperation(null);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#e5deff] dark:border-[#372a5c] text-xs font-medium text-[#6b6684] dark:text-[#b0a6cf] hover:text-[#1b1831] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Cancel</span>
                </button>
              ) : null}
              <CalendarDays className="w-5 h-5 text-[#5a45c8] dark:text-[#a78bfa]" aria-hidden="true" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="sv-task-title"
                className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
              >
                Topic or Goal
              </label>
              <input
                id="sv-task-title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setActionError(null);
                }}
                placeholder="e.g. Solve 10 Trigonometry identities"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc] focus:outline-none focus:ring-2 focus:ring-[#5a45c8]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="sv-task-subject"
                  className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
                >
                  Subject
                </label>
                <select
                  id="sv-task-subject"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc]"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                  {!subjects.some((s) => s.name === subjectName) && subjectName ? (
                    <option value={subjectName}>{subjectName}</option>
                  ) : null}
                </select>
              </div>
              <div>
                <label
                  htmlFor="sv-task-day"
                  className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
                >
                  Day
                </label>
                <select
                  id="sv-task-day"
                  value={day}
                  onChange={(e) => handleDayChange(e.target.value as StudyTask['day'])}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc]"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="sv-task-date"
                  className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
                >
                  Target Date
                </label>
                <input
                  id="sv-task-date"
                  type="date"
                  value={planDate}
                  onChange={(e) => handlePlanDateChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] font-mono-tabular text-sm text-[#1b1831] dark:text-[#f3f0fc]"
                />
              </div>
              <div>
                <label
                  htmlFor="sv-task-duration"
                  className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
                >
                  Duration (minutes)
                </label>
                <input
                  id="sv-task-duration"
                  type="number"
                  min={5}
                  max={600}
                  step={5}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value) || 30)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] font-mono-tabular text-sm text-[#1b1831] dark:text-[#f3f0fc]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="sv-task-priority"
                  className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
                >
                  Priority
                </label>
                <select
                  id="sv-task-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as StudyPlanPriority)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="sv-task-status"
                  className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
                >
                  Status
                </label>
                <select
                  id="sv-task-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StudyPlanStatus)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc]"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="sv-task-desc"
                className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf] mb-1.5"
              >
                Notes / Textbook Pages (optional)
              </label>
              <input
                id="sv-task-desc"
                type="text"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="e.g. Exercise 4.3 Questions 1–6"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc]"
              />
            </div>

            {actionError ? (
              <div
                role="alert"
                className="p-3 rounded-xl bg-[#fef2f2] dark:bg-[#3b151a] border border-[#fecaca] dark:border-[#7f1d1d] text-xs text-[#b91c1c] dark:text-[#fca5a5] flex items-center justify-between gap-2"
              >
                <span>{actionError}</span>
                {retryOperation ? (
                  <button
                    type="button"
                    disabled={submitting || savingGoal || busyTaskId !== null}
                    onClick={() => void retryOperation()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-[#19132b] border border-[#fecaca] dark:border-[#7f1d1d] font-semibold shrink-0 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" aria-hidden="true" />
                    <span>Retry</span>
                  </button>
                ) : null}
              </div>
            ) : null}

            {actionMessage ? (
              <div
                role="status"
                className="p-3 rounded-xl bg-[#ecfdf5] dark:bg-[#102d24] border border-[#a7f3d0] dark:border-[#047857] text-xs font-semibold text-[#059669] dark:text-[#34d399]"
              >
                {actionMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#5a45c8] hover:bg-[#442cb2] disabled:opacity-60 text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : editingTaskId ? (
                <Check className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Plus className="w-4 h-4" aria-hidden="true" />
              )}
              <span>
                {submitting
                  ? editingTaskId
                    ? 'Updating Study Block...'
                    : 'Saving Study Block...'
                  : editingTaskId
                    ? 'Save Changes'
                    : 'Add to Study Plan'}
              </span>
            </button>
          </form>

          {onUpdateProfile ? (
            <div className="pt-4 border-t border-[#ece6ff] dark:border-[#2a2147] space-y-2">
              <label
                htmlFor="sv-planner-daily-goal"
                className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf]"
              >
                Daily Study Goal (minutes/day)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="sv-planner-daily-goal"
                  type="number"
                  min={15}
                  max={720}
                  step={5}
                  value={dailyGoalInput}
                  onChange={(e) => setDailyGoalInput(Number(e.target.value) || 90)}
                  className="flex-1 px-3 py-2 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] font-mono-tabular text-sm text-[#1b1831] dark:text-[#f3f0fc]"
                />
                <button
                  type="button"
                  disabled={savingGoal}
                  onClick={() => void handleSaveDailyGoal()}
                  className="px-3.5 py-2 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#f0ebff] dark:bg-[#221a3a] text-xs font-semibold text-[#442cb2] dark:text-[#c4b5fd] hover:bg-[#e5deff] disabled:opacity-60 whitespace-nowrap cursor-pointer"
                >
                  {savingGoal ? 'Saving...' : 'Save Goal'}
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="lg:col-span-7 rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-lg font-bold text-[#1b1831] dark:text-[#f3f0fc]">
              Weekly Schedule
            </h3>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by day">
              {(['All', ...DAYS] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDayFilter(d)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    dayFilter === d
                      ? 'bg-[#5a45c8] text-white'
                      : 'bg-[#f0ebff] dark:bg-[#221a3a] text-[#484554] dark:text-[#b0a6cf]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {isLoadingPlans ? (
            <div
              role="status"
              className="py-8 flex items-center justify-center gap-2 text-sm text-[#6b6684] dark:text-[#b0a6cf]"
            >
              <Loader2 className="w-4 h-4 animate-spin text-[#5a45c8]" aria-hidden="true" />
              <span>Loading your saved study plans...</span>
            </div>
          ) : visibleTasks.length === 0 ? (
            <p className="py-6 text-sm text-center text-[#6b6684] dark:text-[#b0a6cf]">
              No study blocks scheduled for {dayFilter}. Add one on the left!
            </p>
          ) : (
            <ul className="divide-y divide-[#ece6ff] dark:divide-[#2a2147]">
              {visibleTasks.map((task) => {
                const isBusy = busyTaskId === task.id;
                const isEditing = editingTaskId === task.id;
                const taskVideoContext = getTaskVideoContext(task, profile);
                const taskVideoBoard =
                  task.plannerMetadata?.plannerPreferences?.board ??
                  task.plannerMetadata?.board ??
                  profile.board;
                return (
                  <li key={task.id} className="py-3.5 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        disabled={isBusy}
                        aria-label={`${task.completed ? 'Mark pending' : 'Mark completed'}: ${task.title}`}
                        onClick={() => void handleToggle(task.id)}
                        className="flex items-start gap-3 text-left flex-1 min-w-0 cursor-pointer disabled:opacity-60"
                      >
                      {isBusy ? (
                        <Loader2
                          className="w-4 h-4 animate-spin text-[#5a45c8] shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                      ) : task.completed ? (
                        <CheckCircle2
                          className="w-4 h-4 text-[#059669] shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                      ) : (
                        <Circle
                          className="w-4 h-4 text-[#8f84b3] shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                      )}
                      <div className="min-w-0">
                        <div
                          className={`text-sm font-medium ${
                            task.completed
                              ? 'line-through text-[#776d94]'
                              : 'text-[#1b1831] dark:text-[#f3f0fc]'
                          }`}
                        >
                          {task.title}
                        </div>
                        <div className="text-xs text-[#6b6684] dark:text-[#b0a6cf] tabular-nums">
                          {task.subjectName} · {formatPlanDateLabel(task.planDate, task.day)} ·{' '}
                          {task.plannerMetadata?.startTime
                            ? `${task.plannerMetadata.startTime} · `
                            : ''}
                          {task.durationMinutes} min
                          {task.priority ? ` · ${task.priority} priority` : ''}
                          {task.status === 'in_progress' ? ' · in progress' : ''}
                        </div>
                        {task.taskDescription ? (
                          <div className="text-xs text-[#776d94] dark:text-[#968cb8] mt-0.5">
                            {task.taskDescription}
                          </div>
                        ) : null}
                      </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          aria-expanded={videoPanelTaskId === task.id}
                          onClick={() =>
                            setVideoPanelTaskId((current) => (current === task.id ? null : task.id))
                          }
                          aria-label={`${videoPanelTaskId === task.id ? 'Hide' : 'Find'} learning videos for ${task.title}`}
                          className={`p-2 rounded-lg transition-colors cursor-pointer ${
                            videoPanelTaskId === task.id
                              ? 'bg-[#e5deff] dark:bg-[#2c214f] text-[#5a45c8] dark:text-[#c4b5fd]'
                              : 'text-[#776d94] hover:text-[#5a45c8] hover:bg-[#f0ebff] dark:hover:bg-[#221a3a]'
                          }`}
                        >
                          <Youtube className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => startEditingTask(task)}
                          aria-label={`Edit task ${task.title}`}
                          className={`p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
                            isEditing
                              ? 'bg-[#e5deff] dark:bg-[#2c214f] text-[#5a45c8] dark:text-[#c4b5fd]'
                              : 'text-[#776d94] hover:text-[#5a45c8] hover:bg-[#f0ebff] dark:hover:bg-[#221a3a]'
                          }`}
                        >
                          <Pencil className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleDelete(task.id, task.title)}
                          aria-label={`Delete task ${task.title}`}
                          className="p-2 rounded-lg text-[#776d94] hover:text-[#dc2626] hover:bg-[#fef2f2] dark:hover:bg-[#3b151a] transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    {task.plannerMetadata?.linkedVideo ? (
                      <a
                        href={task.plannerMetadata.linkedVideo.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-7 inline-flex items-center gap-1.5 text-xs font-medium text-[#442cb2] dark:text-[#c4b5fd]"
                      >
                        Linked video: {task.plannerMetadata.linkedVideo.title}
                      </a>
                    ) : null}
                    {videoPanelTaskId === task.id ? (
                      <div className="pl-0 sm:pl-7">
                        <VideoLearningPanel
                          key={`planner-video-${task.id}`}
                          context={taskVideoContext}
                          board={taskVideoBoard}
                          initialQuery={`${task.plannerMetadata?.topic ?? task.title} lesson`}
                          progress={videoProgress}
                          progressError={videoProgressError}
                          isAuthenticated={isAuthenticated}
                          linkedVideoId={task.plannerMetadata?.linkedVideo?.videoId}
                          onUpdateProgress={onUpdateVideoProgress}
                          onStartQuiz={onStartQuizFromVideo}
                          onLinkVideo={(video) => void handleLinkVideo(task, video)}
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <IntegrationBanner
        serviceName="Gemini API"
        title="Smart Revision Scheduling"
        description="Plan your weekly chapters and study durations above—all study blocks save directly to your StudyVerse account."
        onNavigate={onNavigate}
        compact
      />
    </div>
  );
}
