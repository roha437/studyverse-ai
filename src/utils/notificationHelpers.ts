import type { NavModuleId, NotificationInput, NotificationItem } from '../types/studyverse.ts';

const NAV_MODULES = new Set<string>([
  'dashboard',
  'explorer',
  'previous-classes',
  'lessons',
  'notes',
  'aria',
  'quizzes',
  'numerical-lab',
  'focus',
  'youtube',
  'planner',
  'analytics',
  'achievements',
  'library',
  'notifications',
  'parent-dashboard',
  'settings',
]);

function isNavModule(value: string): value is NavModuleId {
  return NAV_MODULES.has(value);
}

export function normalizeNotificationInput(input: NotificationInput): NotificationInput {
  const title = input.title.trim();
  const message = input.message.trim();
  const eventKey = input.eventKey.trim();
  if (!title || title.length > 160 || !message || message.length > 1200 || !eventKey || eventKey.length > 200) {
    throw new Error('Invalid notification details.');
  }
  return { ...input, title, message, eventKey };
}

export function mapNotificationRowToItem(row: Record<string, unknown>): NotificationItem {
  const targetModule =
    typeof row.target_module === 'string' && isNavModule(row.target_module)
      ? row.target_module
      : undefined;
  return {
    id: String(row.id),
    title: String(row.title ?? 'StudyVerse notification'),
    message: String(row.message ?? ''),
    category: row.category === 'reminders' ? 'reminders' : 'system',
    timestamp: String(row.created_at ?? new Date().toISOString()),
    read: Boolean(row.read),
    ...(targetModule ? { targetModule } : {}),
  };
}
