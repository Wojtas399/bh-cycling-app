import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const RELEASE_SCRIPT = path.join(__dirname, '..', 'release.sh');

const UPLOAD =
  'npx --package=@sentry/react-native sentry-expo-upload-sourcemaps dist';

const STUBS: Record<string, string> = {
  eas: `
case "$1" in
  fingerprint:generate) echo '{"hash":"abc"}' ;;
  build:list) echo '[{"status":"FINISHED"}]' ;;
  update) exit "$EAS_UPDATE_EXIT" ;;
esac`,
  npx: 'exit "$UPLOAD_EXIT"',
  git: `
case "$1" in
  log) echo 'Fix the calendar' ;;
  rev-parse) echo false ;;
esac`,
};

type ReleaseRun = {
  refType: 'branch' | 'tag';
  refName: string;
  updateExit?: number;
  uploadExit?: number;
};

function release({
  refType,
  refName,
  updateExit = 0,
  uploadExit = 0,
}: ReleaseRun) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-'));
  const bin = path.join(dir, 'bin');
  const callsLog = path.join(dir, 'calls.log');

  fs.mkdirSync(bin);
  fs.writeFileSync(callsLog, '');
  fs.writeFileSync(
    path.join(dir, 'app.config.ts'),
    "export default {\n  version: '0.2.0',\n};\n",
  );

  for (const [name, body] of Object.entries(STUBS)) {
    fs.writeFileSync(
      path.join(bin, name),
      `#!/usr/bin/env bash\necho "${name} $*" >>"$CALLS_LOG"\n${body}\n`,
      { mode: 0o755 },
    );
  }

  const result = spawnSync('bash', [RELEASE_SCRIPT, 'ios'], {
    cwd: dir,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${bin}${path.delimiter}${process.env.PATH ?? ''}`,
      GITHUB_ACTIONS: 'true',
      GITHUB_STEP_SUMMARY: '',
      REF_TYPE: refType,
      REF_NAME: refName,
      CALLS_LOG: callsLog,
      EAS_UPDATE_EXIT: String(updateExit),
      UPLOAD_EXIT: String(uploadExit),
    },
  });
  const calls = fs.readFileSync(callsLog, 'utf8').split('\n').filter(Boolean);

  fs.rmSync(dir, { recursive: true, force: true });

  return {
    status: result.status,
    stdout: result.stdout,
    publishSteps: calls.flatMap(call => {
      if (call.startsWith('eas update ')) {
        return ['eas update'];
      }

      if (call.startsWith('npx ')) {
        return [call];
      }

      return [];
    }),
  };
}

describe('release.sh', () => {
  it.each([
    { update: 'a dev update', refType: 'branch', refName: 'main' },
    { update: 'a staging update', refType: 'branch', refName: 'rc/0.2.0' },
    { update: 'a staging hotfix', refType: 'branch', refName: 'hotfix/v0.2.0' },
    {
      update: 'a production hotfix',
      refType: 'tag',
      refName: 'v0.2.0-hotfix-1',
    },
  ] as const)(
    'uploads the source maps of $update to Sentry once it is published',
    ({ refType, refName }) => {
      const run = release({ refType, refName });

      expect(run.status).toBe(0);
      expect(run.publishSteps).toEqual(['eas update', UPLOAD]);
    },
  );

  it('warns and still succeeds when the source map upload fails, so a Sentry outage never holds up a release', () => {
    const run = release({
      refType: 'branch',
      refName: 'main',
      uploadExit: 1,
    });

    expect(run.status).toBe(0);
    expect(run.stdout).toContain(
      '::warning::Could not upload the source maps of this update to Sentry. Its errors will show minified stack traces.',
    );
  });

  it('fails the release and uploads nothing when the OTA update fails', () => {
    const run = release({
      refType: 'branch',
      refName: 'main',
      updateExit: 1,
    });

    expect(run.status).toBe(1);
    expect(run.publishSteps).toEqual(['eas update']);
  });
});
