# lib/queries

Typed, parameterized ClickHouse aggregation functions backing the agent tools:
opportunity ranking, account signals, theme evidence/trends, competitive
position, impact projection, and filtered signal comparison/source mix.

`signal-comparison.ts` composes bounded theme, segment, industry, and time-window
filters across `meridian.mentions` plus the `default.public_accounts` and
`default.public_themes` CDC replicas. It returns provenance and matched-account
counts so the agent can distinguish an unknown filter from a valid zero-result
query. No function accepts model-generated SQL or performs Postgres analytics.

Owner: Person A.
