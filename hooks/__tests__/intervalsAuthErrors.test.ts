import { mapIntervalsAuthError } from '../intervalsAuthErrors';

describe('mapIntervalsAuthError', () => {
  it('falls back to the exchange failure for any connect error', () => {
    expect(mapIntervalsAuthError('connect')).toEqual({
      key: 'errors.exchangeFailed',
    });
  });

  it('falls back to the disconnect failure for any disconnect error', () => {
    expect(mapIntervalsAuthError('disconnect')).toEqual({
      key: 'errors.disconnectFailed',
    });
  });
});
