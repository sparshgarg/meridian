export interface AnswerHistoryEntry {
  turnId: string;
  scrollTop: number;
}

export interface AnswerNavigationState {
  stack: AnswerHistoryEntry[];
}

export const pushAnswer = (
  navigation: AnswerNavigationState,
  entry: AnswerHistoryEntry,
): AnswerNavigationState => ({
  stack: [...navigation.stack, entry],
});

export const popAnswer = (
  navigation: AnswerNavigationState,
): { navigation: AnswerNavigationState; entry: AnswerHistoryEntry | null } => {
  const entry = navigation.stack[navigation.stack.length - 1] ?? null;
  return {
    navigation: { stack: navigation.stack.slice(0, -1) },
    entry,
  };
};
