/**
 * The test athlete's email and password, from the local env file that
 * `e2e.config.ts` loads. The config calls this at load, so a missing value
 * stops the run with one error before any test signs in.
 */
export function athleteFromEnv(): { email: string; password: string } {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    const missing = [
      ...(email ? [] : ['E2E_USER_EMAIL']),
      ...(password ? [] : ['E2E_USER_PASSWORD']),
    ];

    throw new Error(
      `Set ${missing.join(' and ')} in .env.local: the e2e suite signs in as the test athlete with them.`,
    );
  }

  return { email, password };
}

/**
 * The test athlete's Intervals.icu API key and athlete id, which the seed
 * uses to recreate its Workouts before a run.
 */
export function intervalsFromEnv(): { apiKey: string; athleteId: string } {
  const apiKey = process.env.E2E_INTERVALS_API_KEY;
  const athleteId = process.env.E2E_INTERVALS_ATHLETE_ID;

  if (!apiKey || !athleteId) {
    const missing = [
      ...(apiKey ? [] : ['E2E_INTERVALS_API_KEY']),
      ...(athleteId ? [] : ['E2E_INTERVALS_ATHLETE_ID']),
    ];

    throw new Error(
      `Set ${missing.join(' and ')} in .env.local: the e2e seed writes the test athlete's Workouts on Intervals.icu with them.`,
    );
  }

  return { apiKey, athleteId };
}
