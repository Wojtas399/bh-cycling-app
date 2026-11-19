import { requireEnv } from './env.ts';

/**
 * The test athlete's email and password, from the local env file that
 * `e2e.config.ts` loads. The config calls this at load, so a missing value
 * stops the run with one error before any test signs in.
 */
export function athleteFromEnv(): { email: string; password: string } {
  const env = requireEnv(
    ['E2E_USER_EMAIL', 'E2E_USER_PASSWORD'],
    'the e2e suite signs in as the test athlete with them',
  );

  return { email: env.E2E_USER_EMAIL, password: env.E2E_USER_PASSWORD };
}

/**
 * A second staging user whose email is never verified, so it always lands on
 * verify-email. Like the athlete, the config reads it at load.
 */
export function unverifiedUserFromEnv(): { email: string; password: string } {
  const env = requireEnv(
    ['E2E_UNVERIFIED_USER_EMAIL', 'E2E_UNVERIFIED_USER_PASSWORD'],
    'the verify-email e2e test signs in as the unverified user with them',
  );

  return {
    email: env.E2E_UNVERIFIED_USER_EMAIL,
    password: env.E2E_UNVERIFIED_USER_PASSWORD,
  };
}

/**
 * The test athlete's Intervals.icu API key and athlete id, which the seed
 * uses to recreate its Workouts before a run.
 */
export function intervalsFromEnv(): { apiKey: string; athleteId: string } {
  const env = requireEnv(
    ['E2E_INTERVALS_API_KEY', 'E2E_INTERVALS_ATHLETE_ID'],
    "the e2e seed writes the test athlete's Workouts on Intervals.icu with them",
  );

  return {
    apiKey: env.E2E_INTERVALS_API_KEY,
    athleteId: env.E2E_INTERVALS_ATHLETE_ID,
  };
}
