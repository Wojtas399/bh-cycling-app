const { SourceSkips } = require('expo/fingerprint');

// Leave npm scripts out of the native fingerprint. Every script edit changed
// the hash, so a scripts-only merge started a new build on every track, and the
// EAS Free plan has no builds to spare.
//
// Warning: this also drops any `postinstall` or `eas-build-*` hook from the
// fingerprint. Whoever adds or changes one must start a rebuild by hand
// (`eas build --profile <profile> --platform <platform>`), because CI won't.
/** @type {import('expo/fingerprint').Config} */
module.exports = {
  sourceSkips: SourceSkips.PackageJsonScriptsAll,
};
