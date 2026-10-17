# Every form is built with react-hook-form and a valibot schema, behind one shared field binding

## Status

Accepted

## Context

Each form (sign-in, sign-up, forgot-password, change-password, delete-account) was a route-local `use*.ts` hook with a `useState` per field value and per error, `on*Change` handlers that cleared errors and reset mutations, and a hand-written `validate()`. Every new form repeated that boilerplate a little differently, and planned forms with numeric, select and switch inputs would multiply it.

The app runs with the React Compiler on, and `CODING_STANDARDS.md` requires form logic to be testable in hooks and `lib/` without rendering UI.

## Decision

A **form** is any set of inputs the user fills in and then submits to an action. Every form is built with `react-hook-form` (^7.90) and validated by a valibot schema through `standardSchemaResolver` from `@hookform/resolvers`. An input that takes effect live with no submit (e.g. a search or filter field) is not a form.

### Validation

- Each form has a route-local `<form>Schema.ts` next to its hook and `*Errors.ts`. Form value types come from the schema. Shared building blocks (`msg()`, `requiredString`, `newPasswordField`, email and match helpers) live in `lib/validation.ts`.
- Schemas carry **i18n keys** as messages, written through the typed `msg()` helper, never translated text. The field binding translates them with `t()` at render. Constant params come from i18next `interpolation.defaultVariables` (e.g. `{{minPasswordLength}}`).
- Messages shared across forms live in the `validation.*` namespace. Wording specific to one form stays in that form's namespace. There is no generic "required" key, because every required message names its field.
- One error per field: the resolver keeps the first issue. All fields are validated on submit.
- Validation lives only in the schema. It is never written as RHF `rules` or `register` options, which can't run in hook tests.
- Schemas trim emails and similar text, never passwords. The submit handler gets the parsed output, and the input still shows what the user typed.

### Behaviour

- `mode: 'onSubmit'`, `reValidateMode: 'onChange'`. No errors show before the first submit. After it, each field re-checks as the user types.
- A cross-field rule re-checks through `deps` on the **compared** field (e.g. `newPassword: ['confirmPassword']`). The form hook declares `deps`, not the JSX.
- A failed submit focuses the first invalid field (`shouldFocusError`). Every field except the last uses `returnKeyType="next"` and moves focus with `setFocus`. The last field uses `"done"` and submits.
- **Server errors** are Firebase failures mapped by the form's `*Errors.ts`. They stay derived from mutation state and are never copied into RHF (no `setError`, no `errors.root`). A field shows its validation error first, then its mapped server error. A mapped error with no field is the form's **form error**.
- Any field change resets all of the form's mutations, so a stale server error disappears as soon as the user edits.
- Each form has one **primary submit**, run through `handleSubmit`. **Secondary actions** (Google sign-in/up, the reset email) are plain handlers outside RHF and don't validate. Starting any mutation resets the others.
- **Busy** means any of the form's mutations is pending, not `isSubmitting`. While busy, every button is disabled, every input has `editable={false}`, and every handler returns early.
- `watch()` is never used, because the React Compiler marks it incompatible. Use `useWatch` or `useFormState` instead.

### Shape

- The route-local form hook returns `{ form, formError, busy, submit, …secondary actions }`. It owns the schema, the mutations, the `*Errors.ts` mapping and `deps`.
- Form hooks create the form with `useAppForm(schema, options)` from `hooks/useAppForm.ts`, which fixes the resolver, `mode`, `reValidateMode` and `shouldFocusError` above. They pass only per-form options such as `defaultValues`.
- `form` is a **`FormBinding`** (`hooks/formBinding.ts`), everything a field needs from its form: `control`, `setFocus`, `busy`, `onFieldChange`, `serverError(name)` and `deps`. Screens pass it to every field unchanged.
- Each input kind has exactly one binding: a hook `hooks/useForm<Kind>Field.ts` holding the logic (`useController`, the forwarded ref, translation, error precedence, busy, `next`), plus a component `components/Form<Kind>Field.tsx` that renders it. Text fields are `useFormTextField` and `FormTextField` over `FormField`. A new input kind (numeric, select, switch) adds its own pair on the same `FormBinding` contract.
- Screens never use `Controller`, `useController`, `FormField`, `Input` or `PasswordInput` directly.

### Testing

- Per-field rules are tested as pure `safeParse` calls in `<form>Schema.test.ts`.
- Hook tests use `renderHookWithClient` with `useBoundFields(hook.form, FIELDS)` from `test-utils/form.ts`, which drives fields through the real binding hook. They cover validation timing, `deps`, error precedence, submit, server errors and secondary actions.

### Lint

ESLint enforces the boundaries, and each message cites this ADR:

- In `app/**`, imports of `@/components/FormField`, `@/components/Input` and `@/components/PasswordInput` are errors. A screen with a live (non-form) input disables the rule inline and gives the reason.
- `Controller` and `useController` from `react-hook-form` are errors outside `hooks/useForm*Field.ts`.
- Calling `watch` or destructuring it from `useForm` or `useAppForm` is an error.

### Considered and rejected

- **The hand-written `use*` hooks we had:** the boilerplate this replaces.
- **RHF built-in `rules`:** they only run once a field registers, so hook tests without a render never exercise them.
- **A hand-written pure validator plus a tiny resolver:** keeps most of the per-form boilerplate.
- **zod / zod-mini:** about 87 KB gzipped with tree shaking off, and it uses `new Function` under Hermes.
- **`setError` for server errors:** a second copy of the error that needs manual clearing, plus separate set/clear code for each secondary action.
- **react-hook-form v8:** still beta. `@hookform/resolvers` requires v7, and the beta lacks 7.90's React Compiler fixes.

## Consequences

- react-hook-form, valibot and the resolvers add about 46 KB gzipped, roughly 5% of the iOS bundle.
- Validation UX changed from before: errors now re-check as the user types after the first submit (instead of only clearing), the first invalid field gets focus, and `next` moves focus on every form.
- "Passwords don't match" still shows next to a too-short new password, as before.
- An upgrade of react-hook-form or the React Compiler must re-check a release build on device: typing, focus-on-error, `next`/`done`, `deps` and the server-error flow. Release builds of iOS and Android passed these checks with no workarounds.
- Form hooks, schemas and `lib/validation.ts` are business logic and are unit-tested. The field components are not.
- Forms are UI infrastructure, not domain language, so these terms stay out of `CONTEXT.md`.
