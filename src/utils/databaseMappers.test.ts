import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifySupabaseError,
  computeDashboardMetrics,
  computeProgressSummary,
  computeSubjectAnalytics,
  evaluateQuizAnswers,
  formatAttemptTimestamp,
  formatPlanDateLabel,
  getNextIsoDateForWeekday,
  mapProfileRowToStudentProfile,
  mapQuizAttemptRowToRecord,
  mapStudentProfileToProfileRow,
  mapStudyPlanRowToTask,
  mapTaskInputToStudyPlanInsert,
  mapTaskInputToStudyPlanUpdate,
  mapTestAttemptRowToRecord,
  weekdayFromIsoDate,
} from './databaseMappers';
import type {
  AssessmentQuestion,
  StudyPlanMetadata,
  StudyPlannerPreferences,
  StudentProfile,
  StudentProgressRecord,
  SubjectItem,
} from '../types/studyverse';

const BASE_PROFILE: StudentProfile = {
  name: 'Ananya Sharma',
  email: 'ananya@studyverse.edu',
  gradeId: 'class-10',
  streamId: 'general',
  board: 'NCERT / CBSE',
  dailyGoalMinutes: 90,
  guardianName: 'Rajesh Sharma',
  guardianEmail: 'rajesh@example.com',
};

test('classifySupabaseError identifies missing schema and RLS permission errors', () => {
  assert.equal(
    classifySupabaseError({ code: '42P01', message: 'relation "public.profiles" does not exist' })
      .schemaMissing,
    true
  );
  assert.equal(
    classifySupabaseError({
      code: 'PGRST205',
      message: "Could not find the table 'public.notes' in the schema cache",
    }).schemaMissing,
    true
  );
  assert.equal(
    classifySupabaseError({ code: '23505', message: 'duplicate key value violates unique constraint' })
      .schemaMissing,
    false
  );
  const rlsErr = classifySupabaseError({
    code: '42501',
    message: 'new row violates row-level security policy for table "quiz_attempts"',
  });
  assert.equal(rlsErr.schemaMissing, false);
  assert.match(rlsErr.message, /signed in/i);
});

test('mapProfileRowToStudentProfile and mapStudentProfileToProfileRow round-trip profile fields', () => {
  const row = mapStudentProfileToProfileRow('user-123', {
    ...BASE_PROFILE,
    academicGoal: 'Score 95+ in Class 10 Boards',
    targetMarks: 95,
    examDate: '2027-03-15',
    preferredLanguage: 'English',
    accountRole: 'parent',
  });
  assert.equal(row.id, 'user-123');
  assert.equal(row.class_level, 'class-10');
  assert.equal(row.target_marks, 95);
  assert.equal(row.account_role, 'parent');

  const mapped = mapProfileRowToStudentProfile(
    {
      ...row,
      created_at: '2026-11-14T00:00:00Z',
      updated_at: '2026-11-14T00:00:00Z',
    },
    BASE_PROFILE,
    'student@example.com'
  );
  assert.equal(mapped.email, 'student@example.com');
  assert.equal(mapped.academicGoal, 'Score 95+ in Class 10 Boards');
  assert.equal(mapped.targetMarks, 95);
  assert.equal(mapped.examDate, '2027-03-15');
  assert.equal(mapped.accountRole, 'parent');
});

test('weekday and ISO date conversion preserves weekday and update payloads for study_plans', () => {
  const ref = new Date('2026-11-14T10:00:00Z'); // Saturday
  const wedIso = getNextIsoDateForWeekday('Wed', ref);
  assert.equal(wedIso, '2026-11-18');
  assert.equal(weekdayFromIsoDate(wedIso), 'Wed');
  assert.match(formatPlanDateLabel(wedIso, 'Wed'), /^Wed,/);

  const insertPayload = mapTaskInputToStudyPlanInsert('user-1', {
    title: 'Revise Quadratic Equations',
    subjectName: 'Mathematics',
    day: 'Wed',
    planDate: wedIso,
    durationMinutes: 45,
    priority: 'high',
    taskDescription: 'Exercise 4.2',
  });
  assert.equal(insertPayload.priority, 'high');
  assert.equal(insertPayload.status, 'pending');
  assert.equal(insertPayload.plan_date, '2026-11-18');

  const updatePayload = mapTaskInputToStudyPlanUpdate({
    title: 'Revise Quadratic Equations (Updated)',
    subjectName: 'Physics',
    day: 'Thu',
    planDate: '2026-11-19',
    durationMinutes: 60,
    priority: 'low',
    status: 'completed',
    completed: true,
    taskDescription: 'Updated notes',
  });
  assert.equal(updatePayload.title, 'Revise Quadratic Equations (Updated)');
  assert.equal(updatePayload.subject, 'Physics');
  assert.equal(updatePayload.plan_date, '2026-11-19');
  assert.equal(updatePayload.duration_minutes, 60);
  assert.equal(updatePayload.status, 'completed');
  assert.ok(updatePayload.completed_at);

  const uiTask = mapStudyPlanRowToTask({
    id: 'plan-1',
    title: insertPayload.title,
    subject: insertPayload.subject,
    plan_date: wedIso,
    duration_minutes: 45,
    priority: 'high',
    status: 'completed',
    completed_at: '2026-11-14T12:00:00Z',
  });
  assert.equal(uiTask.day, 'Wed');
  assert.equal(uiTask.planDate, '2026-11-18');
  assert.equal(uiTask.completed, true);
  assert.equal(uiTask.priority, 'high');
});

test('study plan mapper round-trips AI plan grouping and session metadata', () => {
  const plannerPreferences: StudyPlannerPreferences = {
    gradeId: 'class-10',
    board: 'NCERT / CBSE',
    subjects: ['Mathematics'],
    weakSubjects: ['Mathematics'],
    dailyAvailableMinutes: 90,
    weekStartDate: '2027-01-04',
    targetDate: '2027-03-01',
    preferredDays: ['Mon', 'Wed'],
    chaptersAndTopics: 'Quadratics',
    revisionPreference: 'spaced',
  } as const;
  const metadata: StudyPlanMetadata = {
    source: 'ai' as const,
    planGroupId: 'plan-group-1',
    planTitle: 'Focused mathematics week',
    planSummary: 'Build algebra confidence.',
    weekStartDate: plannerPreferences.weekStartDate,
    targetDate: plannerPreferences.targetDate,
    dailyAvailableMinutes: plannerPreferences.dailyAvailableMinutes,
    board: plannerPreferences.board,
    classLabel: 'Class 10',
    topic: 'Quadratic equations',
    learningObjective: 'Solve equations by factorisation.',
    practiceRecommendation: 'Complete five textbook questions.',
    sessionType: 'practice' as const,
    sessionOrder: 0,
    startTime: '16:00',
    linkedVideo: {
      videoId: 'abcdefghijk',
      title: 'Quadratics explained',
      channel: 'Study Channel',
      videoUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
    },
    plannerPreferences,
  };
  const insertPayload = mapTaskInputToStudyPlanInsert('user-1', {
    title: 'Quadratic equations practice',
    subjectName: 'Mathematics',
    day: 'Mon',
    planDate: '2027-01-04',
    durationMinutes: 45,
    priority: 'medium',
    plannerMetadata: metadata,
  });
  assert.equal(insertPayload.planner_metadata.planGroupId, 'plan-group-1');

  const mapped = mapStudyPlanRowToTask({
    id: 'ai-session-1',
    title: insertPayload.title,
    subject: insertPayload.subject,
    plan_date: insertPayload.plan_date,
    duration_minutes: insertPayload.duration_minutes,
    priority: insertPayload.priority,
    status: insertPayload.status,
    planner_metadata: insertPayload.planner_metadata,
  });
  assert.equal(mapped.plannerMetadata?.planGroupId, 'plan-group-1');
  assert.equal(mapped.plannerMetadata?.topic, 'Quadratic equations');
  assert.equal(mapped.plannerMetadata?.linkedVideo?.videoId, 'abcdefghijk');
  assert.equal(mapped.plannerMetadata?.plannerPreferences?.revisionPreference, 'spaced');
});

test('evaluateQuizAnswers stores full question details, options, selected/correct text, and explanations', () => {
  const questions: AssessmentQuestion[] = [
    {
      id: 'q1',
      prompt: 'Discriminant of ax^2 + bx + c = 0',
      options: ['b^2 - 4ac', 'b^2 + 4ac', '4ac - b^2', 'a^2 - 4bc'],
      correctIndex: 0,
      difficulty: 'Board Standard',
      explanation: 'D = b^2 - 4ac.',
    },
    {
      id: 'q2',
      prompt: 'If D < 0, roots are:',
      options: ['Real and equal', 'Real and distinct', 'No real roots', 'Zero'],
      correctIndex: 2,
      difficulty: 'Board Standard',
      explanation: 'Negative discriminant gives non-real roots.',
    },
  ];
  const result = evaluateQuizAnswers(questions, { q1: 0, q2: 1 });
  assert.equal(result.totalQuestions, 2);
  assert.equal(result.correctAnswers, 1);
  assert.equal(result.scorePercentage, 50);
  assert.equal(result.answers[0].isCorrect, true);
  assert.equal(result.answers[0].selectedOption, 'b^2 - 4ac');
  assert.equal(result.answers[0].correctOption, 'b^2 - 4ac');
  assert.equal(result.answers[0].explanation, 'D = b^2 - 4ac.');
  assert.deepEqual(result.answers[1].options, [
    'Real and equal',
    'Real and distinct',
    'No real roots',
    'Zero',
  ]);
  assert.equal(result.answers[1].isCorrect, false);
  assert.equal(result.answers[1].selectedOption, 'Real and distinct');
  assert.equal(result.answers[1].correctOption, 'No real roots');
});

test('mapQuizAttemptRowToRecord and mapTestAttemptRowToRecord preserve userId, scores, timestamps, and answer details', () => {
  const quizRow = mapQuizAttemptRowToRecord({
    id: 'qa-101',
    user_id: 'user-abc',
    class_level: 'class-10',
    subject: 'Mathematics',
    chapter_id: 'c10-math-ch1',
    quiz_type: 'practice',
    difficulty: 'Board Standard',
    total_questions: 2,
    correct_answers: 1,
    score_percentage: '50.00',
    answers: [
      {
        questionId: 'q1',
        prompt: 'Sample Q1',
        options: ['A', 'B'],
        selectedIndex: 0,
        correctIndex: 0,
        isCorrect: true,
        explanation: 'A is right.',
      },
    ],
    duration_seconds: 24,
    completed_at: '2026-11-14T11:30:00.000Z',
    created_at: '2026-11-14T11:30:01.000Z',
  });
  assert.equal(quizRow.userId, 'user-abc');
  assert.equal(quizRow.scorePercentage, 50);
  assert.equal(quizRow.completedAt, '2026-11-14T11:30:00.000Z');
  assert.equal(quizRow.answers[0].selectedOption, 'A');
  assert.equal(quizRow.answers[0].correctOption, 'A');
  assert.equal(quizRow.answers[0].explanation, 'A is right.');

  const testRow = mapTestAttemptRowToRecord({
    id: 'ta-202',
    user_id: 'user-abc',
    title: 'Quadratic Equations (Chapter Test)',
    class_level: 'class-10',
    subject: 'Mathematics',
    test_type: 'chapter-test',
    total_marks: 10,
    obtained_marks: 8,
    duration_seconds: 95,
    answers: [
      {
        questionId: 'q1',
        prompt: 'Sample Q1',
        options: ['A', 'B'],
        selectedIndex: 1,
        selectedOption: 'B',
        correctIndex: 0,
        correctOption: 'A',
        isCorrect: false,
      },
    ],
    result: {
      percentage: 80,
      gradeLabel: 'Merit (A)',
      chapterId: 'c10-math-ch1',
      difficulty: 'Challenge',
    },
    completed_at: '2026-11-14T12:00:00.000Z',
    created_at: '2026-11-14T12:00:02.000Z',
  });
  assert.equal(testRow.userId, 'user-abc');
  assert.equal(testRow.totalMarks, 10);
  assert.equal(testRow.obtainedMarks, 8);
  assert.equal(testRow.result.percentage, 80);
  assert.equal(testRow.result.gradeLabel, 'Merit (A)');
  assert.equal(testRow.answers[0].selectedOption, 'B');
  assert.equal(testRow.answers[0].correctOption, 'A');
  assert.notEqual(formatAttemptTimestamp('2026-11-14T12:00:00.000Z'), 'Recently');
});

test('computeProgressSummary and computeSubjectAnalytics aggregate student progress accurately', () => {
  const progress: StudentProgressRecord[] = [
    {
      id: 'p1',
      classLevel: 'class-10',
      subject: 'Mathematics',
      chapterId: 'ch1',
      topicId: 't1',
      completionPercentage: 100,
      masteryLevel: 90,
      timeSpentMinutes: 35,
      lastAccessedAt: '2026-11-14T10:00:00Z',
      completedAt: '2026-11-14T10:35:00Z',
    },
  ];
  const summary = computeProgressSummary(progress, 4);
  assert.equal(summary.completedTopics, 1);
  assert.equal(summary.classCompletionPercentage, 25);
  assert.equal(summary.averageMastery, 90);

  const subjects: SubjectItem[] = [
    {
      id: 's1',
      name: 'Mathematics',
      code: 'MATH-10',
      streams: ['general'],
      chapters: [
        {
          id: 'ch1',
          number: 1,
          title: 'Quadratic Equations',
          textbookUnit: 'Algebra',
          topics: [
            { id: 't1', title: 'Discriminant', summary: 'Roots check', estimatedMinutes: 25 },
            { id: 't2', title: 'Factorisation', summary: 'Splitting middle term', estimatedMinutes: 25 },
          ],
        },
      ],
    },
  ];
  const analytics = computeSubjectAnalytics(subjects, progress, [], [], []);
  assert.equal(analytics[0].completedTopics, 1);
  assert.equal(analytics[0].totalTopics, 2);
  assert.equal(analytics[0].completionPct, 50);
});

test('computeDashboardMetrics aggregates study time, assessment averages, and prioritizes pending tasks', () => {
  const result = computeDashboardMetrics({
    dailyGoalMinutes: 100,
    totalTopicsInClass: 10,
    progressRecords: [
      {
        id: 'p1',
        classLevel: 'class-10',
        subject: 'Mathematics',
        chapterId: 'ch1',
        topicId: 't1',
        completionPercentage: 100,
        masteryLevel: 88,
        timeSpentMinutes: 45,
        lastAccessedAt: '2026-11-14T10:00:00Z',
        completedAt: '2026-11-14T10:45:00Z',
      },
    ],
    focusSessions: [
      {
        id: 'f1',
        label: 'Optics Review',
        subject: 'Physics',
        minutes: 25,
        completedAt: '11:00 AM',
        startedAt: '2026-11-14T10:35:00Z',
        endedAt: '2026-11-14T11:00:00Z',
        durationSeconds: 1500,
        status: 'completed',
      },
    ],
    quizAttempts: [
      {
        id: 'q1',
        classLevel: 'class-10',
        subject: 'Mathematics',
        chapterId: 'ch1',
        quizType: 'practice',
        difficulty: 'Board Standard',
        totalQuestions: 5,
        correctAnswers: 4,
        scorePercentage: 80,
        answers: [],
        durationSeconds: 60,
        completedAt: '2026-11-14T09:00:00Z',
      },
    ],
    testAttempts: [
      {
        id: 't1',
        title: 'Light Reflection Test',
        classLevel: 'class-10',
        subject: 'Science',
        testType: 'chapter-test',
        totalMarks: 10,
        obtainedMarks: 9,
        durationSeconds: 120,
        answers: [],
        result: { percentage: 90, gradeLabel: 'Distinction (A+)' },
        completedAt: '2026-11-14T11:30:00Z',
      },
    ],
    tasks: [
      {
        id: 'task-done',
        title: 'Completed task',
        subjectName: 'Science',
        day: 'Mon',
        durationMinutes: 30,
        completed: true,
      },
      {
        id: 'task-open',
        title: 'Pending task',
        subjectName: 'Mathematics',
        day: 'Tue',
        durationMinutes: 45,
        completed: false,
      },
    ],
  });

  assert.equal(result.focusMinutesToday, 25);
  assert.equal(result.totalStudyMinutes, 70);
  assert.equal(result.goalProgressPct, 70);
  assert.equal(result.totalAssessments, 2);
  assert.equal(result.averageScore, 85);
  assert.equal(result.recentAssessments[0].id, 't1');
  assert.equal(result.upcomingTasks[0].id, 'task-open');
  assert.equal(result.upcomingTasks[1].id, 'task-done');
});

