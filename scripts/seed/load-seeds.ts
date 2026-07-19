import { withTransaction } from '../../lib/db/postgres';
import type { SeedArtifacts } from './artifacts';

export interface LoadCounts {
  accounts: number;
  themes: number;
  competitors: number;
}

// Load reference data (accounts/themes/competitors) from the design artifacts
// into Postgres, atomically. Idempotent when accounts carry stable IDs
// (ON CONFLICT); competitors dedupe on their UNIQUE name. Run before --generate.
export const loadSeeds = async (artifacts: SeedArtifacts): Promise<LoadCounts> =>
  withTransaction(async (client) => {
    for (const a of artifacts.accounts) {
      await client.query(
        `INSERT INTO accounts
           (id, name, industry, employee_count, arr, segment, health_score, renewal_date,
            primary_contact_name, primary_contact_role)
         VALUES (COALESCE($1::uuid, uuid_generate_v4()), $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
        [
          a.id ?? null,
          a.name,
          a.industry,
          a.employee_count,
          a.arr,
          a.segment,
          a.health_score,
          a.renewal_date,
          a.primary_contact_name,
          a.primary_contact_role,
        ],
      );
    }

    for (const t of artifacts.themes) {
      await client.query(
        `INSERT INTO themes (id, name, short_description, category, first_seen_at, last_seen_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [t.id, t.name, t.short_description, t.category, t.first_seen_at, t.last_seen_at],
      );
    }

    for (const c of artifacts.competitors) {
      await client.query(
        `INSERT INTO competitors (id, name, is_self, features, gap_notes)
         VALUES (COALESCE($1::uuid, uuid_generate_v4()), $2, $3, $4, $5)
         ON CONFLICT (name) DO NOTHING`,
        [c.id ?? null, c.name, c.is_self, JSON.stringify(c.features), c.gap_notes ? JSON.stringify(c.gap_notes) : null],
      );
    }

    return {
      accounts: artifacts.accounts.length,
      themes: artifacts.themes.length,
      competitors: artifacts.competitors.length,
    };
  });
