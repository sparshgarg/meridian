import { createClient, type ClickHouseClient } from '@clickhouse/client';

// ── Person A: this is your file. ─────────────────────────────────────────────
// Scaffolded by Person B so env wiring + deps exist; replace/extend freely.
// Env vars are documented in .env.example. The frontend never imports this —
// ClickHouse is only reached from Trigger.dev tasks and the agent's tools.

let client: ClickHouseClient | null = null;

export const clickhouse = (): ClickHouseClient => {
  if (!client) {
    const url = process.env.CLICKHOUSE_URL;
    if (!url) throw new Error('CLICKHOUSE_URL is not set — copy .env.example to .env.local');
    client = createClient({
      url,
      username: process.env.CLICKHOUSE_USER ?? 'default',
      password: process.env.CLICKHOUSE_PASSWORD ?? '',
      database: process.env.CLICKHOUSE_DATABASE ?? 'meridian',
    });
  }
  return client;
};
