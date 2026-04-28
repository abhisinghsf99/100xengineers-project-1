'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { ChatMessage } from '@/components/chat/chat-message';
import { ChatInput } from '@/components/chat/chat-input';
import { SuggestionChips } from '@/components/chat/suggestion-chips';
import { TypingIndicator } from '@/components/chat/typing-indicator';

interface ChatViewProps {
  onClose: () => void;
}

export function ChatView({ onClose }: ChatViewProps) {
  const { messages, sendMessage, status, setMessages, error } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isLoading = status === 'streaming' || status === 'submitted';
  const isEmpty = messages.length === 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  function handleSend(text: string) {
    sendMessage({ parts: [{ type: 'text', text }] });
  }

  const handleNewChat = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-muted transition-colors duration-200 cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-base font-semibold">FinTrack Chat</h2>
        <button
          type="button"
          onClick={handleNewChat}
          aria-label="New chat"
          className="h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-muted transition-colors duration-200 cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isEmpty ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <SuggestionChips onSelect={handleSend} />
          </div>
        ) : (
          <div className="space-y-1">
            {messages
              .filter((m) => m.role === 'user' || m.role === 'assistant')
              .map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
            {isLoading &&
              messages.length > 0 &&
              messages[messages.length - 1].role !== 'assistant' && (
                <TypingIndicator />
              )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 text-sm text-red-400 bg-red-400/10 border-t border-red-400/20">
          Something went wrong. Try again.
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-border px-4 py-3 pb-[env(safe-area-inset-bottom,12px)] shrink-0">
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>
    </div>
  );
}
