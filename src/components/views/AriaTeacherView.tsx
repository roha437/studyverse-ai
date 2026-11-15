import { useEffect, useRef, useState } from 'react';
import { Loader2, RotateCcw, Send, Trash2 } from 'lucide-react';
import type { ActiveStudyContext, BoardId, NavModuleId } from '../../types/studyverse';
import { resolveContextDetails } from '../../utils/curriculumHelpers';
import { ContextBreadcrumbBar } from '../common/ContextBreadcrumbBar';
import { ImageWithFallback } from '../common/ImageWithFallback';

interface AriaTeacherViewProps {
  context: ActiveStudyContext;
  board: BoardId;
  onNavigate: (module: NavModuleId) => void;
}

type TeachingStyle = 'socratic' | 'step-by-step' | 'exam-coach';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface RetryRequest {
  message: string;
  history: ChatMessage[];
  teachingStyle: TeachingStyle;
}

const MAX_HISTORY_MESSAGES = 12;

export function AriaTeacherView({ context, board, onNavigate }: AriaTeacherViewProps) {
  const { cls, subject, chapter, topic } = resolveContextDetails(context);
  const [teachingStyle, setTeachingStyle] = useState<TeachingStyle>('step-by-step');
  const [promptInput, setPromptInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryRequest, setRetryRequest] = useState<RetryRequest | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contextKey = [
    cls.label,
    board,
    context.streamId,
    subject.name,
    chapter.title,
    topic.id,
  ].join('|');

  const starterPrompts = [
    `Explain ${topic.title} using a simple real-life example.`,
    `What common exam mistakes happen in ${chapter.title}?`,
    `Walk me through one solved problem from ${topic.title}.`,
  ];

  useEffect(() => {
    abortControllerRef.current?.abort();
    setMessages([]);
    setErrorMessage(null);
    setRetryRequest(null);
    setIsLoading(false);
  }, [contextKey]);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    []
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  const handleAsk = async (
    text: string,
    history = messages,
    style = teachingStyle,
    appendUserMessage = true
  ) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    const priorHistory = history.slice(-MAX_HISTORY_MESSAGES);
    const request: RetryRequest = { message: trimmed, history: priorHistory, teachingStyle: style };

    if (appendUserMessage) {
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}-${Math.random()}`, role: 'user', content: trimmed },
      ]);
    }
    setPromptInput('');
    setErrorMessage(null);
    setRetryRequest(null);
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/aria/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: request.message,
          teachingStyle: request.teachingStyle,
          history: request.history.map(({ role, content }) => ({ role, content })),
          context: {
            classLabel: cls.label,
            board,
            streamLabel: context.streamId === 'general' ? undefined : context.streamId.toUpperCase(),
            subject: subject.name,
            chapter: chapter.title,
            topic: topic.title,
            topicSummary: topic.summary,
            keyFormula: topic.keyFormula,
          },
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        reply?: unknown;
        error?: string;
      };

      if (!response.ok || typeof data.reply !== 'string' || !data.reply.trim()) {
        throw new Error(data.error || 'Aria could not answer right now. Please retry.');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}-${Math.random()}`,
          role: 'assistant',
          content: data.reply as string,
        },
      ]);
    } catch (err) {
      if (controller.signal.aborted) return;
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'A network error interrupted the conversation. Please retry.'
      );
      setRetryRequest(request);
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setIsLoading(false);
      }
    }
  };

  const handleClearChat = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setMessages([]);
    setErrorMessage(null);
    setRetryRequest(null);
    setPromptInput('');
    setIsLoading(false);
  };

  const handleRetry = () => {
    if (!retryRequest) return;
    void handleAsk(
      retryRequest.message,
      retryRequest.history,
      retryRequest.teachingStyle,
      false
    );
  };

  return (
    <div className="space-y-6">
      <ContextBreadcrumbBar context={context} onNavigate={onNavigate} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-4 rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-[#e5deff] dark:border-[#372a5c] shrink-0">
              <ImageWithFallback
                src="/src/assets/images/aria_mentor_avatar_1794676730537.jpg"
                alt="AI Teacher Aria portrait illustration"
                className="w-full h-full object-cover"
                fallbackTitle="Aria"
              />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-[#1b1831] dark:text-[#f3f0fc]">
                Aria · AI Mentor
              </h2>
              <p className="text-xs text-[#6b6684] dark:text-[#b0a6cf]">
                Tuned for {cls.label} · {subject.name}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf]">
              Tutoring Mode
            </span>
            {(
              [
                {
                  id: 'step-by-step',
                  label: 'Step-by-Step',
                  desc: 'Clear textbook derivations & examples',
                },
                {
                  id: 'socratic',
                  label: 'Socratic Guide',
                  desc: 'Hints & guiding questions first',
                },
                {
                  id: 'exam-coach',
                  label: 'Exam Coach',
                  desc: 'Marking scheme & board presentation',
                },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setTeachingStyle(mode.id)}
                className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                  teachingStyle === mode.id
                    ? 'bg-[#e5deff] dark:bg-[#2c214f] border-[#5a45c8] text-[#442cb2] dark:text-[#f3f0fc]'
                    : 'bg-[#fcfaff] dark:bg-[#221a3a] border-[#e5deff] dark:border-[#2e244d] text-[#1b1831] dark:text-[#e9e4f8]'
                }`}
              >
                <div className="text-sm font-semibold">{mode.label}</div>
                <div className="text-xs opacity-80">{mode.desc}</div>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf]">
              Suggested Questions
            </span>
            {starterPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setPromptInput(prompt)}
                className="w-full text-left p-3 rounded-xl bg-[#f7f5ff] dark:bg-[#221a3a] hover:bg-[#e5deff] dark:hover:bg-[#2c214f] text-xs text-[#484554] dark:text-[#d8d0f2] transition-colors cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        </aside>

        <section className="lg:col-span-8 rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 flex flex-col min-h-[460px] gap-5">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-[#ece6ff] dark:border-[#2a2147] pb-4">
              <div className="text-xs font-medium text-[#5a45c8] dark:text-[#c4b5fd]">
                <div>Active Syllabus Context</div>
                <h3 className="mt-1 font-display text-lg font-bold text-[#1b1831] dark:text-[#f3f0fc]">
                  Discussing {topic.title} ({chapter.title})
                </h3>
                <p className="mt-1 text-[11px] text-[#6b6684] dark:text-[#b0a6cf]">
                  {cls.label} · {board} · {subject.name}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearChat}
                disabled={messages.length === 0 && !isLoading && !errorMessage}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#e5deff] dark:border-[#372a5c] text-xs font-medium text-[#6b6684] dark:text-[#b0a6cf] hover:bg-[#f0ebff] dark:hover:bg-[#221a3a] disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Clear chat</span>
              </button>
            </div>

            <div
              className="max-h-[440px] min-h-[240px] overflow-y-auto space-y-4 pr-1"
              role="log"
              aria-label="Conversation with Aria"
              aria-live="polite"
              aria-busy={isLoading}
            >
              {messages.length === 0 ? (
                <div className="h-full min-h-[220px] rounded-2xl bg-[#f7f5ff] dark:bg-[#221a3a] border border-[#ece6ff] dark:border-[#2e244d] p-5 flex flex-col justify-center">
                  <h4 className="font-display text-base font-bold text-[#1b1831] dark:text-[#f3f0fc]">
                    Hi, I’m Aria. What are you learning today?
                  </h4>
                  <p className="mt-1 text-sm text-[#6b6684] dark:text-[#b0a6cf]">
                    Ask for an explanation, a worked example, an analogy, or a hint. I’ll tailor my
                    answer to your selected class and topic.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {starterPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        disabled={isLoading}
                        onClick={() => void handleAsk(prompt)}
                        className="px-3 py-2 rounded-xl bg-white dark:bg-[#19132b] border border-[#e5deff] dark:border-[#372a5c] text-xs font-medium text-[#442cb2] dark:text-[#c4b5fd] hover:bg-[#e5deff] dark:hover:bg-[#2c214f] cursor-pointer"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      message.role === 'user'
                        ? 'ml-auto bg-[#5a45c8] text-white'
                        : 'mr-auto bg-[#f0ebff] dark:bg-[#221a3a] border border-[#ddd6fe] dark:border-[#372a5c] text-[#30264a] dark:text-[#e9e4f8]'
                    }`}
                  >
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-75">
                      {message.role === 'user' ? 'You' : 'Aria'}
                    </div>
                    {message.content}
                  </div>
                ))
              )}
              {isLoading ? (
                <div role="status" className="mr-auto flex items-center gap-2 px-4 py-3 text-xs text-[#6b6684] dark:text-[#b0a6cf]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#5a45c8]" aria-hidden="true" />
                  <span>Aria is thinking through your question…</span>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>

            {errorMessage ? (
              <div
                role="alert"
                className="rounded-xl border border-[#fecaca] dark:border-[#7f1d1d] bg-[#fef2f2] dark:bg-[#3b151a] p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#b91c1c] dark:text-[#fca5a5]"
              >
                <span>{errorMessage}</span>
                {retryRequest ? (
                  <button
                    type="button"
                    onClick={handleRetry}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#19132b] border border-[#fecaca] dark:border-[#7f1d1d] font-semibold disabled:opacity-60 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Retry</span>
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleAsk(promptInput);
            }}
            className="flex items-center gap-2.5 pt-3 border-t border-[#ece6ff] dark:border-[#2a2147]"
          >
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              disabled={isLoading}
              aria-label="Ask AI Teacher Aria a question"
              placeholder={`Ask Aria about ${topic.title}...`}
              className="flex-1 px-4 py-3 rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] text-sm text-[#1b1831] dark:text-[#f3f0fc] focus:outline-none focus:ring-2 focus:ring-[#5a45c8]"
            />
            <button
              type="submit"
              disabled={isLoading || !promptInput.trim()}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#5a45c8] hover:bg-[#442cb2] disabled:opacity-60 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="w-4 h-4" aria-hidden="true" />
              )}
              <span>{isLoading ? 'Thinking...' : 'Ask Aria'}</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
