// Mirrors the `competitors` table in lib/db/schema.postgres.sql.

// Three-state feature support in the competitor matrix (rendered ✅/🟡/❌).
export type FeatureSupport = 'full' | 'partial' | 'none';

export interface Competitor {
  id: string;
  name: string;
  is_self: boolean;                          // true = the Meridian self row
  features: Record<string, FeatureSupport>;  // feature_name -> support level
  gap_notes: Record<string, string> | null; // feature_name -> note (mainly self)
  created_at: string;                        // ISO datetime
}
