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

// ── Typed helpers ────────────────────────────────────────────────────────────
// Narrow wrappers so the agent's tools and Trigger tasks never touch the raw
// client. query() uses JSON format so every call yields row-count + elapsed for
// the status ticker; insertBatch() is the bulk-load workhorse for mentions.

export interface QueryResult<T> {
  data: T[];
  rows: number;
  elapsedMs: number;
}

// Raised with context (sql/table + params) so a failure is debuggable without
// re-plumbing logging at every call site. Preserves the driver error as `cause`.
export class ClickHouseError extends Error {
  constructor(
    message: string,
    readonly context: Record<string, unknown>,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'ClickHouseError';
  }
}

// Read path. JSON format (not JSONEachRow) so we get statistics for the ticker.
// Aggregations are small, so buffering the whole response is fine here.
export const query = async <T>(
  sql: string,
  params?: Record<string, unknown>,
): Promise<QueryResult<T>> => {
  try {
    const resultSet = await clickhouse().query({
      query: sql,
      query_params: params,
      format: 'JSON',
    });
    const body = await resultSet.json<T>();
    return {
      data: body.data,
      rows: body.rows ?? body.data.length,
      // ClickHouse reports elapsed in seconds; the ticker wants ms.
      elapsedMs: Math.round((body.statistics?.elapsed ?? 0) * 1000),
    };
  } catch (err) {
    // Truncate only the copy kept for logging; the full sql was already sent above.
    throw new ClickHouseError(
      'ClickHouse query failed',
      { sql: sql.slice(0, 200), params },
      { cause: err },
    );
  }
};

// Bulk write path — the workhorse for loading mentions. Chunks large batches so
// a single 5k-row insert doesn't become one oversized request; on failure the
// error reports how many rows landed before the throw.
export const insertBatch = async <T>(
  table: string,
  rows: T[],
  chunkSize = 1000,
): Promise<{ inserted: number }> => {
  if (rows.length === 0) return { inserted: 0 };
  let inserted = 0;
  try {
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await clickhouse().insert({ table, values: chunk, format: 'JSONEachRow' });
      inserted += chunk.length;
    }
    return { inserted };
  } catch (err) {
    throw new ClickHouseError(
      'ClickHouse insert failed',
      { table, batchSize: rows.length, insertedBeforeError: inserted, chunkSize },
      { cause: err },
    );
  }
};

// Health check for schema-init and task startup. Returns false rather than
// throwing — callers decide whether a dead connection is fatal.
export const ping = async (): Promise<boolean> => {
  const result = await clickhouse().ping();
  return result.success;
};
