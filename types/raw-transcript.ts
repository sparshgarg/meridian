// Mirrors the `raw_transcripts` table in lib/db/schema.postgres.sql. Append-only.
export interface RawTranscript {
  id: string;
  external_id: string;          // e.g. 'INT-012'
  account_id: string;
  title: string;
  interviewee_name: string;
  interviewee_role: string;
  interview_date: string;       // ISO date — event date
  duration_minutes: number | null;
  transcript: string;
  created_at: string;           // ISO datetime — audit / load time
}
