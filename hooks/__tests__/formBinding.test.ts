import { noServerErrorOnAnyField } from '../formBinding';

describe('noServerErrorOnAnyField', () => {
  it('maps no server error to any field, so every one shows as a form error', () => {
    expect(noServerErrorOnAnyField()).toBe('');
  });
});
