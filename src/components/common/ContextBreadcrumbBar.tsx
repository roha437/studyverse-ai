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
    <div className="rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#6b6684] dark:text-[#b0a6cf] min-w-0">
        <span className="font-semibold text-[#5a45c8] dark:text-[#c4b5fd]">{cls.label}</span>
        <span aria-hidden="true">·</span>
        <span className="font-medium text-[#1b1831] dark:text-[#f3f0fc]">{subject.name}</span>
        <span aria-hidden="true">·</span>
        <span>
          Ch. {chapter.number}: {chapter.title}
        </span>
        <span aria-hidden="true">·</span>
        <span className="text-[#1b1831] dark:text-[#e9e4f8] font-medium truncate max-w-md">
          {topic.title}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onNavigate('explorer')}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[#f0ebff] dark:bg-[#221a3a] text-[#442cb2] dark:text-[#c4b5fd] hover:bg-[#e5deff] dark:hover:bg-[#2d224d] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Compass className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Change Topic</span>
      </button>
    </div>
  );
}
