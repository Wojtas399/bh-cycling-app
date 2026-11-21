import * as v from 'valibot';

export function issueMessagesByField(
  schema: v.GenericSchema,
  input: unknown,
): Record<string, string[]> {
  const byField: Record<string, string[]> = {};

  for (const issue of v.safeParse(schema, input).issues ?? []) {
    const field = v.getDotPath(issue) ?? 'root';

    (byField[field] ??= []).push(issue.message);
  }

  return byField;
}

export function firstIssuePerField(
  schema: v.GenericSchema,
  input: unknown,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(issueMessagesByField(schema, input)).map(
      ([field, [first]]) => [field, first],
    ),
  );
}
