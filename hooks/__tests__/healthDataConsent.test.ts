import { healthDataConsent } from '../healthDataConsent';

const CURRENT_VERSION = 3;
const CURRENT_RECORD = { consentVersion: CURRENT_VERSION };
const OLDER_RECORD = { consentVersion: 2 };
const SCOPE_WITH_WELLNESS =
  'ACTIVITY:READ,CALENDAR:READ,SETTINGS:READ,WELLNESS:READ';
const SCOPE_WITHOUT_WELLNESS = 'ACTIVITY:READ,CALENDAR:READ,SETTINGS:READ';

describe('healthDataConsent', () => {
  describe('state', () => {
    it('is given with a current record and Wellness access granted', () => {
      expect(
        healthDataConsent(CURRENT_RECORD, SCOPE_WITH_WELLNESS, CURRENT_VERSION)
          .state,
      ).toBe('given');
    });

    it('needs consent without a record, even when a stale token still carries Wellness access', () => {
      expect(
        healthDataConsent(null, SCOPE_WITH_WELLNESS, CURRENT_VERSION).state,
      ).toBe('needsConsent');
    });

    it('needs consent with a record for an older consent version', () => {
      expect(
        healthDataConsent(OLDER_RECORD, SCOPE_WITH_WELLNESS, CURRENT_VERSION)
          .state,
      ).toBe('needsConsent');
    });

    it('needs only a re-authorization with a current record but no Wellness access', () => {
      expect(
        healthDataConsent(
          CURRENT_RECORD,
          SCOPE_WITHOUT_WELLNESS,
          CURRENT_VERSION,
        ).state,
      ).toBe('needsReauthorization');
    });

    it('is given with a current record and an unknown stored scope, leaving the request to decide', () => {
      expect(
        healthDataConsent(CURRENT_RECORD, null, CURRENT_VERSION).state,
      ).toBe('given');
    });
  });

  describe('connect, which a new connection, a reconnect after a 401 and authorizing again all use', () => {
    const CONNECTION_SCOPES = [
      'ACTIVITY:READ',
      'CALENDAR:READ',
      'SETTINGS:READ',
    ];

    it('asks only for the connection scopes and keeps the consent without a record', () => {
      expect(healthDataConsent(null, null, CURRENT_VERSION).connect).toEqual({
        scopes: CONNECTION_SCOPES,
        healthData: { action: 'keep' },
      });
    });

    it('asks for Wellness access too and keeps the consent with a current record, so a reconnect after a 401 keeps Wellness', () => {
      expect(
        healthDataConsent(CURRENT_RECORD, null, CURRENT_VERSION).connect,
      ).toEqual({
        scopes: [...CONNECTION_SCOPES, 'WELLNESS:READ'],
        healthData: { action: 'keep' },
      });
    });

    it('asks for Wellness access again with a current record whose access was taken away on Intervals.icu', () => {
      expect(
        healthDataConsent(
          CURRENT_RECORD,
          SCOPE_WITHOUT_WELLNESS,
          CURRENT_VERSION,
        ).connect,
      ).toEqual({
        scopes: [...CONNECTION_SCOPES, 'WELLNESS:READ'],
        healthData: { action: 'keep' },
      });
    });

    it('asks only for the connection scopes with a record for an older consent version', () => {
      expect(
        healthDataConsent(OLDER_RECORD, SCOPE_WITH_WELLNESS, CURRENT_VERSION)
          .connect,
      ).toEqual({ scopes: CONNECTION_SCOPES, healthData: { action: 'keep' } });
    });
  });

  describe('grant', () => {
    it('grants the consent to the current version with the age statement, asking for Wellness access too', () => {
      expect(healthDataConsent(null, null, CURRENT_VERSION).grant).toEqual({
        scopes: [
          'ACTIVITY:READ',
          'CALENDAR:READ',
          'SETTINGS:READ',
          'WELLNESS:READ',
        ],
        healthData: {
          action: 'grant',
          consentVersion: CURRENT_VERSION,
          ageConfirmed: true,
        },
      });
    });
  });
});
