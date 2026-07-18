'use client';

import { useCallback, useRef, useState } from 'react';
import type { Chapter, ChatRequest, StatusUpdate, StreamEvent } from '@/types/chapter';

export interface AssistantTurn {
  role: 'assistant';
  id: string;
  state: 'streaming' | 'done' | 'error';
  statuses: StatusUpdate[];
  chapters: Chapter[];
  headline?: string;
  error?: string;
}

export interface UserTurn {
  role: 'user';
  id: string;
  content: string;
}

export type Turn = UserTurn | AssistantTurn;

interface ChatState {
  turns: Turn[];
  isStreaming: boolean;
  // which assistant turn the canvas is showing; defaults to the latest
  activeTurnId: string | null;
}

const applyEvent = (turn: AssistantTurn, event: StreamEvent): AssistantTurn => {
  switch (event.type) {
    case 'status': {
      const rest = turn.statuses.filter((s) => s.id !== event.status.id);
      return { ...turn, statuses: [...rest, event.status] };
    }
    case 'chapter_start':
      return {
        ...turn,
        chapters: [
          ...turn.chapters,
          { id: event.chapter_id, title: event.title, icon: event.icon, intro: '', callouts: [] },
        ],
      };
    case 'chapter_intro_delta':
      return mapChapter(turn, event.chapter_id, (c) => ({ ...c, intro: c.intro + event.delta }));
    case 'chapter_visual':
      return mapChapter(turn, event.chapter_id, (c) => ({ ...c, visual: event.visual }));
    case 'chapter_callout':
      return mapChapter(turn, event.chapter_id, (c) => ({
        ...c,
        callouts: [...c.callouts, event.callout],
      }));
    case 'message_end':
      return { ...turn, state: 'done', headline: event.headline };
    case 'error':
      return { ...turn, state: 'error', error: event.message };
    default:
      return turn;
  }
};

const mapChapter = (
  turn: AssistantTurn,
  chapterId: string,
  fn: (c: Chapter) => Chapter,
): AssistantTurn => ({
  ...turn,
  chapters: turn.chapters.map((c) => (c.id === chapterId ? fn(c) : c)),
});

export const useChat = () => {
  const [state, setState] = useState<ChatState>({ turns: [], isStreaming: false, activeTurnId: null });
  const conversationId = useRef(`conv_${Date.now().toString(36)}`);

  const setActiveTurn = useCallback((id: string) => {
    setState((s) => ({ ...s, activeTurnId: id }));
  }, []);

  const sendMessage = useCallback(async (content: string): Promise<void> => {
    const userTurn: UserTurn = { role: 'user', id: `u_${Date.now().toString(36)}`, content };
    const assistantId = `a_${Date.now().toString(36)}`;
    const assistantTurn: AssistantTurn = {
      role: 'assistant', id: assistantId, state: 'streaming', statuses: [], chapters: [],
    };

    let history: ChatRequest['messages'] = [];
    setState((s) => {
      history = [
        ...s.turns.map((t) => ({
          role: t.role,
          content: t.role === 'user' ? t.content : t.headline ?? '',
        })),
        { role: 'user' as const, content },
      ];
      return {
        turns: [...s.turns, userTurn, assistantTurn],
        isStreaming: true,
        activeTurnId: assistantId,
      };
    });

    const update = (event: StreamEvent): void => {
      setState((s) => ({
        ...s,
        turns: s.turns.map((t) =>
          t.role === 'assistant' && t.id === assistantId ? applyEvent(t, event) : t,
        ),
      }));
    };

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId.current,
          messages: history,
        } satisfies ChatRequest),
      });
      if (!res.ok || !res.body) throw new Error(`agent returned ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.trim()) update(JSON.parse(line) as StreamEvent);
        }
      }
    } catch (err) {
      update({ type: 'error', message: err instanceof Error ? err.message : 'connection lost' });
    } finally {
      setState((s) => ({ ...s, isStreaming: false }));
    }
  }, []);

  return { ...state, sendMessage, setActiveTurn };
};
