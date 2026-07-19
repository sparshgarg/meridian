import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Zod schemas for the design artifacts in /data/seed. Reference schemas mirror
// the locked types (Account, Theme, Competitor); DB-managed audit columns
// (created_at/updated_at) are omitted since the artifacts don't carry them.

export const AccountArtifact = z.object({
  id: z.string().uuid().optional(), // loader generates a UUID if absent
  name: z.string(),
  industry: z.string(),
  employee_count: z.number().int(),
  arr: z.number(),
  segment: z.enum(['enterprise', 'mid_market', 'smb']),
  health_score: z.number().int().min(0).max(100),
  renewal_date: z.string(),
  primary_contact_name: z.string(),
  primary_contact_role: z.string(),
});

export const ThemeArtifact = z.object({
  id: z.string(), // slug ThemeId (required)
  name: z.string(),
  short_description: z.string(),
  category: z.enum(['billing', 'invoicing', 'tax', 'revrec', 'integrations', 'other']),
  first_seen_at: z.string(),
  last_seen_at: z.string(),
});

const FeatureSupport = z.enum(['full', 'partial', 'none']);
export const CompetitorArtifact = z.object({
  id: z.string().uuid().optional(), // loader generates a UUID if absent
  name: z.string(),
  is_self: z.boolean(),
  features: z.record(z.string(), FeatureSupport),
  gap_notes: z.record(z.string(), z.string()).nullable().optional(),
});

// ── Opportunity truth (generation guidance) ──────────────────────────────────
const Recommendation = z.enum(['build_now', 'build_next', 'watch', 'deprioritize']); // matches OpportunityRow
const SegmentSkew = z.enum(['enterprise', 'mid_market', 'smb', 'mixed']);
const PlantedRole = z.enum(['blocked_deal', 'top_requester', 'passing_mention']);
const Sentiment = z.union([z.literal(-1), z.literal(0), z.literal(1)]);
const Severity = z.number().int().min(1).max(5);

export const ThemeTruth = z.object({
  theme_id: z.string(),
  rank: z.number().int(),
  recommendation: Recommendation,
  rationale: z.string(),
  target_volume: z.object({
    tickets: z.number().int().nonnegative(),
    transcripts: z.number().int().nonnegative(),
    deal_losses: z.number().int().nonnegative(),
  }),
  segment_skew: SegmentSkew,
  severity_bias: Severity,
  sentiment_bias: Sentiment,
});

export const PlantedAccount = z.object({
  theme_id: z.string(),
  account_name: z.string(), // resolved to an account_id at plan time
  role: PlantedRole,
  severity: Severity,
});

export const OpportunityTruth = z.object({
  themes: z.array(ThemeTruth),
  planted_accounts: z.array(PlantedAccount), // guaranteed requesters, planted before quota fill
});

export type AccountArtifact = z.infer<typeof AccountArtifact>;
export type ThemeArtifact = z.infer<typeof ThemeArtifact>;
export type CompetitorArtifact = z.infer<typeof CompetitorArtifact>;
export type OpportunityTruth = z.infer<typeof OpportunityTruth>;

export interface SeedArtifacts {
  accounts: AccountArtifact[];
  themes: ThemeArtifact[];
  competitors: CompetitorArtifact[];
  truth: OpportunityTruth;
}

const formatZodError = (error: z.ZodError): string =>
  error.issues.map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');

// Fail fast with a distinct message for missing file vs malformed JSON vs
// schema violation, so a bad artifact is obvious before any DB or LLM work.
const parseFile = <S extends z.ZodTypeAny>(path: string, schema: S, label: string): z.infer<S> => {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    throw new Error(`Missing seed artifact: ${label} (expected at ${path})`);
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Malformed JSON in ${label}: ${err instanceof Error ? err.message : String(err)}`);
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new Error(`Validation failed for ${label}:\n${formatZodError(result.error)}`);
  }
  return result.data;
};

export const loadArtifacts = (seedDir: string): SeedArtifacts => ({
  accounts: parseFile(join(seedDir, 'accounts.json'), z.array(AccountArtifact), 'accounts.json'),
  themes: parseFile(join(seedDir, 'themes.json'), z.array(ThemeArtifact), 'themes.json'),
  competitors: parseFile(join(seedDir, 'competitors.json'), z.array(CompetitorArtifact), 'competitors.json'),
  truth: parseFile(join(seedDir, 'opportunity-truth.json'), OpportunityTruth, 'opportunity-truth.json'),
});
