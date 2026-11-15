import { NAV_ITEMS } from './navigationConfig';
import type { NavModuleId } from '../../types/studyverse';

interface MobileBottomNavigationProps {
  activeModule: NavModuleId;
  onSelectModule: (module: NavModuleId) => void;
}

const MOBILE_ITEMS: Array<{ id: NavModuleId; label: string }> = [
  { id: 'dashboard', label: 'Home' },
  { id: 'library', label: 'Library' },
  { id: 'aria', label: 'AI Tutor' },
  { id: 'quizzes', label: 'Practice' },
  { id: 'settings', label: 'Profile' },
];

const PRACTICE_MODULES: NavModuleId[] = ['quizzes', 'numerical-lab', 'focus'];

export function MobileBottomNavigation({
  activeModule,
  onSelectModule,
}: MobileBottomNavigationProps) {
  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e5deff] bg-white/95 pt-2 backdrop-blur-md dark:border-[#2e244d] dark:bg-[#19132b]/95 lg:hidden"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5 gap-1 px-2">
        {MOBILE_ITEMS.map(({ id, label }) => {
          const item = NAV_ITEMS.find((navItem) => navItem.id === id);
          if (!item) return null;
          const Icon = item.icon;
          const isActive =
            activeModule === id || (id === 'quizzes' && PRACTICE_MODULES.includes(activeModule));

          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onSelectModule(id)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={label}
                className={`flex w-full flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-[10px] font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#f0ebff] text-[#5a45c8] dark:bg-[#2c214f] dark:text-[#ddd6fe]'
                    : 'text-[#6b6684] hover:bg-[#f7f5ff] dark:text-[#b0a6cf] dark:hover:bg-[#221a3a]'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
