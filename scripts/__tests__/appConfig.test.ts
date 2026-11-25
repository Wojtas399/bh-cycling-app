import appConfig from '../../app.config';

function sentryPlugin() {
  const { plugins = [] } = appConfig({
    projectRoot: '',
    staticConfigPath: null,
    packageJsonPath: null,
    config: {},
  });

  return plugins.find(plugin =>
    (typeof plugin === 'string' ? plugin : plugin[0])?.startsWith('@sentry/'),
  );
}

describe('app.config.ts', () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
  });

  it('hands the Sentry plugin its org and project under the /expo name, which the OTA source map upload looks up', () => {
    expect(sentryPlugin()).toEqual([
      '@sentry/react-native/expo',
      { organization: expect.any(String), project: expect.any(String) },
    ]);
  });

  it('keeps the Sentry plugin config the same whatever the environment says, because plugin options are part of the native fingerprint', () => {
    delete process.env.SENTRY_ORG;
    delete process.env.SENTRY_PROJECT;
    const withoutEnv = sentryPlugin();

    Object.assign(process.env, {
      SENTRY_ORG: 'acme',
      SENTRY_PROJECT: 'bh-cycling',
    });

    expect(sentryPlugin()).toEqual(withoutEnv);
  });
});
