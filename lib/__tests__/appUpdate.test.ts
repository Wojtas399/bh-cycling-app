import { formatRunningUpdate } from '../appUpdate';

const labels = {
  monthsShort: [
    'sty',
    'lut',
    'mar',
    'kwi',
    'maj',
    'cze',
    'lip',
    'sie',
    'wrz',
    'paź',
    'lis',
    'gru',
  ],
  update: (id: string, date: string) => `Aktualizacja ${id} · ${date}`,
};

const ota = {
  isEnabled: true,
  isEmbeddedLaunch: false,
  updateId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  createdAt: new Date(2026, 9, 31, 14, 5),
};

describe('formatRunningUpdate', () => {
  it('names the short ID and Polish short date of a downloaded OTA update', () => {
    expect(formatRunningUpdate(ota, labels)).toBe(
      'Aktualizacja a1b2c3d4 · 31 paź 2026',
    );
  });

  it('returns nothing on the bundle embedded in the store build', () => {
    expect(
      formatRunningUpdate({ ...ota, isEmbeddedLaunch: true }, labels),
    ).toBeUndefined();
  });

  it('returns nothing when updates are disabled', () => {
    expect(
      formatRunningUpdate({ ...ota, isEnabled: false }, labels),
    ).toBeUndefined();
  });

  it('returns nothing when the update has no ID or date', () => {
    expect(
      formatRunningUpdate({ ...ota, updateId: null }, labels),
    ).toBeUndefined();
    expect(
      formatRunningUpdate({ ...ota, createdAt: null }, labels),
    ).toBeUndefined();
  });
});
