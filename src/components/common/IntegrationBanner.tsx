import { ArrowRight, Sparkles } from 'lucide-react';
import type { NavModuleId } from '../../types/studyverse';

interface IntegrationBannerProps {
  serviceName: 'Gemini API' | 'Supabase' | 'YouTube Data API' | 'GitHub';
  title: string;
  description: string;
  onNavigate?: (module: NavModuleId) => void;
  compact?: boolean;
  stacked?: boolean;
}

const FRIENDLY_CATEGORY_LABEL: Record<IntegrationBannerProps['serviceName'], string> = {
  'Gemini API': 'StudyVerse AI Companion',
  Supabase: 'StudyVerse Cloud Sync',
  'YouTube Data API': 'StudyVerse Video Library',
  GitHub: 'StudyVerse Workspace',
};

export function IntegrationBanner({
  serviceName,
  title,
  description,
  onNavigate,
  compact = false,
  stacked = false,
}: IntegrationBannerProps) {
  return (
    <div
      className={`rounded-2xl border border-[#ddd6fe] dark:border-[#372a5c] bg-[#f5f2ff] dark:bg-[#21183d] ${
        compact ? 'p-4' : 'p-5'
      } flex flex-col ${
        stacked ? 'items-start' : 'sm:flex-row sm:items-center justify-between'
      } gap-4`}
    >
      <div className="flex items-start gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#2b204d] border border-[#e5dff4] dark:border-[#3e3166] flex items-center justify-center shrink-0 text-[#6d28d9] dark:text-[#a78bfa]">
          <Sparkles className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-[#6d28d9] dark:text-[#c4b5fd] mb-0.5">
            {FRIENDLY_CATEGORY_LABEL[serviceName]}
          </div>
          <h3 className="text-sm font-semibold text-[#1b1430] dark:text-[#f3f0fc]">{title}</h3>
          <p className="text-sm text-[#5b5276] dark:text-[#b0a6cf] mt-1 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {onNavigate ? (
        <button
          type="button"
          onClick={() => onNavigate('settings')}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-[#2b204d] text-[#5b21b6] dark:text-[#ddd6fe] border border-[#ddd6fe] dark:border-[#3e3166] hover:bg-[#ede9fe] dark:hover:bg-[#35285e] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            stacked ? 'w-full' : ''
          }`}
        >
          <span>Account &amp; Settings</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

