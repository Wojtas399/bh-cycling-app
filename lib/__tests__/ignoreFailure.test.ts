import { ignoreFailure } from '../ignoreFailure';

describe('ignoreFailure', () => {
  it('resolves when the promise rejects', async () => {
    await expect(
      ignoreFailure(Promise.reject(new Error('nothing to recover'))),
    ).resolves.toBeUndefined();
  });

  it('resolves only once the promise has settled', async () => {
    const order: string[] = [];
    const slow = new Promise<void>(resolve =>
      setTimeout(() => {
        order.push('settled');
        resolve();
      }, 0),
    );

    await ignoreFailure(slow);
    order.push('resumed');

    expect(order).toEqual(['settled', 'resumed']);
  });
});
