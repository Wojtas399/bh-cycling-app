# Explore before/after images in a PR body

Research for #411 (map #408). Researched 2026-11-19. Sources are `expo/explore` at commit `1de4213` (README, `docs/private-review.md`, `src/report/agent-api.ts`, `src/report/pr-comment-html.ts`, `src/report/pr-comment-body.ts`), live requests to Expo's public example report, GitHub's Markdown rendering API run with this repo as context, GitHub Docs ("About anonymized URLs", "Attaching files", "Attaching files with GitHub CLI", "Basic writing and formatting syntax"), `atmos/camo` source, and the `cli/cli` release notes. Nothing was posted to a PR. Items marked **_unverified_** need a live run.

## Short answer

- **Listing changed screens: yes.** `GET <link>/api/v1/screens?status=modified,added,removed` returns each changed screen with `headImage` and `baseImage` URLs that return the PNG. No credential beyond the link.
- **Embedding the hosted URLs: technically yes, and it renders.** GitHub rewrites them to `camo.githubusercontent.com` URLs, and camo served both URL forms as `image/png` in a test. But there are three costs. The images break when Expo Hosting deletes the deployment (30 days on the free plan). The report's bearer token goes into the PR body. And a camo URL is a public, unauthenticated URL that hex-encodes the token.
- **Better: upload the PNGs as GitHub attachments with `gh --attach`.** The premise that `gh` cannot upload user-attachments is out of date. `gh` 2.99.0 (2026-09-01) added a repeatable `--attach` flag to `gh pr create`, `gh pr edit` and `gh pr comment`. It uploads local images and rewrites local paths in the body to the uploaded URLs. In a private repo only people with repo access can see the attachments, and they don't expire with the Explore deployment. Our machine has `gh` 2.92.0, which doesn't have the flag yet: run `brew upgrade gh` first (latest is 2.105.0).
- **Recommended flow:** run `capture --upload`. Fetch `/api/v1/screens?status=modified,added,removed`. Download each `baseImage` and `headImage` into a temp folder. Write a Before/After table that points at the local paths. Then run `gh pr edit <n> --body-file body.md --attach …` with one `--attach` per PNG. Also link the hosted report (`viewerUrl`) for the full Viewer while it lives.

## 1. Can an agent list changed screens and get image URLs?

Yes. Sources: README "How agents read a report", and `src/report/agent-api.ts`. Verified against the example report `https://explore-example--euxy.expo.app/p/rfcoic27ccgnrmzgijubxkmuzmptcrva`.

- A non-HTML request to the link, or to `<link>/llms.txt`, returns a Markdown index. It links the JSON API under `/api/v1`: `/screens?status=…`, `/screens/<id>`, `/transitions` and `/raw`. A link with several targets takes `?target=<id>`, and `/reports.json` lists the targets.
- Each item from `/screens` (`reviewSurfaceItem` in `agent-api.ts`) has `id`, `route`, `routeFile`, `status`, `colorScheme`, `review.description`/`facts`, `visual.mismatchPercentage`, `headImage`, `baseImage` and `viewerUrl`. Light and dark are separate items (`<id>@dark`).
- `headImage` and `baseImage` have the form `<deployment-host>/p/<token>/api/v1/assets/<sha256>?target=<id>`. The field is absent for the side that doesn't exist: an `added` screen has no `baseImage`, a `removed` screen has no `headImage`. On the example, `status=modified,added,removed&target=iphone` returned 11 items, which matches the index ("7 modified, 2 added, 2 removed").
- The JSON uses the deployment's own host (`explore-example--eui3igzxly.expo.app`), not the alias host the link was opened with (`--euxy`). So the image URLs stay pinned to that deployment.
- The same PNG is also a plain static file at `/p/<token>/assets/<sha256>.png` (`docs/private-review.md`, "The token"). Both forms returned the same 543,413-byte, 1206×2622 PNG.
- Pages pass `limit=` and `cursor=`. The `assets` route checks that the id is a sha256 and serves files of at most 32 MiB (`MAX_ASSET_BYTES`).

Example:

```sh
curl -s "$LINK/api/v1/screens?status=modified,added,removed" \
  | jq -r '.items[] | [.route, .colorScheme, .baseImage // "-", .headImage // "-"] | @tsv'
```

## 2. Will GitHub render the hosted URLs in a private repo's PR body?

It renders, but the images don't last.

### Response headers (`curl -I`)

| URL form                                                               | Status | Content-Type | Cache-Control          | Other                                                                                                                              |
| ---------------------------------------------------------------------- | ------ | ------------ | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `/p/<token>/api/v1/assets/<sha>?target=iphone` (the API's `headImage`) | 200    | `image/png`  | `private, no-store`    | `x-robots-tag: noindex, nofollow`, `access-control-allow-origin: https://cors.invalid`, `referrer-policy: no-referrer`, ETag = sha |
| `/p/<token>/assets/<sha>.png` (static)                                 | 200    | `image/png`  | `public, max-age=3600` | Expo Hosting defaults, no robots header                                                                                            |
| same path, wrong token                                                 | 404    | `text/plain` |                        | as `docs/private-review.md` describes                                                                                              |

The deployment's `robots.txt` is `Disallow: /p/*/assets/` and `Disallow: /p/*/targets/`. That doesn't block camo: `atmos/camo`'s `server.coffee` never reads `robots.txt`, and robots headers aren't part of its checks. Camo needs a supported image content type (GitHub Docs, "About anonymized URLs"). By default it also caps size at `CAMO_LENGTH_LIMIT` = 5 MiB (`server.coffee`). GitHub's production limit isn't published (**_unverified_**). The example's screenshots are about 0.5 MB.

### Render test (no PR touched)

`POST /markdown` with `mode: gfm` and `context: Wojtas399/bh-cycling-app` renders Markdown the way an issue or PR body is rendered. The test body held both URL forms, as an HTML `<img>` and as `![]()`:

- Both came back as `https://camo.githubusercontent.com/<hmac>/<hex of the original URL>`, with the original in `data-canonical-src`.
- Fetching each camo URL anonymously returned `200 image/png`: the full PNG (1206×2622). Camo passed through the origin's `Cache-Control` (`private, no-store` for the API form, `public, max-age=3600` for the static form).
- So yes: a private repo's PR body renders the hosted images, through camo. Rendering this in a real PR body wasn't done, as instructed. The Markdown API with the repo as context is the same pipeline (**_unverified_** end to end).

### Why it's still a poor fit

- **They expire.** "A link works as long as its Expo Hosting deployment exists… Expo Hosting deletes a deployment after 30 days on the Free plan" (`docs/private-review.md`). After that, every image in the merged PR becomes a broken image. Images in the PR record should outlive the report. A deployment with an alias pointing at it is kept, but that is one alias per deployment and isn't how `capture --upload` reviews work.
- **They leak the token.** "A screenshot's URL contains the token, so it is the link too: anyone who copies a screenshot's address can open the whole report" (`docs/private-review.md`). The PR body source shows the token to anyone with repo read access. That is the intended audience, so this is acceptable. But camo URLs need no GitHub login, and their path is just the hex-encoded original URL. Anyone who gets a camo URL (copied, or in a notification email) can decode the token.
- **Camo caches.** Camo may serve a cached copy for a while after the deployment is deleted, depending on the origin's cache headers. Deleting a deployment doesn't remove images reliably either.

### What Explore itself does

`src/report/pr-comment-html.ts` has a `renderScreenshotGrid` helper. It renders `<img src="…" width="180">` cells into a PR comment ("GitHub renders this HTML inline"). At `1de4213` nothing in `src/` calls it, and `pr-comment-body.ts` says "Screenshots and per-surface navigation live inside the hosted report". So Explore's own comment links to the report and doesn't embed images.

## 3. Alternatives

### A. `gh --attach` (recommended)

- GitHub Docs, "Attaching files with GitHub CLI": "`--attach` … uploads the file to GitHub and writes the resulting URL into the body". It's available on `gh issue create|edit|comment` and `gh pr create|edit|comment`, and it's repeatable. "If your Markdown text already references a local file, and you attach that same file with `--attach`, GitHub CLI rewrites the reference in place". Attached files that the body doesn't reference are added at the end. It needs push access. It supports images and media only: PNG, GIF, JPEG, SVG, MP4, MOV, WEBM.
- It shipped in `cli/cli` v2.99.0 (release notes: "Attach images and videos to issues and pull requests"). The 2.99.0 notes also mention a 50-file batch limit (#14289). v2.102.0 allows `ghu_` tokens for supported actors. "Attachments are available on GitHub.com and GitHub Enterprise Cloud."
- Privacy: "In the case of private and internal repositories, only people with access to the repository can view the uploaded files" (GitHub Docs, "Attaching files"). The size limit is 10 MB per image.
- Lifetime: attachments are separate from the body that links them and stay until GitHub Support deletes them ("About anonymized URLs"). That's the right lifetime for a PR record.
- Local check: `gh` here is 2.92.0 (`/opt/homebrew/bin/gh`). `gh pr edit --help` has no `--attach`. **_Unverified_** here: no upload was run with a newer `gh`. Running a downloaded 2.105.0 binary was blocked in this session, and no PR may be touched. Once someone runs `brew upgrade gh`, a one-line check is `gh issue comment 411 --attach some.png`.
- Size budget: each changed screen gives up to 4 PNGs (before and after, light and dark). Ten changed screens is 40 files, under the 50-file batch limit. Above that, split across `gh pr comment` calls, or only embed light mode and link the rest.

Sketch:

```sh
LINK=…  # printed by capture --upload
mkdir -p "$TMP/shots"
curl -s "$LINK/api/v1/screens?status=modified,added,removed" > "$TMP/screens.json"
# for each item: curl -o "$TMP/shots/<id>-base.png" "$baseImage"; same for headImage
# body.md: | Screen | Before | After |  with ![before](…/shots/<id>-base.png) cells
gh pr edit <n> --body-file body.md --attach "$TMP/shots/a-base.png" --attach "$TMP/shots/a-head.png" …
```

A local `capture` also keeps the report on disk for 30 days (`npx @expo/explore reports`, `capture --output`). So you can take the PNGs from the local report instead of downloading them. The API is the simpler interface, because it already maps screens to images.

### B. Commit the PNGs to a branch and embed `../blob/<branch>/<path>?raw=true`

GitHub Docs ("Basic writing and formatting syntax", Images) gives `../blob/main/assets/images/x.png?raw=true` for "issues, pull requests and comments of the repository". These work in a private repo "only if the viewer has at least read access". The render test confirmed that GitHub does not route `github.com/…/blob/…?raw=true` through camo. An anonymous fetch got a 404, as it should for a private repo. Downsides: the PNGs go into git history (use a dedicated orphan branch, never the PR branch), and someone has to prune them. It's only worth it if `--attach` doesn't work.

### C. Link only

Put the hosted report link (or each screen's `viewerUrl`) in the PR body, with no images. That's what Explore's own comment does. It's cheap and private enough, but the images aren't in the PR, and the link dies after 30 days.

## Open questions

- Run `gh --attach` once with an upgraded `gh` on a scratch issue, to confirm the upload and rewrite work with our `gh auth` token type.
- Whether the PR body should embed both color schemes, or light only plus links.
