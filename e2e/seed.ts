/**
 * Recreates the test athlete's `e2e-` Workouts, Race, Note and ride on
 * Intervals.icu, so every suite run starts from the same data. `npm run e2e:ios` and
 * `npm run e2e:android` run it before `e2e run`, because e2e 0.23 has no
 * global setup and its `test.setup` isn't available on mobile. `planSeed`
 * decides what to write; this file only makes the calls. Run it on its own with `npm run e2e:seed`.
 */
import { athleteFromEnv, intervalsFromEnv } from './support/athlete.ts';
import { loadLocalEnv } from './support/env.ts';
import { planSeed } from './support/seedPlan.ts';

const BASE_URL = 'https://intervals.icu/api/v1';

loadLocalEnv();

interface ExistingItem {
  id: number | string;
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
  const activitiesPath = `/athlete/${athleteId}/activities`;
  const plan = planSeed(new Date());
  const { oldest, newest } = plan.deleteWindow;

  // A `FormData` body goes as multipart, with the boundary `fetch` sets.
  const call = async (method: string, path: string, body?: unknown) => {
    const name = `${method} ${path.split('?')[0]}`;
    const isJson = body !== undefined && !(body instanceof FormData);
    let response: Response;

    try {
      response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: {
          Authorization: authorization,
          ...(isJson ? { 'Content-Type': 'application/json' } : {}),
        },
        body: isJson ? JSON.stringify(body) : (body as FormData | undefined),
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
  )) as ExistingItem[];
  const owned = existing.filter(plan.isSeedOwned);

  for (const event of owned) {
    await call('DELETE', `${eventsPath}/${event.id}`);
  }

  const activities = (await call(
    'GET',
    `${activitiesPath}?oldest=${oldest}&newest=${newest}T23:59:59&fields=id,external_id`,
  )) as ExistingItem[];
  const ownedActivities = activities.filter(plan.isSeedOwned);

  for (const activity of ownedActivities) {
    await call('DELETE', `/activity/${activity.id}`);
  }

  for (const event of Object.values(plan.events)) {
    await call('POST', eventsPath, {
      category: event.category,
      start_date_local: `${event.date}T00:00:00`,
      type: 'type' in event ? event.type : undefined,
      name: event.name,
      description: 'description' in event ? event.description : undefined,
      external_id: event.external_id,
    });
  }

  const { ride } = plan;
  const upload = new FormData();

  upload.append(
    'file',
    new Blob([ride.tcx], { type: 'application/xml' }),
    `${ride.external_id}.tcx`,
  );
  // Unpaired: no `paired_event_id`, so it's an Unplanned Activity.
  await call(
    'POST',
    `${activitiesPath}?${new URLSearchParams({ name: ride.name, external_id: ride.external_id })}`,
    upload,
  );

  const created = [...Object.values(plan.events), ride]
    .map(item => `"${item.name}" on ${item.date}`)
    .join(', ');

  process.stdout.write(
    `E2E seed: deleted ${owned.length} e2e- event(s) and ${ownedActivities.length} e2e- Activit(ies) from ${oldest} to ${newest}, created ${created}.\n`,
  );
} catch (error) {
  console.error(
    `E2E seed failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
