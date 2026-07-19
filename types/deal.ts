import type { ThemeId } from './theme';

// Mirrors the `deals` table in lib/db/schema.postgres.sql.
export type DealStatus = 'won' | 'lost' | 'in_progress';

export interface Deal {
  id: string;
  account_id: string;
  name: string;
  status: DealStatus;
  amount: number;                     // deal ARR value in USD
  close_date: string | null;         // ISO date; null while in_progress
  loss_reason: string | null;        // null unless lost
  blocking_theme_id: ThemeId | null; // theme that blocked/lost the deal
  competitor_id: string | null;      // competitor we lost to
  created_at: string;                // ISO datetime
  updated_at: string;                // ISO datetime
}
