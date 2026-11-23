export function bindSelectArgs<Stored, Selected, SelectArgs extends unknown[]>(
  select: (stored: Stored, ...selectArgs: SelectArgs) => Selected,
  ...selectArgs: SelectArgs
): (stored: Stored) => Selected {
  return stored => select(stored, ...selectArgs);
}
