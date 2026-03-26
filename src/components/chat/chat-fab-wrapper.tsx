'use client';

import dynamic from 'next/dynamic';

const ChatFAB = dynamic(
  () => import('@/components/chat/chat-fab').then((m) => ({ default: m.ChatFAB })),
  { ssr: false }
);

export function ChatFABWrapper() {
  return <ChatFAB />;
}
