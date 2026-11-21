import { requireEnv } from './env.ts';

export function athleteFromEnv(): { email: string; password: string } {
  const env = requireEnv(
    ['E2E_USER_EMAIL', 'E2E_USER_PASSWORD'],
    'the e2e suite signs in as the test athlete with them',
  );

  return { email: env.E2E_USER_EMAIL, password: env.E2E_USER_PASSWORD };
}

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
