// Mirrors the `raw_tickets` table in lib/db/schema.postgres.sql. Append-only.
export interface RawTicket {
  id: string;
  external_id: string;         // e.g. 'TICK-00123'
  account_id: string;
  subject: string;
  body: string;
  status: string | null;       // open / pending / closed
  priority: string | null;     // low / medium / high / urgent
  opened_at: string;           // ISO datetime — event date
  created_at: string;          // ISO datetime — audit / load time
}
