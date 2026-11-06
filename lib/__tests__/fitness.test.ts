import { formatForm } from '../fitness';

describe('formatForm', () => {
  it('signs a fresh Form with a plus', () => {
    expect(formatForm(5)).toBe('+5');
  });

  it('signs a tired Form with a minus', () => {
    expect(formatForm(-12)).toBe('-12');
  });

  it('shows a Form of zero with no sign', () => {
    expect(formatForm(0)).toBe('0');
  });
});
