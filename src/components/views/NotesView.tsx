import { useState } from 'react';
import { FileText, Sparkles } from 'lucide-react';
import type { ActiveStudyContext, NavModuleId } from '../../types/studyverse';
import { resolveContextDetails } from '../../utils/curriculumHelpers';
import { ContextBreadcrumbBar } from '../common/ContextBreadcrumbBar';
import { IntegrationBanner } from '../common/IntegrationBanner';

interface NotesViewProps {
  context: ActiveStudyContext;
  onNavigate: (module: NavModuleId) => void;
}

type NoteFormat = 'summary' | 'formulas' | 'qa' | 'mindmap';

export function NotesView({ context, onNavigate }: NotesViewProps) {
  const { cls, subject, chapter, topic } = resolveContextDetails(context);
  const [noteFormat, setNoteFormat] = useState<NoteFormat>('summary');
  const [customFocus, setCustomFocus] = useState('');
  const [generationRequested, setGenerationRequested] = useState(false);

  return (
    <div className="space-y-6">
      <ContextBreadcrumbBar context={context} onNavigate={onNavigate} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold text-[#1b1430] dark:text-[#f3f0fc]">
              AI Notes Generator
            </h2>
            <p className="mt-1 text-xs text-[#5b5276] dark:text-[#b0a6cf]">
              Configure study notes for {cls.label} · {subject.name}
            </p>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf]">
              Note Format
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              {(
                [
                  { id: 'summary', label: 'Concise Summary' },
                  { id: 'formulas', label: 'Formula Sheet' },
                  { id: 'qa', label: 'Exam Q&A' },
                  { id: 'mindmap', label: 'Concept Outline' },
                ] as const
              ).map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setNoteFormat(fmt.id)}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                    noteFormat === fmt.id
                      ? 'bg-[#ede9fe] dark:bg-[#2c214f] border-[#6d28d9] text-[#5b21b6] dark:text-[#f3f0fc]'
                      : 'bg-[#faf8ff] dark:bg-[#221a3a] border-[#e5dff4] dark:border-[#2e244d] text-[#4c4366] dark:text-[#b0a6cf]'
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="sv-notes-focus"
              className="block text-xs font-semibold text-[#5b5276] dark:text-[#b0a6cf] mb-1.5"
            >
              Optional Emphasis or Textbook Section
            </label>
            <textarea
              id="sv-notes-focus"
              rows={3}
              value={customFocus}
              onChange={(e) => setCustomFocus(e.target.value)}
              placeholder={`e.g. Highlight key definitions and derivations for ${topic.title}`}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc] focus:outline-none focus:ring-2 focus:ring-[#6d28d9]"
            />
          </div>

          <button
            type="button"
            onClick={() => setGenerationRequested(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>Prepare Study Notes</span>
          </button>
        </section>

        <section className="lg:col-span-7 rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center justify-between gap-3 border-b border-[#efeaf9] dark:border-[#2a2147] pb-4">
              <div>
                <div className="text-xs font-medium text-[#6d28d9] dark:text-[#c4b5fd]">
                  Notes Viewer · {noteFormat.toUpperCase()}
                </div>
                <h3 className="mt-1 font-display text-lg font-bold text-[#1b1430] dark:text-[#f3f0fc]">
                  {chapter.title}: {topic.title}
                </h3>
              </div>
              <FileText className="w-5 h-5 text-[#6d28d9] dark:text-[#a78bfa]" aria-hidden="true" />
            </div>

            <div className="mt-4 space-y-3 text-sm text-[#5b5276] dark:text-[#b0a6cf]">
              <div className="p-4 rounded-xl bg-[#faf8ff] dark:bg-[#221a3a] border border-[#efeaf9] dark:border-[#2e244d]">
                <div className="font-semibold text-[#1b1430] dark:text-[#f3f0fc]">
                  Textbook Topic Scope
                </div>
                <p className="mt-1 leading-relaxed">{topic.summary}</p>
                {topic.keyFormula ? (
                  <div className="mt-2 font-mono-tabular text-xs font-semibold text-[#5b21b6] dark:text-[#c4b5fd]">
                    Reference Formula: {topic.keyFormula}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <IntegrationBanner
            serviceName="Gemini API"
            title={
              generationRequested
                ? `Notes generation queued for "${topic.title}"`
                : 'AI Notes Viewer & Supabase Storage Ready'
            }
            description="Once Gemini API and Supabase are connected, generated markdown notes, formula sheets, and revision highlights will render and save directly inside this viewer."
            onNavigate={onNavigate}
          />
        </section>
      </div>
    </div>
  );
}
