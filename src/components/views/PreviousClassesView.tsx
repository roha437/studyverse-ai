import { useState } from 'react';
import { ArrowUpRight, History } from 'lucide-react';
import { CURRICULUM_CLASSES } from '../../data/curriculum';
import type { ActiveStudyContext, GradeLevelId, NavModuleId } from '../../types/studyverse';
import { getClassById, getPreviousClassesForGrade, isIntermediateGrade } from '../../utils/curriculumHelpers';

interface PreviousClassesViewProps {
  studentGradeId: GradeLevelId;
  onLaunchTopic: (next: ActiveStudyContext, target: NavModuleId) => void;
}

export function PreviousClassesView({ studentGradeId, onLaunchTopic }: PreviousClassesViewProps) {
  const [showAllClasses, setShowAllClasses] = useState(false);
  const currentClass = getClassById(studentGradeId);
  const lowerClasses = getPreviousClassesForGrade(studentGradeId);
  const classesToDisplay = showAllClasses ? CURRICULUM_CLASSES : lowerClasses;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-[#5a45c8] dark:text-[#c4b5fd]">
            Foundational Bridge Library
          </div>
          <h2 className="mt-1 font-display text-xl font-bold text-[#1b1831] dark:text-[#f3f0fc]">
            Previous Classes Learning Library
          </h2>
          <p className="mt-1 text-sm text-[#6b6684] dark:text-[#b0a6cf] max-w-2xl">
            Revisit prerequisite chapters from grades earlier than {currentClass.label} to strengthen
            core formulas and definitions before tackling advanced board topics.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAllClasses((prev) => !prev)}
          className="px-4 py-2 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#f7f5ff] dark:bg-[#221a3a] text-xs font-semibold text-[#442cb2] dark:text-[#c4b5fd] hover:bg-[#e5deff] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {showAllClasses ? `Show Grades Below ${currentClass.shortLabel}` : 'Browse All Grades (5–12)'}
        </button>
      </div>

      {classesToDisplay.length === 0 ? (
        <div className="rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-8 text-center">
          <History className="w-8 h-8 text-[#5a45c8] dark:text-[#a78bfa] mx-auto mb-3" aria-hidden="true" />
          <h3 className="font-display text-base font-bold text-[#1b1831] dark:text-[#f3f0fc]">
            You are currently in Class 5
          </h3>
          <p className="mt-1 text-sm text-[#6b6684] dark:text-[#b0a6cf] max-w-md mx-auto">
            Class 5 is the starting grade in StudyVerse. Switch to "Browse All Grades" above if you
            would like to preview higher classes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {classesToDisplay.map((cls) => (
            <section
              key={cls.id}
              className="rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="text-xs font-medium text-[#5a45c8] dark:text-[#c4b5fd]">
                  Foundation Archive · {cls.subjects.length} subjects
                </div>
                <h3 className="mt-1 font-display text-lg font-bold text-[#1b1831] dark:text-[#f3f0fc]">
                  {cls.label}
                </h3>
                <p className="mt-1 text-xs text-[#6b6684] dark:text-[#b0a6cf] leading-relaxed">
                  {cls.description}
                </p>

                <div className="mt-4 space-y-2.5">
                  {cls.subjects.slice(0, 3).map((subj) => {
                    const firstChapter = subj.chapters[0];
                    const firstTopic = firstChapter?.topics[0];
                    if (!firstChapter || !firstTopic) return null;
                    return (
                      <div
                        key={subj.id}
                        className="p-3 rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] border border-[#ece6ff] dark:border-[#2e244d] flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[#1b1831] dark:text-[#f3f0fc] truncate">
                            {subj.name} — {firstChapter.title}
                          </div>
                          <div className="text-xs text-[#6b6684] dark:text-[#b0a6cf] truncate">
                            {firstTopic.title}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onLaunchTopic(
                              {
                                gradeId: cls.id,
                                streamId: isIntermediateGrade(cls.id) ? 'mpc' : 'general',
                                subjectId: subj.id,
                                chapterId: firstChapter.id,
                                topicId: firstTopic.id,
                              },
                              'lessons'
                            )
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-[#2c214f] border border-[#e5deff] dark:border-[#3e3166] text-xs font-semibold text-[#442cb2] dark:text-[#ddd6fe] hover:bg-[#e5deff] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <span>Revise</span>
                          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
