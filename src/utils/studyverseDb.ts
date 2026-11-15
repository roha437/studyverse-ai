import type {
  AchievementRecord,
  BookmarkRecord,
  BookmarkResourceType,
  DbOperationResult,
  DbProfileRow,
  GradeLevelId,
  NoteContentPayload,
  NoteRecord,
  NoteType,
  QuizAttemptRecord,
  StudentProfile,
  StudentProgressRecord,
  StudyPlanStatus,
  StudyTask,
  TestAttemptRecord,
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

export interface LoadedWorkspaceData {
  profile: StudentProfile | null;
  progressRecords: StudentProgressRecord[];
  studyPlans: StudyTask[];
  notes: NoteRecord[];
  quizAttempts: QuizAttemptRecord[];
  testAttempts: TestAttemptRecord[];
  bookmarks: BookmarkRecord[];
  achievements: AchievementRecord[];
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
    },
    error: null,
    schemaMissing: false,
  };
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
  input: {
    title: string;
    classLevel: GradeLevelId;
    subject: string;
    chapterId: string | null;
    topicId: string | null;
    noteType: NoteType;
    content: NoteContentPayload;
    isFavorite?: boolean;
  }
): Promise<DbOperationResult<NoteRecord>> {
  if (!supabase) return notConfiguredResult();

  const { data, error } = await supabase
    .from('notes')
    .insert({
      user_id: userId,
      title: input.title.trim(),
      class_level: input.classLevel,
      subject: input.subject,
      chapter_id: input.chapterId,
      topic_id: input.topicId,
      note_type: input.noteType,
      content: input.content,
      is_favorite: Boolean(input.isFavorite),
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
