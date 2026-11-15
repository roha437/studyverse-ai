import type {
  AchievementRecord,
  AssessmentQuestion,
  BoardId,
  BookmarkRecord,
  BookmarkResourceType,
  DbProfileRow,
  FocusSessionRecord,
  GradeLevelId,
  NoteContentPayload,
  NoteRecord,
  NoteType,
  QuizAnswerItem,
  QuizAttemptRecord,
  StreamId,
  StudentProfile,
  StudentProgressRecord,
  StudyPlanPriority,
  StudyPlanMetadata,
  StudyPlanStatus,
  StudyPlannerDay,
  StudyPlannerPreferences,
  StudyPlannerRevisionPreference,
  StudySessionType,
  StudyTask,
  SubjectItem,
  TestAttemptRecord,
  UserRole,
} from '../types/studyverse';

const VALID_GRADES: GradeLevelId[] = [
  'class-5',
  'class-6',
  'class-7',
  'class-8',
  'class-9',
  'class-10',
  'inter-1',
  'inter-2',
];
const VALID_STREAMS: StreamId[] = ['general', 'mpc', 'bipc', 'cec', 'mec'];
const VALID_BOARDS: BoardId[] = ['NCERT / CBSE', 'State Board', 'Intermediate Board'];
const WEEKDAYS: StudyTask['day'][] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_ORDER: Record<StudyTask['day'], number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function classifySupabaseError(error: {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
} | null): { message: string; schemaMissing: boolean } {
  if (!error) {
    return { message: 'Unknown database error', schemaMissing: false };
  }
  const code = error.code ?? '';
  const msg = error.message ?? 'Database operation failed';
  const lower = `${code} ${msg} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();

  const schemaMissing =
    code === '42P01' ||
    code === 'PGRST205' ||
    code === 'PGRST204' ||
    lower.includes('does not exist') ||
    lower.includes('could not find the table') ||
    lower.includes('schema cache');

  if (schemaMissing) {
    return {
      message: msg,
      schemaMissing: true,
    };
  }

  if (
    code === '42501' ||
    lower.includes('row-level security') ||
    lower.includes('permission denied') ||
    lower.includes('jwt') ||
    lower.includes('not authenticated')
  ) {
    return {
      message: 'Your session needs to be signed in before saving or viewing personal study records.',
      schemaMissing: false,
    };
  }

  if (code === '23514' || code === '23502') {
    return {
      message: 'One or more assessment values could not be validated. Please review and try again.',
      schemaMissing: false,
    };
  }

  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return {
      message: 'Network connection interrupted while syncing your assessment. Please retry.',
      schemaMissing: false,
    };
  }

  return {
    message: msg,
    schemaMissing: false,
  };
}

export function sanitizeGradeId(value: unknown, fallback: GradeLevelId = 'class-10'): GradeLevelId {
  return typeof value === 'string' && VALID_GRADES.includes(value as GradeLevelId)
    ? (value as GradeLevelId)
    : fallback;
}

export function sanitizeStreamId(value: unknown, fallback: StreamId = 'general'): StreamId {
  return typeof value === 'string' && VALID_STREAMS.includes(value as StreamId)
    ? (value as StreamId)
    : fallback;
}

export function sanitizeBoardId(value: unknown, fallback: BoardId = 'NCERT / CBSE'): BoardId {
  return typeof value === 'string' && VALID_BOARDS.includes(value as BoardId)
    ? (value as BoardId)
    : fallback;
}

function sanitizeUserRole(value: unknown, fallback: UserRole = 'student'): UserRole {
  return value === 'parent' || value === 'student' ? value : fallback;
}

export function mapProfileRowToStudentProfile(
  row: Partial<DbProfileRow>,
  fallback: StudentProfile,
  authEmail?: string | null
): StudentProfile {
  return {
    name:
      typeof row.full_name === 'string' && row.full_name.trim().length > 0
        ? row.full_name.trim()
        : fallback.name,
    email: authEmail && authEmail.trim().length > 0 ? authEmail.trim() : fallback.email,
    gradeId: sanitizeGradeId(row.class_level, fallback.gradeId),
    streamId: sanitizeStreamId(row.stream, fallback.streamId),
    board: sanitizeBoardId(row.curriculum_board, fallback.board),
    dailyGoalMinutes:
      typeof row.daily_study_minutes === 'number' && row.daily_study_minutes >= 15
        ? row.daily_study_minutes
        : fallback.dailyGoalMinutes,
    guardianName:
      typeof row.guardian_name === 'string' && row.guardian_name.trim().length > 0
        ? row.guardian_name.trim()
        : fallback.guardianName,
    guardianEmail: fallback.guardianEmail,
    avatarUrl: typeof row.avatar_url === 'string' ? row.avatar_url : fallback.avatarUrl ?? '',
    academicGoal:
      typeof row.academic_goal === 'string' ? row.academic_goal : fallback.academicGoal ?? '',
    targetMarks:
      typeof row.target_marks === 'number' ? row.target_marks : fallback.targetMarks ?? null,
    examDate: typeof row.exam_date === 'string' ? row.exam_date : fallback.examDate ?? '',
    preferredLanguage:
      typeof row.preferred_language === 'string' && row.preferred_language.trim().length > 0
        ? row.preferred_language
        : fallback.preferredLanguage ?? 'English',
    accountRole: sanitizeUserRole(row.account_role, fallback.accountRole ?? 'student'),
  };
}

export function mapStudentProfileToProfileRow(userId: string, profile: StudentProfile) {
  const parsedTargetMarks =
    typeof profile.targetMarks === 'number' && !Number.isNaN(profile.targetMarks)
      ? Math.max(0, Math.min(100, Math.round(profile.targetMarks)))
      : null;

  return {
    id: userId,
    full_name: profile.name.trim(),
    avatar_url: profile.avatarUrl?.trim() ? profile.avatarUrl.trim() : null,
    class_level: profile.gradeId,
    curriculum_board: profile.board,
    stream: profile.streamId,
    academic_goal: profile.academicGoal?.trim() ?? '',
    target_marks: parsedTargetMarks,
    exam_date: profile.examDate?.trim() ? profile.examDate.trim() : null,
    daily_study_minutes: Math.max(15, Math.min(720, Math.round(profile.dailyGoalMinutes || 90))),
    preferred_language: profile.preferredLanguage?.trim() || 'English',
    account_role: profile.accountRole ?? 'student',
    guardian_name: profile.guardianName?.trim() ?? '',
  };
}

export function getNextIsoDateForWeekday(
  day: StudyTask['day'],
  referenceDate: Date = new Date()
): string {
  const targetDay = WEEKDAY_ORDER[day];
  const base = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate())
  );
  const currentDay = base.getUTCDay();
  const delta = (targetDay - currentDay + 7) % 7;
  base.setUTCDate(base.getUTCDate() + delta);
  return base.toISOString().slice(0, 10);
}

export function weekdayFromIsoDate(isoDate?: string | null): StudyTask['day'] {
  if (!isoDate) return 'Mon';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return 'Mon';
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return WEEKDAYS[date.getUTCDay()] ?? 'Mon';
}

export function formatPlanDateLabel(
  isoDate?: string | null,
  fallbackDay: StudyTask['day'] = 'Mon'
): string {
  if (!isoDate) return fallbackDay;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return fallbackDay;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) return fallbackDay;
  const weekday = WEEKDAYS[date.getUTCDay()] ?? fallbackDay;
  const monthDay = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  return `${weekday}, ${monthDay}`;
}

export function mapStudyPlanRowToTask(row: Record<string, unknown>): StudyTask {
  const status = (
    row.status === 'completed' || row.status === 'in_progress' ? row.status : 'pending'
  ) as StudyPlanStatus;
  const priority = (
    row.priority === 'low' || row.priority === 'high' ? row.priority : 'medium'
  ) as StudyPlanPriority;
  const planDate = typeof row.plan_date === 'string' ? row.plan_date : undefined;

  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    subjectName: String(row.subject ?? 'General'),
    day: weekdayFromIsoDate(planDate),
    durationMinutes: Number(row.duration_minutes ?? 30),
    completed: status === 'completed',
    planDate,
    chapterId: typeof row.chapter_id === 'string' ? row.chapter_id : undefined,
    taskDescription: typeof row.task_description === 'string' ? row.task_description : '',
    priority,
    status,
    completedAt: typeof row.completed_at === 'string' ? row.completed_at : null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : undefined,
    plannerMetadata: mapStudyPlanMetadata(row.planner_metadata),
  };
}

function mapStudyPlanMetadata(value: unknown): StudyPlanMetadata | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const row = value as Record<string, unknown>;
  const metadata: StudyPlanMetadata = {};
  const stringFields: Array<keyof StudyPlanMetadata> = [
    'planGroupId',
    'planTitle',
    'planSummary',
    'weekStartDate',
    'targetDate',
    'breakGuidance',
    'classLabel',
    'topic',
    'learningObjective',
    'practiceRecommendation',
  ];

  if (row.source === 'ai') metadata.source = 'ai';
  for (const field of stringFields) {
    const raw = row[field];
    if (typeof raw === 'string') {
      (metadata as Record<string, unknown>)[field] = raw.slice(0, 2_000);
    }
  }
  if (
    typeof row.board === 'string' &&
    VALID_BOARDS.includes(row.board as BoardId)
  ) {
    metadata.board = row.board as BoardId;
  }
  if (typeof row.dailyAvailableMinutes === 'number' && Number.isFinite(row.dailyAvailableMinutes)) {
    metadata.dailyAvailableMinutes = Math.max(15, Math.min(720, Math.round(row.dailyAvailableMinutes)));
  }
  if (Array.isArray(row.finalRevisionPlan)) {
    metadata.finalRevisionPlan = row.finalRevisionPlan
      .filter((item): item is string => typeof item === 'string')
      .slice(0, 12)
      .map((item) => item.slice(0, 500));
  }
  const sessionTypes: StudySessionType[] = [
    'learning',
    'practice',
    'revision',
    'final-revision',
  ];
  if (
    typeof row.sessionType === 'string' &&
    sessionTypes.includes(row.sessionType as StudySessionType)
  ) {
    metadata.sessionType = row.sessionType as StudySessionType;
  }
  if (Number.isInteger(row.sessionOrder) && Number(row.sessionOrder) >= 0) {
    metadata.sessionOrder = Number(row.sessionOrder);
  }
  if (typeof row.startTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(row.startTime)) {
    metadata.startTime = row.startTime;
  }
  if (
    row.linkedVideo &&
    typeof row.linkedVideo === 'object' &&
    !Array.isArray(row.linkedVideo)
  ) {
    const video = row.linkedVideo as Record<string, unknown>;
    if (
      typeof video.videoId === 'string' &&
      /^[A-Za-z0-9_-]{11}$/.test(video.videoId) &&
      typeof video.title === 'string' &&
      video.title.trim().length > 0 &&
      typeof video.channel === 'string' &&
      typeof video.videoUrl === 'string' &&
      video.videoUrl === `https://www.youtube.com/watch?v=${video.videoId}`
    ) {
      metadata.linkedVideo = {
        videoId: video.videoId,
        title: video.title.slice(0, 300),
        channel: video.channel.slice(0, 120),
        videoUrl: video.videoUrl,
      };
    }
  }

  const preferences = row.plannerPreferences;
  if (preferences && typeof preferences === 'object' && !Array.isArray(preferences)) {
    const pref = preferences as Record<string, unknown>;
    const days: StudyPlannerDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const revisionPreferences: StudyPlannerRevisionPreference[] = [
      'spaced',
      'balanced',
      'exam-focused',
    ];
    const subjects = Array.isArray(pref.subjects)
      ? pref.subjects.filter((item): item is string => typeof item === 'string').slice(0, 12)
      : [];
    const weakSubjects = Array.isArray(pref.weakSubjects)
      ? pref.weakSubjects
          .filter((item): item is string => typeof item === 'string')
          .slice(0, 12)
      : [];
    const preferredDays = Array.isArray(pref.preferredDays)
      ? pref.preferredDays.filter(
          (item): item is StudyPlannerDay => typeof item === 'string' && days.includes(item as StudyPlannerDay)
        )
      : [];
    if (
      typeof pref.gradeId === 'string' &&
      VALID_GRADES.includes(pref.gradeId as GradeLevelId) &&
      typeof pref.board === 'string' &&
      VALID_BOARDS.includes(pref.board as BoardId) &&
      subjects.length > 0 &&
      Number.isInteger(pref.dailyAvailableMinutes) &&
      Number(pref.dailyAvailableMinutes) >= 15 &&
      Number(pref.dailyAvailableMinutes) <= 720 &&
      typeof pref.weekStartDate === 'string' &&
      typeof pref.targetDate === 'string' &&
      preferredDays.length > 0 &&
      typeof pref.chaptersAndTopics === 'string' &&
      typeof pref.revisionPreference === 'string' &&
      revisionPreferences.includes(pref.revisionPreference as StudyPlannerRevisionPreference)
    ) {
      metadata.plannerPreferences = {
        gradeId: pref.gradeId as GradeLevelId,
        board: pref.board as BoardId,
        subjects,
        weakSubjects,
        dailyAvailableMinutes: Number(pref.dailyAvailableMinutes),
        weekStartDate: pref.weekStartDate,
        targetDate: pref.targetDate,
        preferredDays,
        chaptersAndTopics: pref.chaptersAndTopics.slice(0, 1_500),
        revisionPreference: pref.revisionPreference as StudyPlannerRevisionPreference,
      } satisfies StudyPlannerPreferences;
    }
  }

  return Object.keys(metadata).length ? metadata : undefined;
}

export function mapTaskInputToStudyPlanInsert(
  userId: string,
  task: Omit<StudyTask, 'id' | 'completed'>
) {
  const planDate = task.planDate?.trim() || getNextIsoDateForWeekday(task.day);
  const status: StudyPlanStatus = task.status ?? 'pending';
  return {
    user_id: userId,
    title: task.title.trim(),
    plan_date: planDate,
    subject: task.subjectName,
    chapter_id: task.chapterId ?? null,
    task_description: task.taskDescription?.trim() ?? '',
    duration_minutes: Math.max(5, Math.min(600, Math.round(task.durationMinutes || 30))),
    priority: task.priority ?? 'medium',
    status,
    completed_at: status === 'completed' ? task.completedAt || new Date().toISOString() : null,
    planner_metadata: task.plannerMetadata ?? {},
  };
}

export function mapTaskInputToStudyPlanUpdate(task: Omit<StudyTask, 'id'>) {
  const planDate = task.planDate?.trim() || getNextIsoDateForWeekday(task.day);
  const status: StudyPlanStatus =
    task.status ?? (task.completed ? 'completed' : 'pending');
  return {
    title: task.title.trim(),
    plan_date: planDate,
    subject: task.subjectName,
    chapter_id: task.chapterId ?? null,
    task_description: task.taskDescription?.trim() ?? '',
    duration_minutes: Math.max(5, Math.min(600, Math.round(task.durationMinutes || 30))),
    priority: task.priority ?? 'medium',
    status,
    completed_at:
      status === 'completed' ? task.completedAt || new Date().toISOString() : null,
    planner_metadata: task.plannerMetadata ?? {},
  };
}

export function mapProgressRowToRecord(row: Record<string, unknown>): StudentProgressRecord {
  return {
    id: String(row.id),
    userId: typeof row.user_id === 'string' ? row.user_id : undefined,
    classLevel: sanitizeGradeId(row.class_level),
    subject: String(row.subject ?? ''),
    chapterId: String(row.chapter_id ?? ''),
    topicId: String(row.topic_id ?? ''),
    completionPercentage: Number(row.completion_percentage ?? 0),
    masteryLevel: Number(row.mastery_level ?? 0),
    timeSpentMinutes: Number(row.time_spent_minutes ?? 0),
    lastAccessedAt: String(row.last_accessed_at ?? new Date().toISOString()),
    completedAt: typeof row.completed_at === 'string' ? row.completed_at : null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : undefined,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : undefined,
  };
}

export function mapNoteRowToRecord(row: Record<string, unknown>): NoteRecord {
  const rawContent = (row.content && typeof row.content === 'object' ? row.content : {}) as Record<
    string,
    unknown
  >;
  const content: NoteContentPayload = {
    summary: typeof rawContent.summary === 'string' ? rawContent.summary : '',
    keyPoints: Array.isArray(rawContent.keyPoints)
      ? rawContent.keyPoints.filter((item): item is string => typeof item === 'string')
      : [],
    formula: typeof rawContent.formula === 'string' ? rawContent.formula : undefined,
    emphasis: typeof rawContent.emphasis === 'string' ? rawContent.emphasis : undefined,
  };

  const validNoteTypes: NoteType[] = ['summary', 'formulas', 'qa', 'mindmap', 'custom'];
  const noteType = validNoteTypes.includes(row.note_type as NoteType)
    ? (row.note_type as NoteType)
    : 'summary';

  return {
    id: String(row.id),
    userId: typeof row.user_id === 'string' ? row.user_id : undefined,
    title: String(row.title ?? 'Untitled Note'),
    classLevel: sanitizeGradeId(row.class_level),
    subject: String(row.subject ?? ''),
    chapterId: typeof row.chapter_id === 'string' ? row.chapter_id : null,
    topicId: typeof row.topic_id === 'string' ? row.topic_id : null,
    noteType,
    content,
    isFavorite: Boolean(row.is_favorite),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function sanitizeQuizAnswers(raw: unknown): QuizAnswerItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item, idx) => {
      const options = Array.isArray(item.options)
        ? item.options.filter((opt): opt is string => typeof opt === 'string')
        : undefined;
      const selectedIndex =
        typeof item.selectedIndex === 'number' && Number.isFinite(item.selectedIndex)
          ? item.selectedIndex
          : -1;
      const correctIndex =
        typeof item.correctIndex === 'number' && Number.isFinite(item.correctIndex)
          ? item.correctIndex
          : 0;
      return {
        questionId: typeof item.questionId === 'string' ? item.questionId : `q-${idx + 1}`,
        prompt: typeof item.prompt === 'string' ? item.prompt : '',
        options: options && options.length > 0 ? options : undefined,
        selectedIndex,
        selectedOption:
          typeof item.selectedOption === 'string'
            ? item.selectedOption
            : item.selectedOption === null
              ? null
              : options && selectedIndex >= 0 && selectedIndex < options.length
                ? options[selectedIndex]
                : undefined,
        correctIndex,
        correctOption:
          typeof item.correctOption === 'string'
            ? item.correctOption
            : options && correctIndex >= 0 && correctIndex < options.length
              ? options[correctIndex]
              : undefined,
        isCorrect: Boolean(item.isCorrect),
        explanation: typeof item.explanation === 'string' ? item.explanation : undefined,
      };
    });
}

export function formatAttemptTimestamp(isoString?: string | null): string {
  if (!isoString) return 'Just now';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function mapQuizAttemptRowToRecord(row: Record<string, unknown>): QuizAttemptRecord {
  return {
    id: String(row.id),
    userId: typeof row.user_id === 'string' ? row.user_id : undefined,
    classLevel: sanitizeGradeId(row.class_level),
    subject: String(row.subject ?? ''),
    chapterId: typeof row.chapter_id === 'string' ? row.chapter_id : null,
    topicId: typeof row.topic_id === 'string' ? row.topic_id : null,
    quizType: String(row.quiz_type ?? 'practice'),
    difficulty: String(row.difficulty ?? 'Board Standard'),
    totalQuestions: Number(row.total_questions ?? 0),
    correctAnswers: Number(row.correct_answers ?? 0),
    scorePercentage: Number(row.score_percentage ?? 0),
    answers: sanitizeQuizAnswers(row.answers),
    durationSeconds: Number(row.duration_seconds ?? 0),
    completedAt: String(row.completed_at ?? new Date().toISOString()),
    createdAt: typeof row.created_at === 'string' ? row.created_at : undefined,
  };
}

export function mapTestAttemptRowToRecord(row: Record<string, unknown>): TestAttemptRecord {
  const rawResult = (row.result && typeof row.result === 'object' ? row.result : {}) as Record<
    string,
    unknown
  >;
  const totalMarks = Number(row.total_marks ?? 0);
  const obtainedMarks = Number(row.obtained_marks ?? 0);
  const computedPct = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;

  return {
    id: String(row.id),
    userId: typeof row.user_id === 'string' ? row.user_id : undefined,
    title: String(row.title ?? 'Chapter Assessment'),
    classLevel: sanitizeGradeId(row.class_level),
    subject: String(row.subject ?? ''),
    testType: String(row.test_type ?? 'chapter-test'),
    totalMarks,
    obtainedMarks,
    durationSeconds: Number(row.duration_seconds ?? 0),
    answers: sanitizeQuizAnswers(row.answers),
    result: {
      percentage:
        typeof rawResult.percentage === 'number' ? rawResult.percentage : computedPct,
      gradeLabel:
        typeof rawResult.gradeLabel === 'string' ? rawResult.gradeLabel : deriveGradeLabel(computedPct),
      chapterId: typeof rawResult.chapterId === 'string' ? rawResult.chapterId : undefined,
      topicId: typeof rawResult.topicId === 'string' ? rawResult.topicId : undefined,
      difficulty: typeof rawResult.difficulty === 'string' ? rawResult.difficulty : undefined,
    },
    completedAt: String(row.completed_at ?? new Date().toISOString()),
    createdAt: typeof row.created_at === 'string' ? row.created_at : undefined,
  };
}

export function mapBookmarkRowToRecord(row: Record<string, unknown>): BookmarkRecord {
  const validTypes: BookmarkResourceType[] = ['lesson', 'topic', 'note', 'video', 'numerical'];
  const resourceType = validTypes.includes(row.resource_type as BookmarkResourceType)
    ? (row.resource_type as BookmarkResourceType)
    : 'topic';

  return {
    id: String(row.id),
    userId: typeof row.user_id === 'string' ? row.user_id : undefined,
    resourceType,
    resourceId: String(row.resource_id ?? ''),
    title: String(row.title ?? ''),
    metadata:
      row.metadata && typeof row.metadata === 'object'
        ? (row.metadata as BookmarkRecord['metadata'])
        : {},
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export function mapAchievementRowToRecord(row: Record<string, unknown>): AchievementRecord {
  return {
    id: String(row.id),
    userId: typeof row.user_id === 'string' ? row.user_id : undefined,
    achievementCode: String(row.achievement_code ?? ''),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    unlockedAt: String(row.unlocked_at ?? new Date().toISOString()),
    metadata:
      row.metadata && typeof row.metadata === 'object'
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdAt: typeof row.created_at === 'string' ? row.created_at : undefined,
  };
}

export function deriveGradeLabel(percentage: number): string {
  if (percentage >= 90) return 'Distinction (A+)';
  if (percentage >= 75) return 'Merit (A)';
  if (percentage >= 60) return 'Proficient (B)';
  if (percentage >= 40) return 'Developing (C)';
  return 'Needs Revision';
}

export function evaluateQuizAnswers(
  questions: AssessmentQuestion[],
  selectedOptionIndexes: Record<string, number>
): {
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  answers: QuizAnswerItem[];
} {
  const totalQuestions = questions.length;
  if (totalQuestions === 0) {
    return { totalQuestions: 0, correctAnswers: 0, scorePercentage: 0, answers: [] };
  }

  let correctAnswers = 0;
  const answers: QuizAnswerItem[] = questions.map((q) => {
    const selectedIndex =
      typeof selectedOptionIndexes[q.id] === 'number' ? selectedOptionIndexes[q.id] : -1;
    const isCorrect = selectedIndex === q.correctIndex;
    if (isCorrect) correctAnswers += 1;
    return {
      questionId: q.id,
      prompt: q.prompt,
      options: [...q.options],
      selectedIndex,
      selectedOption:
        selectedIndex >= 0 && selectedIndex < q.options.length ? q.options[selectedIndex] : null,
      correctIndex: q.correctIndex,
      correctOption: q.options[q.correctIndex] ?? '',
      isCorrect,
      explanation: q.explanation,
    };
  });

  const scorePercentage = Number(((correctAnswers / totalQuestions) * 100).toFixed(2));
  return { totalQuestions, correctAnswers, scorePercentage, answers };
}

export function computeProgressSummary(
  progressRecords: StudentProgressRecord[],
  totalTopicsInClass: number
) {
  const completedTopics = progressRecords.filter((p) => p.completionPercentage >= 100).length;
  const totalTrackedMinutes = progressRecords.reduce((sum, p) => sum + p.timeSpentMinutes, 0);
  const averageMastery =
    progressRecords.length > 0
      ? Math.round(
          progressRecords.reduce((sum, p) => sum + p.masteryLevel, 0) / progressRecords.length
        )
      : 0;
  const classCompletionPercentage =
    totalTopicsInClass > 0 ? Math.min(100, Math.round((completedTopics / totalTopicsInClass) * 100)) : 0;

  return {
    completedTopics,
    trackedTopics: progressRecords.length,
    totalTrackedMinutes,
    averageMastery,
    classCompletionPercentage,
  };
}

export function computeSubjectAnalytics(
  subjects: SubjectItem[],
  progressRecords: StudentProgressRecord[],
  quizAttempts: QuizAttemptRecord[],
  testAttempts: TestAttemptRecord[],
  tasks: StudyTask[]
) {
  return subjects.map((subj) => {
    const topicIds = new Set(subj.chapters.flatMap((c) => c.topics.map((t) => t.id)));
    const subjectProgress = progressRecords.filter(
      (p) => topicIds.has(p.topicId) || p.subject.toLowerCase() === subj.name.toLowerCase()
    );
    const completedTopics = subjectProgress.filter((p) => p.completionPercentage >= 100).length;
    const totalTopics = topicIds.size;
    const completionPct =
      totalTopics > 0 ? Math.min(100, Math.round((completedTopics / totalTopics) * 100)) : 0;

    const subjectQuizzes = quizAttempts.filter(
      (q) => q.subject.toLowerCase() === subj.name.toLowerCase()
    );
    const subjectTests = testAttempts.filter(
      (t) => t.subject.toLowerCase() === subj.name.toLowerCase()
    );
    const allScores = [
      ...subjectQuizzes.map((q) => q.scorePercentage),
      ...subjectTests.map((t) => t.result.percentage),
    ];
    const avgScore =
      allScores.length > 0
        ? Math.round(allScores.reduce((sum, val) => sum + val, 0) / allScores.length)
        : null;

    const plannedTasks = tasks.filter((t) =>
      subj.name.toLowerCase().includes(t.subjectName.toLowerCase())
    ).length;

    return {
      subjectId: subj.id,
      subjectName: subj.name,
      subjectCode: subj.code,
      chaptersCount: subj.chapters.length,
      totalTopics,
      completedTopics,
      completionPct,
      avgScore,
      assessmentsCount: allScores.length,
      plannedTasks,
    };
  });
}

export interface DashboardAssessmentSummary {
  id: string;
  kind: 'Quiz' | 'Test';
  label: string;
  percentage: number;
  completedAt: string;
}

export function computeDashboardMetrics(input: {
  dailyGoalMinutes: number;
  progressRecords: StudentProgressRecord[];
  focusSessions: FocusSessionRecord[];
  quizAttempts: QuizAttemptRecord[];
  testAttempts: TestAttemptRecord[];
  tasks: StudyTask[];
  totalTopicsInClass: number;
}) {
  const progressSummary = computeProgressSummary(input.progressRecords, input.totalTopicsInClass);
  const focusMinutesToday = input.focusSessions.reduce((sum, s) => sum + s.minutes, 0);
  const totalStudyMinutes = progressSummary.totalTrackedMinutes + focusMinutesToday;
  const safeDailyGoal = Math.max(15, input.dailyGoalMinutes || 90);
  const goalProgressPct = Math.min(100, Math.round((totalStudyMinutes / safeDailyGoal) * 100));

  const allAssessments: DashboardAssessmentSummary[] = [
    ...input.quizAttempts.map((q) => ({
      id: q.id,
      kind: 'Quiz' as const,
      label: `${q.subject} · ${q.difficulty}`,
      percentage: Math.round(q.scorePercentage),
      completedAt: q.completedAt,
    })),
    ...input.testAttempts.map((t) => ({
      id: t.id,
      kind: 'Test' as const,
      label: t.title,
      percentage: Math.round(t.result.percentage),
      completedAt: t.completedAt,
    })),
  ].sort((a, b) => b.completedAt.localeCompare(a.completedAt));

  const totalAssessments = allAssessments.length;
  const averageScore =
    totalAssessments > 0
      ? Math.round(
          allAssessments.reduce((sum, item) => sum + item.percentage, 0) / totalAssessments
        )
      : null;

  const upcomingTasks = [
    ...input.tasks.filter((t) => !t.completed),
    ...input.tasks.filter((t) => t.completed),
  ];

  return {
    progressSummary,
    focusMinutesToday,
    totalStudyMinutes,
    goalProgressPct,
    averageScore,
    totalAssessments,
    recentAssessments: allAssessments.slice(0, 3),
    upcomingTasks,
  };
}

