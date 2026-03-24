'use client';

import { useChat } from 'ai/react';
import { useState, useRef, useEffect } from 'react';
import MemoRenderer from './MemoRenderer';

const EXAMPLE_COMPANIES = [
  'Stripe',
  'Linear',
  'Notion',
  'Figma',
  'Vercel',
  'Perplexity',
];

export default function Chat() {
  const [companyName, setCompanyName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, append, error } = useChat({
    api: '/api/chat',
  });

  // Auto-scroll to bottom as streaming happens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (company: string) => {
    const name = company.trim();
    if (!name || isLoading) return;

    setCompanyName('');
    append({
      role: 'user',
      content: `Generate a deal memo for: ${name}`,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(companyName);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto w-full px-4 sm:px-6">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6">
        {!hasMessages && (
          <EmptyState onExample={(company) => handleSubmit(company)} />
        )}

        {messages.map((message) => (
          <div key={message.id}>
            {message.role === 'user' ? (
              <UserMessage content={message.content} />
            ) : (
              <AssistantMessage
                content={message.content}
                isStreaming={isLoading && message.id === messages[messages.length - 1]?.id}
              />
            )}
          </div>
        ))}

        {error && (
          <div className="card border-red-900 bg-red-950/30">
            <p className="text-red-400 text-sm">
              <span className="font-medium">Error:</span> {error.message}
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-800 py-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter a company name (e.g. Stripe, Linear, Notion...)"
            className="input-field flex-1"
            disabled={isLoading}
            maxLength={100}
            autoFocus
          />
          <button
            onClick={() => handleSubmit(companyName)}
            disabled={!companyName.trim() || isLoading}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            {isLoading ? (
              <>
                <LoadingSpinner />
                <span>Researching...</span>
              </>
            ) : (
              <>
                <SearchIcon />
                <span>Research</span>
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2 text-center">
          Powered by Claude · Uses training data knowledge · Streaming live
        </p>
      </div>
    </div>
  );
}

function EmptyState({ onExample }: { onExample: (company: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mb-6 shadow-lg shadow-brand-900/50">
        <span className="text-3xl">📋</span>
      </div>
      <h2 className="text-xl font-semibold text-gray-200 mb-2">
        Ready to research
      </h2>
      <p className="text-gray-500 text-sm max-w-sm mb-8">
        Enter any startup or company name below. The AI will produce a structured
        deal memo with market analysis, competitors, and a verdict.
      </p>

      <div className="flex flex-col gap-2 items-center">
        <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">Try an example</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {EXAMPLE_COMPANIES.map((company) => (
            <button
              key={company}
              onClick={() => onExample(company)}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
            >
              {company}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function UserMessage({ content }: { content: string }) {
  // Extract company name from "Generate a deal memo for: X"
  const match = content.match(/Generate a deal memo for: (.+)/);
  const company = match ? match[1] : content;

  return (
    <div className="flex justify-end">
      <div className="max-w-sm bg-brand-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm font-medium">
        <span className="text-brand-200 text-xs block mb-1">Deal memo request</span>
        {company}
      </div>
    </div>
  );
}

function AssistantMessage({
  content,
  isStreaming,
}: {
  content: string;
  isStreaming: boolean;
}) {
  return (
    <div className="flex justify-start">
      <div className="w-full">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">D</span>
          </div>
          <span className="text-xs text-gray-500 font-medium">DealMemo Agent</span>
          {isStreaming && (
            <span className="flex items-center gap-1 text-xs text-brand-400">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
              Streaming...
            </span>
          )}
        </div>
        <MemoRenderer content={content} isStreaming={isStreaming} />
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}
