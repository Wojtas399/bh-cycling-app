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
