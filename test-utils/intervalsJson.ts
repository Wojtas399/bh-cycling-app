export type IntervalsJson<T> = { [K in keyof T]: T[K] | null };

export function fromIntervalsJson<T>(json: IntervalsJson<T>): T {
  return json as T;
}

export function readIntervalsBody<T>(
  typedFields: Partial<IntervalsJson<T>>,
  fieldsOutsideTheType: Record<string, unknown> = {},
): T {
  const json: unknown = JSON.parse(
    JSON.stringify({ ...typedFields, ...fieldsOutsideTheType }),
  );

  return json as T;
}
