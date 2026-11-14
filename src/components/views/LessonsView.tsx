import { useState } from 'react';
import { BookOpen, Sparkles } from 'lucide-react';
import type { ActiveStudyContext, NavModuleId } from '../../types/studyverse';
import { resolveContextDetails } from '../../utils/curriculumHelpers';
import { ContextBreadcrumbBar } from '../common/ContextBreadcrumbBar';
import { IntegrationBanner } from '../common/IntegrationBanner';

interface LessonsViewProps {
  context: ActiveStudyContext;
  onNavigate: (module: NavModuleId) => void;
}

type LessonDepth = 'overview' | 'walkthrough' | 'exam';

export function LessonsView({ context, onNavigate }: LessonsViewProps) {
  const { cls, subject, chapter, topic } = resolveContextDetails(context);
  const [depth, setDepth] = useState<LessonDepth>('walkthrough');
  const [requestedTopicId, setRequestedTopicId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <ContextBreadcrumbBar context={context} onNavigate={onNavigate} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-4 rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-5 space-y-5">
          <div>
            <h2 className="font-display text-base font-bold text-[#1b1430] dark:text-[#f3f0fc]">
              Lesson Configuration
            </h2>
            <p className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf]">
              Aligned to {cls.label} · {subject.name} · {chapter.textbookUnit}
            </p>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf]">
              Teaching Depth
            </span>
            {(
              [
                { id: 'overview', label: 'Concept Overview', hint: 'Quick 10-min clarity' },
                {
                  id: 'walkthrough',
                  label: 'Textbook Walkthrough',
                  hint: 'Full definitions & examples',
                },
                { id: 'exam', label: 'Board Exam Revision', hint: 'Key proofs & marking points' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDepth(opt.id)}
                className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                  depth === opt.id
                    ? 'bg-[#ede9fe] dark:bg-[#2c214f] border-[#6d28d9] text-[#5b21b6] dark:text-[#f3f0fc]'
                    : 'bg-[#faf8ff] dark:bg-[#221a3a] border-[#e5dff4] dark:border-[#2e244d] text-[#1b1430] dark:text-[#e9e4f8]'
                }`}
              >
                <div className="text-sm font-semibold">{opt.label}</div>
                <div className="text-xs opacity-80">{opt.hint}</div>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setRequestedTopicId(topic.id)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>Generate Textbook Lesson</span>
          </button>
        </section>

        <section className="lg:col-span-8 rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-5">
          <div className="flex items-start justify-between gap-4 border-b border-[#efeaf9] dark:border-[#2a2147] pb-4">
            <div>
              <div className="text-xs font-medium text-[#6d28d9] dark:text-[#c4b5fd]">
                Chapter {chapter.number}: {chapter.title}
              </div>
              <h3 className="mt-1 font-display text-xl font-bold text-[#1b1430] dark:text-[#f3f0fc]">
                {topic.title}
              </h3>
              <p className="mt-1.5 text-sm text-[#5b5276] dark:text-[#b0a6cf]">{topic.summary}</p>
            </div>
            <BookOpen className="w-6 h-6 text-[#6d28d9] dark:text-[#a78bfa] shrink-0" aria-hidden="true" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-[#faf8ff] dark:bg-[#221a3a] border border-[#efeaf9] dark:border-[#2e244d]">
              <div className="text-xs font-semibold text-[#6d28d9] dark:text-[#c4b5fd]">
                01. Core Concept
              </div>
              <p className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf]">
                Textbook-grounded explanation tailored for {cls.label} comprehension.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#faf8ff] dark:bg-[#221a3a] border border-[#efeaf9] dark:border-[#2e244d]">
              <div className="text-xs font-semibold text-[#6d28d9] dark:text-[#c4b5fd]">
                02. Worked Example
              </div>
              <p className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf]">
                Step-by-step derivation and formula application with unit checks.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#faf8ff] dark:bg-[#221a3a] border border-[#efeaf9] dark:border-[#2e244d]">
              <div className="text-xs font-semibold text-[#6d28d9] dark:text-[#c4b5fd]">
                03. Exam Checkpoint
              </div>
              <p className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf]">
                Common mistakes and quick self-check questions before moving on.
              </p>
            </div>
          </div>

          {requestedTopicId === topic.id ? (
            <IntegrationBanner
              serviceName="Gemini API"
              title={`Ready to generate "${topic.title}" (${depth} mode)`}
              description="Live AI lesson generation is disabled until your Gemini API key is configured on the server. No synthetic AI lesson text is fabricated in foundation mode."
              onNavigate={onNavigate}
            />
          ) : (
            <IntegrationBanner
              serviceName="Gemini API"
              title="Textbook AI Lesson Engine Ready"
              description="Click 'Generate Textbook Lesson' or connect your Gemini API key to stream structured, textbook-aligned lessons for any class and chapter."
              onNavigate={onNavigate}
            />
          )}
        </section>
      </div>
    </div>
  );
}
