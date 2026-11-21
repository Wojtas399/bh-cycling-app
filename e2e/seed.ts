import { athleteFromEnv, intervalsFromEnv } from './support/athlete.ts';
import { loadLocalEnv } from './support/env.ts';
import { planSeed } from './support/seedPlan.ts';

const BASE_URL = 'https://intervals.icu/api/v1';

loadLocalEnv();

interface ExistingItem {
  id: number | string;
  external_id?: string | null;
}

function requireSuiteCredentialsBeforeChangingStaging(): void {
  athleteFromEnv();
}

function personalApiKeyBasicAuth(apiKey: string): string {
  return `Basic ${Buffer.from(`API_KEY:${apiKey}`).toString('base64')}`;
}

try {
  requireSuiteCredentialsBeforeChangingStaging();
  const { apiKey, athleteId } = intervalsFromEnv();
  const authorization = personalApiKeyBasicAuth(apiKey);
  const eventsPath = `/athlete/${athleteId}/events`;
  const activitiesPath = `/athlete/${athleteId}/activities`;
  const plan = planSeed(new Date());
  const { oldest, newest } = plan.deleteWindow;

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
  const unpairedRideUpload = new FormData();

  unpairedRideUpload.append(
    'file',
    new Blob([ride.tcx], { type: 'application/xml' }),
    `${ride.external_id}.tcx`,
  );
  await call(
    'POST',
    `${activitiesPath}?${new URLSearchParams({ name: ride.name, external_id: ride.external_id })}`,
    unpairedRideUpload,
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
