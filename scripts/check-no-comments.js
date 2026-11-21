const { execFileSync } = require('node:child_process');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ENFORCED_PATHS = [
  'lib/__tests__/activityDetails.test.ts',
  'lib/__tests__/activityStart.test.ts',
  'lib/__tests__/activitySummary.test.ts',
  'lib/__tests__/appFocus.test.ts',
  'lib/__tests__/appUpdate.test.ts',
  'lib/__tests__/appVersion.test.ts',
  'lib/__tests__/calendarDayCounts.test.ts',
  'lib/__tests__/calendarGrid.test.ts',
  'lib/__tests__/calendarItems.test.ts',
  'lib/__tests__/calendarRefreshStatus.test.ts',
  'lib/__tests__/calendarView.test.ts',
  'lib/__tests__/calendarWorkouts.test.ts',
  'lib/__tests__/combineMonthResults.test.ts',
  'lib/__tests__/compactItemRow.test.ts',
  'lib/__tests__/externalStore.test.ts',
  'lib/__tests__/fitness.test.ts',
  'lib/__tests__/fitnessChart.test.ts',
  'lib/__tests__/formatDuration.test.ts',
  'lib/__tests__/formatMonthTitle.test.ts',
  'lib/__tests__/getErrorCode.test.ts',
  'lib/__tests__/handleIntervalsAuthError.test.ts',
  'lib/__tests__/ignoreFailure.test.ts',
  'lib/__tests__/intervalsApi.test.ts',
  'lib/__tests__/intervalsQueries.test.ts',
  'lib/__tests__/isFiniteNumber.test.ts',
  'lib/__tests__/liquidGlass.test.ts',
  'lib/__tests__/localDate.test.ts',
  'lib/__tests__/localDateTime.test.ts',
  'lib/__tests__/noteBars.test.ts',
  'lib/__tests__/noteColors.test.ts',
  'lib/__tests__/noteDates.test.ts',
  'lib/__tests__/notes.test.ts',
  'lib/__tests__/pairing.test.ts',
  'lib/__tests__/queryClient.test.ts',
  'lib/__tests__/raceLabels.test.ts',
  'lib/__tests__/races.test.ts',
  'lib/__tests__/route.test.ts',
  'lib/__tests__/routeChips.test.ts',
  'lib/__tests__/routeMapData.test.ts',
  'lib/__tests__/secondClock.test.ts',
  'lib/__tests__/signInMethods.test.ts',
  'lib/__tests__/signInWithGoogle.test.ts',
  'lib/__tests__/signOutAndClear.test.ts',
  'lib/__tests__/splashScreen.test.ts',
  'lib/__tests__/sportIcon.test.ts',
  'lib/__tests__/stravaActivity.test.ts',
  'lib/__tests__/stripNoteHtml.test.ts',
  'lib/__tests__/surfaceTreatment.test.ts',
  'lib/__tests__/upcomingWorkouts.test.ts',
  'lib/__tests__/validation.test.ts',
  'lib/__tests__/verificationEmail.test.ts',
  'lib/__tests__/weekNotes.test.ts',
  'lib/__tests__/wellness.test.ts',
  'lib/activityDetails.ts',
  'lib/activityStart.ts',
  'lib/activitySummary.ts',
  'lib/appFocus.ts',
  'lib/appUpdate.ts',
  'lib/appVersion.ts',
  'lib/authState.ts',
  'lib/calendarDayCounts.ts',
  'lib/calendarGrid.ts',
  'lib/calendarItems.ts',
  'lib/calendarRefreshStatus.ts',
  'lib/calendarView.ts',
  'lib/calendarWorkouts.ts',
  'lib/combineMonthResults.ts',
  'lib/compactItemRow.ts',
  'lib/externalStore.ts',
  'lib/firebase.ts',
  'lib/firestorePaths.ts',
  'lib/fitness.ts',
  'lib/fitnessChart.ts',
  'lib/formatDuration.ts',
  'lib/formatMonthTitle.ts',
  'lib/getErrorCode.ts',
  'lib/handleIntervalsAuthError.ts',
  'lib/ignoreFailure.ts',
  'lib/intervalsApi.ts',
  'lib/intervalsApiPaths.ts',
  'lib/intervalsQueries.ts',
  'lib/intervalsReconnectStore.ts',
  'lib/isFiniteNumber.ts',
  'lib/liquidGlass.tsx',
  'lib/localDate.ts',
  'lib/localDateTime.ts',
  'lib/noteBars.ts',
  'lib/noteColors.ts',
  'lib/noteDates.ts',
  'lib/notes.ts',
  'lib/pairing.ts',
  'lib/queryClient.ts',
  'lib/raceLabels.ts',
  'lib/races.ts',
  'lib/route.ts',
  'lib/routeChips.ts',
  'lib/routeMapData.ts',
  'lib/secondClock.ts',
  'lib/signInMethods.ts',
  'lib/signInWithGoogle.ts',
  'lib/signOutAndClear.ts',
  'lib/splashScreen.ts',
  'lib/sportIcon.ts',
  'lib/stravaActivity.ts',
  'lib/stripNoteHtml.ts',
  'lib/surfaceTreatment.ts',
  'lib/toast/',
  'lib/upcomingWorkouts.ts',
  'lib/validation.ts',
  'lib/verificationEmail.ts',
  'lib/weekNotes.ts',
  'lib/wellness.ts',
];

const EXCLUDED_GENERATED_PATHS = ['dist/', 'expo-env.d.ts'];

const SCRIPT_KINDS = {
  '.ts': ts.ScriptKind.TS,
  '.tsx': ts.ScriptKind.TSX,
  '.js': ts.ScriptKind.JS,
  '.jsx': ts.ScriptKind.JSX,
  '.mjs': ts.ScriptKind.JS,
  '.cjs': ts.ScriptKind.JS,
};

const ESLINT_RULE = String.raw`[@a-z][\w@/-]*`;

const ALLOWED_DIRECTIVES = [
  new RegExp(
    String.raw`^\/\/ eslint-disable(?:-next)?-line ${ESLINT_RULE}(?:, ${ESLINT_RULE})* -- \S`,
  ),
  /^\/\/ @ts-expect-error: \S/,
];

function isJsDocNode(node) {
  return (
    node.kind >= ts.SyntaxKind.FirstJSDocNode &&
    node.kind <= ts.SyntaxKind.LastJSDocNode
  );
}

function isJsxText(node) {
  return (
    node.kind === ts.SyntaxKind.JsxText ||
    node.kind === ts.SyntaxKind.JsxTextAllWhiteSpaces
  );
}

function commentRangesIn(fileName, text) {
  const sourceFile = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    SCRIPT_KINDS[path.extname(fileName)],
  );
  const rangesByStart = new Map();
  const collect = ranges =>
    ranges?.forEach(range => rangesByStart.set(range.pos, range));
  const visit = node => {
    if (isJsDocNode(node)) {
      return;
    }

    const children = node.getChildren(sourceFile);

    if (children.length > 0) {
      children.forEach(visit);

      return;
    }

    if (isJsxText(node)) {
      return;
    }

    collect(ts.getLeadingCommentRanges(text, node.pos));
    collect(ts.getTrailingCommentRanges(text, node.pos));
  };

  collect(ts.getLeadingCommentRanges(text, 0));
  visit(sourceFile);

  return [...rangesByStart.values()].sort((a, b) => a.pos - b.pos);
}

function findBannedComments(fileName, text) {
  return commentRangesIn(fileName, text)
    .map(({ pos, end }) => ({
      line: text.slice(0, pos).split('\n').length,
      text: text.slice(pos, end),
    }))
    .filter(
      comment => !ALLOWED_DIRECTIVES.some(shape => shape.test(comment.text)),
    );
}

function isUnder(file, listedPath) {
  return listedPath.endsWith('/')
    ? file.startsWith(listedPath)
    : file === listedPath;
}

function isLintedSource(file) {
  return (
    path.extname(file) in SCRIPT_KINDS &&
    !path.basename(file).includes('.config.') &&
    !EXCLUDED_GENERATED_PATHS.some(excluded => isUnder(file, excluded))
  );
}

function filesToCheck(trackedFiles, enforcedPaths) {
  return trackedFiles.filter(
    file =>
      isLintedSource(file) &&
      enforcedPaths.some(enforced => isUnder(file, enforced)),
  );
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const trackedFiles = execFileSync('git', ['ls-files', '-z'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(file => file && existsSync(path.join(repoRoot, file)));
  const findings = filesToCheck(trackedFiles, ENFORCED_PATHS).flatMap(file =>
    findBannedComments(
      file,
      readFileSync(path.join(repoRoot, file), 'utf8'),
    ).map(comment => ({ file, ...comment })),
  );

  if (findings.length === 0) {
    return;
  }

  for (const { file, line, text } of findings) {
    console.error(`${file}:${line}: ${text.split('\n')[0]}`);
  }

  console.error(
    `\n${findings.length} comment(s) found. Code has no comments (docs/adr/0013-no-comments.md). Only "// eslint-disable-next-line <rule> -- <reason>", "// eslint-disable-line <rule> -- <reason>" and "// @ts-expect-error: <reason>" are allowed. See "Write no comments" in CODING_STANDARDS.md for where the why goes instead.`,
  );
  process.exitCode = 1;
}

if (require.main === module) {
  main();
}

module.exports = {
  EXCLUDED_GENERATED_PATHS,
  filesToCheck,
  findBannedComments,
};
