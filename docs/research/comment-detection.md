# Detecting comments reliably in TS and TSX

Research for #404 (map #403). Measured on `origin/main` @ `4498b2d`, 2026-11-19.

## Answer

Use a Node script built on **TypeScript's scanner**: `ts.getLeadingCommentRanges` **plus** `ts.getTrailingCommentRanges` at every token. On this repo it finds every comment and nothing else. It agrees exactly with ESLint's `getAllComments()`, it runs in about 0.5 s, and it needs no new dependency in either package, because `typescript` is already a devDependency of both root and `functions/`.

No grep regex we tried gets both false positives and false negatives to zero once the code includes cases this repo doesn't have yet. ESLint gives the same answer as the TS scanner, but it is slower, and `functions/` doesn't have ESLint at all.

## What was measured

- **Files:** tracked `*.ts|tsx|js|jsx|mjs|cjs` under `app/ components/ lib/ hooks/ constants/ i18n/ e2e/ functions/ scripts/ __mocks__/ test-utils/`, excluding `*.config.*`. That gives 396 files: 293 `.ts`, 102 `.tsx` and 1 `.js`.
- **Ground truth:** the TS scanner. Parse each file with `ts.createSourceFile`, visit every leaf token except `JsxText` and the JSDoc nodes, and collect both leading and trailing comment ranges at `token.pos`, deduplicated by position.
- **Result:** 1,773 comments in 308 files. 1,264 are JSDoc `/** */`, 490 are `//` and 19 are `/* */`, and every one of those 19 is a JSX `{/* */}`. 42 comments sit on the same line as code: those 19 JSX comments and 23 trailing `//`.
- **Cross-checks:** TS 5.9.3 (the version in `functions/`) and TS 6.0.3 (root) give identical ranges in all 396 files. ESLint 9.39.4 `Linter` + `@typescript-eslint/parser` 8.59.1 with `getAllComments()` returns exactly the same 1,773 start offsets, with 0 extra and 0 missing.
- **Grep scoring:** at line level. A false positive is a matched line that no comment touches. A false negative is a line where a comment starts but the regex doesn't match.

The harness lives in the session scratchpad and isn't committed. It's about 100 lines and the sketch below has its core.

## Results on this repo

| Method                               | False positives                                                                            | False negatives                                         | Runtime (396 files)                                                        | New dependency?                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| grep, naive `//\|/\*`                | 26 lines: all URLs in strings (`'https://…'`, `xmlns="http://…"`, `` `https://…/${id}` ``) | 0                                                       | ~35 ms                                                                     | none                                                                                                         |
| grep, line-start `^\s*(//\|/\*\|\*)` | 0                                                                                          | **42**: all 19 JSX `{/* */}` and all 23 trailing `// …` | ~40 ms                                                                     | none                                                                                                         |
| grep, "tuned" `(^\|[^:"'\`])//\|/\*` | 0                                                                                          | 0                                                       | ~50 ms                                                                     | none                                                                                                         |
| **TS scanner script**                | **0**                                                                                      | **0**                                                   | 0.30 s scan, 0.46 s wall for the whole CLI on root, 0.16 s on `functions/` | **none in root or `functions/`**                                                                             |
| ESLint `getAllComments()` script     | 0                                                                                          | 0                                                       | 0.82 s scan + 0.14 s to load ESLint                                        | root: none, though the parser is only transitive. `functions/`: needs `eslint` + `@typescript-eslint/parser` |

The "tuned" regex scores 0/0 only because this repo happens to have no string containing `'//`, no glob, no `/*` in a regex and no `//` in JSX text. The adversarial fixture below shows how easily it breaks.

## Adversarial fixture (`edge.tsx`, 30 lines, 7 real comments)

The fixture contains: `'https://…'`, `"a // b"`, `` `x // ${a} /* y */` ``, `/a\/*b/`, `'src/**/*.ts'`, `.join('//')`, `6 /* six */ * 7`, a template literal holding a `// …` line, JSX text `http://example.com // and /* this */ is text`, `{/* real */}`, `title="a // b"`, `<p>{a}</p>{/* trailing jsx */}`, `const k = 1; // trailing`, a multi-line `/* */`, a `* i` continuation line, and reasoned `@ts-expect-error` / `eslint-disable-next-line` comments.

| Method                          | False positives (lines)                                                                 | False negatives (lines)                                 |
| ------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| naive grep                      | 9: string, template, regex, glob, `.join('//')`, template line, JSX text, JSX attribute | 0                                                       |
| line-start grep                 | 2: `// …` inside a template, the `* i` multiplication                                   | 4: inline `/* six */`, both JSX comments, trailing `//` |
| tuned grep                      | 7: string, template, regex, glob, template line, JSX text, JSX attribute                | 0                                                       |
| TS scanner (leading + trailing) | 0                                                                                       | 0                                                       |
| TS scanner, **leading only**    | 0                                                                                       | 4: the same four same-line comments                     |
| ESLint `getAllComments()`       | 0                                                                                       | 0                                                       |

Grep can't tell a `//` inside a string, template, regex or JSX text from a real comment, because telling them apart needs lexer state. A regex anchored to line starts misses `{/* */}` and trailing comments. Loosening the anchor brings the false positives back.

## The trap in the TS API

`getLeadingCommentRanges(text, pos)` alone **misses every comment on the same line as the previous token**. That includes `{/* … */}` in JSX (it comes right after `{`) and `foo(); // why`. My first ground-truth run made this mistake and lost 42 of the 1,773 comments. ESLint's count exposed it.

The cause is in TS's `iterateCommentRanges`, `node_modules/typescript/lib/typescript.js` (6.0.3), around line 11923. It starts with `let collecting = trailing;`, so a leading scan only begins collecting after it crosses a line break (or at `pos === 0`). A trailing scan, the other way round, collects until it hits a line break (`if (trailing) break scan;`). The two calls therefore split a token's trivia between them, and you need both. The public signatures are in `typescript.d.ts`: `getLeadingCommentRanges(text, pos)` and `getTrailingCommentRanges(text, pos)`.

`@typescript-eslint/parser` does exactly this. `typescript-estree/dist/convert-comments.js` (8.59.1) builds `ast.comments` from `ts-api-utils`' `iterateComments`, which, in `ts-api-utils/lib/index.cjs` (2.5.0), calls `forEachLeadingCommentRange` at `token.pos` (skipping `JsxText`) and `forEachTrailingCommentRange` at `token.end` for every token. ESLint's `SourceCode#getAllComments()` just returns `this.ast.comments` (`eslint/lib/languages/js/source-code/source-code.js`, 9.39.4). So option 3 runs **the same TS-scanner algorithm** as option 2, with ESLint's config and rule machinery added on top.

## Dependencies in root vs `functions/`

- **Root:** `typescript ~6.0.3` and `eslint ^9.25.0` are direct devDependencies. `@typescript-eslint/parser` is not direct: it comes in through `eslint-config-expo`, so requiring it from a script relies on npm hoisting.
- **`functions/`:** only `typescript ~5.9.2` (5.9.3 installed). There is **no `eslint`** in `functions/package.json` and no `eslint.config.*` in `functions/`, and the root config ignores `functions/**`. `functions/`'s existing `"lint": "eslint ."` only runs because npm puts the parent's `node_modules/.bin` on PATH. It then picks up the root config, which ignores every file, so it **lints nothing** today. That's a separate bug, and the spec should note it.
- **CI:** `.github/workflows/ci.yml` runs only the root `npm run lint`.

This leaves the TS scanner as the only tokenizer that is already installed in both packages. If the script resolves `typescript` from the package it's checking (`createRequire(<cwd>/package.json)`), each package uses its own TypeScript version. The results are identical across 5.9 and 6.0.

## Recommendation

Write `scripts/check-no-comments.js` on the TS scanner (leading + trailing), and chain it into lint the same way `scripts/check-no-effects.sh` is chained:

- root: `"lint": "expo lint . --max-warnings 0 && bash scripts/check-no-effects.sh && node scripts/check-no-comments.js"`. Root skips `functions/`.
- `functions/`: `"lint": "node ../scripts/check-no-comments.js"` (plus a real linter once that's fixed). Run from `functions/`, it lists `functions/`'s tracked files and loads `functions/`' own `typescript`.

It works on comment **ranges**, so the allow-list (`eslint-disable* … -- reason`, `@ts-expect-error <description>`, license/`@generated` headers at the very top of a file) is matched against the comment's own text, not the whole line. A grep can't do that safely for multi-line block comments.

Sketch, tried on this repo: it flags 1,767 comments in root in 0.46 s and 5 in `functions/` in 0.16 s.

```js
#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');

const cwd = process.cwd();
const ts = createRequire(path.join(cwd, 'package.json'))('typescript');

const ALLOWED = [
  /^\/\/\s*eslint-disable(-next-line|-line)?\s+\S.*\s--\s+\S/,
  /^\/\*\s*eslint-(disable|enable)\s+\S[\s\S]*\s--\s+\S[\s\S]*\*\/$/,
  /^\/\/\s*@ts-expect-error\s+(--\s+)?\S/,
];
const HEADER = /@license|@generated|^\/\/ Copyright|^\/\*\s*Copyright/;
const KIND = {
  ts: 'TS',
  tsx: 'TSX',
  js: 'JS',
  jsx: 'JSX',
  mjs: 'JS',
  cjs: 'JS',
};

const files = execFileSync(
  'git',
  ['ls-files', '--', ...Object.keys(KIND).map(e => `*.${e}`)],
  { cwd, encoding: 'utf8' },
)
  .split('\n')
  .filter(
    f =>
      f && !/\.config\./.test(path.basename(f)) && !f.startsWith('functions/'),
  );

function commentsIn(file, text) {
  const kind = ts.ScriptKind[KIND[path.extname(file).slice(1)]];
  const sf = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    kind,
  );
  const found = new Map();
  const add = ranges => ranges?.forEach(r => found.set(r.pos, r));
  add(ts.getLeadingCommentRanges(text, 0));
  const visit = node => {
    if (
      node.kind >= ts.SyntaxKind.FirstJSDocNode &&
      node.kind <= ts.SyntaxKind.LastJSDocNode
    )
      return;
    const children = node.getChildren(sf);
    if (children.length > 0) return children.forEach(visit);
    if (
      node.kind === ts.SyntaxKind.JsxText ||
      node.kind === ts.SyntaxKind.JsxTextAllWhiteSpaces
    )
      return;
    add(ts.getLeadingCommentRanges(text, node.pos));
    add(ts.getTrailingCommentRanges(text, node.pos));
  };
  visit(sf);
  return [...found.values()];
}

let failures = 0;
for (const file of files) {
  const text = readFileSync(path.join(cwd, file), 'utf8');
  const firstToken = text.search(/\S/);
  for (const { pos, end } of commentsIn(file, text)) {
    const body = text.slice(pos, end);
    if (ALLOWED.some(re => re.test(body))) continue;
    if (pos === firstToken && HEADER.test(body)) continue;
    console.error(
      `${file}:${text.slice(0, pos).split('\n').length}: ${body.split('\n')[0].slice(0, 100)}`,
    );
    failures++;
  }
}
if (failures > 0) {
  console.error(
    `\n${failures} comment(s) found. Comments are banned (ADR 0013); see CODING_STANDARDS.md.`,
  );
  process.exit(1);
}
```

Notes for the spec:

- The script has no off switch by design. A comment that would disable it is itself a comment, so the script flags it.
- The repo's lint rules already guarantee that every file parses, so a syntax error can't hide comments from the scanner. The TS parser recovers from errors and still returns ranges.
- The script has a few edge cases worth a Jest test: JSX `{/* */}`, trailing `//`, `//` inside string, template, regex and JSX text, glob strings, and each allow-list form. That test belongs under `scripts/__tests__/` or `lib/`, per `CODING_STANDARDS.md` (business logic gets Jest).
- JSDoc nodes are skipped during the walk because they would otherwise be visited as children. The `/** */` text itself is still returned as an ordinary comment range, so JSDoc is caught.
