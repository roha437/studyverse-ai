import { useState } from 'react';
import { Bell, CheckCheck, Loader2, Trash2 } from 'lucide-react';
import type { DbOperationResult, NavModuleId, NotificationItem } from '../../types/studyverse';

interface NotificationsViewProps {
  notifications: NotificationItem[];
  loading?: boolean;
  error?: string | null;
  onMarkRead: (id: string) => Promise<DbOperationResult<NotificationItem>>;
  onMarkAllRead: () => Promise<DbOperationResult<number>>;
  onDismiss: (id: string) => Promise<DbOperationResult<{ id: string }>>;
  onRetry: () => Promise<void>;
  onNavigate: (module: NavModuleId) => void;
}

export function NotificationsView({
  notifications,
  loading = false,
  error,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
  onRetry,
  onNavigate,
}: NotificationsViewProps) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'reminders' | 'system'>('all');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = notifications.filter((item) => {
    if (filter === 'unread') return !item.read;
    if (filter === 'reminders' || filter === 'system') return item.category === filter;
    return true;
  });

  const markRead = async (id: string) => {
    setBusyAction(id);
    setActionError(null);
    try {
      const result = await onMarkRead(id);
      if (result.error) setActionError(result.error);
    } catch {
      setActionError('Could not update this notification. Please try again.');
    } finally {
      setBusyAction(null);
    }
  };

  const markAllRead = async () => {
    setBusyAction('all');
    setActionError(null);
    try {
      const result = await onMarkAllRead();
      if (result.error) setActionError(result.error);
    } catch {
      setActionError('Could not update notifications. Please try again.');
    } finally {
      setBusyAction(null);
    }
  };

  const dismiss = async (id: string) => {
    setBusyAction(id);
    setActionError(null);
    try {
      const result = await onDismiss(id);
      if (result.error) setActionError(result.error);
    } catch {
      setActionError('Could not dismiss this notification. Please try again.');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-[#5a45c8] dark:text-[#a78bfa]" aria-hidden="true" />
            <div>
              <h2 className="font-display text-lg font-bold text-[#1b1831] dark:text-[#f3f0fc]">
                Notifications
              </h2>
              <p className="text-xs text-[#6b6684] dark:text-[#b0a6cf]">
                Study reminders and workspace setup updates
              </p>
            </div>
          </div>

          <button
          type="button"
          onClick={() => void markAllRead()}
          disabled={busyAction !== null || !notifications.some((item) => !item.read)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#f7f5ff] dark:bg-[#221a3a] text-xs font-semibold text-[#442cb2] dark:text-[#c4b5fd] hover:bg-[#e5deff] transition-colors whitespace-nowrap cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" aria-hidden="true" />
            <span>{busyAction === 'all' ? 'Saving...' : 'Mark All Read'}</span>
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
                  ? 'bg-[#5a45c8] text-white'
                  : 'bg-[#f0ebff] dark:bg-[#221a3a] text-[#484554] dark:text-[#b0a6cf]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error || actionError ? (
          <div role="alert" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <span>{actionError || error}</span>
            <button
              type="button"
              onClick={() => void onRetry()}
              className="inline-flex items-center gap-1.5 self-start rounded-lg border border-red-300 px-3 py-1.5 font-semibold hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-950 cursor-pointer"
            >
              <Loader2 className="h-3.5 w-3.5" aria-hidden="true" />
              Retry
            </button>
          </div>
        ) : null}

        {loading ? (
          <div role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-[#6b6684] dark:text-[#b0a6cf]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading notifications...
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#6b6684] dark:text-[#b0a6cf]">
            No notifications in this category. Study and assessment events will appear here.
          </p>
        ) : (
          <ul className="divide-y divide-[#ece6ff] dark:divide-[#2a2147]">
            {filtered.map((item) => (
              <li key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-[#776d94] dark:text-[#968cb8]">
                    <span className="font-semibold text-[#5a45c8] dark:text-[#c4b5fd] capitalize">
                      {item.category}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {Number.isNaN(new Date(item.timestamp).getTime())
                        ? item.timestamp
                        : new Date(item.timestamp).toLocaleString()}
                    </span>
                    {!item.read ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-[#1b1831] dark:text-[#f3f0fc]">
                          Unread
                        </span>
                      </>
                    ) : null}
                  </div>
                  <h3 className="text-sm font-semibold text-[#1b1831] dark:text-[#f3f0fc]">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#6b6684] dark:text-[#b0a6cf] max-w-2xl leading-relaxed">
                    {item.message}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.targetModule ? (
                    <button
                      type="button"
                      onClick={() => {
                        void markRead(item.id);
                        onNavigate(item.targetModule!);
                      }}
                      disabled={busyAction === item.id}
                      className="px-3 py-1.5 rounded-lg bg-[#f0ebff] dark:bg-[#221a3a] text-xs font-semibold text-[#442cb2] dark:text-[#c4b5fd] hover:bg-[#e5deff] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Open
                    </button>
                  ) : null}
                  {!item.read ? (
                    <button
                      type="button"
                      onClick={() => void markRead(item.id)}
                      disabled={busyAction === item.id}
                      className="px-3 py-1.5 rounded-lg border border-[#e5deff] dark:border-[#372a5c] text-xs font-medium text-[#484554] dark:text-[#b0a6cf] hover:bg-[#fcfaff] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Mark Read
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void dismiss(item.id)}
                    disabled={busyAction === item.id}
                    aria-label={`Dismiss ${item.title}`}
                    className="p-1.5 rounded-lg text-[#8f84b3] hover:text-[#dc2626] disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
