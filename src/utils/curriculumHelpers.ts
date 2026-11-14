import { CURRICULUM_CLASSES } from '../data/curriculum';
import type {
  ActiveStudyContext,
  CurriculumClass,
  GradeLevelId,
  StreamId,
  StudyTask,
  SubjectItem,
} from '../types/studyverse';

export function isIntermediateGrade(gradeId: GradeLevelId): boolean {
  return gradeId === 'inter-1' || gradeId === 'inter-2';
}

export function getClassById(gradeId: GradeLevelId): CurriculumClass {
  return CURRICULUM_CLASSES.find((c) => c.id === gradeId) ?? CURRICULUM_CLASSES[5];
}

export function getPreviousClassesForGrade(gradeId: GradeLevelId): CurriculumClass[] {
  const current = getClassById(gradeId);
  return CURRICULUM_CLASSES.filter((c) => c.order < current.order);
}

export function getAvailableSubjects(gradeId: GradeLevelId, streamId: StreamId): SubjectItem[] {
  const cls = getClassById(gradeId);
  if (!isIntermediateGrade(gradeId)) {
    return cls.subjects;
  }
  const activeStream: StreamId = streamId === 'general' ? 'mpc' : streamId;
  return cls.subjects.filter((subject) => subject.streams.includes(activeStream));
}

export function resolveDefaultContext(
  gradeId: GradeLevelId,
  streamId: StreamId
): ActiveStudyContext {
  const effectiveStream: StreamId = isIntermediateGrade(gradeId)
    ? streamId === 'general'
      ? 'mpc'
      : streamId
    : 'general';
  const subjects = getAvailableSubjects(gradeId, effectiveStream);
  const subject = subjects[0] ?? getClassById(gradeId).subjects[0];
  const chapter = subject.chapters[0];
  const topic = chapter.topics[0];

  return {
    gradeId,
    streamId: effectiveStream,
    subjectId: subject.id,
    chapterId: chapter.id,
    topicId: topic.id,
  };
}

export function resolveContextDetails(ctx: ActiveStudyContext) {
  const cls = getClassById(ctx.gradeId);
  const subjects = getAvailableSubjects(ctx.gradeId, ctx.streamId);
  const subject = subjects.find((s) => s.id === ctx.subjectId) ?? subjects[0] ?? cls.subjects[0];
  const chapter = subject.chapters.find((c) => c.id === ctx.chapterId) ?? subject.chapters[0];
  const topic = chapter.topics.find((t) => t.id === ctx.topicId) ?? chapter.topics[0];

  return { cls, subject, chapter, topic };
}

export interface TopicSearchHit {
  gradeId: GradeLevelId;
  gradeLabel: string;
  subjectId: string;
  subjectName: string;
  chapterId: string;
  chapterTitle: string;
  topicId: string;
  topicTitle: string;
  topicSummary: string;
  estimatedMinutes: number;
  hasNumericals: boolean;
}

export function filterCurriculumTopics(
  classes: CurriculumClass[],
  query: string,
  gradeFilter: GradeLevelId | 'all' = 'all',
  streamFilter: StreamId | 'all' = 'all'
): TopicSearchHit[] {
  const normalized = query.trim().toLowerCase();
  const hits: TopicSearchHit[] = [];

  for (const cls of classes) {
    if (gradeFilter !== 'all' && cls.id !== gradeFilter) continue;
    for (const subject of cls.subjects) {
      if (
        streamFilter !== 'all' &&
        isIntermediateGrade(cls.id) &&
        !subject.streams.includes(streamFilter)
      ) {
        continue;
      }
      for (const chapter of subject.chapters) {
        for (const topic of chapter.topics) {
          const matches =
            normalized.length === 0 ||
            topic.title.toLowerCase().includes(normalized) ||
            topic.summary.toLowerCase().includes(normalized) ||
            chapter.title.toLowerCase().includes(normalized) ||
            subject.name.toLowerCase().includes(normalized) ||
            cls.label.toLowerCase().includes(normalized);

          if (matches) {
            hits.push({
              gradeId: cls.id,
              gradeLabel: cls.label,
              subjectId: subject.id,
              subjectName: subject.name,
              chapterId: chapter.id,
              chapterTitle: chapter.title,
              topicId: topic.id,
              topicTitle: topic.title,
              topicSummary: topic.summary,
              estimatedMinutes: topic.estimatedMinutes,
              hasNumericals: Boolean(topic.hasNumericals),
            });
          }
        }
      }
    }
  }
  return hits;
}

export function formatSecondsToTimer(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export interface OnboardingValidationResult {
  valid: boolean;
  errors: {
    name?: string;
    streamId?: string;
  };
}

export function validateOnboardingProfile(input: {
  name: string;
  gradeId: GradeLevelId;
  streamId: StreamId;
}): OnboardingValidationResult {
  const errors: OnboardingValidationResult['errors'] = {};
  if (input.name.trim().length < 2) {
    errors.name = 'Please enter your full name (at least 2 characters).';
  }
  if (isIntermediateGrade(input.gradeId) && input.streamId === 'general') {
    errors.streamId = 'Please select an Intermediate stream (MPC, BiPC, CEC, or MEC).';
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function computePlannerSummary(tasks: StudyTask[]) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const totalMinutes = tasks.reduce((sum, t) => sum + t.durationMinutes, 0);
  const completedMinutes = tasks
    .filter((t) => t.completed)
    .reduce((sum, t) => sum + t.durationMinutes, 0);

  return {
    totalTasks,
    completedTasks,
    totalMinutes,
    completedMinutes,
    remainingMinutes: Math.max(0, totalMinutes - completedMinutes),
  };
}
