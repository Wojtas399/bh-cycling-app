import { athleteFromEnv } from './e2e/support/athlete';
import { claudeCode } from '@e2e-dev/acp';
import { mobile } from '@e2e-dev/mobile';
import type { E2EConfig } from 'e2e';
import { existsSync } from 'node:fs';

// Every worker imports this file again, so the env reaches the tests too.
const envFile = new URL('.env.local', import.meta.url);

if (existsSync(envFile)) process.loadEnvFile(envFile);

process.env.E2E_TELEMETRY_DISABLED = '1';

const athlete = athleteFromEnv();
const app = { bundleId: 'com.wojtas.blackhorsecyclingapp.staging' };

export default {
  tests: 'e2e/tests/**/*.e2e.ts',
  targets: [
    {
      name: 'ios',
      engine: mobile({
        platform: 'ios',
        device: process.env.E2E_IOS_DEVICE ?? 'BH e2e iPhone',
      }),
      app,
    },
    {
      name: 'android',
      engine: mobile({
        platform: 'android',
        device: process.env.E2E_ANDROID_DEVICE ?? 'BH_e2e_Pixel',
      }),
      app,
    },
  ],
  workers: 1,
  credentials: {
    athlete: { username: athlete.email, password: athlete.password },
  },
  agents: { default: { executor: claudeCode({ model: 'sonnet' }) } },
} satisfies E2EConfig;
