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
}

export type StudyPlanPriority = 'low' | 'medium' | 'high';
export type StudyPlanStatus = 'pending' | 'in_progress' | 'completed';

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
}

export interface FocusSessionRecord {
  id: string;
  label: string;
  minutes: number;
  completedAt: string;
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
  };
  createdAt: string;
}

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
}

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

