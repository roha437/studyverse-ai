import { useState } from 'react';
import { BookMarked, Compass } from 'lucide-react';
import type { NavModuleId } from '../../types/studyverse';
import { IntegrationBanner } from '../common/IntegrationBanner';

interface PersonalLibraryViewProps {
  onNavigate: (module: NavModuleId) => void;
}

type LibraryTab = 'lessons' | 'notes' | 'videos' | 'numericals';

export function PersonalLibraryView({ onNavigate }: PersonalLibraryViewProps) {
  const [activeTab, setActiveTab] = useState<LibraryTab>('lessons');

  const tabs: { id: LibraryTab; label: string; emptyCopy: string; actionModule: NavModuleId; actionLabel: string }[] = [
    {
      id: 'lessons',
      label: 'Saved Lessons',
      emptyCopy: 'Textbook AI lessons you bookmark will appear here once Supabase storage is connected.',
      actionModule: 'lessons',
      actionLabel: 'Open AI Lessons',
    },
    {
      id: 'notes',
      label: 'Generated Notes',
      emptyCopy: 'Study summaries, formula sheets, and revision notes generated via Gemini will save here.',
      actionModule: 'notes',
      actionLabel: 'Open Notes Studio',
    },
    {
      id: 'videos',
      label: 'Bookmarked Videos',
      emptyCopy: 'Curated YouTube lectures saved from the Learning Hub will organize by subject here.',
      actionModule: 'youtube',
      actionLabel: 'Open YouTube Hub',
    },
    {
      id: 'numericals',
      label: 'Solved Numericals',
      emptyCopy: 'Verified step-by-step physics, chemistry, and math solutions will archive here.',
      actionModule: 'numerical-lab',
      actionLabel: 'Open Numerical Lab',
    },
  ];

  const currentTab = tabs.find((t) => t.id === activeTab) ?? tabs[0];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#1b1430] dark:text-[#f3f0fc]">
              Personal Learning Library
            </h2>
            <p className="text-xs text-[#5b5276] dark:text-[#b0a6cf]">
              Central archive for saved textbook lessons, AI notes, lectures, and solved problems.
            </p>
          </div>
          <BookMarked className="w-6 h-6 text-[#6d28d9] dark:text-[#a78bfa] shrink-0" aria-hidden="true" />
        </div>

        <div
          className="inline-flex flex-wrap gap-1.5 p-1 rounded-xl bg-[#f3effb] dark:bg-[#221a3a] border border-[#e5dff4] dark:border-[#2e244d]"
          role="tablist"
          aria-label="Library categories"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-[#322657] text-[#5b21b6] dark:text-[#f3f0fc] shadow-xs'
                  : 'text-[#5b5276] dark:text-[#b0a6cf]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-dashed border-[#d8cff2] dark:border-[#3b2e63] bg-[#faf8ff] dark:bg-[#221a3a] p-8 text-center">
          <h3 className="font-display text-base font-bold text-[#1b1430] dark:text-[#f3f0fc]">
            No {currentTab.label} Saved Yet
          </h3>
          <p className="mt-1.5 text-sm text-[#5b5276] dark:text-[#b0a6cf] max-w-lg mx-auto">
            {currentTab.emptyCopy}
          </p>
          <button
            type="button"
            onClick={() => onNavigate(currentTab.actionModule)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            <Compass className="w-4 h-4" aria-hidden="true" />
            <span>{currentTab.actionLabel}</span>
          </button>
        </div>
      </div>

      <IntegrationBanner
        serviceName="Supabase"
        title="Personal Library Sync Ready"
        description="Connect Supabase Postgres and Storage to persist your bookmarked lessons, generated PDF/Markdown notes, and solved numerical history."
        onNavigate={onNavigate}
        compact
      />
    </div>
  );
}
