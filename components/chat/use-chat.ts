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
  suggested_followups?: string[];
  error?: string;
  retryable?: boolean;
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
    case 'message_start':
      return {
        ...turn,
        statuses: turn.statuses.map((status) =>
          status.id.endsWith('_sending')
            ? { ...status, state: 'done', detail: 'Server connected' }
            : status,
        ),
      };
    case 'status': {
      const acknowledged = turn.statuses.map((status) =>
        status.id.endsWith('_sending') && status.state === 'running'
          ? { ...status, state: 'done' as const, detail: 'Server connected' }
          : status,
      );
      const rest = acknowledged.filter((s) => s.id !== event.status.id);
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
    case 'no_data':
      return turn;
    case 'message_end':
      return {
        ...turn,
        state: 'done',
        headline: event.headline,
        suggested_followups: event.suggested_followups,
      };
    case 'error':
      return { ...turn, state: 'error', error: event.message, retryable: event.retryable ?? true };
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

const emptyState = (): ChatState => ({
  turns: [],
  isStreaming: false,
  activeTurnId: null,
  navigation: { stack: [] },
  focusRestoreKey: 0,
});

export const useChat = () => {
  const [state, setState] = useState<ChatState>(emptyState);
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

  const startOver = useCallback((): boolean => {
    if (stateRef.current.isStreaming) {
      const confirmed = window.confirm(
        'An answer is still streaming. Start a new chat and discard this conversation?',
      );
      if (!confirmed) return false;
    } else if (stateRef.current.turns.length > 0) {
      const confirmed = window.confirm('Start a new chat? This clears the conversation and canvas.');
      if (!confirmed) return false;
    }
    conversationId.current = `conv_${Date.now().toString(36)}`;
    scrollPositions.current.clear();
    setState(emptyState());
    return true;
  }, []);

  const submit = useCallback(async (
    content: string,
    action?: VisualAction,
  ): Promise<void> => {
    const userTurn: UserTurn = { role: 'user', id: `u_${Date.now().toString(36)}`, content };
    const assistantId = `a_${Date.now().toString(36)}`;
    const assistantTurn: AssistantTurn = {
      role: 'assistant',
      id: assistantId,
      state: 'streaming',
      statuses: [{
        id: `${assistantId}_sending`,
        label: 'Understanding your question',
        detail: 'Contacting Trigger.dev',
        state: 'running',
        source: 'trigger',
        phase: 'understanding',
      }],
      chapters: [],
    };
    const parentTurnId = action ? stateRef.current.activeTurnId : null;
    const parentEntry = parentTurnId
      ? { turnId: parentTurnId, scrollTop: scrollPositions.current.get(parentTurnId) ?? 0 }
      : null;

    // Full prior turns so follow-ups like "enterprise only" keep context.
    const history: ChatRequest['messages'] = [
      ...stateRef.current.turns.map((turn) => ({
        role: turn.role,
        content: turn.role === 'user' ? turn.content : turn.headline ?? '',
      })),
      { role: 'user', content },
    ];
    setState((current) => ({
      // Append — never wipe prior Q&A on a new send.
      turns: [...current.turns, userTurn, assistantTurn],
      isStreaming: true,
      activeTurnId: assistantId,
      // Deep dives push Back stack; top-level questions start a fresh branch.
      navigation: parentEntry
        ? pushAnswer(current.navigation, parentEntry)
        : { stack: [] },
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

    let timeout: number | undefined;
    try {
      const controller = new AbortController();
      timeout = window.setTimeout(() => controller.abort(), 185_000);
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
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        throw new Error(`Agent returned HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let terminal = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as StreamEvent;
          update(event);
          if (event.type === 'message_end' || event.type === 'error') terminal = true;
        }
      }
      if (buffer.trim()) {
        const event = JSON.parse(buffer) as StreamEvent;
        update(event);
        if (event.type === 'message_end' || event.type === 'error') terminal = true;
      }
      if (!terminal) throw new Error('The answer stream ended before completion.');
    } catch (err) {
      const timedOut = err instanceof DOMException && err.name === 'AbortError';
      update({
        type: 'error',
        code: timedOut ? 'timeout' : 'network',
        retryable: true,
        message: timedOut
          ? 'The agent took too long to respond.'
          : err instanceof Error ? err.message : 'Connection lost.',
      });
    } finally {
      if (timeout !== undefined) window.clearTimeout(timeout);
      setState((s) => ({ ...s, isStreaming: false }));
    }
  }, []);

  const sendMessage = useCallback((content: string): Promise<void> => submit(content), [submit]);
  const retryTurn = useCallback((assistantId: string): Promise<void> => {
    const index = stateRef.current.turns.findIndex((turn) => turn.id === assistantId);
    const prior = index > 0 ? stateRef.current.turns[index - 1] : null;
    return prior?.role === 'user' ? submit(prior.content) : Promise.resolve();
  }, [submit]);
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

  const latestAssistantId = [...state.turns]
    .reverse()
    .find((turn): turn is AssistantTurn => turn.role === 'assistant')?.id ?? null;

  return {
    ...state,
    // Back only while viewing the tip of a deep-dive branch (not a past rail chip).
    canGoBack:
      state.navigation.stack.length > 0 && state.activeTurnId === latestAssistantId,
    sendMessage,
    retryTurn,
    sendAction,
    setActiveTurn,
    startOver,
    goBack,
    setScrollPosition,
    getScrollPosition,
  };
};
