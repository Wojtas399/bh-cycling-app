import { readIntervalsBody } from '../intervalsJson';
import type { IntervalsActivityMap } from '@/lib/intervalsApi';

describe('readIntervalsBody', () => {
  it('sends the typed fields and the fields outside the type as one parsed body', () => {
    expect(
      readIntervalsBody<IntervalsActivityMap>(
        { latlngs: [[52.2, 21.0]], bounds: null },
        { bounds: [[52.2, null]], icu_athlete_id: 'athlete-1' },
      ),
    ).toStrictEqual({
      latlngs: [[52.2, 21.0]],
      bounds: [[52.2, null]],
      icu_athlete_id: 'athlete-1',
    });
  });

  it('drops a typed field left undefined, as a parsed body would', () => {
    expect(
      readIntervalsBody<IntervalsActivityMap>({ latlngs: undefined }),
    ).toStrictEqual({});
  });

  it('fails type-checking on a typed field the type does not name', () => {
    expect(
      readIntervalsBody<IntervalsActivityMap>({
        // @ts-expect-error: a renamed or misspelt field must not compile as a typed field
        latlng: [],
      }),
    ).toStrictEqual({ latlng: [] });
  });
});
