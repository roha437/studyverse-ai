/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { AchievementsView } from './components/views/AchievementsView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { AriaTeacherView } from './components/views/AriaTeacherView';
import { AuthOnboardingView } from './components/views/AuthOnboardingView';
import { DashboardView } from './components/views/DashboardView';
import { ExplorerView } from './components/views/ExplorerView';
import { FocusCenterView } from './components/views/FocusCenterView';
import { LessonsView } from './components/views/LessonsView';
import { NotesView } from './components/views/NotesView';
import { NotificationsView } from './components/views/NotificationsView';
import { NumericalLabView } from './components/views/NumericalLabView';
import { ParentDashboardView } from './components/views/ParentDashboardView';
import { PersonalLibraryView } from './components/views/PersonalLibraryView';
import { PreviousClassesView } from './components/views/PreviousClassesView';
import { ProfileSettingsView } from './components/views/ProfileSettingsView';
import { QuizzesView } from './components/views/QuizzesView';
import { StudyPlannerView } from './components/views/StudyPlannerView';
import { YouTubeHubView } from './components/views/YouTubeHubView';
import { INITIAL_NOTIFICATIONS, INITIAL_STUDY_TASKS } from './data/curriculum';
import type {
  AchievementRecord,
  ActiveStudyContext,
  BookmarkRecord,
  BookmarkResourceType,
  DatabaseSyncStatus,
  DbOperationResult,
  FocusSessionRecord,
  GradeLevelId,
  NavModuleId,
  NoteContentPayload,
  NoteRecord,
  NoteType,
  NotificationItem,
  QuizAttemptRecord,
  StudentProfile,
  StudentProgressRecord,
  StudyTask,
  TestAttemptRecord,
  UserRole,
} from './types/studyverse';
import { resolveDefaultContext } from './utils/curriculumHelpers';
import { isSupabaseConfigured, supabase } from './utils/supabase';
import { mergeProfileFromSupabaseUser } from './utils/supabaseHelpers';
import {
  deleteBookmarkById,
  deleteNoteById,
  deleteStudyPlan,
  insertNote,
  insertQuizAttempt,
  insertStudyPlan,
  insertTestAttempt,
  loadUserWorkspaceData,
  toggleNoteFavorite,
  unlockAchievementOnce,
  updateStudyPlan,
  updateStudyPlanStatus,
  upsertBookmark,
  upsertTopicProgress,
  upsertUserProfile,
} from './utils/studyverseDb';

const DEFAULT_PROFILE: StudentProfile = {
  name: 'Ananya Sharma',
  email: 'ananya.sharma@studyverse.edu',
  gradeId: 'class-10',
  streamId: 'general',
  board: 'NCERT / CBSE',
  dailyGoalMinutes: 90,
  guardianName: 'Rajesh Sharma',
  guardianEmail: 'rajesh.sharma@example.com',
  academicGoal: '',
  targetMarks: null,
  examDate: '',
  preferredLanguage: 'English',
};

function hasAutostartParam(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('autostart') === '1';
}

export default function App() {
  const [isOnboarded, setIsOnboarded] = useState<boolean>(() => hasAutostartParam());
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authUserEmail, setAuthUserEmail] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<DatabaseSyncStatus>(() =>
    isSupabaseConfigured ? 'local_preview' : 'not_configured'
  );
  const [dbError, setDbError] = useState<string | null>(null);
  const [dismissedDbBanner, setDismissedDbBanner] = useState(false);

  const [role, setRole] = useState<UserRole>('student');
  const [activeModule, setActiveModule] = useState<NavModuleId>('dashboard');
  const [profile, setProfile] = useState<StudentProfile>(DEFAULT_PROFILE);
  const [studyContext, setStudyContext] = useState<ActiveStudyContext>(() =>
    resolveDefaultContext(DEFAULT_PROFILE.gradeId, DEFAULT_PROFILE.streamId)
  );

  const [tasks, setTasks] = useState<StudyTask[]>(INITIAL_STUDY_TASKS);
  const [progressRecords, setProgressRecords] = useState<StudentProgressRecord[]>([]);
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttemptRecord[]>([]);
  const [testAttempts, setTestAttempts] = useState<TestAttemptRecord[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [achievements, setAchievements] = useState<AchievementRecord[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSessionRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const profileRef = useRef<StudentProfile>(profile);
  profileRef.current = profile;
  const loadedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const hydrateFromSupabase = useCallback(
    async (userId: string, email: string | null, metadata?: Record<string, unknown>) => {
      setDbStatus('loading');
      setDbError(null);
      setDismissedDbBanner(false);

      const merged = mergeProfileFromSupabaseUser(profileRef.current, email ?? undefined, metadata);
      const res = await loadUserWorkspaceData(userId, merged, email);

      if (res.error || !res.data) {
        setDbStatus(res.schemaMissing ? 'migrations_required' : 'error');
        setDbError(res.error ?? 'Unable to sync your study workspace right now.');
        setProfile(merged);
        setStudyContext(resolveDefaultContext(merged.gradeId, merged.streamId));
        return;
      }

      const activeProfile = res.data.profile ?? merged;
      setProfile(activeProfile);
      setStudyContext(resolveDefaultContext(activeProfile.gradeId, activeProfile.streamId));
      setProgressRecords(res.data.progressRecords);
      setTasks(res.data.studyPlans);
      setNotes(res.data.notes);
      setQuizAttempts(res.data.quizAttempts);
      setTestAttempts(res.data.testAttempts);
      setBookmarks(res.data.bookmarks);
      setAchievements(res.data.achievements);
      setDbStatus('ready');

      if (!res.data.profile) {
        void upsertUserProfile(userId, activeProfile);
      }
      if (!res.data.achievements.some((a) => a.achievementCode === 'onboarding')) {
        const achRes = await unlockAchievementOnce(userId, {
          achievementCode: 'onboarding',
          title: 'StudyVerse Explorer',
          description: 'Set up your class profile and entered the StudyVerse learning workspace.',
        });
        if (achRes.data) {
          setAchievements((prev) =>
            prev.some((a) => a.achievementCode === achRes.data!.achievementCode)
              ? prev
              : [achRes.data!, ...prev]
          );
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!supabase) {
      setDbStatus('not_configured');
      return;
    }

    let isMounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      const user = data.session?.user;
      if (user) {
        setAuthUserId(user.id);
        setAuthUserEmail(user.email ?? null);
        setIsOnboarded(true);
        if (loadedUserIdRef.current !== user.id) {
          loadedUserIdRef.current = user.id;
          void hydrateFromSupabase(user.id, user.email ?? null, user.user_metadata);
        }
      } else {
        setDbStatus('local_preview');
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        setIsOnboarded(false);
      }
      const user = session?.user;
      if (user) {
        setAuthUserId(user.id);
        setAuthUserEmail(user.email ?? null);
        if (loadedUserIdRef.current !== user.id) {
          loadedUserIdRef.current = user.id;
          void hydrateFromSupabase(user.id, user.email ?? null, user.user_metadata);
        }
      } else {
        const hadAuthenticatedUser = loadedUserIdRef.current !== null;
        loadedUserIdRef.current = null;
        setAuthUserId(null);
        setAuthUserEmail(null);
        if (hadAuthenticatedUser) {
          setTasks(INITIAL_STUDY_TASKS);
          setProgressRecords([]);
          setNotes([]);
          setQuizAttempts([]);
          setTestAttempts([]);
          setBookmarks([]);
          setAchievements([]);
        }
        setIsPasswordRecovery(false);
        setDbStatus('local_preview');
        setDbError(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [hydrateFromSupabase]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const unlockMilestone = useCallback(
    async (code: string, title: string, description: string) => {
      if (!authUserId || dbStatus !== 'ready') return;
      if (achievements.some((a) => a.achievementCode === code)) return;
      const res = await unlockAchievementOnce(authUserId, {
        achievementCode: code,
        title,
        description,
      });
      if (res.data) {
        setAchievements((prev) =>
          prev.some((a) => a.achievementCode === res.data!.achievementCode)
            ? prev
            : [res.data!, ...prev]
        );
      }
    },
    [achievements, authUserId, dbStatus]
  );

  const handleCompleteOnboarding = (nextProfile: StudentProfile, chosenRole: UserRole) => {
    setProfile(nextProfile);
    setStudyContext(resolveDefaultContext(nextProfile.gradeId, nextProfile.streamId));
    setRole(chosenRole);
    setActiveModule(chosenRole === 'parent' ? 'parent-dashboard' : 'dashboard');
    setIsOnboarded(true);
  };

  const handleUpdateProfile = async (
    nextProfile: StudentProfile
  ): Promise<DbOperationResult<StudentProfile>> => {
    const gradeOrStreamChanged =
      nextProfile.gradeId !== profile.gradeId || nextProfile.streamId !== profile.streamId;

    if (!authUserId || !supabase) {
      setProfile(nextProfile);
      if (gradeOrStreamChanged) {
        setStudyContext(resolveDefaultContext(nextProfile.gradeId, nextProfile.streamId));
      }
      return { data: nextProfile, error: null, schemaMissing: false };
    }

    const [authUpdate, dbRes] = await Promise.all([
      supabase.auth.updateUser({
        data: {
          name: nextProfile.name,
          full_name: nextProfile.name,
          gradeId: nextProfile.gradeId,
          class_level: nextProfile.gradeId,
          streamId: nextProfile.streamId,
          stream: nextProfile.streamId,
          board: nextProfile.board,
          curriculum_board: nextProfile.board,
          dailyGoalMinutes: nextProfile.dailyGoalMinutes,
          daily_study_minutes: nextProfile.dailyGoalMinutes,
          guardianName: nextProfile.guardianName,
          guardian_name: nextProfile.guardianName,
          guardianEmail: nextProfile.guardianEmail,
          academicGoal: nextProfile.academicGoal ?? '',
          preferredLanguage: nextProfile.preferredLanguage ?? 'English',
        },
      }),
      upsertUserProfile(authUserId, nextProfile),
    ]);

    if (dbRes.error || !dbRes.data) {
      if (dbRes.schemaMissing) {
        setDbStatus('migrations_required');
        setDbError(dbRes.error);
      }
      return {
        data: null,
        error: dbRes.error ?? authUpdate.error?.message ?? 'Failed to save profile.',
        schemaMissing: dbRes.schemaMissing,
      };
    }

    setProfile(dbRes.data);
    if (gradeOrStreamChanged) {
      setStudyContext(resolveDefaultContext(dbRes.data.gradeId, dbRes.data.streamId));
    }
    return dbRes;
  };

  const handleSignOutToAuth = async () => {
    if (supabase && authUserId) {
      await supabase.auth.signOut();
    }
    loadedUserIdRef.current = null;
    setAuthUserId(null);
    setAuthUserEmail(null);
    setTasks(INITIAL_STUDY_TASKS);
    setProgressRecords([]);
    setNotes([]);
    setQuizAttempts([]);
    setTestAttempts([]);
    setBookmarks([]);
    setAchievements([]);
    setDbError(null);
    setDbStatus(isSupabaseConfigured ? 'local_preview' : 'not_configured');
    setIsPasswordRecovery(false);
    setIsOnboarded(false);
  };

  const handleRecordTopicProgress = async (input: {
    classLevel: GradeLevelId;
    subject: string;
    chapterId: string;
    topicId: string;
    completionPercentage: number;
    masteryLevel: number;
    timeSpentMinutes: number;
  }): Promise<DbOperationResult<StudentProgressRecord>> => {
    if (!authUserId) {
      const localRecord: StudentProgressRecord = {
        id: `prog-${input.topicId}`,
        classLevel: input.classLevel,
        subject: input.subject,
        chapterId: input.chapterId,
        topicId: input.topicId,
        completionPercentage: input.completionPercentage,
        masteryLevel: input.masteryLevel,
        timeSpentMinutes: input.timeSpentMinutes,
        lastAccessedAt: new Date().toISOString(),
        completedAt: input.completionPercentage >= 100 ? new Date().toISOString() : null,
      };
      setProgressRecords((prev) => [
        localRecord,
        ...prev.filter((p) => p.topicId !== input.topicId),
      ]);
      return { data: localRecord, error: null, schemaMissing: false };
    }

    const res = await upsertTopicProgress(authUserId, input);
    if (res.error || !res.data) {
      if (res.schemaMissing) setDbStatus('migrations_required');
      return res;
    }

    setProgressRecords((prev) => [res.data!, ...prev.filter((p) => p.topicId !== input.topicId)]);
    if (res.data.completionPercentage >= 100) {
      void unlockMilestone(
        'first-lesson',
        'Curriculum Scholar',
        'Completed at least one textbook topic in Curriculum Explorer or AI Lessons.'
      );
    }
    return res;
  };

  const handleToggleTask = async (taskId: string): Promise<DbOperationResult<StudyTask>> => {
    const existing = tasks.find((t) => t.id === taskId);
    if (!existing) {
      return { data: null, error: 'Task not found.', schemaMissing: false };
    }
    const nextCompleted = !existing.completed;

    if (!authUserId) {
      const updated = {
        ...existing,
        completed: nextCompleted,
        status: nextCompleted ? ('completed' as const) : ('pending' as const),
      };
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      return { data: updated, error: null, schemaMissing: false };
    }

    const res = await updateStudyPlanStatus(
      authUserId,
      taskId,
      nextCompleted ? 'completed' : 'pending'
    );
    if (res.error || !res.data) {
      if (res.schemaMissing) setDbStatus('migrations_required');
      return res;
    }

    setTasks((prev) => prev.map((t) => (t.id === taskId ? res.data! : t)));
    if (res.data.completed) {
      void unlockMilestone(
        'first-task',
        'Planner Momentum',
        'Marked a study block completed in the Study Planner.'
      );
    }
    return res;
  };

  const handleAddTask = async (
    taskInput: Omit<StudyTask, 'id' | 'completed'>
  ): Promise<DbOperationResult<StudyTask>> => {
    if (!authUserId) {
      const localTask: StudyTask = {
        ...taskInput,
        id: `task-${Date.now()}`,
        completed: false,
        status: 'pending',
      };
      setTasks((prev) => [localTask, ...prev]);
      return { data: localTask, error: null, schemaMissing: false };
    }

    const res = await insertStudyPlan(authUserId, taskInput);
    if (res.error || !res.data) {
      if (res.schemaMissing) setDbStatus('migrations_required');
      return res;
    }

    setTasks((prev) => [res.data!, ...prev]);
    return res;
  };

  const handleUpdateTask = async (
    taskId: string,
    taskInput: Omit<StudyTask, 'id'>
  ): Promise<DbOperationResult<StudyTask>> => {
    const nextStatus = taskInput.status ?? (taskInput.completed ? 'completed' : 'pending');
    const nextCompleted = nextStatus === 'completed';

    if (!authUserId) {
      const updated: StudyTask = {
        ...taskInput,
        id: taskId,
        status: nextStatus,
        completed: nextCompleted,
        completedAt: nextCompleted ? taskInput.completedAt ?? new Date().toISOString() : null,
      };
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      return { data: updated, error: null, schemaMissing: false };
    }

    const res = await updateStudyPlan(authUserId, taskId, {
      ...taskInput,
      status: nextStatus,
      completed: nextCompleted,
    });
    if (res.error || !res.data) {
      if (res.schemaMissing) setDbStatus('migrations_required');
      return res;
    }

    setTasks((prev) => prev.map((t) => (t.id === taskId ? res.data! : t)));
    if (res.data.completed) {
      void unlockMilestone(
        'first-task',
        'Planner Momentum',
        'Marked a study block completed in the Study Planner.'
      );
    }
    return res;
  };

  const handleDeleteTask = async (
    taskId: string
  ): Promise<DbOperationResult<{ id: string }>> => {
    if (!authUserId) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      return { data: { id: taskId }, error: null, schemaMissing: false };
    }

    const res = await deleteStudyPlan(authUserId, taskId);
    if (res.error) {
      if (res.schemaMissing) setDbStatus('migrations_required');
      return res;
    }
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    return res;
  };

  const handleSaveNote = async (input: {
    title: string;
    classLevel: GradeLevelId;
    subject: string;
    chapterId: string | null;
    topicId: string | null;
    noteType: NoteType;
    content: NoteContentPayload;
    isFavorite?: boolean;
  }): Promise<DbOperationResult<NoteRecord>> => {
    if (!authUserId) {
      const now = new Date().toISOString();
      const localNote: NoteRecord = {
        id: `note-${Date.now()}`,
        title: input.title,
        classLevel: input.classLevel,
        subject: input.subject,
        chapterId: input.chapterId,
        topicId: input.topicId,
        noteType: input.noteType,
        content: input.content,
        isFavorite: Boolean(input.isFavorite),
        createdAt: now,
        updatedAt: now,
      };
      setNotes((prev) => [localNote, ...prev]);
      return { data: localNote, error: null, schemaMissing: false };
    }

    const res = await insertNote(authUserId, input);
    if (res.error || !res.data) {
      if (res.schemaMissing) setDbStatus('migrations_required');
      return res;
    }
    setNotes((prev) => [res.data!, ...prev]);
    void unlockMilestone(
      'first-note',
      'Revision Architect',
      'Created and saved a structured study note in Notes Studio.'
    );
    return res;
  };

  const handleToggleNoteFavorite = async (
    noteId: string,
    nextFavorite: boolean
  ): Promise<DbOperationResult<NoteRecord>> => {
    if (!authUserId) {
      const existing = notes.find((n) => n.id === noteId);
      if (!existing) return { data: null, error: 'Note not found', schemaMissing: false };
      const updated = { ...existing, isFavorite: nextFavorite };
      setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
      return { data: updated, error: null, schemaMissing: false };
    }

    const res = await toggleNoteFavorite(authUserId, noteId, nextFavorite);
    if (res.error || !res.data) return res;
    setNotes((prev) => prev.map((n) => (n.id === noteId ? res.data! : n)));
    return res;
  };

  const handleDeleteNote = async (
    noteId: string
  ): Promise<DbOperationResult<{ id: string }>> => {
    if (!authUserId) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      return { data: { id: noteId }, error: null, schemaMissing: false };
    }

    const res = await deleteNoteById(authUserId, noteId);
    if (res.error) return res;
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    return res;
  };

  const handleSaveQuizAttempt = async (
    input: Omit<QuizAttemptRecord, 'id' | 'userId' | 'createdAt'>
  ): Promise<DbOperationResult<QuizAttemptRecord>> => {
    if (!authUserId) {
      const localAttempt: QuizAttemptRecord = {
        ...input,
        id: `quiz-${Date.now()}`,
      };
      setQuizAttempts((prev) => [localAttempt, ...prev]);
      return { data: localAttempt, error: null, schemaMissing: false };
    }

    const res = await insertQuizAttempt(authUserId, input);
    if (res.error || !res.data) {
      if (res.schemaMissing) setDbStatus('migrations_required');
      return res;
    }
    setQuizAttempts((prev) => [res.data!, ...prev]);
    void unlockMilestone(
      'first-quiz',
      'Assessment Challenger',
      'Submitted and recorded a curriculum quiz or chapter test attempt.'
    );
    return res;
  };

  const handleSaveTestAttempt = async (
    input: Omit<TestAttemptRecord, 'id' | 'userId' | 'createdAt'>
  ): Promise<DbOperationResult<TestAttemptRecord>> => {
    if (!authUserId) {
      const localTest: TestAttemptRecord = {
        ...input,
        id: `test-${Date.now()}`,
      };
      setTestAttempts((prev) => [localTest, ...prev]);
      return { data: localTest, error: null, schemaMissing: false };
    }

    const res = await insertTestAttempt(authUserId, input);
    if (res.error || !res.data) {
      if (res.schemaMissing) setDbStatus('migrations_required');
      return res;
    }
    setTestAttempts((prev) => [res.data!, ...prev]);
    void unlockMilestone(
      'first-quiz',
      'Assessment Challenger',
      'Submitted and recorded a curriculum quiz or chapter test attempt.'
    );
    return res;
  };

  const handleToggleBookmark = async (input: {
    resourceType: BookmarkResourceType;
    resourceId: string;
    title: string;
    metadata: BookmarkRecord['metadata'];
  }): Promise<DbOperationResult<BookmarkRecord | { removedId: string }>> => {
    const existing = bookmarks.find(
      (b) => b.resourceType === input.resourceType && b.resourceId === input.resourceId
    );

    if (existing) {
      if (!authUserId) {
        setBookmarks((prev) => prev.filter((b) => b.id !== existing.id));
        return { data: { removedId: existing.id }, error: null, schemaMissing: false };
      }
      const delRes = await deleteBookmarkById(authUserId, existing.id);
      if (delRes.error) return { data: null, error: delRes.error, schemaMissing: delRes.schemaMissing };
      setBookmarks((prev) => prev.filter((b) => b.id !== existing.id));
      return { data: { removedId: existing.id }, error: null, schemaMissing: false };
    }

    if (!authUserId) {
      const localBookmark: BookmarkRecord = {
        id: `bm-${Date.now()}`,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        title: input.title,
        metadata: input.metadata,
        createdAt: new Date().toISOString(),
      };
      setBookmarks((prev) => [localBookmark, ...prev]);
      return { data: localBookmark, error: null, schemaMissing: false };
    }

    const res = await upsertBookmark(authUserId, input);
    if (res.error || !res.data) {
      if (res.schemaMissing) setDbStatus('migrations_required');
      return res;
    }
    setBookmarks((prev) => [res.data!, ...prev]);
    return res;
  };

  const handleDeleteBookmark = async (
    bookmarkId: string
  ): Promise<DbOperationResult<{ id: string }>> => {
    if (!authUserId) {
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
      return { data: { id: bookmarkId }, error: null, schemaMissing: false };
    }
    const res = await deleteBookmarkById(authUserId, bookmarkId);
    if (res.error) return res;
    setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
    return res;
  };

  const handleLogFocusSession = useCallback(
    (label: string, minutes: number) => {
      const now = new Date();
      const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setFocusSessions((prev) => [
        {
          id: `focus-${Date.now()}`,
          label,
          minutes,
          completedAt: timeLabel,
        },
        ...prev,
      ]);
      void unlockMilestone(
        'focus-block',
        'Deep Focus Initiate',
        'Completed a focus timer session in the Focus & Concentration Center.'
      );
    },
    [unlockMilestone]
  );

  const handleMarkNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleSelectSubjectFromDashboard = (subjectId: string) => {
    setStudyContext((prev) => ({
      ...prev,
      gradeId: profile.gradeId,
      streamId: profile.streamId,
      subjectId,
    }));
  };

  const handleLaunchTopic = (nextContext: ActiveStudyContext, target: NavModuleId) => {
    setStudyContext(nextContext);
    setActiveModule(target);
  };

  if (!isOnboarded) {
    return (
      <AuthOnboardingView
        initialProfile={profile}
        onCompleteOnboarding={handleCompleteOnboarding}
        isPasswordRecovery={isPasswordRecovery}
        onCompletePasswordRecovery={() => {
          setIsPasswordRecovery(false);
          setIsOnboarded(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f6fc] dark:bg-[#110d1e] text-[#1b1430] dark:text-[#f3f0fc] flex">
      <Sidebar
        activeModule={activeModule}
        onSelectModule={(mod) => {
          setActiveModule(mod);
          if (mod === 'parent-dashboard') setRole('parent');
          else if (role === 'parent' && mod === 'dashboard') setRole('student');
        }}
        profile={profile}
        unreadNotificationsCount={unreadCount}
        onSignOutToAuth={() => void handleSignOutToAuth()}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeModule={activeModule}
          profile={profile}
          role={role}
          onToggleRole={setRole}
          onSelectModule={setActiveModule}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          unreadCount={unreadCount}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {authUserId && dbStatus === 'error' && dbError && !dismissedDbBanner ? (
            <div
              role="alert"
              className="rounded-2xl border border-[#fde68a] dark:border-[#78350f] bg-[#fffbeb] dark:bg-[#2f2310] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#92400e] dark:text-[#fcd34d]"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <div className="font-semibold">Workspace Sync Notice</div>
                  <p className="mt-0.5 leading-relaxed">{dbError}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void hydrateFromSupabase(authUserId, authUserEmail)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#1b1430] border border-[#fde68a] dark:border-[#78350f] font-semibold cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Retry Sync</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDismissedDbBanner(true)}
                  aria-label="Dismiss database notice"
                  className="p-1.5 rounded-lg hover:bg-black/5 cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : null}

          {activeModule === 'dashboard' && (
            <DashboardView
              profile={profile}
              context={studyContext}
              tasks={tasks}
              focusSessions={focusSessions}
              progressRecords={progressRecords}
              notes={notes}
              quizAttempts={quizAttempts}
              testAttempts={testAttempts}
              dbStatus={dbStatus}
              onToggleTask={handleToggleTask}
              onNavigate={setActiveModule}
              onSelectSubjectContext={handleSelectSubjectFromDashboard}
            />
          )}

          {activeModule === 'explorer' && (
            <ExplorerView
              context={studyContext}
              onUpdateContext={setStudyContext}
              onNavigate={setActiveModule}
              progressRecords={progressRecords}
              bookmarks={bookmarks}
              onRecordTopicProgress={handleRecordTopicProgress}
              onToggleBookmark={handleToggleBookmark}
            />
          )}

          {activeModule === 'previous-classes' && (
            <PreviousClassesView
              studentGradeId={profile.gradeId}
              onLaunchTopic={handleLaunchTopic}
            />
          )}

          {activeModule === 'lessons' && (
            <LessonsView
              context={studyContext}
              onNavigate={setActiveModule}
              progressRecords={progressRecords}
              bookmarks={bookmarks}
              onRecordTopicProgress={handleRecordTopicProgress}
              onToggleBookmark={handleToggleBookmark}
            />
          )}

          {activeModule === 'notes' && (
            <NotesView
              context={studyContext}
              board={profile.board}
              onNavigate={setActiveModule}
              notes={notes}
              onSaveNote={handleSaveNote}
              onToggleNoteFavorite={handleToggleNoteFavorite}
              onDeleteNote={handleDeleteNote}
            />
          )}

          {activeModule === 'aria' && (
            <AriaTeacherView context={studyContext} onNavigate={setActiveModule} />
          )}

          {activeModule === 'quizzes' && (
            <QuizzesView
              context={studyContext}
              onNavigate={setActiveModule}
              quizAttempts={quizAttempts}
              testAttempts={testAttempts}
              dbStatus={dbStatus}
              isAuthenticated={Boolean(authUserId)}
              onSaveQuizAttempt={handleSaveQuizAttempt}
              onSaveTestAttempt={handleSaveTestAttempt}
            />
          )}

          {activeModule === 'numerical-lab' && (
            <NumericalLabView context={studyContext} onNavigate={setActiveModule} />
          )}

          {activeModule === 'focus' && (
            <FocusCenterView
              sessions={focusSessions}
              onLogFocusSession={handleLogFocusSession}
              onNavigate={setActiveModule}
            />
          )}

          {activeModule === 'youtube' && (
            <YouTubeHubView context={studyContext} onNavigate={setActiveModule} />
          )}

          {activeModule === 'planner' && (
            <StudyPlannerView
              profile={profile}
              tasks={tasks}
              dbStatus={dbStatus}
              dbError={dbError}
              isAuthenticated={Boolean(authUserId)}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
              onUpdateProfile={handleUpdateProfile}
              onRetrySync={() => {
                if (authUserId) void hydrateFromSupabase(authUserId, authUserEmail);
              }}
              onNavigate={setActiveModule}
            />
          )}

          {activeModule === 'analytics' && (
            <AnalyticsView
              profile={profile}
              tasks={tasks}
              focusSessions={focusSessions}
              progressRecords={progressRecords}
              quizAttempts={quizAttempts}
              testAttempts={testAttempts}
              onNavigate={setActiveModule}
            />
          )}

          {activeModule === 'achievements' && (
            <AchievementsView
              tasks={tasks}
              focusSessions={focusSessions}
              progressRecords={progressRecords}
              notes={notes}
              quizAttempts={quizAttempts}
              testAttempts={testAttempts}
              achievements={achievements}
              onNavigate={setActiveModule}
            />
          )}

          {activeModule === 'library' && (
            <PersonalLibraryView
              onNavigate={setActiveModule}
              notes={notes}
              bookmarks={bookmarks}
              onToggleNoteFavorite={handleToggleNoteFavorite}
              onDeleteNote={handleDeleteNote}
              onDeleteBookmark={handleDeleteBookmark}
            />
          )}

          {activeModule === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              onMarkRead={handleMarkNotificationRead}
              onMarkAllRead={handleMarkAllNotificationsRead}
              onNavigate={setActiveModule}
            />
          )}

          {activeModule === 'parent-dashboard' && (
            <ParentDashboardView
              profile={profile}
              tasks={tasks}
              focusSessions={focusSessions}
              progressRecords={progressRecords}
              quizAttempts={quizAttempts}
              testAttempts={testAttempts}
              onNavigate={setActiveModule}
            />
          )}

          {activeModule === 'settings' && (
            <ProfileSettingsView
              profile={profile}
              onUpdateProfile={handleUpdateProfile}
              darkMode={darkMode}
              onToggleDarkMode={() => setDarkMode((prev) => !prev)}
              authUserEmail={authUserEmail}
              dbStatus={dbStatus}
              dbError={dbError}
              onRetryDbSync={() => {
                if (authUserId) void hydrateFromSupabase(authUserId, authUserEmail);
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
