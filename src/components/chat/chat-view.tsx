'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useChat, type UIMessage } from '@ai-sdk/react';
import { ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import { ChatMessage } from '@/components/chat/chat-message';
import { ChatInput } from '@/components/chat/chat-input';
import { SuggestionChips } from '@/components/chat/suggestion-chips';
import { TypingIndicator } from '@/components/chat/typing-indicator';

interface ChatViewProps {
  onClose: () => void;
}

/**
 * Extract plain text content from a UIMessage.
 * Messages can have parts (text, tool-call, etc.) — we only want the text.
 */
function getMessageText(message: UIMessage): string {
  if (message.parts) {
    return message.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('\n');
  }
  return '';
}

export function ChatView({ onClose }: ChatViewProps) {
  const { messages, sendMessage, status, setMessages, error } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const savedIdsRef = useRef<Set<string>>(new Set());

  const isLoading = status === 'streaming' || status === 'submitted';
  const isEmpty = messages.length === 0 && !isLoadingHistory;

  // Load chat history from Supabase on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch('/api/chat/history');
        if (!res.ok) return;
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          const restored: UIMessage[] = data.messages.map(
            (m: { id: string; role: string; content: string; created_at: string }) => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              parts: [{ type: 'text' as const, text: m.content }],
              createdAt: new Date(m.created_at),
            })
          );
          // Track all loaded IDs so we don't re-save them
          restored.forEach((m) => savedIdsRef.current.add(m.id));
          setMessages(restored);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    }
    loadHistory();
  }, [setMessages]);

  // Save new messages to Supabase whenever the messages array updates
  // and we're not actively streaming
  useEffect(() => {
    if (status === 'streaming' || status === 'submitted') return;
    if (messages.length === 0) return;

    const unsaved = messages.filter(
      (m) =>
        (m.role === 'user' || m.role === 'assistant') &&
        !savedIdsRef.current.has(m.id)
    );

    if (unsaved.length === 0) return;

    // Save each unsaved message
    const toSave = unsaved.map((m) => ({
      id: m.id,
      role: m.role,
      content: getMessageText(m),
    }));

    // Mark as saved immediately to prevent duplicates
    unsaved.forEach((m) => savedIdsRef.current.add(m.id));

    fetch('/api/chat/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: toSave }),
    }).catch((err) => {
      console.error('Failed to save chat messages:', err);
      // Remove from saved set so we retry next time
      unsaved.forEach((m) => savedIdsRef.current.delete(m.id));
    });
  }, [messages, status]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  function handleSend(text: string) {
    sendMessage({ parts: [{ type: 'text', text }] });
  }

  const handleNewChat = useCallback(async () => {
    // Clear messages locally
    setMessages([]);
    savedIdsRef.current.clear();
    // Clear from Supabase
    try {
      await fetch('/api/chat/history', { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to clear chat history:', err);
    }
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
        {isLoadingHistory ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : isEmpty ? (
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
