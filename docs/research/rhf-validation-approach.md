# Research: validating RHF forms with built-in rules or a schema resolver

Ticket: #100 (map #98). Researched 2026-10-14. These are facts and trade-offs. The decision belongs to a separate grilling ticket.

## TL;DR

- **There are four mechanisms, not two.** (1) Per-field `rules` (`required`, `minLength`, `pattern`, `validate(value, formValues)`). (2) The form-level `useForm({ validate })`, added in v7.72.0. (3) A hand-written `resolver`, which is a plain function. (4) A schema library plus an `@hookform/resolvers` adapter. A resolver and the built-in rules are mutually exclusive.
- **Every path ends in `FieldError.message: string`.** RHF types `Message = string`, and the resolvers copy only `{ message, type }` from each issue. A typed `ParseKeys` key survives only as a string. That means a typed helper where keys are written and one narrowing cast where they are read, whatever library is chosen. Interpolation params such as `{ count }` are dropped, so they have to be supplied at render time.
- **Measured cost on top of RHF (esbuild, tree-shaken, min+gzip) for the change-password and email schemas:** valibot about 2.3 KB, zod/mini about 6.3 KB, zod classic about 26 KB, arktype about 49 KB. Hermes bytecode deltas: about 12 KB, 38 KB, 203 KB and 340 KB. All four compile with the repo's `hermesc`.
- **Expo tree shaking is not on in this repo.** No `EXPO_UNSTABLE_TREE_SHAKING` is set, so whole-module inclusion is the realistic case. Valibot still costs about 15 KB gz for the entire library. `zod/mini` re-exports all locales, at about 87 KB gz for the whole barrel.
- **Hermes:** zod v4 had two Hermes bugs, both fixed upstream: the `navigator` probe (fixed in 3.25.64) and `Symbol.hasInstance`. Zod and arktype also generate code with `new Function`. ArkType has an **open** Hermes crash (arktype#1415). Valibot builds no code at runtime, and I found no Hermes issues for it.
- **Leaning:** for form-sized validation the facts favour either **valibot through `standardSchemaResolver`/`valibotResolver`** or a **hand-written pure `validate*()` plus a tiny custom resolver**. The second has no dependency and is fully typed. Zod classic and arktype cost much more bundle for no feature this app needs.

## 1. What RHF offers (v7.90.0, latest stable; v8 is at `8.0.0-beta.4`)

Source: [useForm docs](https://react-hook-form.com/docs/useform), [register docs](https://react-hook-form.com/docs/useform/register), npm `react-hook-form` dist-tags (latest `7.90.0`, beta `8.0.0-beta.4`).

| Mechanism                                   | Cross-field                                                                                                                                                                                                          | Where the logic lives                                           | Notes                                                                                                                                                                                                                         |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rules` on `register`/`Controller`          | `validate: (value, formValues) => true \| string \| false`. Form values are passed "since v7.42.0". `deps` (since v7.14.0) re-validates the listed fields, but "Calling `trigger()` manually does not honor `deps`". | Spread across each field's `rules` prop                         | "Validation rules are all based on the HTML standard and also allow for custom validation methods."                                                                                                                           |
| `useForm({ validate })` (since **v7.72.0**) | Receives `{ formValues, formState, eventType, name }`. Returns `true`, a string (surfaced at `errors.form`), or `{ [field]: { type, message } }`.                                                                    | One function                                                    | "validate does not run when a resolver is configured — resolver and validate are mutually exclusive, and only resolver runs if both are set." Field errors from it surface under `errors.form.<field>`, not `errors.<field>`. |
| Custom `resolver`                           | Full access to values                                                                                                                                                                                                | One function `(values, context, options) => { values, errors }` | "If you're not using a library, you can always write your own logic to validate your forms." Must return both `values` and `errors`, and errors must be nested, not dotted keys.                                              |
| Schema + `@hookform/resolvers`              | Through the schema's refine/check API                                                                                                                                                                                | Schema module in `lib/` or route-local                          | "A resolver cannot be used with the built-in validators (e.g.: required, min, etc.)"                                                                                                                                          |

Other relevant options: `criteriaMode: 'firstError'` (default) gathers "only the first error from each field". `mode` defaults to `'onSubmit'`, which matches today's validate-on-submit. "Clear on change" and `reValidateMode` belong to #99.

## 2. Resolver compatibility

Source: npm `@hookform/resolvers@5.9.1` (latest, 2026-08-17), [resolvers README](https://github.com/react-hook-form/resolvers/blob/master/README.md).

- Peer deps: `react-hook-form: ^7.55.0`, `zod: ^3.25.0 || ^4.0.0`, `valibot: >=0.31.0 || ^1.0.0-…`, `arktype: ^2.0.0`, `@standard-schema/spec: ^1.0.0`. **7.90.0 is in range. The RHF v8 betas are not covered by the declared peer range.**
- `standardSchemaResolver` (`@hookform/resolvers/standard-schema`) accepts any [Standard Schema v1](https://standardschema.dev/) object. Zod v4 (classic and mini), valibot 1.x and arktype 2.x all expose `~standard.validate`, which I checked at runtime. Its criteriaMode support is `firstError | all`. ArkType's own resolver supports `firstError` only (README table).
- The zod resolver detects v4 by duck-typing (`'_zod' in schema`), so `zod/mini` schemas work with `zodResolver` too. That detection logic is in `@hookform/resolvers/zod/src/zod.ts`. The README shows only `zod` / `zod/v4` imports.
- **Error mapping (source read):** `parseZod4Issues` stores `{ message, type: code }` for the first issue on each path. The Standard Schema resolver stores `{ message, type: '' }` and puts root-level issues under `errors.root`. Nothing else from the issue reaches RHF, including custom `params`.
- Version pitfall in this repo: `zod@3.25.76` is already hoisted in `node_modules`, pulled in by `eslint-plugin-react-hooks` and `@expo/cli`. Adding `zod@^4` as a direct dependency is fine, but check `npm ls zod` after installing.

## 3. Candidate libraries: size and Hermes

### Measured bundle cost

Method: I installed `react-hook-form@7.90.0`, `@hookform/resolvers@5.9.1`, `zod@4.6.7`, `valibot@1.5.0` and `arktype@2.2.8` in a scratch dir. Each entry was bundled with esbuild (`--minify`, `react` external, `react-native` main field and condition) and gzip -9. The schemas were the real change-password schema (3 fields, required/min-length, 2 cross-field rules) plus the sign-up email rule. Each IIFE build was then compiled with the repo's `node_modules/hermes-compiler/hermesc/osx-bin/hermesc -emit-binary -O`. **All builds compiled under hermesc.** Deltas are against RHF alone (13.1 KB gz, 90 KB HBC).

| Entry                                         | min+gz  | Δ gz vs RHF  | Hermes HBC | Δ HBC vs RHF |
| --------------------------------------------- | ------- | ------------ | ---------- | ------------ |
| RHF only (= built-in rules / custom resolver) | 13.1 KB | 0            | 90 KB      | 0            |
| + valibot + `valibotResolver`                 | 15.5 KB | **+2.3 KB**  | 103 KB     | **+12 KB**   |
| + valibot + `standardSchemaResolver`          | 16.2 KB | +3.0 KB      | 104 KB     | +13 KB       |
| + zod/mini + `zodResolver`                    | 19.4 KB | +6.3 KB      | 128 KB     | +38 KB       |
| + zod/mini + `standardSchemaResolver`         | 19.6 KB | +6.5 KB      | 127 KB     | +37 KB       |
| + zod (classic) + `zodResolver`               | 39.2 KB | **+26.1 KB** | 294 KB     | **+203 KB**  |
| + arktype + `arktypeResolver`                 | 62.0 KB | **+48.8 KB** | 430 KB     | **+340 KB**  |

Whole-library upper bound (`export * from '<lib>'`, i.e. no tree shaking): valibot 15.4 KB gz, zod/mini 86.9 KB gz, zod 94.5 KB gz. Zod's `mini/external.js` and `classic/external.js` both contain `export * as locales from "../locales/index.js"`, which explains the zod/mini figure.

Vendor numbers for comparison, using a different schema: [Zod Mini docs](https://zod.dev/packages/mini) give `z.boolean().parse(true)` at 2.12 KB (mini) vs 5.91 KB (zod), and an object schema at 4.0 KB vs 13.1 KB. The [Valibot comparison](https://valibot.dev/guides/comparison/) gives a login-form schema at 1.37 KB (valibot) vs 17.7 KB (zod, esbuild) vs about 6.88 KB (zod mini, esbuild). My numbers are higher for zod because zod 4.6 is larger than the version those docs measured, and my schema has more checks.

### Does Metro tree-shake here?

[Expo tree-shaking guide](https://docs.expo.dev/guides/tree-shaking/): "Experimentally available in SDK 52 and later." The note "Enabled by default in SDK 54 and later" sits under the step about `experimentalImportSupport`. Actual shaking still needs the steps "Toggle on the environment variable `EXPO_UNSTABLE_TREE_SHAKING=1`" (production only) and, optionally, `EXPO_UNSTABLE_METRO_OPTIMIZE_GRAPH=1`. The guide calls the feature "very experimental". This repo has no `metro.config.js`, no `.env`, and no such variable in `eas.json`, so **expect whole-module inclusion**. Between the two rows above, that makes the "upper bound" row the more realistic one. Valibot ships as a single module (`dist/index.mjs`), so it lands at about 15 KB gz either way. A real `expo export` measurement would settle this and fits the prototype ticket.

### Hermes compatibility

- Hermes [Features.md](https://github.com/facebook/hermes/blob/main/doc/Features.md) lists "Local mode `eval()`" under "Excluded From Support". The Function constructor is not listed as excluded, and Hermes issues show it in use, e.g. [hermes#120](https://github.com/facebook/hermes/issues/120).
- **Zod v4** builds an object fast path with `new Function` when `allowsEval` succeeds (`zod/v4/core/util.js`, `schemas.js`). `z.config({ jitless: true })` turns it off. Code built that way is compiled from source at runtime, so it gets no benefit from Hermes bytecode precompilation. This is inferred from the mechanism and was not measured on a device. Past Hermes bugs, both fixed:
  - [zod#4690](https://github.com/colinhacks/zod/issues/4690): a `navigator.userAgent` crash on RN. The maintainer replied "fixed in 3.25.64".
  - [zod#5070](https://github.com/colinhacks/zod/issues/5070): Hermes ignored `Symbol.hasInstance` ([hermes#1468](https://github.com/facebook/hermes/issues/1468)). The maintainer: "I fixed this by avoiding Zod's internal usage of `instanceof`." The resolver also duck-types now, as shown in section 2.
  - [zod#4741](https://github.com/colinhacks/zod/issues/4741): `export * as` needed a Babel transform on older RN. It is closed.
- **ArkType** also builds code at runtime (`@ark/util/out/functions.js` probes `new Function`). [arktype#1415](https://github.com/arktypeio/arktype/issues/1415), "React Native: TypeError: \_result.isRoot is not a function", is **open**, and the maintainer could not reproduce it. [arktype#1340](https://github.com/arktypeio/arktype/issues/1340) (CI for RN/Static Hermes) is open. Other Expo issues (#1645, #1027, #855) are closed.
- **Valibot:** a search of the `open-circle/valibot` issues for "hermes" returned nothing. Validation is plain functions with no code generated at runtime.

Runtime cost of validating 3 to 5 strings on submit is negligible in every option. What remains is module init and bundle/bytecode size. Not measured on a device.

## 4. Cross-field rules we need

Today's behaviour (`useChangePassword.ts`, `useSignUp.ts`): each field gets its first failing message in an else-if chain. For new password that is required → too short (`MIN_PASSWORD_LENGTH`) → same as current. For confirm it is required → mismatch. Email is trimmed, then checked as required → `EMAIL_REGEX`.

I ran all three schema styles against the same inputs (`node`, zod 4.6.7 / valibot 1.5.0). With RHF's `firstError` taking the first issue per path, **all three matched today's per-field result** on these cases: all empty; short + mismatch; empty current + mismatch; same-as-current; valid.

- **Zod (classic / mini):** use object-level `.refine(fn, { path: ['confirmPassword'], message })`, or `z.refine` inside `.check()` for mini ([zod.dev/api](https://zod.dev/api), "path"). Caveat from the docs: "An error on anotherField will prevent the password confirmation check from executing". Object refinements are skipped once a non-continuable issue exists, and the `when` option controls this. I observed it directly: `abort: true` on `newPassword` required skipped both refinements. Plain `min` checks are continuable, so the refinements still ran in the other cases.
- **Valibot:** `v.forward(v.partialCheck([['newPassword'], ['confirmPassword']], fn, msg), ['confirmPassword'])`. Per the docs, "`partialCheck` can be executed whenever the selected part of the data is valid", whereas `check` runs "only when the entire dataset is typed" ([partialCheck](https://valibot.dev/api/partialCheck/)). Observed: for all-empty input valibot emits several issues per field, all pipe steps plus the partial check, unless `abortPipeEarly` is set. `firstError` still surfaces the right one.
- **Built-in rules:** `validate: (v, values) => v === values.newPassword || key`, plus `deps: ['confirmPassword']` on `newPassword`. Each field keeps its own chain, so the logic is spread across fields.
- **Hand-written:** the existing else-if chains carry over as they are.

## 5. Emitting typed i18n keys instead of strings

Constraint: RHF's `type Message = string` and `FieldError.message?: Message` (`react-hook-form/dist/types/errors.d.ts`). The Standard Schema `Issue.message` is `string` ([spec](https://standardschema.dev/), `@standard-schema/spec` d.ts). **No option keeps the `ParseKeys` type through RHF's `formState.errors`.**

What works everywhere:

- **Write side:** pass the key as the message, through a helper typed like the `*Errors.ts` files, e.g. `const key = <K extends Extract<ParseKeys, \`${string}.validation.${string}\`>>(k: K) => k`. Zod accepts `string | { error }`. Valibot accepts `string | (issue) => string`, and its i18n guide says message lookup keys "can be any string you want" ([i18n guide](https://valibot.dev/guides/internationalization/)). RHF rules accept a string.
- **Read side:** one narrowing cast in the form layer (`t(error.message as ValidationKey)`), which could live in `FormField`.
- **Params:** `changePassword.validation.newPasswordTooShort` uses `{{count}}`. Resolvers drop issue params (section 2), so `count: MIN_PASSWORD_LENGTH` has to be supplied at render time. The alternative is to encode params in the message, which is not recommended. `signUp.validation.passwordTooShort` hardcodes "8" in `pl.ts`.
- **Fully typed alternative:** a pure `validateChangePassword(values): Partial<Record<Field, ValidationKey>>` in `lib/` (or route-local), wrapped by a 5-line custom resolver. The pure function's return type stays `ParseKeys` end to end. Only the resolver adapter widens it to `string`.

## 6. Testability (CODING_STANDARDS.md: pure functions / hooks, no UI tests)

- **Schema (any lib):** `schema.safeParse(values)` or `v.safeParse(schema, values)` is pure and easy to unit-test in `lib/__tests__/` or the route's `__tests__/`. Asserting on `path` + `message` (the key) is straightforward. You can also test the actual RHF output by calling `zodResolver(schema)(values, undefined, { fields: {}, shouldUseNativeValidation: false })`, which is async.
- **Hand-written validate + custom resolver:** this is the most direct pure-function test, and today's `use*.test.ts` validation cases port almost as they are.
- **Built-in rules:** individual `validate` functions can be exported and tested. The combined behaviour (which rule fires first, `deps`) only exists inside RHF at runtime, so you would need `renderHook` and real fields to test it. That ties into #99 / the "Testing pattern" open question on #98.
- **`useForm({ validate })`:** a pure function too, but its field errors land under `errors.form.<field>` (per the docs), not `errors.<field>`, which changes how `FormField` reads errors.

## 7. Trade-off summary

|                       | Deps / size                                      | Cross-field                                      | Typed keys                  | Pure test     | Hermes risk                                          |
| --------------------- | ------------------------------------------------ | ------------------------------------------------ | --------------------------- | ------------- | ---------------------------------------------------- |
| Built-in `rules`      | 0                                                | `validate(v, values)` + `deps`, spread per field | key as string; cast on read | per-rule only | none                                                 |
| Hand-written resolver | 0                                                | as today                                         | **typed until the adapter** | **best**      | none                                                 |
| valibot               | +2.3 KB gz (tree-shaken) / about 15 KB whole lib | `forward(partialCheck)`                          | key as string; cast on read | good          | no known issues                                      |
| zod/mini              | +6.3 KB gz / up to about 87 KB unshaken          | `.check(z.refine(…, { path }))`                  | same                        | good          | fixed bugs; `new Function` JIT (`jitless` available) |
| zod classic           | +26 KB gz                                        | `.refine(…, { path })`                           | same                        | good          | same as zod/mini                                     |
| arktype               | +49 KB gz                                        | `.narrow` + `ctx.reject({ path })`               | same                        | good          | **open RN crash #1415**                              |

Things that would change the picture: planned numeric/select/switch forms that need coercion or transforms (schemas help there, through `z.input`/`v.InferInput` and the three-generic `useForm`, per the resolvers README); turning on Expo tree shaking; sharing schemas with `functions/` (Cloud Functions), where zod's ecosystem is broader.
