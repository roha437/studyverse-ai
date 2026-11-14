import { Bell, Menu, Moon, Sun, UserCheck } from 'lucide-react';
import type { NavModuleId, StudentProfile, UserRole } from '../../types/studyverse';
import { getClassById } from '../../utils/curriculumHelpers';
import { getNavItemMeta } from './navigationConfig';

interface TopBarProps {
  activeModule: NavModuleId;
  profile: StudentProfile;
  role: UserRole;
  onToggleRole: (nextRole: UserRole) => void;
  onSelectModule: (module: NavModuleId) => void;
  onOpenMobileNav: () => void;
  unreadCount: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export function TopBar({
  activeModule,
  profile,
  role,
  onToggleRole,
  onSelectModule,
  onOpenMobileNav,
  unreadCount,
  darkMode,
  onToggleDarkMode,
}: TopBarProps) {
  const meta = getNavItemMeta(activeModule);
  const currentClass = getClassById(profile.gradeId);

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#19132b]/95 backdrop-blur-sm border-b border-[#e5dff4] dark:border-[#2e244d] px-4 sm:px-6 lg:px-8 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label="Open navigation menu"
            className="lg:hidden p-2 rounded-xl border border-[#e5dff4] dark:border-[#2e244d] text-[#4c4366] dark:text-[#c4b5fd] hover:bg-[#f3effb] dark:hover:bg-[#221a3a] cursor-pointer shrink-0"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>

          <div className="min-w-0">
            <h1 className="font-display text-lg sm:text-xl font-bold text-[#1b1430] dark:text-[#f3f0fc] truncate">
              {meta.label}
            </h1>
            <div className="text-xs text-[#5b5276] dark:text-[#b0a6cf] truncate">
              {currentClass.label}
              {profile.streamId !== 'general' ? ` · ${profile.streamId.toUpperCase()}` : ''}
              {' · '}
              {profile.board}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div
            className="hidden sm:flex items-center p-1 rounded-xl bg-[#f3effb] dark:bg-[#221a3a] border border-[#e5dff4] dark:border-[#2e244d]"
            role="group"
            aria-label="Perspective switcher"
          >
            <button
              type="button"
              onClick={() => {
                onToggleRole('student');
                if (activeModule === 'parent-dashboard') {
                  onSelectModule('dashboard');
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                role === 'student'
                  ? 'bg-white dark:bg-[#322657] text-[#5b21b6] dark:text-[#f3f0fc] shadow-xs'
                  : 'text-[#5b5276] dark:text-[#b0a6cf] hover:text-[#1b1430] dark:hover:text-[#f3f0fc]'
              }`}
            >
              Student View
            </button>
            <button
              type="button"
              onClick={() => {
                onToggleRole('parent');
                onSelectModule('parent-dashboard');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                role === 'parent'
                  ? 'bg-white dark:bg-[#322657] text-[#5b21b6] dark:text-[#f3f0fc] shadow-xs'
                  : 'text-[#5b5276] dark:text-[#b0a6cf] hover:text-[#1b1430] dark:hover:text-[#f3f0fc]'
              }`}
            >
              Parent View
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
            className="p-2.5 rounded-xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#221a3a] text-[#4c4366] dark:text-[#c4b5fd] hover:bg-[#f3effb] dark:hover:bg-[#2c214f] transition-colors cursor-pointer shrink-0"
          >
            {darkMode ? (
              <Sun className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Moon className="w-4 h-4" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectModule('notifications')}
            aria-label={`Notifications (${unreadCount} unread)`}
            className="relative p-2.5 rounded-xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#221a3a] text-[#4c4366] dark:text-[#c4b5fd] hover:bg-[#f3effb] dark:hover:bg-[#2c214f] transition-colors cursor-pointer shrink-0"
          >
            <Bell className="w-4 h-4" aria-hidden="true" />
            {unreadCount > 0 ? (
              <span className="sr-only">{unreadCount} unread notifications</span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => onSelectModule('settings')}
            aria-label="Open Student Profile and Settings"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden md:inline">Profile</span>
          </button>
        </div>
      </div>
    </header>
  );
}
