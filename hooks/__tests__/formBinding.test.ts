import { formErrorsOnly } from '../formBinding';

describe('formErrorsOnly', () => {
  it('maps no server error to any field, so every one shows as a form error', () => {
    expect(formErrorsOnly()).toBe('');
  });
});
