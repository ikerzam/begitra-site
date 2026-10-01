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
| Build and check a release's pages         | `node scripts/deploy.mjs [--version <x.y.z>]`                                                               |
| Deploy them                               | `node scripts/deploy.mjs --upload <user@host:/path> --identity <key file>`                                  |

## What a page is made of

- **The release's facts**: the version, the updater's public key and the installers with their
  size and SHA-256, as the release's `site-facts.json` holds them. `BEGITRA_SITE_FACTS` names the
  file; without it, the build reads `src/sample-release.json`. The installers download from the
  version's GitHub release.
- **The copy**: `strings/en.json` and `strings/es.json`; `releases.json` holds each version's date,
  title and notes in both languages, and is where a release's notes are written before its tag is
  pushed, since the release reads them from here; `site.json` holds the site's address, the
  repository whose releases it describes, the publisher and the donation page.
- **The images**: `assets/`, cut by the image script from 2x captures of the app, with their sizes in
  `images.json`.

## Deploying

`node scripts/deploy.mjs` takes the `site-facts.json` of the latest release (or of `--version`, or
the file `--facts` names), builds the pages from it, and asks GitHub for every release file the
pages link: when one is missing, it stops before anything is uploaded. With `--upload` it then
copies the build to the server over SSH, `assets/` before the pages that name them. It never sends
`releases/` or `latest.json`: the server keeps the installers of the versions up to 0.6.5, and
answers `/latest.json`, the only address those versions ask for updates, with a redirect to the
latest release's manifest (`deploy/nginx.conf`).

The server is `deploy/compose.yml` and `deploy/nginx.conf` in one folder, with the site in
`site/` beside them: `docker compose up -d` there. After changing `nginx.conf`, copy it to that
folder and run `docker compose up -d --force-recreate`, since nginx reads it when it starts.

## Commits

Conventional Commits, which the `commit-msg` hook checks. The `pre-push` hook builds and runs the tests.
