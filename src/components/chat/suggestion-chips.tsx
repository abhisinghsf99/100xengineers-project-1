'use client';

import { SUGGESTION_CHIPS } from '@/lib/chat-config';

interface SuggestionChipsProps {
  onSelect: (text: string) => void;
}

export function SuggestionChips({ onSelect }: SuggestionChipsProps) {
  return (
    <div className="flex flex-col items-center gap-4 px-4">
      <p className="text-muted-foreground text-center text-sm">
        Ask me anything about your finances
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTION_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onSelect(chip)}
            className="border border-border rounded-full px-4 py-2 text-sm hover:bg-muted transition-colors duration-200 cursor-pointer"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
