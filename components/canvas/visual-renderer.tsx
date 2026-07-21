'use client';

import type { ChapterVisual } from '@/types/chapter';
import { CompetitorMatrix } from '@/components/charts/competitor-matrix';
import { EvidenceCards } from '@/components/charts/evidence-cards';
import { ImpactWaterfall } from '@/components/charts/impact-waterfall';
import { OpportunityRanking } from '@/components/charts/opportunity-ranking';
import { StatRow } from '@/components/charts/stat-row';
import { TrendLines } from '@/components/charts/trend-lines';
import { VolumeTrap } from '@/components/charts/volume-trap';
import { AccountSnapshot } from '@/components/charts/account-snapshot';
import { ComparisonBars } from '@/components/charts/comparison-bars';
import { SourceMix } from '@/components/charts/source-mix';
import { NoDataState } from './no-data-state';

// The one switch that maps the streaming contract onto chart components.
// Adding a visual = add a member to ChapterVisual in /types/chapter.ts,
// build the component, add a case here.
export const VisualRenderer = ({ visual }: { visual: ChapterVisual }): JSX.Element => {
  switch (visual.type) {
    case 'stat_row':
      return <StatRow stats={visual.data.stats} />;
    case 'opportunity_ranking':
      return <OpportunityRanking data={visual.data} />;
    case 'volume_trap':
      return <VolumeTrap points={visual.data.points} />;
    case 'evidence_cards':
      return <EvidenceCards data={visual.data} />;
    case 'competitor_matrix':
      return <CompetitorMatrix data={visual.data} />;
    case 'impact_waterfall':
      return <ImpactWaterfall data={visual.data} />;
    case 'impact_breakdown':
      return <ImpactWaterfall data={visual.data} showDetails />;
    case 'account_snapshot':
      return <AccountSnapshot data={visual.data} />;
    case 'trend_lines':
      return <TrendLines series={visual.data.series} />;
    case 'comparison_bars':
      return <ComparisonBars data={visual.data} />;
    case 'source_mix':
      return <SourceMix data={visual.data} />;
    case 'no_data':
      return <NoDataState outcome={visual.data} />;
  }
};
