import { Compass } from 'lucide-react';
import type { ActiveStudyContext, NavModuleId } from '../../types/studyverse';
import { resolveContextDetails } from '../../utils/curriculumHelpers';

interface ContextBreadcrumbBarProps {
  context: ActiveStudyContext;
  onNavigate: (module: NavModuleId) => void;
}

export function ContextBreadcrumbBar({ context, onNavigate }: ContextBreadcrumbBarProps) {
  const { cls, subject, chapter, topic } = resolveContextDetails(context);

  return (
    <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#5b5276] dark:text-[#b0a6cf] min-w-0">
        <span className="font-semibold text-[#6d28d9] dark:text-[#c4b5fd]">{cls.label}</span>
        <span aria-hidden="true">·</span>
        <span className="font-medium text-[#1b1430] dark:text-[#f3f0fc]">{subject.name}</span>
        <span aria-hidden="true">·</span>
        <span>
          Ch. {chapter.number}: {chapter.title}
        </span>
        <span aria-hidden="true">·</span>
        <span className="text-[#1b1430] dark:text-[#e9e4f8] font-medium truncate max-w-md">
          {topic.title}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onNavigate('explorer')}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[#f3effb] dark:bg-[#221a3a] text-[#5b21b6] dark:text-[#c4b5fd] hover:bg-[#ede9fe] dark:hover:bg-[#2d224d] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Compass className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Change Topic</span>
      </button>
    </div>
  );
}
