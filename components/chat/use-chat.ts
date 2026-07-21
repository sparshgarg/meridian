'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  Chapter,
  ChatRequest,
  StatusUpdate,
  StreamEvent,
  VisualAction,
} from '@/types/chapter';
import {
  popAnswer,
  pushAnswer,
  type AnswerNavigationState,
} from './answer-navigation';

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
  navigation: AnswerNavigationState;
  focusRestoreKey: number;
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
          {
            id: event.chapter_id,
            title: event.title,
            icon: event.icon,
            intro: '',
            callouts: [],
            actions: [],
          },
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
    case 'chapter_actions':
      return mapChapter(turn, event.chapter_id, (c) => ({ ...c, actions: event.actions }));
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
  const [state, setState] = useState<ChatState>({
    turns: [],
    isStreaming: false,
    activeTurnId: null,
    navigation: { stack: [] },
    focusRestoreKey: 0,
  });
  const stateRef = useRef(state);
  stateRef.current = state;
  const conversationId = useRef(`conv_${Date.now().toString(36)}`);
  const scrollPositions = useRef(new Map<string, number>());

  const restorePreviousAnswer = useCallback(() => {
    setState((current) => {
      const { navigation, entry } = popAnswer(current.navigation);
      if (!entry) return current;
      scrollPositions.current.set(entry.turnId, entry.scrollTop);
      return {
        ...current,
        navigation,
        activeTurnId: entry.turnId,
        focusRestoreKey: current.focusRestoreKey + 1,
      };
    });
  }, []);

  useEffect(() => {
    const handlePopState = (): void => {
      if (stateRef.current.navigation.stack.length > 0) restorePreviousAnswer();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [restorePreviousAnswer]);

  const setActiveTurn = useCallback((id: string) => {
    setState((s) => ({ ...s, activeTurnId: id }));
  }, []);

  const submit = useCallback(async (
    content: string,
    action?: VisualAction,
  ): Promise<void> => {
    const userTurn: UserTurn = { role: 'user', id: `u_${Date.now().toString(36)}`, content };
    const assistantId = `a_${Date.now().toString(36)}`;
    const assistantTurn: AssistantTurn = {
      role: 'assistant', id: assistantId, state: 'streaming', statuses: [], chapters: [],
    };
    const parentTurnId = action ? stateRef.current.activeTurnId : null;
    const parentEntry = parentTurnId
      ? { turnId: parentTurnId, scrollTop: scrollPositions.current.get(parentTurnId) ?? 0 }
      : null;

    const history: ChatRequest['messages'] = [
      ...stateRef.current.turns.map((turn) => ({
        role: turn.role,
        content: turn.role === 'user' ? turn.content : turn.headline ?? '',
      })),
      { role: 'user', content },
    ];
    setState((current) => ({
      turns: [...current.turns, userTurn, assistantTurn],
      isStreaming: true,
      activeTurnId: assistantId,
      navigation: parentEntry ? pushAnswer(current.navigation, parentEntry) : current.navigation,
      focusRestoreKey: current.focusRestoreKey,
    }));
    if (parentEntry) {
      window.history.pushState(
        { meridianAnswerDepth: stateRef.current.navigation.stack.length + 1 },
        '',
      );
    }

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
          action: action
            ? { type: 'deep_dive', id: action.id, theme_id: action.theme_id }
            : undefined,
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

  const sendMessage = useCallback((content: string): Promise<void> => submit(content), [submit]);
  const sendAction = useCallback(
    (action: VisualAction): Promise<void> => submit(action.label, action),
    [submit],
  );
  const setScrollPosition = useCallback((turnId: string, scrollTop: number) => {
    scrollPositions.current.set(turnId, scrollTop);
  }, []);
  const getScrollPosition = useCallback(
    (turnId: string): number => scrollPositions.current.get(turnId) ?? 0,
    [],
  );
  const goBack = useCallback(() => {
    if (stateRef.current.navigation.stack.length === 0) return;
    if (window.history.state?.meridianAnswerDepth) {
      window.history.back();
      return;
    }
    restorePreviousAnswer();
  }, [restorePreviousAnswer]);

  return {
    ...state,
    canGoBack: state.navigation.stack.length > 0,
    sendMessage,
    sendAction,
    setActiveTurn,
    goBack,
    setScrollPosition,
    getScrollPosition,
  };
};
