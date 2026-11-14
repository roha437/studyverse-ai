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
}

export interface StudyTask {
  id: string;
  title: string;
  subjectName: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  durationMinutes: number;
  completed: boolean;
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
