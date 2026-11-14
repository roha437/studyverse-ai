import { useState } from 'react';
import { Send } from 'lucide-react';
import type { ActiveStudyContext, NavModuleId } from '../../types/studyverse';
import { resolveContextDetails } from '../../utils/curriculumHelpers';
import { ContextBreadcrumbBar } from '../common/ContextBreadcrumbBar';
import { ImageWithFallback } from '../common/ImageWithFallback';
import { IntegrationBanner } from '../common/IntegrationBanner';

interface AriaTeacherViewProps {
  context: ActiveStudyContext;
  onNavigate: (module: NavModuleId) => void;
}

type TeachingStyle = 'socratic' | 'step-by-step' | 'exam-coach';

interface QueuedQuestion {
  id: string;
  question: string;
  mode: TeachingStyle;
}

export function AriaTeacherView({ context, onNavigate }: AriaTeacherViewProps) {
  const { cls, subject, chapter, topic } = resolveContextDetails(context);
  const [teachingStyle, setTeachingStyle] = useState<TeachingStyle>('step-by-step');
  const [promptInput, setPromptInput] = useState('');
  const [submittedPrompts, setSubmittedPrompts] = useState<QueuedQuestion[]>([]);

  const starterPrompts = [
    `Explain ${topic.title} using a simple real-life example.`,
    `What common exam mistakes happen in ${chapter.title}?`,
    `Walk me through one solved problem from ${topic.title}.`,
  ];

  const handleAsk = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSubmittedPrompts((prev) => [
      ...prev,
      { id: String(Date.now()), question: trimmed, mode: teachingStyle },
    ]);
    setPromptInput('');
  };

  return (
    <div className="space-y-6">
      <ContextBreadcrumbBar context={context} onNavigate={onNavigate} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-4 rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-[#e5dff4] dark:border-[#372a5c] shrink-0">
              <ImageWithFallback
                src="/src/assets/images/aria_mentor_avatar_1794676730537.jpg"
                alt="AI Teacher Aria portrait illustration"
                className="w-full h-full object-cover"
                fallbackTitle="Aria"
              />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-[#1b1430] dark:text-[#f3f0fc]">
                Aria · AI Mentor
              </h2>
              <p className="text-xs text-[#5b5276] dark:text-[#b0a6cf]">
                Tuned for {cls.label} · {subject.name}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf]">
              Tutoring Mode
            </span>
            {(
              [
                {
                  id: 'step-by-step',
                  label: 'Step-by-Step',
                  desc: 'Clear textbook derivations & examples',
                },
                {
                  id: 'socratic',
                  label: 'Socratic Guide',
                  desc: 'Hints & guiding questions first',
                },
                {
                  id: 'exam-coach',
                  label: 'Exam Coach',
                  desc: 'Marking scheme & board presentation',
                },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setTeachingStyle(mode.id)}
                className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                  teachingStyle === mode.id
                    ? 'bg-[#ede9fe] dark:bg-[#2c214f] border-[#6d28d9] text-[#5b21b6] dark:text-[#f3f0fc]'
                    : 'bg-[#faf8ff] dark:bg-[#221a3a] border-[#e5dff4] dark:border-[#2e244d] text-[#1b1430] dark:text-[#e9e4f8]'
                }`}
              >
                <div className="text-sm font-semibold">{mode.label}</div>
                <div className="text-xs opacity-80">{mode.desc}</div>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf]">
              Suggested Questions
            </span>
            {starterPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setPromptInput(prompt)}
                className="w-full text-left p-3 rounded-xl bg-[#f8f6fc] dark:bg-[#221a3a] hover:bg-[#ede9fe] dark:hover:bg-[#2c214f] text-xs text-[#4c4366] dark:text-[#d8d0f2] transition-colors cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        </aside>

        <section className="lg:col-span-8 rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 flex flex-col justify-between min-h-[460px] gap-5">
          <div className="space-y-4">
            <div className="border-b border-[#efeaf9] dark:border-[#2a2147] pb-4">
              <div className="text-xs font-medium text-[#6d28d9] dark:text-[#c4b5fd]">
                Active Syllabus Context
              </div>
              <h3 className="mt-1 font-display text-lg font-bold text-[#1b1430] dark:text-[#f3f0fc]">
                Discussing {topic.title} ({chapter.title})
              </h3>
            </div>

            {submittedPrompts.length === 0 ? (
              <IntegrationBanner
                serviceName="Gemini API"
                title="AI Teacher Aria Conversational Workspace"
                description="Ask any syllabus question below or pick a starter prompt. Live responses from Aria require connecting your server-side Gemini API key; no mock AI chat replies are simulated."
                onNavigate={onNavigate}
              />
            ) : (
              <div className="space-y-4">
                {submittedPrompts.map((item) => (
                  <div key={item.id} className="space-y-2">
                    <div className="ml-auto max-w-xl rounded-2xl bg-[#6d28d9] text-white px-4 py-3 text-sm">
                      {item.question}
                    </div>
                    <div className="max-w-xl rounded-2xl bg-[#f5f2ff] dark:bg-[#221a3a] border border-[#ddd6fe] dark:border-[#372a5c] px-4 py-3 text-xs text-[#4c4366] dark:text-[#c4b5fd]">
                      Gemini API not connected yet ({item.mode} mode). Once configured, Aria will
                      answer this question grounded in {cls.label} {subject.name}.
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk(promptInput);
            }}
            className="flex items-center gap-2.5 pt-3 border-t border-[#efeaf9] dark:border-[#2a2147]"
          >
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              aria-label="Ask AI Teacher Aria a question"
              placeholder={`Ask Aria about ${topic.title}...`}
              className="flex-1 px-4 py-3 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc] focus:outline-none focus:ring-2 focus:ring-[#6d28d9]"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Ask Aria</span>
              <Send className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
