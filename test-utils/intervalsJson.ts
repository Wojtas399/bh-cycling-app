export type IntervalsJson<T> = { [K in keyof T]: T[K] | null };

export function fromIntervalsJson<T>(json: IntervalsJson<T>): T {
  return json as T;
}

export function readIntervalsBody<T>(body: unknown): T {
  const json: unknown = JSON.parse(JSON.stringify(body));

  return json as T;
}
