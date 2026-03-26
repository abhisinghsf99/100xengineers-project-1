'use client';

import { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { ChatView } from '@/components/chat/chat-view';

interface ChatFABProps {
  externalOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ChatFAB({ externalOpen, onOpenChange }: ChatFABProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Sync external open state
  useEffect(() => {
    if (externalOpen !== undefined) {
      setIsOpen(externalOpen);
    }
  }, [externalOpen]);

  // Listen for open-chat custom event from mobile nav
  useEffect(() => {
    function handleOpenChat() {
      setIsOpen(true);
      onOpenChange?.(true);
    }
    window.addEventListener('open-chat', handleOpenChat);
    return () => window.removeEventListener('open-chat', handleOpenChat);
  }, [onOpenChange]);

  function handleClose() {
    setIsOpen(false);
    onOpenChange?.(false);
  }

  if (isOpen) {
    return <ChatView onClose={handleClose} />;
  }

  return (
    <button
      type="button"
      onClick={() => {
        setIsOpen(true);
        onOpenChange?.(true);
      }}
      aria-label="Open chat"
      className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 h-14 w-14 rounded-full shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transition-colors duration-200 cursor-pointer"
    >
      <MessageSquare className="h-6 w-6" />
    </button>
  );
}
