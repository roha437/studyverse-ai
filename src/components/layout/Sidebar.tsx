import { GraduationCap, LogOut, X } from 'lucide-react';
import type { NavModuleId, StudentProfile } from '../../types/studyverse';
import { getClassById } from '../../utils/curriculumHelpers';
import { NAV_GROUPS, NAV_ITEMS } from './navigationConfig';

interface SidebarProps {
  activeModule: NavModuleId;
  onSelectModule: (module: NavModuleId) => void;
  profile: StudentProfile;
  unreadNotificationsCount: number;
  onSignOutToAuth: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  activeModule,
  onSelectModule,
  profile,
  unreadNotificationsCount,
  onSignOutToAuth,
  mobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const activeClass = getClassById(profile.gradeId);

  const handleSelect = (id: NavModuleId) => {
    onSelectModule(id);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#19132b] border-r border-[#e5dff4] dark:border-[#2e244d]">
      <div className="px-5 py-4 flex items-center justify-between border-b border-[#efeaf9] dark:border-[#2a2147]">
        <button
          type="button"
          onClick={() => handleSelect('dashboard')}
          className="flex items-center gap-3 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6d28d9] rounded-lg"
        >
          <div className="w-8 h-8 rounded-xl bg-[#6d28d9] text-white flex items-center justify-center shrink-0 shadow-sm">
            <GraduationCap className="w-4 h-4" aria-hidden="true" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-[#1b1430] dark:text-[#f3f0fc] whitespace-nowrap">
            StudyVerse
          </span>
        </button>

        {onCloseMobile ? (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="lg:hidden p-2 rounded-xl text-[#5b5276] dark:text-[#b0a6cf] hover:bg-[#f3effb] dark:hover:bg-[#221a3a] cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <nav
        aria-label="Primary StudyVerse Navigation"
        className="flex-1 overflow-y-auto px-3 py-3 space-y-3.5"
      >
        {NAV_GROUPS.map((group) => {
          const items = NAV_ITEMS.filter((item) => item.group === group);
          return (
            <div key={group}>
              <div className="px-3 mb-1 text-[11px] font-semibold text-[#776d94] dark:text-[#968cb8]">
                {group}
              </div>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeModule === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(item.id)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`w-full flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                          isActive
                            ? 'bg-[#ede9fe] dark:bg-[#2c214f] text-[#5b21b6] dark:text-[#e9e4f8]'
                            : 'text-[#4c4366] dark:text-[#b0a6cf] hover:bg-[#f5f2ff] dark:hover:bg-[#221a3a] hover:text-[#1b1430] dark:hover:text-[#f3f0fc]'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isActive
                                ? 'text-[#6d28d9] dark:text-[#a78bfa]'
                                : 'text-[#776d94] dark:text-[#8f84b3]'
                            }`}
                            aria-hidden="true"
                          />
                          <span className="truncate">{item.shortTitle}</span>
                        </span>
                        {item.id === 'notifications' && unreadNotificationsCount > 0 ? (
                          <span className="text-xs font-mono-tabular font-semibold text-[#6d28d9] dark:text-[#c4b5fd]">
                            {unreadNotificationsCount}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[#efeaf9] dark:border-[#2a2147]">
        <div className="rounded-xl bg-[#f8f6fc] dark:bg-[#221a3a] p-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[#1b1430] dark:text-[#f3f0fc] truncate">
              {profile.name}
            </div>
            <div className="text-xs text-[#5b5276] dark:text-[#b0a6cf] truncate">
              {activeClass.label}
              {profile.streamId !== 'general' ? ` · ${profile.streamId.toUpperCase()}` : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={onSignOutToAuth}
            aria-label="Open authentication and onboarding screen"
            title="Switch account or onboarding"
            className="p-2 rounded-lg text-[#5b5276] dark:text-[#b0a6cf] hover:bg-white dark:hover:bg-[#2d224d] hover:text-[#6d28d9] transition-colors shrink-0 cursor-pointer"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {mobileOpen ? (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-[#1b1430]/40 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[82vw] h-full z-10">{sidebarContent}</div>
        </div>
      ) : null}
    </>
  );
}
