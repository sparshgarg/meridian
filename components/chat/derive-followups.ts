import type { Chapter, VisualType } from '@/types/chapter';

export interface FollowupSource {
  suggested_followups?: string[];
  chapters: Chapter[];
}

/** Scripted prioritize path — deep-dive style next questions. */
export const PRIORITIZE_FOLLOWUPS = [
  'Why shouldn’t we prioritize dunning email customization?',
  'Tell me more about multi-entity consolidated invoicing',
  'Where are competitors beating us on usage-based billing?',
  'What does Figma want?',
  'Which themes are growing fastest over the last 90 days?',
] as const;

const DEFAULT_FOLLOWUPS = [
  'What should we prioritize next quarter?',
  'What does Figma want?',
  'Which themes are growing fastest over the last 90 days?',
  'Compare usage-based billing with dunning for enterprise accounts',
  'Where are competitors beating us on usage-based billing?',
] as const;

const byVisual = (types: Set<VisualType>): string[] => {
  if (types.has('opportunity_ranking') || types.has('impact_waterfall')) {
    return [...PRIORITIZE_FOLLOWUPS];
  }
  if (types.has('volume_trap')) {
    return [
      'Tell me more about multi-entity consolidated invoicing',
      'What should we prioritize next quarter?',
      'What does Figma want?',
      'Which themes are growing fastest over the last 90 days?',
    ];
  }
  if (types.has('evidence_cards')) {
    return [
      'Where are competitors beating us on usage-based billing?',
      'What is the ARR impact of usage-based billing?',
      'What does Figma want?',
      'What should we prioritize next quarter?',
    ];
  }
  if (types.has('competitor_matrix')) {
    return [
      'What should we prioritize next quarter?',
      'Tell me more about multi-entity consolidated invoicing',
      'What does Figma want?',
      'Which themes are growing fastest over the last 90 days?',
    ];
  }
  if (types.has('account_snapshot')) {
    return [
      'What should we prioritize next quarter?',
      'Compare usage-based billing with dunning for enterprise accounts',
      'Which themes are growing fastest over the last 90 days?',
      'Where are competitors beating us on usage-based billing?',
    ];
  }
  if (types.has('trend_lines')) {
    return [
      'What should we prioritize next quarter?',
      'Compare usage-based billing with dunning for enterprise accounts',
      'What does Figma want?',
      'Are support tickets or interviews driving multi-entity demand?',
    ];
  }
  if (types.has('comparison_bars') || types.has('source_mix')) {
    return [
      'What should we prioritize next quarter?',
      'Show mention volume by industry for the last 90 days',
      'What does Figma want?',
      'Where are competitors beating us on usage-based billing?',
    ];
  }
  if (types.has('no_data')) {
    return [
      'What should we prioritize next quarter?',
      'What does Figma want?',
      'Which themes are growing fastest over the last 90 days?',
    ];
  }
  return [...DEFAULT_FOLLOWUPS];
};

/** Prefer agent-emitted followups; otherwise derive from the answer visuals. */
export const deriveFollowups = (turn: FollowupSource): string[] => {
  if (turn.suggested_followups && turn.suggested_followups.length > 0) {
    return turn.suggested_followups.slice(0, 5);
  }
  const types = new Set(
    turn.chapters
      .map((chapter) => chapter.visual?.type)
      .filter((type): type is VisualType => type !== undefined),
  );
  return byVisual(types).slice(0, 5);
};
