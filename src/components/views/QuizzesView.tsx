import { useState } from 'react';
import { CheckSquare, Play } from 'lucide-react';
import type { ActiveStudyContext, NavModuleId } from '../../types/studyverse';
import { resolveContextDetails } from '../../utils/curriculumHelpers';
import { ContextBreadcrumbBar } from '../common/ContextBreadcrumbBar';
import { IntegrationBanner } from '../common/IntegrationBanner';

interface QuizzesViewProps {
  context: ActiveStudyContext;
  onNavigate: (module: NavModuleId) => void;
}

export function QuizzesView({ context, onNavigate }: QuizzesViewProps) {
  const { cls, subject, chapter, topic } = resolveContextDetails(context);
  const [assessmentType, setAssessmentType] = useState<'practice' | 'chapter-test' | 'timed'>(
    'practice'
  );
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<'Foundation' | 'Board Standard' | 'Challenge'>(
    'Board Standard'
  );
  const [requested, setRequested] = useState(false);

  return (
    <div className="space-y-6">
      <ContextBreadcrumbBar context={context} onNavigate={onNavigate} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold text-[#1b1430] dark:text-[#f3f0fc]">
              Quiz & Test Builder
            </h2>
            <p className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf]">
              {cls.label} · {subject.name} · {chapter.title}
            </p>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf]">
              Assessment Mode
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'practice', label: 'Topic Practice' },
                  { id: 'chapter-test', label: 'Chapter Test' },
                  { id: 'timed', label: 'Timed Mock' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAssessmentType(item.id)}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                    assessmentType === item.id
                      ? 'bg-[#ede9fe] dark:bg-[#2c214f] border-[#6d28d9] text-[#5b21b6] dark:text-[#f3f0fc]'
                      : 'bg-[#faf8ff] dark:bg-[#221a3a] border-[#e5dff4] dark:border-[#2e244d] text-[#4c4366] dark:text-[#b0a6cf]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="sv-quiz-count"
                className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
              >
                Question Count
              </label>
              <select
                id="sv-quiz-count"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc] tabular-nums"
              >
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
                <option value={15}>15 Questions</option>
                <option value={25}>25 Questions</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="sv-quiz-difficulty"
                className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
              >
                Difficulty Tier
              </label>
              <select
                id="sv-quiz-difficulty"
                value={difficulty}
                onChange={(e) =>
                  setDifficulty(
                    e.target.value as 'Foundation' | 'Board Standard' | 'Challenge'
                  )
                }
                className="w-full px-3 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc]"
              >
                <option value="Foundation">Foundation</option>
                <option value="Board Standard">Board Standard</option>
                <option value="Challenge">Challenge</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setRequested(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            <Play className="w-4 h-4" aria-hidden="true" />
            <span>Prepare {questionCount}-Question Set</span>
          </button>
        </section>

        <section className="lg:col-span-7 rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-5">
          <div className="flex items-start justify-between gap-4 border-b border-[#efeaf9] dark:border-[#2a2147] pb-4">
            <div>
              <div className="text-xs font-medium text-[#6d28d9] dark:text-[#c4b5fd]">
                Assessment Blueprint
              </div>
              <h3 className="mt-1 font-display text-lg font-bold text-[#1b1430] dark:text-[#f3f0fc]">
                {topic.title} ({difficulty})
              </h3>
            </div>
            <CheckSquare className="w-5 h-5 text-[#6d28d9] dark:text-[#a78bfa]" aria-hidden="true" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-[#faf8ff] dark:bg-[#221a3a] border border-[#efeaf9] dark:border-[#2e244d]">
              <div className="text-xs text-[#776d94] dark:text-[#968cb8]">Mode</div>
              <div className="mt-1 text-sm font-semibold text-[#1b1430] dark:text-[#f3f0fc] capitalize">
                {assessmentType.replace('-', ' ')}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#faf8ff] dark:bg-[#221a3a] border border-[#efeaf9] dark:border-[#2e244d]">
              <div className="text-xs text-[#776d94] dark:text-[#968cb8]">Target Items</div>
              <div className="mt-1 text-sm font-semibold text-[#1b1430] dark:text-[#f3f0fc] tabular-nums">
                {questionCount} MCQs & Short Answers
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#faf8ff] dark:bg-[#221a3a] border border-[#efeaf9] dark:border-[#2e244d]">
              <div className="text-xs text-[#776d94] dark:text-[#968cb8]">Result Sync</div>
              <div className="mt-1 text-sm font-semibold text-[#1b1430] dark:text-[#f3f0fc]">
                Supabase Ready
              </div>
            </div>
          </div>

          <IntegrationBanner
            serviceName="Gemini API"
            title={
              requested
                ? `Quiz blueprint ready for ${topic.title}`
                : 'Dynamic Quiz & Practice Engine Ready'
            }
            description="Connect Gemini API to generate fresh textbook-grounded questions with detailed answer rationales, and connect Supabase to store score history."
            onNavigate={onNavigate}
          />
        </section>
      </div>
    </div>
  );
}
