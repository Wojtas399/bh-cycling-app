/**
 * Recreates the test athlete's `e2e-` Workouts on Intervals.icu, so every
 * suite run starts from the same data. `npm run e2e:ios` and
 * `npm run e2e:android` run it before `e2e run`: e2e has no global setup, and
 * `test.setup` isn't available on mobile. `planSeed` decides what to write;
 * this file only makes the calls. Run it on its own with `npm run e2e:seed`.
 */
import { athleteFromEnv, intervalsFromEnv } from './support/athlete.ts';
import { loadLocalEnv } from './support/env.ts';
import { planSeed } from './support/seedPlan.ts';

const BASE_URL = 'https://intervals.icu/api/v1';

loadLocalEnv();

interface ExistingEvent {
  id: number;
  external_id?: string | null;
}

try {
  // The suite refuses to start without the test user's credentials, but its
  // config loads only after the seed. So check them here, before the seed
  // changes anything on staging.
  athleteFromEnv();
  const { apiKey, athleteId } = intervalsFromEnv();
  // A personal API key is Basic auth with the username `API_KEY`.
  const authorization = `Basic ${Buffer.from(`API_KEY:${apiKey}`).toString('base64')}`;
  const eventsPath = `/athlete/${athleteId}/events`;
  const plan = planSeed(new Date());
  const { oldest, newest } = plan.deleteWindow;

  const call = async (method: string, path: string, body?: unknown) => {
    const name = `${method} ${path}`;
    let response: Response;

    try {
      response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: {
          Authorization: authorization,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      throw new Error(`${name} failed: ${String(error)}`);
    }

    const text = await response.text();

    if (!response.ok) {
      throw new Error(
        `${name} returned ${response.status} ${response.statusText}: ${text.slice(0, 300)}`,
      );
    }

    return text ? (JSON.parse(text) as unknown) : undefined;
  };

  const existing = (await call(
    'GET',
    `${eventsPath}?oldest=${oldest}&newest=${newest}`,
  )) as ExistingEvent[];
  const owned = existing.filter(plan.isSeedOwned);

  for (const event of owned) {
    await call('DELETE', `${eventsPath}/${event.id}`);
  }

  for (const workout of Object.values(plan.events)) {
    await call('POST', eventsPath, {
      category: 'WORKOUT',
      start_date_local: `${workout.date}T00:00:00`,
      type: workout.type,
      name: workout.name,
      description: workout.description,
      external_id: workout.external_id,
    });
  }

  const created = Object.values(plan.events)
    .map(workout => `"${workout.name}" on ${workout.date}`)
    .join(' and ');

  process.stdout.write(
    `E2E seed: deleted ${owned.length} e2e- event(s) from ${oldest} to ${newest}, created ${created}.\n`,
  );
} catch (error) {
  console.error(
    `E2E seed failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
