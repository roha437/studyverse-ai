export type GradeLevelId =
  | 'class-5'
  | 'class-6'
  | 'class-7'
  | 'class-8'
  | 'class-9'
  | 'class-10'
  | 'inter-1'
  | 'inter-2';

export type StreamId = 'general' | 'mpc' | 'bipc' | 'cec' | 'mec';

export type BoardId = 'NCERT / CBSE' | 'State Board' | 'Intermediate Board';

export type UserRole = 'student' | 'parent';

export type NavModuleId =
  | 'dashboard'
  | 'explorer'
  | 'previous-classes'
  | 'lessons'
  | 'notes'
  | 'aria'
  | 'quizzes'
  | 'numerical-lab'
  | 'focus'
  | 'youtube'
  | 'planner'
  | 'analytics'
  | 'achievements'
  | 'library'
  | 'notifications'
  | 'parent-dashboard'
  | 'settings';

export interface TopicItem {
  id: string;
  title: string;
  summary: string;
  learningObjective?: string;
  estimatedMinutes: number;
  hasNumericals?: boolean;
  keyFormula?: string;
}

export interface ChapterItem {
  id: string;
  number: number;
  title: string;
  textbookUnit: string;
  topics: TopicItem[];
}

export interface SubjectItem {
  id: string;
  name: string;
  code: string;
  streams: StreamId[];
  chapters: ChapterItem[];
}

export interface CurriculumClass {
  id: GradeLevelId;
  label: string;
  shortLabel: string;
  tier: 'middle' | 'secondary' | 'intermediate';
  order: number;
  description: string;
  subjects: SubjectItem[];
}

export interface ActiveStudyContext {
  gradeId: GradeLevelId;
  streamId: StreamId;
  subjectId: string;
  chapterId: string;
  topicId: string;
}

export interface StudentProfile {
  name: string;
  email: string;
  gradeId: GradeLevelId;
  streamId: StreamId;
  board: BoardId;
  dailyGoalMinutes: number;
  guardianName: string;
  guardianEmail: string;
  avatarUrl?: string;
  academicGoal?: string;
  targetMarks?: number | null;
  examDate?: string;
  preferredLanguage?: string;
  accountRole?: UserRole;
}

export type StudyPlanPriority = 'low' | 'medium' | 'high';
export type StudyPlanStatus = 'pending' | 'in_progress' | 'completed';
export type StudyPlannerDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
export type StudySessionType = 'learning' | 'practice' | 'revision' | 'final-revision';
export type StudyPlannerRevisionPreference = 'spaced' | 'balanced' | 'exam-focused';

export interface StudyPlannerPreferences {
  gradeId: GradeLevelId;
  board: BoardId;
  subjects: string[];
  weakSubjects: string[];
  dailyAvailableMinutes: number;
  weekStartDate: string;
  targetDate: string;
  preferredDays: StudyPlannerDay[];
  chaptersAndTopics: string;
  revisionPreference: StudyPlannerRevisionPreference;
}

export interface StudyPlanMetadata {
  source?: 'ai';
  planGroupId?: string;
  planTitle?: string;
  planSummary?: string;
  weekStartDate?: string;
  targetDate?: string;
  dailyAvailableMinutes?: number;
  breakGuidance?: string;
  finalRevisionPlan?: string[];
  board?: BoardId;
  classLabel?: string;
  topic?: string;
  learningObjective?: string;
  practiceRecommendation?: string;
  sessionType?: StudySessionType;
  sessionOrder?: number;
  startTime?: string;
  linkedVideo?: {
    videoId: string;
    title: string;
    channel: string;
    videoUrl: string;
  };
  plannerPreferences?: StudyPlannerPreferences;
}

export interface StudyTask {
  id: string;
  title: string;
  subjectName: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  durationMinutes: number;
  completed: boolean;
  planDate?: string;
  chapterId?: string;
  taskDescription?: string;
  priority?: StudyPlanPriority;
  status?: StudyPlanStatus;
  completedAt?: string | null;
  createdAt?: string;
  plannerMetadata?: StudyPlanMetadata;
}

export interface FocusSessionRecord {
  id: string;
  label: string;
  subject: string;
  minutes: number;
  completedAt: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  status: 'completed' | 'interrupted';
}

export interface FocusSessionInput {
  label: string;
  subject: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  status: 'completed' | 'interrupted';
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: 'reminders' | 'system';
  timestamp: string;
  read: boolean;
  targetModule?: NavModuleId;
}

export interface NotificationInput {
  title: string;
  message: string;
  category: NotificationItem['category'];
  targetModule?: NavModuleId;
  eventKey: string;
}

export interface GuardianStudentLink {
  linkId: string;
  studentId: string;
  fullName: string;
  classLevel: GradeLevelId;
  stream: StreamId;
  board: BoardId;
  linkedAt: string;
}

export interface StudentGuardianLink {
  linkId: string;
  guardianId: string;
  fullName: string;
  linkedAt: string;
}

export interface GuardianStudentSummary {
  student: {
    name: string;
    classLevel: GradeLevelId;
    stream: StreamId;
    board: BoardId;
    dailyGoalMinutes: number;
  };
  progress: {
    trackedTopics: number;
    completedTopics: number;
    averageMastery: number;
    trackedMinutes: number;
  };
  studyPlan: {
    totalSessions: number;
    completedSessions: number;
    completedMinutes: number;
  };
  quizzes: { attempts: number; averageScore: number };
  tests: { attempts: number; averageScore: number };
  focus: {
    completedSessions: number;
    completedMinutes: number;
    interruptedSessions: number;
  };
  recentAssessments: Array<{
    subject: string;
    score: number;
    completedAt: string;
    kind: 'quiz' | 'test';
  }>;
  achievements: Array<{ title: string; unlockedAt: string }>;
}

export interface IntegrationReadinessItem {
  id: 'supabase' | 'gemini' | 'youtube' | 'github';
  name: string;
  purpose: string;
  status: 'pending';
  envVars: string[];
}

export interface DbProfileRow {
  id: string;
  full_name: string;
  avatar_url: string | null;
  class_level: string;
  curriculum_board: string;
  stream: string;
  academic_goal: string | null;
  target_marks: number | null;
  exam_date: string | null;
  daily_study_minutes: number;
  preferred_language: string;
  account_role?: string;
  guardian_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentProgressRecord {
  id: string;
  userId?: string;
  classLevel: GradeLevelId;
  subject: string;
  chapterId: string;
  topicId: string;
  completionPercentage: number;
  masteryLevel: number;
  timeSpentMinutes: number;
  lastAccessedAt: string;
  completedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type NoteType = 'summary' | 'formulas' | 'qa' | 'mindmap' | 'custom';

export interface NoteContentPayload {
  summary: string;
  keyPoints: string[];
  formula?: string;
  emphasis?: string;
}

export interface NoteRecord {
  id: string;
  userId?: string;
  title: string;
  classLevel: GradeLevelId;
  subject: string;
  chapterId: string | null;
  topicId: string | null;
  noteType: NoteType;
  content: NoteContentPayload;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NoteInput {
  title: string;
  classLevel: GradeLevelId;
  subject: string;
  chapterId: string | null;
  topicId: string | null;
  noteType: NoteType;
  content: NoteContentPayload;
  isFavorite?: boolean;
}

export interface QuizAnswerItem {
  questionId: string;
  prompt: string;
  options?: string[];
  selectedIndex: number;
  selectedOption?: string | null;
  correctIndex: number;
  correctOption?: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface QuizAttemptRecord {
  id: string;
  userId?: string;
  classLevel: GradeLevelId;
  subject: string;
  chapterId: string | null;
  topicId?: string | null;
  quizType: string;
  difficulty: string;
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  answers: QuizAnswerItem[];
  durationSeconds: number;
  completedAt: string;
  createdAt?: string;
}

export interface TestAttemptRecord {
  id: string;
  userId?: string;
  title: string;
  classLevel: GradeLevelId;
  subject: string;
  testType: string;
  totalMarks: number;
  obtainedMarks: number;
  durationSeconds: number;
  answers: QuizAnswerItem[];
  result: {
    percentage: number;
    gradeLabel: string;
    chapterId?: string;
    topicId?: string;
    difficulty?: string;
  };
  completedAt: string;
  createdAt?: string;
}

export type BookmarkResourceType = 'lesson' | 'topic' | 'note' | 'video' | 'numerical';

export interface BookmarkRecord {
  id: string;
  userId?: string;
  resourceType: BookmarkResourceType;
  resourceId: string;
  title: string;
  metadata: {
    gradeId?: GradeLevelId;
    subject?: string;
    chapterId?: string;
    topicId?: string;
    subtitle?: string;
    formula?: string;
    channel?: string;
    thumbnailUrl?: string;
    videoUrl?: string;
    durationSeconds?: number;
  };
  createdAt: string;
}

export type VideoLearningStatus = 'not_started' | 'in_progress' | 'completed';

export interface VideoLearningProgress {
  id: string;
  userId?: string;
  videoId: string;
  title: string;
  channel: string;
  thumbnailUrl: string | null;
  classLevel: GradeLevelId;
  board: BoardId;
  subject: string;
  chapter: string;
  topic: string;
  status: VideoLearningStatus;
  updatedAt: string;
}

export type VideoLearningProgressInput = Omit<
  VideoLearningProgress,
  'id' | 'userId' | 'updatedAt'
>;

export interface AchievementRecord {
  id: string;
  userId?: string;
  achievementCode: string;
  title: string;
  description: string;
  unlockedAt: string;
  metadata: Record<string, unknown>;
  createdAt?: string;
}

export interface AssessmentQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: AssessmentDifficulty;
}

export type AssessmentDifficulty = 'Foundation' | 'Board Standard' | 'Challenge';

export type DatabaseSyncStatus =
  | 'not_configured'
  | 'local_preview'
  | 'loading'
  | 'ready'
  | 'migrations_required'
  | 'error';

export interface DbOperationResult<T> {
  data: T | null;
  error: string | null;
  schemaMissing: boolean;
}

