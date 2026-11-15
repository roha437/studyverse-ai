import { useState } from 'react';
import { BookMarked, Compass, Search, Star, Trash2 } from 'lucide-react';
import type {
  BookmarkRecord,
  DbOperationResult,
  NavModuleId,
  NoteRecord,
} from '../../types/studyverse';
import {
  formatVideoDuration,
  getSafeYouTubeThumbnailUrl,
  isValidYouTubeVideoId,
} from '../../utils/youtubeHelpers';

interface PersonalLibraryViewProps {
  onNavigate: (module: NavModuleId) => void;
  notes: NoteRecord[];
  bookmarks: BookmarkRecord[];
  onToggleNoteFavorite: (noteId: string, nextFavorite: boolean) => Promise<DbOperationResult<NoteRecord>>;
  onDeleteNote: (noteId: string) => Promise<DbOperationResult<{ id: string }>>;
  onDeleteBookmark: (bookmarkId: string) => Promise<DbOperationResult<{ id: string }>>;
}

type LibraryTab = 'lessons' | 'notes' | 'videos' | 'numericals';

export function PersonalLibraryView({
  onNavigate,
  notes,
  bookmarks,
  onToggleNoteFavorite,
  onDeleteNote,
  onDeleteBookmark,
}: PersonalLibraryViewProps) {
  const [activeTab, setActiveTab] = useState<LibraryTab>('lessons');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const tabs: {
    id: LibraryTab;
    label: string;
    emptyCopy: string;
    actionModule: NavModuleId;
    actionLabel: string;
  }[] = [
    {
      id: 'lessons',
      label: 'Bookmarked Lessons & Topics',
      emptyCopy: 'Bookmark any topic or lesson in Curriculum Explorer or Lessons to save it here.',
      actionModule: 'explorer',
      actionLabel: 'Open Explorer',
    },
    {
      id: 'notes',
      label: 'Saved Study Notes',
      emptyCopy: 'Create and save structured study summaries or formula sheets in Notes Studio.',
      actionModule: 'notes',
      actionLabel: 'Open Notes Studio',
    },
    {
      id: 'videos',
      label: 'Bookmarked Videos',
      emptyCopy: 'Curated YouTube lectures you save from the Learning Hub will organize here.',
      actionModule: 'youtube',
      actionLabel: 'Open YouTube Hub',
    },
    {
      id: 'numericals',
      label: 'Solved Numericals',
      emptyCopy: 'Bookmarked numerical problems from the Numerical Solving Lab will archive here.',
      actionModule: 'numerical-lab',
      actionLabel: 'Open Numerical Lab',
    },
  ];

  const currentTab = tabs.find((t) => t.id === activeTab) ?? tabs[0];
  const query = searchQuery.trim().toLowerCase();

  const filteredNotes = notes.filter(
    (n) =>
      !query ||
      n.title.toLowerCase().includes(query) ||
      n.subject.toLowerCase().includes(query) ||
      n.content.summary.toLowerCase().includes(query)
  );

  const filteredBookmarks = bookmarks.filter((b) => {
    const matchesTab =
      activeTab === 'lessons'
        ? b.resourceType === 'lesson' || b.resourceType === 'topic'
        : activeTab === 'videos'
          ? b.resourceType === 'video'
          : activeTab === 'numericals'
            ? b.resourceType === 'numerical'
            : false;
    if (!matchesTab) return false;
    if (!query) return true;
    return (
      b.title.toLowerCase().includes(query) ||
      (b.metadata.subject ?? '').toLowerCase().includes(query) ||
      (b.metadata.subtitle ?? '').toLowerCase().includes(query)
    );
  });

  const handleDeleteNote = async (id: string) => {
    setActionError(null);
    const res = await onDeleteNote(id);
    if (res.error) setActionError(res.error);
  };

  const handleToggleFavorite = async (id: string, nextVal: boolean) => {
    setActionError(null);
    const res = await onToggleNoteFavorite(id, nextVal);
    if (res.error) setActionError(res.error);
  };

  const handleDeleteBookmark = async (id: string) => {
    setActionError(null);
    const res = await onDeleteBookmark(id);
    if (res.error) setActionError(res.error);
  };

  const isEmpty =
    activeTab === 'notes' ? filteredNotes.length === 0 : filteredBookmarks.length === 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#1b1831] dark:text-[#f3f0fc]">
              Personal Learning Library
            </h2>
            <p className="text-xs text-[#6b6684] dark:text-[#b0a6cf] tabular-nums">
              {notes.length} saved {notes.length === 1 ? 'note' : 'notes'} · {bookmarks.length}{' '}
              {bookmarks.length === 1 ? 'bookmark' : 'bookmarks'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search
                className="w-4 h-4 text-[#776d94] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Filter library items"
                placeholder="Filter saved items..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-xs text-[#1b1831] dark:text-[#f3f0fc]"
              />
            </div>
            <BookMarked
              className="w-6 h-6 text-[#5a45c8] dark:text-[#a78bfa] shrink-0 hidden sm:block"
              aria-hidden="true"
            />
          </div>
        </div>

        <div
          className="inline-flex flex-wrap gap-1.5 p-1 rounded-xl bg-[#f0ebff] dark:bg-[#221a3a] border border-[#e5deff] dark:border-[#2e244d]"
          role="tablist"
          aria-label="Library categories"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-[#322657] text-[#442cb2] dark:text-[#f3f0fc] shadow-xs'
                  : 'text-[#6b6684] dark:text-[#b0a6cf]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {actionError ? (
          <div
            role="alert"
            className="p-3 rounded-xl bg-[#fef2f2] dark:bg-[#3b151a] border border-[#fecaca] dark:border-[#7f1d1d] text-xs text-[#b91c1c] dark:text-[#fca5a5]"
          >
            {actionError}
          </div>
        ) : null}

        {isEmpty ? (
          <div className="rounded-xl border border-dashed border-[#d8cff2] dark:border-[#3b2e63] bg-[#fcfaff] dark:bg-[#221a3a] p-8 text-center">
            <h3 className="font-display text-base font-bold text-[#1b1831] dark:text-[#f3f0fc]">
              No {currentTab.label} Found
            </h3>
            <p className="mt-1.5 text-sm text-[#6b6684] dark:text-[#b0a6cf] max-w-lg mx-auto">
              {currentTab.emptyCopy}
            </p>
            <button
              type="button"
              onClick={() => onNavigate(currentTab.actionModule)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5a45c8] hover:bg-[#442cb2] text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              <Compass className="w-4 h-4" aria-hidden="true" />
              <span>{currentTab.actionLabel}</span>
            </button>
          </div>
        ) : activeTab === 'notes' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNotes.map((note) => (
              <article
                key={note.id}
                className="p-4 rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] border border-[#ece6ff] dark:border-[#2e244d] flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-medium text-[#5a45c8] dark:text-[#c4b5fd] uppercase">
                        {note.noteType} · {note.subject}
                      </div>
                      <h3 className="font-display text-sm font-bold text-[#1b1831] dark:text-[#f3f0fc]">
                        {note.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void handleToggleFavorite(note.id, !note.isFavorite)}
                        aria-label={note.isFavorite ? 'Remove favorite' : 'Favorite note'}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          note.isFavorite
                            ? 'text-[#d97706] bg-[#fef3c7] dark:bg-[#3f2c12]'
                            : 'text-[#8f84b3] hover:text-[#5a45c8]'
                        }`}
                      >
                        <Star className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteNote(note.id)}
                        aria-label={`Delete ${note.title}`}
                        className="p-1.5 rounded-lg text-[#8f84b3] hover:text-[#dc2626] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-[#6b6684] dark:text-[#b0a6cf] leading-relaxed">
                    {note.content.summary}
                  </p>
                  {note.content.formula ? (
                    <div className="font-mono-tabular text-xs font-semibold text-[#442cb2] dark:text-[#c4b5fd]">
                      {note.content.formula}
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBookmarks.map((bm) => {
              const isVideo = bm.resourceType === 'video';
              const validVideo = isVideo && isValidYouTubeVideoId(bm.resourceId);
              const videoUrl = validVideo
                ? `https://www.youtube.com/watch?v=${bm.resourceId}`
                : null;
              const thumbnailUrl = isVideo
                ? getSafeYouTubeThumbnailUrl(bm.metadata.thumbnailUrl)
                : null;
              return (
                <article
                  key={bm.id}
                  className="p-4 rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] border border-[#ece6ff] dark:border-[#2e244d] flex items-start justify-between gap-3"
                >
                  <div className="flex min-w-0 gap-3">
                    {isVideo && videoUrl ? (
                      <a href={videoUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${bm.title} on YouTube`} className="h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-[#221a3a]">
                        {thumbnailUrl ? (
                          <img src={thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[#c4b5fd]">
                            <BookMarked className="h-6 w-6" aria-hidden="true" />
                          </div>
                        )}
                      </a>
                    ) : null}
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium text-[#5a45c8] dark:text-[#c4b5fd] uppercase">
                        {bm.resourceType}
                        {bm.metadata.subject ? ` · ${bm.metadata.subject}` : ''}
                      </div>
                      <h3 className="mt-0.5 font-display text-sm font-bold text-[#1b1831] dark:text-[#f3f0fc]">
                        {bm.title}
                      </h3>
                      {(bm.metadata.channel || bm.metadata.subtitle) ? (
                        <p className="mt-1 text-xs text-[#6b6684] dark:text-[#b0a6cf]">
                          {bm.metadata.channel ?? bm.metadata.subtitle}
                          {typeof bm.metadata.durationSeconds === 'number'
                            ? ` · ${formatVideoDuration(bm.metadata.durationSeconds)}`
                            : ''}
                        </p>
                      ) : null}
                      {bm.metadata.formula ? (
                        <div className="mt-1.5 font-mono-tabular text-xs text-[#442cb2] dark:text-[#c4b5fd]">
                          {bm.metadata.formula}
                        </div>
                      ) : null}
                      {videoUrl ? (
                        <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#442cb2] dark:text-[#c4b5fd]">
                          Watch video
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteBookmark(bm.id)}
                    aria-label={`Remove bookmark ${bm.title}`}
                    className="p-1.5 rounded-lg text-[#8f84b3] hover:text-[#dc2626] transition-colors shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
