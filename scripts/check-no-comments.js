const { execFileSync } = require('node:child_process');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ENFORCED_PATHS = [
  'lib/__tests__/intervalsApi.test.ts',
  'lib/__tests__/intervalsQueries.test.ts',
  'lib/intervalsApi.ts',
  'lib/intervalsApiPaths.ts',
  'lib/intervalsQueries.ts',
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
