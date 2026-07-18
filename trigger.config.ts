import { defineConfig } from '@trigger.dev/sdk/v3';

// Project ref comes from the Trigger.dev dashboard; set TRIGGER_PROJECT_REF in
// .env.local (see .env.example). The placeholder keeps local dev/build working
// before keys exist.
export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF ?? 'proj_placeholder',
  dirs: ['./trigger'],
  maxDuration: 300,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1_000,
      maxTimeoutInMs: 10_000,
      factor: 2,
      randomize: true,
    },
  },
});
