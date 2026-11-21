type Entry<T> = T extends unknown
  ? { [K in keyof T & string]-?: [K, T[K]] }[keyof T & string]
  : never;

export function entries<T extends object>(value: T): Entry<T>[] {
  return Object.entries(value) as Entry<T>[];
}

type FromEntries<E extends readonly [PropertyKey, unknown]> = {
  [K in E[0]]?: Extract<E, readonly [K, unknown]>[1];
};

export function fromEntries<E extends readonly [PropertyKey, unknown]>(
  pairs: Iterable<E>,
): FromEntries<E> {
  return Object.fromEntries(pairs) as FromEntries<E>;
}

export function pick<T extends object, K extends keyof T>(
  source: T,
  keys: readonly K[],
): Pick<T, K> {
  return Object.fromEntries(
    keys.filter(key => key in source).map(key => [key, source[key]]),
  ) as Pick<T, K>;
}

export async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
