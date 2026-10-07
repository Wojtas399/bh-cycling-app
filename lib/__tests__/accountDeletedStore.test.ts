import {
  consumeAccountDeleted,
  markAccountDeleted,
} from '../accountDeletedStore';

describe('accountDeletedStore', () => {
  beforeEach(() => {
    consumeAccountDeleted();
  });

  it('is false by default', () => {
    expect(consumeAccountDeleted()).toBe(false);
  });

  it('returns true once after being marked, then resets', () => {
    markAccountDeleted();

    expect(consumeAccountDeleted()).toBe(true);
    expect(consumeAccountDeleted()).toBe(false);
  });
});
