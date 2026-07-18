export const formatUsd = (n: number): string => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
};

export const formatCount = (n: number): string => n.toLocaleString('en-US');

export const segmentLabel: Record<'enterprise' | 'mid_market' | 'smb', string> = {
  enterprise: 'Enterprise',
  mid_market: 'Mid-market',
  smb: 'SMB',
};
