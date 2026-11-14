import {
  Award,
  BarChart3,
  Bell,
  BookMarked,
  BookOpen,
  Bot,
  Calculator,
  CalendarDays,
  CheckSquare,
  Compass,
  FileText,
  History,
  LayoutDashboard,
  Settings,
  Timer,
  Users,
  Youtube,
  type LucideIcon,
} from 'lucide-react';
import type { NavModuleId } from '../../types/studyverse';

export interface NavItemConfig {
  id: NavModuleId;
  label: string;
  shortTitle: string;
  icon: LucideIcon;
  group: 'Overview' | 'Learn & Explore' | 'Practice & Focus' | 'Progress & Space';
}

export const NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'dashboard',
    label: 'Student Dashboard',
    shortTitle: 'Dashboard',
    icon: LayoutDashboard,
    group: 'Overview',
  },
  {
    id: 'planner',
    label: 'AI Study Planner',
    shortTitle: 'Study Planner',
    icon: CalendarDays,
    group: 'Overview',
  },
  {
    id: 'explorer',
    label: 'Class & Topic Explorer',
    shortTitle: 'Explorer',
    icon: Compass,
    group: 'Learn & Explore',
  },
  {
    id: 'previous-classes',
    label: 'Previous Classes',
    shortTitle: 'Previous Classes',
    icon: History,
    group: 'Learn & Explore',
  },
  {
    id: 'lessons',
    label: 'Textbook AI Lessons',
    shortTitle: 'AI Lessons',
    icon: BookOpen,
    group: 'Learn & Explore',
  },
  {
    id: 'notes',
    label: 'AI Notes Studio',
    shortTitle: 'Notes Studio',
    icon: FileText,
    group: 'Learn & Explore',
  },
  {
    id: 'aria',
    label: 'AI Teacher Aria',
    shortTitle: 'AI Teacher Aria',
    icon: Bot,
    group: 'Learn & Explore',
  },
  {
    id: 'quizzes',
    label: 'Quizzes & Practice',
    shortTitle: 'Quizzes & Tests',
    icon: CheckSquare,
    group: 'Practice & Focus',
  },
  {
    id: 'numerical-lab',
    label: 'Numerical Solving Lab',
    shortTitle: 'Numerical Lab',
    icon: Calculator,
    group: 'Practice & Focus',
  },
  {
    id: 'focus',
    label: 'Focus & Concentration',
    shortTitle: 'Focus Center',
    icon: Timer,
    group: 'Practice & Focus',
  },
  {
    id: 'youtube',
    label: 'YouTube Learning Hub',
    shortTitle: 'YouTube Hub',
    icon: Youtube,
    group: 'Practice & Focus',
  },
  {
    id: 'analytics',
    label: 'Learning Analytics',
    shortTitle: 'Analytics',
    icon: BarChart3,
    group: 'Progress & Space',
  },
  {
    id: 'achievements',
    label: 'Achievements',
    shortTitle: 'Achievements',
    icon: Award,
    group: 'Progress & Space',
  },
  {
    id: 'library',
    label: 'Personal Library',
    shortTitle: 'My Library',
    icon: BookMarked,
    group: 'Progress & Space',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    shortTitle: 'Notifications',
    icon: Bell,
    group: 'Progress & Space',
  },
  {
    id: 'parent-dashboard',
    label: 'Parent / Guardian',
    shortTitle: 'Parent Portal',
    icon: Users,
    group: 'Progress & Space',
  },
  {
    id: 'settings',
    label: 'Profile & Settings',
    shortTitle: 'Settings',
    icon: Settings,
    group: 'Progress & Space',
  },
];

export const NAV_GROUPS: NavItemConfig['group'][] = [
  'Overview',
  'Learn & Explore',
  'Practice & Focus',
  'Progress & Space',
];

export function getNavItemMeta(id: NavModuleId): NavItemConfig {
  return NAV_ITEMS.find((item) => item.id === id) ?? NAV_ITEMS[0];
}
