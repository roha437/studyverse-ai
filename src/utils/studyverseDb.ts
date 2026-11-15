import type {
  AchievementRecord,
  BookmarkRecord,
  BookmarkResourceType,
  DbOperationResult,
  DbProfileRow,
  FocusSessionInput,
  FocusSessionRecord,
  GradeLevelId,
  GuardianStudentLink,
  GuardianStudentSummary,
  NotificationInput,
  NotificationItem,
  NoteInput,
  NoteRecord,
  QuizAttemptRecord,
  StudentProfile,
  StudentGuardianLink,
  StudentProgressRecord,
  StudyPlanStatus,
  StudyTask,
  TestAttemptRecord,
  VideoLearningProgress,
  VideoLearningProgressInput,
} from '../types/studyverse';
import {
  classifySupabaseError,
  mapAchievementRowToRecord,
  mapBookmarkRowToRecord,
  mapNoteRowToRecord,
  mapProfileRowToStudentProfile,
  mapProgressRowToRecord,
  mapQuizAttemptRowToRecord,
  mapStudentProfileToProfileRow,
  mapStudyPlanRowToTask,
  mapTaskInputToStudyPlanInsert,
  mapTaskInputToStudyPlanUpdate,
  mapTestAttemptRowToRecord,
} from './databaseMappers';
import { supabase } from './supabase';
import { normalizeVideoLearningProgressRow } from './videoLearningHelpers';
import { isDuplicateNote, mapNoteInputToDatabaseFields } from './noteHelpers';
import { mapFocusSessionRowToRecord, normalizeFocusSessionInput } from './focusSessionHelpers';
import { mapNotificationRowToItem, normalizeNotificationInput } from './notificationHelpers';
import {
  mapGuardianStudentRow,
  mapStudentGuardianRow,
  normalizeGuardianStudentSummary,
} from './guardianHelpers';

export interface LoadedWorkspaceData {
  profile: StudentProfile | null;
  progressRecords: StudentProgressRecord[];
  studyPlans: StudyTask[];
  notes: NoteRecord[];
  quizAttempts: QuizAttemptRecord[];
  testAttempts: TestAttemptRecord[];
  bookmarks: BookmarkRecord[];
  achievements: AchievementRecord[];
  videoLearningProgress: VideoLearningProgress[];
  videoLearningProgressError: string | null;
}

function notConfiguredResult<T>(): DbOperationResult<T> {
  return {
    data: null,
    error: 'You are currently in preview mode. Sign in to save your study data across devices.',
    schemaMissing: false,
  };
}

export async function loadUserWorkspaceData(
  userId: string,
  fallbackProfile: StudentProfile,
  authEmail?: string | null
): Promise<DbOperationResult<LoadedWorkspaceData>> {
  if (!supabase) return notConfiguredResult();

  const [
    profileRes,
    progressRes,
    plansRes,
    notesRes,
    quizRes,
    testRes,
    bookmarksRes,
    achievementsRes,
    videoProgressRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase
      .from('student_progress')
      .select('*')
      .eq('user_id', userId)
      .order('last_accessed_at', { ascending: false }),
    supabase
      .from('study_plans')
      .select('*')
      .eq('user_id', userId)
      .order('plan_date', { ascending: true }),
    supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false }),
    supabase
      .from('test_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false }),
    supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('achievements')
      .select('*')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false }),
    supabase
      .from('video_learning_progress')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false }),
  ]);

  const errors = [
    profileRes.error,
    progressRes.error,
    plansRes.error,
    notesRes.error,
    quizRes.error,
    testRes.error,
    bookmarksRes.error,
    achievementsRes.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    const classified = errors.map((err) => classifySupabaseError(err));
    const missingSchema = classified.some((item) => item.schemaMissing);
    const firstMsg = classified[0]?.message ?? 'Unable to sync your StudyVerse workspace right now.';
    return {
      data: null,
      error: missingSchema
        ? 'Cloud sync is currently being prepared for your StudyVerse account. Your workspace continues smoothly in this session.'
        : firstMsg,
      schemaMissing: missingSchema,
    };
  }

  const profile = profileRes.data
    ? mapProfileRowToStudentProfile(
        profileRes.data as Partial<DbProfileRow>,
        fallbackProfile,
        authEmail
      )
    : null;

  return {
    data: {
      profile,
      progressRecords: (progressRes.data ?? []).map((row) =>
        mapProgressRowToRecord(row as Record<string, unknown>)
      ),
      studyPlans: (plansRes.data ?? []).map((row) =>
        mapStudyPlanRowToTask(row as Record<string, unknown>)
      ),
      notes: (notesRes.data ?? []).map((row) =>
        mapNoteRowToRecord(row as Record<string, unknown>)
      ),
      quizAttempts: (quizRes.data ?? []).map((row) =>
        mapQuizAttemptRowToRecord(row as Record<string, unknown>)
      ),
      testAttempts: (testRes.data ?? []).map((row) =>
        mapTestAttemptRowToRecord(row as Record<string, unknown>)
      ),
      bookmarks: (bookmarksRes.data ?? []).map((row) =>
        mapBookmarkRowToRecord(row as Record<string, unknown>)
      ),
      achievements: (achievementsRes.data ?? []).map((row) =>
        mapAchievementRowToRecord(row as Record<string, unknown>)
      ),
      videoLearningProgress: (videoProgressRes.data ?? [])
        .map((row) => normalizeVideoLearningProgressRow(row))
        .filter((row): row is VideoLearningProgress => row !== null),
      videoLearningProgressError: videoProgressRes.error
        ? classifySupabaseError(videoProgressRes.error).message
        : null,
    },
    error: null,
    schemaMissing: false,
  };
}

export async function upsertVideoLearningProgress(
  userId: string,
  input: VideoLearningProgressInput
): Promise<DbOperationResult<VideoLearningProgress>> {
  if (!supabase) return notConfiguredResult();
  if (!userId.trim()) {
    return {
      data: null,
      error: 'Please sign in to sync video learning progress.',
      schemaMissing: false,
    };
  }
  const { data, error } = await supabase
    .from('video_learning_progress')
    .upsert(
      {
        user_id: userId,
        video_id: input.videoId,
        title: input.title,
        channel: input.channel,
        thumbnail_url: input.thumbnailUrl,
        class_level: input.classLevel,
        board: input.board,
        subject: input.subject,
        chapter: input.chapter,
        topic: input.topic,
        status: input.status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,video_id' }
    )
    .select('*')
    .single();

  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }

  const progress = normalizeVideoLearningProgressRow(data);
  if (!progress) {
    return {
      data: null,
      error: 'The saved video progress response was invalid. Please retry.',
      schemaMissing: false,
    };
  }
  return { data: progress, error: null, schemaMissing: false };
}

export async function upsertUserProfile(
  userId: string,
  profile: StudentProfile
): Promise<DbOperationResult<StudentProfile>> {
  if (!supabase) return notConfiguredResult();

  const row = mapStudentProfileToProfileRow(userId, profile);
  const { data, error } = await supabase
    .from('profiles')
    .upsert(row, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }

  return {
    data: mapProfileRowToStudentProfile(data as Partial<DbProfileRow>, profile, profile.email),
    error: null,
    schemaMissing: false,
  };
}

export async function loadUserProfile(
  userId: string,
  fallbackProfile: StudentProfile,
  authEmail?: string | null
): Promise<DbOperationResult<StudentProfile>> {
  if (!supabase) return notConfiguredResult();
  if (!userId.trim()) {
    return { data: null, error: 'Please sign in to load your profile.', schemaMissing: false };
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }
  if (!data) {
    return { data: null, error: 'This account has no saved profile. Please contact support.', schemaMissing: false };
  }
  return {
    data: mapProfileRowToStudentProfile(data as Partial<DbProfileRow>, fallbackProfile, authEmail),
    error: null,
    schemaMissing: false,
  };
}

export async function upsertTopicProgress(
  userId: string,
  input: {
    classLevel: GradeLevelId;
    subject: string;
    chapterId: string;
    topicId: string;
    completionPercentage: number;
    masteryLevel: number;
    timeSpentMinutes: number;
  }
): Promise<DbOperationResult<StudentProgressRecord>> {
  if (!supabase) return notConfiguredResult();

  const nowIso = new Date().toISOString();
  const payload = {
    user_id: userId,
    class_level: input.classLevel,
    subject: input.subject,
    chapter_id: input.chapterId,
    topic_id: input.topicId,
    completion_percentage: Math.max(0, Math.min(100, Math.round(input.completionPercentage))),
    mastery_level: Math.max(0, Math.min(100, Math.round(input.masteryLevel))),
    time_spent_minutes: Math.max(0, Math.round(input.timeSpentMinutes)),
    last_accessed_at: nowIso,
    completed_at: input.completionPercentage >= 100 ? nowIso : null,
  };

  const { data, error } = await supabase
    .from('student_progress')
    .upsert(payload, { onConflict: 'user_id,class_level,subject,chapter_id,topic_id' })
    .select('*')
    .single();

  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }

  return {
    data: mapProgressRowToRecord(data as Record<string, unknown>),
    error: null,
    schemaMissing: false,
  };
}

export async function insertStudyPlan(
  userId: string,
  taskInput: Omit<StudyTask, 'id' | 'completed'>
): Promise<DbOperationResult<StudyTask>> {
  if (!supabase) return notConfiguredResult();
  if (!userId.trim()) {
    return {
      data: null,
      error: 'Please sign in to save study plans to your account.',
      schemaMissing: false,
    };
  }

  const payload = mapTaskInputToStudyPlanInsert(userId, taskInput);
  const { data, error } = await supabase.from('study_plans').insert(payload).select('*').single();

  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }

  return {
    data: mapStudyPlanRowToTask(data as Record<string, unknown>),
    error: null,
    schemaMissing: false,
  };
}

export async function insertStudyPlans(
  userId: string,
  tasks: Array<Omit<StudyTask, 'id' | 'completed'>>
): Promise<DbOperationResult<StudyTask[]>> {
  if (!supabase) return notConfiguredResult();
  if (!userId.trim()) {
    return {
      data: null,
      error: 'Please sign in to save generated study plans to your account.',
      schemaMissing: false,
    };
  }
  if (tasks.length < 1 || tasks.length > 42) {
    return {
      data: null,
      error: 'A generated plan must contain between 1 and 42 study sessions.',
      schemaMissing: false,
    };
  }

  const payload = tasks.map((task) => mapTaskInputToStudyPlanInsert(userId, task));
  const { data, error } = await supabase.from('study_plans').insert(payload).select('*');
  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }

  return {
    data: (data ?? []).map((row) => mapStudyPlanRowToTask(row as Record<string, unknown>)),
    error: null,
    schemaMissing: false,
  };
}

export async function updateStudyPlan(
  userId: string,
  planId: string,
  taskInput: Omit<StudyTask, 'id'>
): Promise<DbOperationResult<StudyTask>> {
  if (!supabase) return notConfiguredResult();
  if (!userId.trim()) {
    return {
      data: null,
      error: 'Please sign in to update study plans in your account.',
      schemaMissing: false,
    };
  }

  const payload = mapTaskInputToStudyPlanUpdate(taskInput);
  const { data, error } = await supabase
    .from('study_plans')
    .update(payload)
    .eq('id', planId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }

  return {
    data: mapStudyPlanRowToTask(data as Record<string, unknown>),
    error: null,
    schemaMissing: false,
  };
}

export async function updateStudyPlanStatus(
  userId: string,
  planId: string,
  status: StudyPlanStatus
): Promise<DbOperationResult<StudyTask>> {
  if (!supabase) return notConfiguredResult();
  if (!userId.trim()) {
    return {
      data: null,
      error: 'Please sign in to update study plan completion status.',
      schemaMissing: false,
    };
  }

  const { data, error } = await supabase
    .from('study_plans')
    .update({
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    })
    .eq('id', planId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }

  return {
    data: mapStudyPlanRowToTask(data as Record<string, unknown>),
    error: null,
    schemaMissing: false,
  };
}

export async function deleteStudyPlan(
  userId: string,
  planId: string
): Promise<DbOperationResult<{ id: string }>> {
  if (!supabase) return notConfiguredResult();
  if (!userId.trim()) {
    return {
      data: null,
      error: 'Please sign in to delete study plans from your account.',
      schemaMissing: false,
    };
  }

  const { data, error } = await supabase
    .from('study_plans')
    .delete()
    .eq('id', planId)
    .eq('user_id', userId)
    .select('id');

  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }

  if (!data || data.length === 0) {
    return {
      data: null,
      error: 'Study plan could not be found or is not accessible.',
      schemaMissing: false,
    };
  }

  return { data: { id: planId }, error: null, schemaMissing: false };
}

export async function insertNote(
  userId: string,
  input: NoteInput
): Promise<DbOperationResult<NoteRecord>> {
  if (!supabase) return notConfiguredResult();
  if (!userId.trim()) {
    return {
      data: null,
      error: 'Please sign in to save notes to your account.',
      schemaMissing: false,
    };
  }

  const { data: candidates, error: candidateError } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .eq('class_level', input.classLevel)
    .eq('subject', input.subject.trim())
    .eq('title', input.title.trim())
    .limit(50);
  if (candidateError) {
    const classified = classifySupabaseError(candidateError);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }
  if (
    isDuplicateNote(
      ((candidates ?? []) as Record<string, unknown>[]).map(mapNoteRowToRecord),
      input
    )
  ) {
    return {
      data: null,
      error: 'This note already exists. Edit the saved note instead of creating a duplicate.',
      schemaMissing: false,
    };
  }

  const { data, error } = await supabase
    .from('notes')
    .insert({
      user_id: userId,
      ...mapNoteInputToDatabaseFields(input),
    })
    .select('*')
    .single();

  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }

  return {
    data: mapNoteRowToRecord(data as Record<string, unknown>),
    error: null,
    schemaMissing: false,
  };
}

export async function updateNoteById(
  userId: string,
  noteId: string,
  input: NoteInput
): Promise<DbOperationResult<NoteRecord>> {
  if (!supabase) return notConfiguredResult();
  if (!userId.trim()) {
    return {
      data: null,
      error: 'Please sign in to update notes in your account.',
      schemaMissing: false,
    };
  }

  const { data: candidates, error: candidateError } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .eq('class_level', input.classLevel)
    .eq('subject', input.subject.trim())
    .eq('title', input.title.trim())
    .limit(50);
  if (candidateError) {
    const classified = classifySupabaseError(candidateError);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }
  if (
    isDuplicateNote(
      ((candidates ?? []) as Record<string, unknown>[]).map(mapNoteRowToRecord),
      input,
      noteId
    )
  ) {
    return {
      data: null,
      error: 'Another saved note already has this title and content.',
      schemaMissing: false,
    };
  }

  const { data, error } = await supabase
    .from('notes')
    .update(mapNoteInputToDatabaseFields(input))
    .eq('id', noteId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }

  return {
    data: mapNoteRowToRecord(data as Record<string, unknown>),
    error: null,
    schemaMissing: false,
  };
}

export async function toggleNoteFavorite(
  userId: string,
  noteId: string,
  isFavorite: boolean
): Promise<DbOperationResult<NoteRecord>> {
  if (!supabase) return notConfiguredResult();

  const { data, error } = await supabase
    .from('notes')
    .update({ is_favorite: isFavorite })
    .eq('id', noteId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }

  return {
    data: mapNoteRowToRecord(data as Record<string, unknown>),
    error: null,
    schemaMissing: false,
  };
}

export async function deleteNoteById(
  userId: string,
  noteId: string
): Promise<DbOperationResult<{ id: string }>> {
  if (!supabase) return notConfiguredResult();

  const { error } = await supabase.from('notes').delete().eq('id', noteId).eq('user_id', userId);

  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }

  return { data: { id: noteId }, error: null, schemaMissing: false };
}

export async function loadUserFocusSessions(
  userId: string
): Promise<DbOperationResult<FocusSessionRecord[]>> {
  if (!supabase) return notConfiguredResult();
  if (!userId.trim()) {
    return { data: null, error: 'Please sign in to load focus sessions.', schemaMissing: false };
  }
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(500);
  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }
  return {
    data: ((data ?? []) as Record<string, unknown>[]).map(mapFocusSessionRowToRecord),
    error: null,
    schemaMissing: false,
  };
}

export async function insertFocusSession(
  userId: string,
  input: FocusSessionInput
): Promise<DbOperationResult<FocusSessionRecord>> {
  if (!supabase) return notConfiguredResult();
  if (!userId.trim()) {
    return { data: null, error: 'Please sign in to save focus sessions.', schemaMissing: false };
  }
  let normalizedInput: FocusSessionInput;
  try {
    normalizedInput = normalizeFocusSessionInput(input);
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Invalid focus session details.',
      schemaMissing: false,
    };
  }

  const { data, error } = await supabase
    .from('focus_sessions')
    .insert({
      user_id: userId,
      label: normalizedInput.label,
      subject: normalizedInput.subject,
      started_at: normalizedInput.startedAt,
      ended_at: normalizedInput.endedAt,
      duration_seconds: normalizedInput.durationSeconds,
      status: normalizedInput.status,
    })
    .select('*')
    .single();
  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }
  return {
    data: mapFocusSessionRowToRecord(data as Record<string, unknown>),
    error: null,
    schemaMissing: false,
  };
}

export async function loadUserNotifications(
  userId: string
): Promise<DbOperationResult<NotificationItem[]>> {
  if (!supabase) return notConfiguredResult();
  if (!userId.trim()) {
    return { data: null, error: 'Please sign in to load notifications.', schemaMissing: false };
  }
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }
  return {
    data: ((data ?? []) as Record<string, unknown>[]).map(mapNotificationRowToItem),
    error: null,
    schemaMissing: false,
  };
}

export async function insertUserNotification(
  userId: string,
  input: NotificationInput
): Promise<DbOperationResult<NotificationItem | null>> {
  if (!supabase) return notConfiguredResult();
  if (!userId.trim()) {
    return { data: null, error: 'Please sign in to save notifications.', schemaMissing: false };
  }
  let normalizedInput: NotificationInput;
  try {
    normalizedInput = normalizeNotificationInput(input);
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Invalid notification details.',
      schemaMissing: false,
    };
  }
  const { data, error } = await supabase
    .from('notifications')
    .upsert(
      {
        user_id: userId,
        title: normalizedInput.title,
        message: normalizedInput.message,
        category: normalizedInput.category,
        event_key: normalizedInput.eventKey,
        target_module: normalizedInput.targetModule ?? null,
      },
      { onConflict: 'user_id,event_key', ignoreDuplicates: true }
    )
    .select('*')
    .maybeSingle();
  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }
  return {
    data: data ? mapNotificationRowToItem(data as Record<string, unknown>) : null,
    error: null,
    schemaMissing: false,
  };
}

export async function setUserNotificationRead(
  userId: string,
  notificationId: string,
  read: boolean
): Promise<DbOperationResult<NotificationItem>> {
  if (!supabase) return notConfiguredResult();
  const { data, error } = await supabase
    .from('notifications')
    .update({ read })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }
  return {
    data: mapNotificationRowToItem(data as Record<string, unknown>),
    error: null,
    schemaMissing: false,
  };
}

export async function setAllUserNotificationsRead(
  userId: string
): Promise<DbOperationResult<number>> {
  if (!supabase) return notConfiguredResult();
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
    .select('id');
  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }
  return { data: data?.length ?? 0, error: null, schemaMissing: false };
}

export async function deleteUserNotification(
  userId: string,
  notificationId: string
): Promise<DbOperationResult<{ id: string }>> {
  if (!supabase) return notConfiguredResult();
  const { data, error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', userId)
    .select('id');
  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }
  if (!data?.length) {
    return { data: null, error: 'Notification could not be found or is not accessible.', schemaMissing: false };
  }
  return { data: { id: notificationId }, error: null, schemaMissing: false };
}

export async function createGuardianInvitation(
  userId: string,
  tokenHash: string,
  consentGiven: boolean
): Promise<DbOperationResult<{ id: string; expiresAt: string }>> {
  if (!supabase) return notConfiguredResult();
  if (!userId.trim()) {
    return { data: null, error: 'Sign in as a student to invite a guardian.', schemaMissing: false };
  }
  if (!consentGiven) {
    return { data: null, error: 'Student consent is required before inviting a guardian.', schemaMissing: false };
  }
  const { data, error } = await supabase.rpc('guardian_create_invitation', {
    p_token_hash: tokenHash,
    p_consent_given: consentGiven,
  });
  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row.invitation_id !== 'string' || typeof row.expires_at !== 'string') {
    return { data: null, error: 'Invitation service returned an invalid response.', schemaMissing: false };
  }
  return {
    data: { id: row.invitation_id, expiresAt: row.expires_at },
    error: null,
    schemaMissing: false,
  };
}

export async function claimGuardianInvitation(
  userId: string,
  tokenHash: string
): Promise<DbOperationResult<{ linkId: string }>> {
  if (!supabase) return notConfiguredResult();
  if (!userId.trim()) {
    return { data: null, error: 'Sign in as a guardian to accept an invitation.', schemaMissing: false };
  }
  const { data, error } = await supabase.rpc('guardian_claim_invitation', {
    p_token_hash: tokenHash,
  });
  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }
  if (typeof data !== 'string') {
    return { data: null, error: 'Invitation service returned an invalid response.', schemaMissing: false };
  }
  return { data: { linkId: data }, error: null, schemaMissing: false };
}

export async function loadGuardianStudents(
  userId: string
): Promise<DbOperationResult<GuardianStudentLink[]>> {
  if (!supabase) return notConfiguredResult();
  if (!userId.trim()) {
    return { data: null, error: 'Sign in as a guardian to load linked students.', schemaMissing: false };
  }
  const { data, error } = await supabase.rpc('guardian_list_students');
  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }
  return {
    data: Array.isArray(data)
      ? data.map(mapGuardianStudentRow).filter((item): item is GuardianStudentLink => item !== null)
      : [],
    error: null,
    schemaMissing: false,
  };
}

export async function loadStudentGuardians(
  userId: string
): Promise<DbOperationResult<StudentGuardianLink[]>> {
  if (!supabase) return notConfiguredResult();
  if (!userId.trim()) {
    return { data: null, error: 'Sign in as a student to load linked guardians.', schemaMissing: false };
  }
  const { data, error } = await supabase.rpc('student_list_guardians');
  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }
  return {
    data: Array.isArray(data)
      ? data.map(mapStudentGuardianRow).filter((item): item is StudentGuardianLink => item !== null)
      : [],
    error: null,
    schemaMissing: false,
  };
}

export async function loadGuardianStudentSummary(
  userId: string,
  studentId: string
): Promise<DbOperationResult<GuardianStudentSummary>> {
  if (!supabase) return notConfiguredResult();
  if (!userId.trim() || !studentId.trim()) {
    return { data: null, error: 'Select a linked student to view their progress.', schemaMissing: false };
  }
  const { data, error } = await supabase.rpc('guardian_get_student_summary', {
    p_student_id: studentId,
  });
  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }
  const summary = normalizeGuardianStudentSummary(data);
  return summary
    ? { data: summary, error: null, schemaMissing: false }
    : { data: null, error: 'Guardian summary returned an invalid response.', schemaMissing: false };
}

export async function revokeGuardianLink(
  userId: string,
  linkId: string
): Promise<DbOperationResult<{ id: string }>> {
  if (!supabase) return notConfiguredResult();
  if (!userId.trim() || !linkId.trim()) {
    return { data: null, error: 'Select an active guardian link to revoke.', schemaMissing: false };
  }
  const { data, error } = await supabase.rpc('guardian_revoke_link', { p_link_id: linkId });
  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }
  return data === true
    ? { data: { id: linkId }, error: null, schemaMissing: false }
    : { data: null, error: 'Guardian access could not be revoked.', schemaMissing: false };
}

export async function insertQuizAttempt(
  userId: string,
  input: Omit<QuizAttemptRecord, 'id' | 'userId' | 'createdAt'>
): Promise<DbOperationResult<QuizAttemptRecord>> {
  if (!supabase) return notConfiguredResult();
  if (!userId.trim()) {
    return {
      data: null,
      error: 'Please sign in to save quiz attempts to your account.',
      schemaMissing: false,
    };
  }

  const { data, error } = await supabase
    .from('quiz_attempts')
    .insert({
      user_id: userId,
      class_level: input.classLevel,
      subject: input.subject,
      chapter_id: input.chapterId,
      topic_id: input.topicId ?? null,
      quiz_type: input.quizType,
      difficulty: input.difficulty,
      total_questions: input.totalQuestions,
      correct_answers: input.correctAnswers,
      score_percentage: input.scorePercentage,
      answers: input.answers,
      duration_seconds: Math.max(0, Math.round(input.durationSeconds)),
      completed_at: input.completedAt,
    })
    .select('*')
    .single();

  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }

  return {
    data: mapQuizAttemptRowToRecord(data as Record<string, unknown>),
    error: null,
    schemaMissing: false,
  };
}

export async function insertTestAttempt(
  userId: string,
  input: Omit<TestAttemptRecord, 'id' | 'userId' | 'createdAt'>
): Promise<DbOperationResult<TestAttemptRecord>> {
  if (!supabase) return notConfiguredResult();
  if (!userId.trim()) {
    return {
      data: null,
      error: 'Please sign in to save test attempts to your account.',
      schemaMissing: false,
    };
  }

  const { data, error } = await supabase
    .from('test_attempts')
    .insert({
      user_id: userId,
      title: input.title,
      class_level: input.classLevel,
      subject: input.subject,
      test_type: input.testType,
      total_marks: input.totalMarks,
      obtained_marks: input.obtainedMarks,
      duration_seconds: Math.max(0, Math.round(input.durationSeconds)),
      answers: input.answers,
      result: input.result,
      completed_at: input.completedAt,
    })
    .select('*')
    .single();

  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }

  return {
    data: mapTestAttemptRowToRecord(data as Record<string, unknown>),
    error: null,
    schemaMissing: false,
  };
}

export async function upsertBookmark(
  userId: string,
  input: {
    resourceType: BookmarkResourceType;
    resourceId: string;
    title: string;
    metadata: BookmarkRecord['metadata'];
  }
): Promise<DbOperationResult<BookmarkRecord>> {
  if (!supabase) return notConfiguredResult();

  const { data, error } = await supabase
    .from('bookmarks')
    .upsert(
      {
        user_id: userId,
        resource_type: input.resourceType,
        resource_id: input.resourceId,
        title: input.title.trim(),
        metadata: input.metadata,
      },
      { onConflict: 'user_id,resource_type,resource_id' }
    )
    .select('*')
    .single();

  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }

  return {
    data: mapBookmarkRowToRecord(data as Record<string, unknown>),
    error: null,
    schemaMissing: false,
  };
}

export async function deleteBookmarkById(
  userId: string,
  bookmarkId: string
): Promise<DbOperationResult<{ id: string }>> {
  if (!supabase) return notConfiguredResult();

  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('id', bookmarkId)
    .eq('user_id', userId);

  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }

  return { data: { id: bookmarkId }, error: null, schemaMissing: false };
}

export async function unlockAchievementOnce(
  userId: string,
  input: {
    achievementCode: string;
    title: string;
    description: string;
    metadata?: Record<string, unknown>;
  }
): Promise<DbOperationResult<AchievementRecord>> {
  if (!supabase) return notConfiguredResult();

  const { data, error } = await supabase
    .from('achievements')
    .upsert(
      {
        user_id: userId,
        achievement_code: input.achievementCode,
        title: input.title,
        description: input.description,
        unlocked_at: new Date().toISOString(),
        metadata: input.metadata ?? {},
      },
      { onConflict: 'user_id,achievement_code' }
    )
    .select('*')
    .single();

  if (error) {
    const classified = classifySupabaseError(error);
    return { data: null, error: classified.message, schemaMissing: classified.schemaMissing };
  }

  return {
    data: mapAchievementRowToRecord(data as Record<string, unknown>),
    error: null,
    schemaMissing: false,
  };
}
