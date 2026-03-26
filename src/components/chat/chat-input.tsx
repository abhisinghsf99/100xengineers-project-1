'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowUp } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');

  const trimmed = input.trim();

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="flex-1 flex items-center border border-border rounded-full px-4 py-2 bg-muted/50">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your finances..."
          disabled={disabled}
          className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
        />
      </div>
      {trimmed && (
        <button
          type="submit"
          disabled={disabled}
          aria-label="Send message"
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors duration-200 cursor-pointer disabled:opacity-50"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </form>
  );
}
