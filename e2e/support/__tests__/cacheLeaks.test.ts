import { findCacheLeaks } from '../cacheLeaks';

const EMAIL = 'athlete@example.com';

describe('findCacheLeaks', () => {
  it('finds no leaks when the cache has no files', () => {
    expect(findCacheLeaks([], [EMAIL])).toEqual([]);
  });

  it('reports a file that holds a secret by its name', () => {
    const files = [
      { name: 'a1.json', content: `{"action":"fill","value":"${EMAIL}"}` },
    ];

    expect(findCacheLeaks(files, [EMAIL])).toEqual(['a1.json']);
  });

  it('reports each leaking file once when several secrets are spread across files', () => {
    const files = [
      { name: 'a1.json', content: `{"email":"${EMAIL}","password":"hunter2"}` },
      { name: 'b2.json', content: '{"key":"intervals-key-123"}' },
      { name: 'c3.json', content: '{"password":"hunter2"}' },
    ];

    expect(
      findCacheLeaks(files, [EMAIL, 'hunter2', 'intervals-key-123']),
    ).toEqual(['a1.json', 'b2.json', 'c3.json']);
  });

  it('never matches an empty or unset secret', () => {
    const files = [{ name: 'a1.json', content: '{"action":"tap"}' }];

    expect(findCacheLeaks(files, ['', undefined])).toEqual([]);
  });

  it('leaves clean files out of the report', () => {
    const files = [
      { name: 'clean.json', content: '{"action":"tap","text":"Zaloguj"}' },
      { name: 'leak.json', content: `{"value":"${EMAIL}"}` },
    ];

    expect(findCacheLeaks(files, [EMAIL])).toEqual(['leak.json']);
  });

  it('reports a secret the cache stored JSON-escaped', () => {
    const password = 'pa"ss\\word';
    const files = [
      { name: 'a1.json', content: JSON.stringify({ value: password }) },
    ];

    expect(findCacheLeaks(files, [password])).toEqual(['a1.json']);
  });
});
