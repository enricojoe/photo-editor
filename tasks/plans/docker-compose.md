# Docker Compose setup

## Context
The project had no container setup. This adds a single `docker-compose.yml` (compose project name **`photo-editor`**) that runs the Vite dev server with HMR, so the editor can be run without a local Node install. The app is a pure client-side SPA — no backend, no database — so there is exactly one service. Background removal downloads its model from imgly's CDN *in the browser*, so the container needs no outbound access for the app itself.

## Revision history
- **v1 (superseded):** multi-stage `Dockerfile` + `dev` service + nginx-served `prod` service behind a compose profile, `docker/nginx.conf`, `.dockerignore`. Built and verified, then **dropped at the user's request** ("just create a docker compose named photo-editor, and don't need that nginx"). Because the prod stage was the only reason for a Dockerfile, the Dockerfile and `.dockerignore` went with it.
- **v2 (superseded):** one file, no Dockerfile, top-level `name: photo-editor` pinning the compose project name.
- **v3 (current):** dropped the top-level `name:` field at the user's request, so this `app` service can be combined (via multiple `-f` files or a `-p`/`COMPOSE_PROJECT_NAME` from elsewhere) under another project's compose setup instead of always forcing its own `photo-editor` project namespace.

## Design decisions (v3)
- **No top-level `name:`.** Compose now falls back to its normal default (the containing directory name, lowercased/sanitized) unless the project name is set some other way (`-p`, `COMPOSE_PROJECT_NAME`, or a `name:` in another compose file this one is merged with). This is intentional so the `app` service isn't locked into its own `photo-editor` project and can join another container's compose project.
- **Single service `app`**, straight from the `node:24-alpine` image — no Dockerfile, no build step, no `.dockerignore` (there is no build context to keep clean).
- **Dev server flags on the command line** (`npm run dev -- --host 0.0.0.0`), not in `vite.config.ts` — local `npm run dev` behaviour is untouched.
- **Repo bind-mounted at `/app`, `/app/node_modules` masked by a named volume.** Host `node_modules` holds macOS native binaries (rolldown, oxlint, …) that cannot run in Linux.
- **`npm install` runs on every start** (`--no-audit --no-fund`) instead of `npm ci` baked into an image. It is a no-op when nothing changed (~0.5 s), and it means editing `package.json` is picked up by a plain restart — no stale-volume trap like the image-baked install had. It honours `package-lock.json` and did not modify it in testing.
- **Host port via `APP_PORT`** (default 5173) for when the port is taken by a local `npm run dev`. Named `APP_PORT` rather than `PORT` to avoid silently picking up a `PORT` already exported in someone's shell.

## Checklist
- [x] v1 built and verified (superseded — see above)
- [x] Remove `Dockerfile`, `docker/nginx.conf`, `.dockerignore`; remove the obsolete `photoeditor-dev` / `photoeditor-prod` images
- [x] Rewrite `docker-compose.yml` (`name: photo-editor`, single `app` service)
- [x] README "Running with Docker" section rewritten for v2
- [x] `docker compose config` validates
- [x] Serves the app; Linux binaries in use; host edit triggers HMR; tests + lint pass in the container; lockfile untouched; restart is fast
- [x] Result section below + `tasks/todo.md` entry

## Result
Built and verified; changes are in the working tree, **not committed**.

What shipped:
- `docker-compose.yml` (project `photo-editor`, service `app`) and a "Running with Docker" README section. Nothing else — no source or `vite.config.ts` changes.
- `docker compose up` → Vite dev server with HMR at `http://localhost:5173` (`APP_PORT` to change the host port). `docker compose exec app npm test` / `npm run lint` for the other scripts.

Verification (real container, on alternate host port 15173 because 5173 was held by a local `npm run dev`):
- `docker compose config` valid and reports `name: photo-editor`; container `photo-editor-app-1`, volume `photo-editor_node_modules`.
- Cold start (fresh volume, including install) ready in ~7 s; `/` and `/src/App.tsx` return 200.
- Linux `@rolldown/binding-linux-arm64-musl` in use (not the host's macOS binary).
- `touch src/App.tsx` on the host → `[vite] (client) hmr update /src/App.tsx` in the container (bind mount + watcher work).
- `docker compose exec app npm test` → **131/131**; `npm run lint` → the same 4 pre-existing warnings, 0 errors.
- `package.json` / `package-lock.json` checksums identical before and after; `git status` shows only the intended files.
- `down` (volume kept) then `up` → ready in ~2 s, install log `up to date in 540ms`.
- Test container, network and volume removed afterwards (`down -v`).

**Not verified:**
- Interactive use in a real browser (UI rendering, HMR repainting on screen, background removal fetching its model from `staticimgly.com`): no browser-automation tool available.
- The "edit `package.json`, then restart picks up the change" path was not exercised (would require modifying the project's dependencies); it rests on standard `npm install` behaviour.
- `linux/amd64` hosts (everything ran on `linux/arm64`; the lockfile does contain the x64 bindings) and HMR on non-macOS hosts (WSL2/Linux bind mounts can need `server.watch.usePolling`).
