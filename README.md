# Begitra's site

The product page and the download page of [Begitra](https://github.com/ikerzam/begitra), a desktop
Git client for reading and reviewing large volumes of AI-generated code, in English and Spanish:
[begitra.ikerzam.tech](https://begitra.ikerzam.tech).

An [Astro](https://astro.build) project built as static files: no script, no inline style or image,
every asset under `assets/` with its content's hash in its name, so the server can forbid scripts
outright and cache the assets as immutable (`deploy/nginx.conf`).

## Commands

| Task                                      | Command                                                                                                     |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Install (also installs the git hooks)     | `pnpm install`                                                                                              |
| See the pages while editing               | `pnpm dev`                                                                                                  |
| Build into `dist/`                        | `pnpm build`                                                                                                |
| Serve `dist/` with the production headers | `node scripts/serve.mjs` (port 4173)                                                                        |
| Tests                                     | `pnpm test`                                                                                                 |
| Format                                    | `pnpm format`, `pnpm format:check`                                                                          |
| Cut the screenshots and icons             | `python scripts/generate-images.py <captures> <app checkout>` (needs `pip install pillow fonttools brotli`) |

## What a page is made of

- **The release's facts**: the version, the site's address, the updater's public key and the
  installers with their size and SHA-256, as JSON. `BEGITRA_SITE_FACTS` names the file a release
  writes; without it, the build reads `src/sample-release.json`.
- **The copy**: `strings/en.json` and `strings/es.json`; `releases.json` holds each version's date,
  title and notes in both languages; `site.json` the publisher and the donation page.
- **The images**: `assets/`, cut by the image script from 2x captures of the app, with their sizes in
  `images.json`.

## Commits

Conventional Commits, which the `commit-msg` hook checks. The `pre-push` hook builds and runs the tests.
