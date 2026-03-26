'use client';

import { useChat, type Message } from 'ai/react';
import { useState, useRef, useEffect } from 'react';
import { UserAvatar } from '@clerk/nextjs';
import MemoRenderer from './MemoRenderer';
import AgentSteps from './AgentSteps';
import type { MemoSummary } from '@/lib/memoStore';

const EXAMPLE_COMPANIES = [
  'Stripe',
  'Linear',
  'Notion',
  'Figma',
  'Vercel',
  'Perplexity AI',
];

const PILL_ACCENTS = [
  'from-amber-50 to-orange-50 border-amber-200/80 text-amber-900/90',
  'from-cyan-50 to-sky-50 border-cyan-200/80 text-cyan-900/90',
  'from-rose-50 to-orange-50 border-rose-200/70 text-rose-900/85',
];

interface Session {
  id: string;
  memoId?: string;     // server-assigned ID for share link
  company: string;
  messages: Message[];
  text?: string;       // full text for server-loaded sessions
  createdAt?: string;
}

export default function Chat() {
  const [companyName, setCompanyName] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [viewingSession, setViewingSession] = useState<Session | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Stable ID for the session currently being built — reset on each new search
  const currentSessionIdRef = useRef<string>(crypto.randomUUID());

  const { messages, isLoading, append, error, setMessages } = useChat({
    api: '/api/chat',
  });

  const fetchAndMergeHistory = async () => {
    try {
      const res = await fetch('/api/memos');
      if (!res.ok) return;
      const summaries: MemoSummary[] = await res.json();
      setSessions((prev) => {
        const existingMemoIds = new Set(prev.map((s) => s.memoId).filter(Boolean));
        const incoming = summaries
          .filter((s) => !existingMemoIds.has(s.id))
          .map((s): Session => ({
            id: s.id,
            memoId: s.id,
            company: s.company,
            messages: [],
            createdAt: s.createdAt,
          }));
        if (incoming.length === 0) return prev;
        // Merge: keep live sessions at top, append server sessions not already present
        return [...prev, ...incoming];
      });
    } catch {
      // silent — user may not be authed or Upstash not configured
    }
  };

  useEffect(() => {
    fetchAndMergeHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!viewingSession) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, viewingSession]);

  // Auto-save to sidebar as soon as research finishes (not only when a new search starts)
  useEffect(() => {
    if (isLoading) return;
    const hasResult = messages.some((m) => m.role === 'assistant' && m.content.length > 0);
    if (!hasResult) return;

    const userMsg = messages.find((m) => m.role === 'user');
    const match = userMsg?.content.match(/Generate a deal memo for:\s*(.+)/i);
    const company = match?.[1] ?? 'Unknown';
    const id = currentSessionIdRef.current;

    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      const entry: Session = { id, company, messages: [...messages] };
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = entry;
        return updated;
      }
      return [entry, ...prev];
    });
    setSidebarOpen(true);
    // Refresh from server to get memoId for the session we just generated
    fetchAndMergeHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const handleSubmit = (company: string) => {
    const name = company.trim();
    if (!name || isLoading) return;

    // New session — generate a fresh stable ID
    currentSessionIdRef.current = crypto.randomUUID();
    setViewingSession(null);
    setMessages([]);
    setCompanyName('');
    append({ role: 'user', content: `Generate a deal memo for: ${name}` });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(companyName);
    }
  };

  const removeSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (viewingSession?.id === id) setViewingSession(null);
  };

  const hasLiveMessages = messages.length > 0;
  const lastMessage = messages[messages.length - 1];
  const isLastMessageStreaming = isLoading && lastMessage?.role === 'assistant';
  const showSidebar = sessions.length > 0 && sidebarOpen;

  return (
    <div className="h-full flex overflow-hidden">
      {/* Sidebar — past sessions */}
      {showSidebar && (
        <aside className="w-60 shrink-0 border-r border-stone-200/70 bg-stone-50/60 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200/60">
            <span className="text-[11px] uppercase tracking-[0.18em] font-semibold text-slate-500">
              History
            </span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close sidebar"
            >
              <ChevronLeftIcon />
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto py-2">
            {sessions.map((session) => (
              <li key={session.id}>
                <div
                  className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
                    (viewingSession?.id === session.id || (!viewingSession && session.id === currentSessionIdRef.current))
                      ? 'bg-amber-50/80 border-l-2 border-amber-400'
                      : 'hover:bg-white/70 border-l-2 border-transparent'
                  }`}
                  onClick={async () => {
                    if (session.id === currentSessionIdRef.current) {
                      setViewingSession(null);
                      return;
                    }
                    // Server-only session: fetch full text on demand
                    if (session.memoId && !session.text && session.messages.length === 0) {
                      try {
                        const res = await fetch(`/api/memo/${session.memoId}`);
                        if (res.ok) {
                          const data = await res.json();
                          const loaded = { ...session, text: data.text as string };
                          setSessions((prev) =>
                            prev.map((s) => (s.id === session.id ? loaded : s))
                          );
                          setViewingSession(loaded);
                          return;
                        }
                      } catch { /* fall through */ }
                    }
                    setViewingSession(session);
                  }}
                >
                  <span className="flex-1 text-sm font-medium text-slate-700 truncate">
                    {session.company}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {session.memoId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(`${window.location.origin}/memo/${session.memoId}`);
                        }}
                        className="p-1 text-slate-400 hover:text-sky-600 transition-colors"
                        title="Copy share link"
                      >
                        <ShareIcon />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubmit(session.company);
                      }}
                      className="p-1 text-slate-400 hover:text-amber-600 transition-colors"
                      title="Re-research"
                      disabled={isLoading}
                    >
                      <ReloadIcon />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSession(session.id);
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Sidebar toggle when closed */}
        {sessions.length > 0 && !sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-stone-200 rounded-r-lg px-1.5 py-3 text-slate-400 hover:text-slate-700 shadow-sm transition-colors"
            aria-label="Open history"
          >
            <ChevronRightIcon />
          </button>
        )}

        {/* Viewing a past session banner */}
        {viewingSession && (
          <div className="shrink-0 flex items-center gap-3 px-5 py-2.5 bg-amber-50/80 border-b border-amber-200/60 text-sm">
            <span className="text-amber-700 font-medium">
              Viewing: {viewingSession.company}
            </span>
            <button
              onClick={() => setViewingSession(null)}
              className="ml-auto text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors"
            >
              Back to current
            </button>
            <button
              onClick={() => handleSubmit(viewingSession.company)}
              disabled={isLoading}
              className="text-xs text-amber-700 hover:text-amber-900 underline underline-offset-2 transition-colors disabled:opacity-50"
            >
              Re-research
            </button>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0 py-6 sm:py-8 space-y-8 px-5 sm:px-8 lg:px-12 xl:px-16 max-w-[1400px] w-full mx-auto">
          {viewingSession ? (
            // Historical session view
            <HistoricalSession session={viewingSession} />
          ) : (
            <>
              {!hasLiveMessages && (
                <EmptyState onExample={(company) => handleSubmit(company)} />
              )}
              {messages.map((message, idx) => {
                const isLast = idx === messages.length - 1;
                const showAgentSteps = isLoading && isLast && message.role === 'assistant';
                return (
                  <div key={message.id}>
                    {message.role === 'user' ? (
                      <UserMessage content={message.content} />
                    ) : (
                      <AssistantMessage
                        message={message}
                        isStreaming={isLastMessageStreaming && isLast}
                        showAgentSteps={showAgentSteps}
                        allMessages={messages}
                      />
                    )}
                  </div>
                );
              })}
              {error && (
                <div className="card border-red-200 bg-red-50">
                  <p className="text-red-700 text-sm">
                    <span className="font-medium">Error:</span> {error.message}
                  </p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input bar */}
        <div className="border-t border-stone-200/80 py-6 sm:py-8 bg-white/70 backdrop-blur-md shadow-[0_-12px_40px_-16px_rgba(251,146,60,0.1)] shrink-0 px-5 sm:px-8 lg:px-12 xl:px-16">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-stretch max-w-5xl mx-auto w-full">
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Company name (e.g. Stripe, Linear…)"
              className="input-field flex-1 w-full min-h-[3.25rem]"
              disabled={isLoading}
              maxLength={100}
              autoFocus
            />
            <button
              type="button"
              onClick={() => handleSubmit(companyName)}
              disabled={!companyName.trim() || isLoading}
              className="btn-primary flex items-center justify-center gap-2.5 shrink-0 sm:min-w-[10.5rem]"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner />
                  <span>Researching</span>
                </>
              ) : (
                <>
                  <SearchIcon />
                  <span>Research</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoricalSession({ session }: { session: Session }) {
  const content =
    session.text ??
    [...session.messages].reverse().find((m) => m.role === 'assistant')?.content ??
    '';
  if (!content) {
    return (
      <div className="flex justify-center w-full">
        <div className="w-full max-w-5xl mx-auto flex items-center justify-center py-20 text-slate-400 text-sm">
          Loading memo…
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-center w-full">
      <div className="w-full max-w-5xl mx-auto">
        <MemoRenderer content={content} isStreaming={false} />
      </div>
    </div>
  );
}

function EmptyState({ onExample }: { onExample: (company: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center w-full max-w-5xl mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-400 to-cyan-400 p-[2px] shadow-lg shadow-orange-400/25 mb-6">
        <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center">
          <span className="text-2xl" aria-hidden>✦</span>
        </div>
      </div>
      <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-2">
        Deal memo, on demand
      </h2>
      <p className="text-slate-600 text-sm sm:text-base max-w-2xl mb-10 leading-relaxed">
        Name a startup. We pull public sources and stream a structured memo—ready to read or share.
      </p>
      <div className="w-full max-w-4xl space-y-4">
        <p className="text-[11px] text-amber-700/80 uppercase tracking-[0.2em] font-medium">
          Try an example
        </p>
        <div className="flex flex-wrap gap-2.5 sm:gap-3 justify-center">
          {EXAMPLE_COMPANIES.map((company) => (
            <button
              key={company}
              onClick={() => onExample(company)}
              className="px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl text-sm font-medium text-slate-700
                bg-white border border-stone-200 shadow-sm
                hover:border-amber-300 hover:bg-gradient-to-br hover:from-amber-50 hover:to-orange-50/80
                transition-all duration-200"
            >
              {company}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:gap-3 justify-center mt-12">
        {['Live search', 'Source fetch', 'Streaming'].map((f, i) => (
          <span
            key={f}
            className={`text-[11px] px-3 py-1.5 rounded-full border bg-gradient-to-br font-medium ${PILL_ACCENTS[i % PILL_ACCENTS.length]}`}
          >
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

function UserMessage({ content }: { content: string }) {
  const match = content.match(/Generate a deal memo for: (.+)/);
  const company = match ? match[1] : content;
  return (
    <div className="flex justify-center mb-2 w-full">
      <div className="max-w-xl w-full rounded-2xl border border-stone-200 bg-white/90 px-6 py-4 text-sm sm:text-base text-slate-700 shadow-sm shadow-stone-200/60">
        <div className="flex items-center gap-2.5 mb-2">
          <UserAvatar
            appearance={{ elements: { avatarBox: 'w-5 h-5' } }}
            rounded
          />
          <span className="text-[10px] uppercase tracking-widest text-amber-700/80 font-medium">
            Request
          </span>
        </div>
        <span className="font-semibold text-slate-900">{company}</span>
      </div>
    </div>
  );
}

function AssistantMessage({
  message,
  isStreaming,
  showAgentSteps,
  allMessages,
}: {
  message: Message;
  isStreaming: boolean;
  showAgentSteps: boolean;
  allMessages: Message[];
}) {
  return (
    <div className="flex justify-center w-full">
      <div className="w-full max-w-5xl mx-auto">
        <div className="flex flex-col items-center gap-1 mb-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-stone-300" />
            <span className="uppercase tracking-[0.15em] font-semibold text-slate-600">Memo</span>
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-stone-300" />
          </div>
          {isStreaming && (
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Writing…
            </span>
          )}
        </div>
        <MemoRenderer content={message.content} isStreaming={isStreaming} />
        {showAgentSteps && (
          <AgentSteps messages={allMessages} memoContent={message.content} />
        )}
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-5 w-5 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function ReloadIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  );
}
