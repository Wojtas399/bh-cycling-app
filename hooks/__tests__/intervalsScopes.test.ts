import { lacksScope } from '../intervalsScopes';

describe('lacksScope', () => {
  it('reads scopes separated by commas, as Intervals.icu stores them', () => {
    expect(lacksScope('ACTIVITY:READ,CALENDAR:READ', 'WELLNESS:READ')).toBe(
      true,
    );
    expect(lacksScope('ACTIVITY:READ,WELLNESS:READ', 'WELLNESS:READ')).toBe(
      false,
    );
  });

  it('reads scopes separated by spaces, as OAuth returns them', () => {
    expect(lacksScope('ACTIVITY:READ CALENDAR:READ', 'WELLNESS:READ')).toBe(
      true,
    );
    expect(lacksScope('ACTIVITY:READ WELLNESS:READ', 'WELLNESS:READ')).toBe(
      false,
    );
  });

  it('shows nothing missing for an unknown stored scope, leaving the request to decide', () => {
    expect(lacksScope(null, 'WELLNESS:READ')).toBe(false);
  });
});
