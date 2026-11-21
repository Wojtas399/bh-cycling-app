import { firstIssuePerField, issueMessagesByField } from '../schemaIssues';
import * as v from 'valibot';

const schema = v.object({
  name: v.pipe(v.string(), v.nonEmpty('name required'), v.email('name email')),
  nested: v.object({ city: v.pipe(v.string(), v.nonEmpty('city required')) }),
});

describe('issueMessagesByField', () => {
  it('lists every issue under its dot path, in the order the schema reports them', () => {
    expect(
      issueMessagesByField(
        v.pipe(
          schema,
          v.forward(
            v.check(() => false, 'name rejected'),
            ['name'],
          ),
        ),
        { name: '', nested: { city: '' } },
      ),
    ).toEqual({
      name: ['name required', 'name email', 'name rejected'],
      'nested.city': ['city required'],
    });
  });

  it('files an issue with no path under root', () => {
    expect(issueMessagesByField(schema, 'not an object')).toEqual({
      root: [expect.any(String)],
    });
  });
});

describe('firstIssuePerField', () => {
  it("keeps only each field's first issue, the one the form resolver shows", () => {
    expect(
      firstIssuePerField(schema, { name: '', nested: { city: '' } }),
    ).toEqual({ name: 'name required', 'nested.city': 'city required' });
  });

  it('is empty for valid input', () => {
    expect(
      firstIssuePerField(schema, {
        name: 'rider@example.com',
        nested: { city: 'Kraków' },
      }),
    ).toEqual({});
  });
});
