'use client';

import { Canvas } from '@/components/canvas/canvas';
import { ChatRail } from '@/components/chat/chat-rail';
import { useChat } from '@/components/chat/use-chat';

// The whole app is one full-screen workspace: chat rail + answer canvas.
export default function ChatPage(): JSX.Element {
  const { turns, isStreaming, activeTurnId, sendMessage, sendAction, setActiveTurn } = useChat();

  const activeTurn =
    turns.find((t) => t.role === 'assistant' && t.id === activeTurnId) ?? null;
  const activeIdx = activeTurn ? turns.indexOf(activeTurn) : -1;
  const promptTurn = activeIdx > 0 ? turns[activeIdx - 1] : null;
  const prompt = promptTurn?.role === 'user' ? promptTurn.content : null;

  return (
    <main className="flex h-screen gap-4 p-4">
      <ChatRail
        turns={turns}
        isStreaming={isStreaming}
        activeTurnId={activeTurnId}
        onSend={(content) => void sendMessage(content)}
        onSelectTurn={setActiveTurn}
      />
      <section className="min-w-0 flex-1 overflow-hidden rounded-3xl">
        <Canvas
          turn={activeTurn?.role === 'assistant' ? activeTurn : null}
          prompt={prompt}
          actionsDisabled={activeTurn?.role === 'assistant' && activeTurn.state === 'streaming'}
          onAction={(action) => void sendAction(action)}
        />
      </section>
    </main>
  );
}
