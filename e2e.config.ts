import { athleteFromEnv } from './e2e/support/athlete';
import { loadLocalEnv } from './e2e/support/env';
import { planTargets } from './e2e/support/targetPlan';
import { claudeCode } from '@e2e-dev/acp';
import { expoSimulators } from '@e2e-dev/eas';
import { mobile } from '@e2e-dev/mobile';
import type { E2EConfig } from 'e2e';

// Every worker imports this file again, so the env reaches the tests too.
loadLocalEnv();

const athlete = athleteFromEnv();
const app = { bundleId: 'com.wojtas.blackhorsecyclingapp.staging' };

export default {
  tests: 'e2e/tests/**/*.e2e.ts',
  targets: planTargets(process.env).map(target => ({
    name: target.platform,
    engine: mobile(
      'expoSimulators' in target
        ? {
            platform: target.platform,
            device: expoSimulators(target.expoSimulators),
            videoTouches: target.videoTouches,
          }
        : { platform: target.platform, device: target.device },
    ),
    app,
  })),
  workers: 1,
  credentials: {
    athlete: { username: athlete.email, password: athlete.password },
  },
  agents: { default: { executor: claudeCode({ model: 'sonnet' }) } },
} satisfies E2EConfig;
