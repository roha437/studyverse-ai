import { useState } from 'react';
import { Search, Youtube } from 'lucide-react';
import type { ActiveStudyContext, NavModuleId } from '../../types/studyverse';
import { resolveContextDetails } from '../../utils/curriculumHelpers';
import { ContextBreadcrumbBar } from '../common/ContextBreadcrumbBar';
import { IntegrationBanner } from '../common/IntegrationBanner';

interface YouTubeHubViewProps {
  context: ActiveStudyContext;
  onNavigate: (module: NavModuleId) => void;
}

export function YouTubeHubView({ context, onNavigate }: YouTubeHubViewProps) {
  const { cls, subject, topic } = resolveContextDetails(context);
  const [query, setQuery] = useState(`${cls.label} ${subject.name} ${topic.title}`);
  const [durationFilter, setDurationFilter] = useState<'any' | 'short' | 'medium' | 'long'>('any');
  const [searchTriggered, setSearchTriggered] = useState(false);

  return (
    <div className="space-y-6">
      <ContextBreadcrumbBar context={context} onNavigate={onNavigate} />

      <section className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#1b1430] dark:text-[#f3f0fc]">
              YouTube Learning Hub
            </h2>
            <p className="text-xs text-[#5b5276] dark:text-[#b0a6cf]">
              Distraction-free lecture discovery filtered by class, subject, and concept duration.
            </p>
          </div>
          <Youtube className="w-6 h-6 text-[#6d28d9] dark:text-[#a78bfa] shrink-0" aria-hidden="true" />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearchTriggered(true);
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-[#776d94] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search curriculum video lectures"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc] focus:outline-none focus:ring-2 focus:ring-[#6d28d9]"
            />
          </div>

          <select
            aria-label="Filter lecture duration"
            value={durationFilter}
            onChange={(e) =>
              setDurationFilter(e.target.value as 'any' | 'short' | 'medium' | 'long')
            }
            className="px-3.5 py-2.5 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#faf8ff] dark:bg-[#221a3a] text-sm text-[#1b1430] dark:text-[#f3f0fc]"
          >
            <option value="any">Any Duration</option>
            <option value="short">Under 10 min (Quick Concept)</option>
            <option value="medium">10–30 min (Full Topic)</option>
            <option value="long">30+ min (One-Shot Revision)</option>
          </select>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Search Lectures
          </button>
        </form>
      </section>

      <IntegrationBanner
        serviceName="YouTube Data API"
        title={
          searchTriggered
            ? `Lecture query prepared: "${query}" (${durationFilter})`
            : 'StudyVerse Curated Video Library'
        }
        description="Search verified educational playlists and chapter lectures matching your selected class and duration filter—designed to keep your study session free from distractions."
        onNavigate={onNavigate}
      />
    </div>
  );
}
