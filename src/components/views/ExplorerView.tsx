import { useMemo, useState } from 'react';
import {
  BookOpen,
  Bot,
  Calculator,
  CheckSquare,
  FileText,
  Search,
  Youtube,
} from 'lucide-react';
import { CURRICULUM_CLASSES, STREAM_OPTIONS } from '../../data/curriculum';
import type { ActiveStudyContext, GradeLevelId, NavModuleId, StreamId } from '../../types/studyverse';
import {
  filterCurriculumTopics,
  getAvailableSubjects,
  getClassById,
  isIntermediateGrade,
} from '../../utils/curriculumHelpers';

interface ExplorerViewProps {
  context: ActiveStudyContext;
  onUpdateContext: (next: ActiveStudyContext) => void;
  onNavigate: (module: NavModuleId) => void;
}

export function ExplorerView({ context, onUpdateContext, onNavigate }: ExplorerViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const selectedClass = getClassById(context.gradeId);
  const subjects = getAvailableSubjects(context.gradeId, context.streamId);
  const selectedSubject =
    subjects.find((s) => s.id === context.subjectId) ?? subjects[0] ?? selectedClass.subjects[0];
  const selectedChapter =
    selectedSubject.chapters.find((c) => c.id === context.chapterId) ?? selectedSubject.chapters[0];
  const selectedTopic =
    selectedChapter.topics.find((t) => t.id === context.topicId) ?? selectedChapter.topics[0];

  const searchHits = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return filterCurriculumTopics(CURRICULUM_CLASSES, searchQuery);
  }, [searchQuery]);

  const handleSelectGrade = (gradeId: GradeLevelId) => {
    const nextStream: StreamId = isIntermediateGrade(gradeId)
      ? context.streamId === 'general'
        ? 'mpc'
        : context.streamId
      : 'general';
    const nextSubjects = getAvailableSubjects(gradeId, nextStream);
    const subj = nextSubjects[0];
    const ch = subj.chapters[0];
    const top = ch.topics[0];
    onUpdateContext({
      gradeId,
      streamId: nextStream,
      subjectId: subj.id,
      chapterId: ch.id,
      topicId: top.id,
    });
  };

  const handleSelectStream = (streamId: StreamId) => {
    const nextSubjects = getAvailableSubjects(context.gradeId, streamId);
    const subj = nextSubjects[0];
    const ch = subj.chapters[0];
    const top = ch.topics[0];
    onUpdateContext({
      gradeId: context.gradeId,
      streamId,
      subjectId: subj.id,
      chapterId: ch.id,
      topicId: top.id,
    });
  };

  const handleSelectSubject = (subjectId: string) => {
    const subj = subjects.find((s) => s.id === subjectId) ?? subjects[0];
    const ch = subj.chapters[0];
    const top = ch.topics[0];
    onUpdateContext({
      ...context,
      subjectId: subj.id,
      chapterId: ch.id,
      topicId: top.id,
    });
  };

  const handleSelectChapter = (chapterId: string) => {
    const ch = selectedSubject.chapters.find((c) => c.id === chapterId) ?? selectedSubject.chapters[0];
    const top = ch.topics[0];
    onUpdateContext({
      ...context,
      chapterId: ch.id,
      topicId: top.id,
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#1b1430] dark:text-[#f3f0fc]">
              Browse Classes 5–10 & Intermediate
            </h2>
            <p className="text-xs text-[#5b5276] dark:text-[#b0a6cf]">
              Select a class, subject, chapter, and topic to launch any StudyVerse learning tool.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search
              className="w-4 h-4 text-[#776d94] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search chapters and topics across all classes"
              placeholder="Search topics, formulas, chapters..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc] focus:outline-none focus:ring-2 focus:ring-[#6d28d9]"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Class selector">
          {CURRICULUM_CLASSES.map((cls) => {
            const active = context.gradeId === cls.id;
            return (
              <button
                key={cls.id}
                type="button"
                onClick={() => handleSelectGrade(cls.id)}
                aria-pressed={active}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#6d28d9] text-white'
                    : 'bg-[#f3effb] dark:bg-[#221a3a] text-[#4c4366] dark:text-[#c4b5fd] hover:bg-[#ede9fe] dark:hover:bg-[#2c214f]'
                }`}
              >
                {cls.label}
              </button>
            );
          })}
        </div>

        {isIntermediateGrade(context.gradeId) ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-medium text-[#5b5276] dark:text-[#b0a6cf] mr-1">
              Stream:
            </span>
            {STREAM_OPTIONS.map((stream) => {
              const active = context.streamId === stream.id;
              return (
                <button
                  key={stream.id}
                  type="button"
                  onClick={() => handleSelectStream(stream.id)}
                  aria-pressed={active}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-[#ede9fe] dark:bg-[#322657] border-[#6d28d9] text-[#5b21b6] dark:text-[#f3f0fc]'
                      : 'border-[#e5dff4] dark:border-[#372a5c] text-[#5b5276] dark:text-[#b0a6cf]'
                  }`}
                >
                  {stream.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {searchQuery.trim() ? (
        <section className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5">
          <h3 className="font-display text-base font-bold text-[#1b1430] dark:text-[#f3f0fc] mb-3 tabular-nums">
            Search Results ({searchHits.length})
          </h3>
          {searchHits.length === 0 ? (
            <p className="text-sm text-[#5b5276] dark:text-[#b0a6cf]">
              No curriculum topics matched "{searchQuery}". Try searching "Quadratic", "Optics",
              "Calculus", or "Fractions".
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {searchHits.map((hit) => (
                <button
                  key={hit.topicId}
                  type="button"
                  onClick={() => {
                    onUpdateContext({
                      gradeId: hit.gradeId,
                      streamId: isIntermediateGrade(hit.gradeId) ? 'mpc' : 'general',
                      subjectId: hit.subjectId,
                      chapterId: hit.chapterId,
                      topicId: hit.topicId,
                    });
                    setSearchQuery('');
                  }}
                  className="text-left p-4 rounded-xl border border-[#e5dff4] dark:border-[#2e244d] bg-[#faf8ff] dark:bg-[#221a3a] hover:border-[#6d28d9] transition-colors cursor-pointer"
                >
                  <div className="text-xs text-[#6d28d9] dark:text-[#c4b5fd] font-medium">
                    {hit.gradeLabel} · {hit.subjectName} · {hit.chapterTitle}
                  </div>
                  <div className="mt-1 font-semibold text-sm text-[#1b1430] dark:text-[#f3f0fc]">
                    {hit.topicTitle}
                  </div>
                  <div className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf]">
                    {hit.topicSummary}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5">
            <h3 className="font-display text-sm font-bold text-[#1b1430] dark:text-[#f3f0fc] mb-3">
              1. Subjects in {selectedClass.label}
            </h3>
            <div className="space-y-2">
              {subjects.map((subj) => {
                const active = subj.id === selectedSubject.id;
                return (
                  <button
                    key={subj.id}
                    type="button"
                    onClick={() => handleSelectSubject(subj.id)}
                    className={`w-full text-left px-3.5 py-3 rounded-xl border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#ede9fe] dark:bg-[#2c214f] border-[#6d28d9] text-[#5b21b6] dark:text-[#f3f0fc]'
                        : 'bg-[#faf8ff] dark:bg-[#221a3a] border-[#e5dff4] dark:border-[#2e244d] text-[#1b1430] dark:text-[#e9e4f8]'
                    }`}
                  >
                    <div className="text-xs font-mono-tabular opacity-75">{subj.code}</div>
                    <div className="text-sm font-semibold">{subj.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5">
            <h3 className="font-display text-sm font-bold text-[#1b1430] dark:text-[#f3f0fc] mb-3">
              2. Chapters
            </h3>
            <div className="space-y-2">
              {selectedSubject.chapters.map((ch) => {
                const active = ch.id === selectedChapter.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => handleSelectChapter(ch.id)}
                    className={`w-full text-left px-3.5 py-3 rounded-xl border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#ede9fe] dark:bg-[#2c214f] border-[#6d28d9] text-[#5b21b6] dark:text-[#f3f0fc]'
                        : 'bg-[#faf8ff] dark:bg-[#221a3a] border-[#e5dff4] dark:border-[#2e244d] text-[#1b1430] dark:text-[#e9e4f8]'
                    }`}
                  >
                    <div className="text-xs text-[#776d94] dark:text-[#968cb8]">
                      Chapter {ch.number} · {ch.textbookUnit}
                    </div>
                    <div className="text-sm font-semibold mt-0.5">{ch.title}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5">
            <h3 className="font-display text-sm font-bold text-[#1b1430] dark:text-[#f3f0fc] mb-3">
              3. Topics in {selectedChapter.title}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedChapter.topics.map((topic) => {
                const active = topic.id === selectedTopic.id;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => onUpdateContext({ ...context, topicId: topic.id })}
                    className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#f5f2ff] dark:bg-[#2c214f] border-[#6d28d9]'
                        : 'bg-[#faf8ff] dark:bg-[#221a3a] border-[#e5dff4] dark:border-[#2e244d] hover:border-[#c4b5fd]'
                    }`}
                  >
                    <div className="text-xs text-[#5b5276] dark:text-[#b0a6cf] tabular-nums">
                      Est. {topic.estimatedMinutes} min
                      {topic.hasNumericals ? ' · Includes Numericals' : ''}
                    </div>
                    <div className="mt-1 font-semibold text-sm text-[#1b1430] dark:text-[#f3f0fc]">
                      {topic.title}
                    </div>
                    <p className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf] leading-relaxed">
                      {topic.summary}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6">
            <div className="text-xs font-medium text-[#6d28d9] dark:text-[#c4b5fd]">
              Selected Topic Workspace
            </div>
            <h3 className="mt-1 font-display text-xl font-bold text-[#1b1430] dark:text-[#f3f0fc]">
              {selectedTopic.title}
            </h3>
            <p className="mt-2 text-sm text-[#5b5276] dark:text-[#b0a6cf] leading-relaxed">
              {selectedTopic.summary}
            </p>

            {selectedTopic.keyFormula ? (
              <div className="mt-4 p-3.5 rounded-xl bg-[#f8f6fc] dark:bg-[#221a3a] border border-[#e5dff4] dark:border-[#372a5c]">
                <div className="text-xs font-medium text-[#776d94] dark:text-[#968cb8]">
                  Key Textbook Relation
                </div>
                <div className="mt-1 font-mono-tabular text-sm font-semibold text-[#1b1430] dark:text-[#f3f0fc]">
                  {selectedTopic.keyFormula}
                </div>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => onNavigate('lessons')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
              >
                <BookOpen className="w-4 h-4" aria-hidden="true" />
                <span>Open AI Lesson</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('notes')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-[#4c4366] dark:text-[#e9e4f8] hover:bg-[#ede9fe] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
              >
                <FileText className="w-4 h-4" aria-hidden="true" />
                <span>Generate Notes</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('aria')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-[#4c4366] dark:text-[#e9e4f8] hover:bg-[#ede9fe] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
              >
                <Bot className="w-4 h-4" aria-hidden="true" />
                <span>Ask AI Teacher Aria</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('quizzes')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-[#4c4366] dark:text-[#e9e4f8] hover:bg-[#ede9fe] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
              >
                <CheckSquare className="w-4 h-4" aria-hidden="true" />
                <span>Practice Quiz</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('numerical-lab')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-[#4c4366] dark:text-[#e9e4f8] hover:bg-[#ede9fe] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
              >
                <Calculator className="w-4 h-4" aria-hidden="true" />
                <span>Numerical Lab</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('youtube')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-[#4c4366] dark:text-[#e9e4f8] hover:bg-[#ede9fe] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
              >
                <Youtube className="w-4 h-4" aria-hidden="true" />
                <span>Find Videos</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
