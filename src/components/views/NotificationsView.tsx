import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import type { NavModuleId, NotificationItem } from '../../types/studyverse';

interface NotificationsViewProps {
  notifications: NotificationItem[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigate: (module: NavModuleId) => void;
}

export function NotificationsView({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onNavigate,
}: NotificationsViewProps) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'reminders' | 'system'>('all');

  const filtered = notifications.filter((item) => {
    if (filter === 'unread') return !item.read;
    if (filter === 'reminders' || filter === 'system') return item.category === filter;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#e5dff4] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-[#6d28d9] dark:text-[#a78bfa]" aria-hidden="true" />
            <div>
              <h2 className="font-display text-lg font-bold text-[#1b1430] dark:text-[#f3f0fc]">
                Notifications
              </h2>
              <p className="text-xs text-[#5b5276] dark:text-[#b0a6cf]">
                Study reminders and workspace setup updates
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onMarkAllRead}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#e5dff4] dark:border-[#372a5c] bg-[#f8f6fc] dark:bg-[#221a3a] text-xs font-semibold text-[#5b21b6] dark:text-[#c4b5fd] hover:bg-[#ede9fe] transition-colors whitespace-nowrap cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" aria-hidden="true" />
            <span>Mark All Read</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter notifications">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'unread', label: 'Unread' },
              { id: 'reminders', label: 'Reminders' },
              { id: 'system', label: 'System' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === tab.id
                  ? 'bg-[#6d28d9] text-white'
                  : 'bg-[#f3effb] dark:bg-[#221a3a] text-[#4c4366] dark:text-[#b0a6cf]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#5b5276] dark:text-[#b0a6cf]">
            No notifications in this category.
          </p>
        ) : (
          <ul className="divide-y divide-[#efeaf9] dark:divide-[#2a2147]">
            {filtered.map((item) => (
              <li key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-[#776d94] dark:text-[#968cb8]">
                    <span className="font-semibold text-[#6d28d9] dark:text-[#c4b5fd] capitalize">
                      {item.category}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{item.timestamp}</span>
                    {!item.read ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-[#1b1430] dark:text-[#f3f0fc]">
                          Unread
                        </span>
                      </>
                    ) : null}
                  </div>
                  <h3 className="text-sm font-semibold text-[#1b1430] dark:text-[#f3f0fc]">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#5b5276] dark:text-[#b0a6cf] max-w-2xl leading-relaxed">
                    {item.message}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.targetModule ? (
                    <button
                      type="button"
                      onClick={() => {
                        onMarkRead(item.id);
                        onNavigate(item.targetModule!);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#f3effb] dark:bg-[#221a3a] text-xs font-semibold text-[#5b21b6] dark:text-[#c4b5fd] hover:bg-[#ede9fe] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Open
                    </button>
                  ) : null}
                  {!item.read ? (
                    <button
                      type="button"
                      onClick={() => onMarkRead(item.id)}
                      className="px-3 py-1.5 rounded-lg border border-[#e5dff4] dark:border-[#372a5c] text-xs font-medium text-[#4c4366] dark:text-[#b0a6cf] hover:bg-[#faf8ff] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Mark Read
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
