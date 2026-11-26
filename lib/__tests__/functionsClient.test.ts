import { functions } from '../functionsClient';

jest.mock('@react-native-firebase/app', () => ({
  getApp: () => ({ name: '[DEFAULT]' }),
}));

jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: (app: { name: string }, region: string) => ({
    appName: app.name,
    region,
  }),
}));

describe('functions', () => {
  it('calls the Cloud Functions of the default app in europe-west1', () => {
    expect(functions()).toEqual({
      appName: '[DEFAULT]',
      region: 'europe-west1',
    });
  });
});
