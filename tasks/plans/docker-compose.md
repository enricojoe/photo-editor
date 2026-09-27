# Docker Compose setup

## Context
The project had no container setup. This started as a single `docker-compose.yml` running the Vite dev server with HMR, so the editor could run without a local Node install. It has since been replaced with a **production** setup: a multi-stage `Dockerfile` builds the app and serves it via nginx, fronted by an existing Traefik instance on the deployment server (TLS via Traefik's `myresolver` Let's Encrypt certresolver). The app is a pure client-side SPA — no backend, no database, no router — so there is exactly one service and no SPA-fallback nginx config is needed. Background removal downloads its model from imgly's CDN *in the browser*, unrelated to server-side networking either way.

## Revision history
- **v1 (superseded):** multi-stage `Dockerfile` + `dev` service + nginx-served `prod` service behind a compose profile, `docker/nginx.conf`, `.dockerignore`. Built and verified, then **dropped at the user's request** ("just create a docker compose named photo-editor, and don't need that nginx"). Because the prod stage was the only reason for a Dockerfile, the Dockerfile and `.dockerignore` went with it.
- **v2 (superseded):** one file, no Dockerfile, top-level `name: photo-editor` pinning the compose project name, service named `app`.
- **v3 (superseded):** dropped the top-level `name:` field so the service could be combined under another project's compose setup instead of forcing its own `photo-editor` project namespace.
- **v4 (superseded):** service key renamed `app` → `photo-editor` (done directly in the editor) so other containers on the same Docker network resolve it at hostname `photo-editor`; `container_name: photo-editor` kept so `docker ps` also shows that exact name.
- **v5 (current):** dev setup **replaced entirely** for a real deployment target: a Linux server already running Traefik. Brought back a multi-stage `Dockerfile` (build stage compiles via `npm run build`, runtime stage is plain `nginx:1.27-alpine` serving `dist/`) and a `.dockerignore`. `docker-compose.yml` now builds that image, joins the server's existing external `traefik_web` network, and carries Traefik routing labels instead of publishing a port directly. The local dev flow (bind mount + `npm run dev` + HMR) is gone from this file — there is no dev/prod split file at the user's explicit choice.

## Design decisions (v5)
- **Multi-stage `Dockerfile`, no dev tooling in the final image.** Stage 1 (`node:24-alpine`) runs `npm ci` + `npm run build` (`tsc -b && vite build`) producing static `dist/`. Stage 2 (`nginx:1.27-alpine`) only copies `dist/` in and serves it — no Node, no source, no `node_modules` in the shipped image.
- **No custom nginx config.** The app has no client-side router (no `react-router` or similar dependency), so nginx's default static-file serving is sufficient; no `try_files ... /index.html` SPA fallback is needed.
- **No `ports:` published.** Traefik reaches the container over the shared Docker network, not via a host port mapping.
- **Joins an external network (`traefik_web`), declared `external: true`.** This network already exists on the target server (created by the existing Traefik deployment) — compose does not create or manage it.
- **Traefik labels drive routing:** `Host(\`editor.enricojoe.site\`)`, `entrypoints=websecure`, `tls=true` with `tls.certresolver=myresolver` (name taken from the server's actual Traefik static config, which uses `acme.tlschallenge`), and `loadbalancer.server.port=80` (nginx's listen port). `traefik.docker.network=traefik_web` is set explicitly so routing can't silently break if a second network is ever attached to this container.
- **`restart: unless-stopped`** — the dev version had no restart policy; a deployed service needs to survive crashes/reboots.
- **`container_name: photo-editor`** kept from v4.

## Checklist
- [x] v1–v4 built/iterated (superseded — see revision history)
- [x] Re-add `Dockerfile` (multi-stage build → nginx) and `.dockerignore`
- [x] Rewrite `docker-compose.yml`: drop bind mount/dev command/published port, add `build`, `restart`, external `traefik_web` network, Traefik labels
- [x] `docker compose config` validates (resolves `certresolver=myresolver`, `Host` rule, external network)
- [x] `docker build` succeeds; container serves `200` on `/` via nginx (verified standalone, without the real Traefik network attached)
- [x] Result section below + `tasks/todo.md` entry

## Result
Built and verified locally; changes are in the working tree, **not committed**, and **not yet deployed** to the actual Linux server.

What shipped (v5):
- `Dockerfile` (multi-stage: `node:24-alpine` build → `nginx:1.27-alpine` runtime) and `.dockerignore`.
- `docker-compose.yml` rewritten: `photo-editor` service builds from that Dockerfile, `restart: unless-stopped`, joins external `traefik_web` network, Traefik labels routing `editor.enricojoe.site` over TLS via the `myresolver` certresolver.

Verification performed locally (no live Traefik/`traefik_web` network available in this environment):
- `docker compose config` — valid; resolves the `Host` rule, certresolver name, and external network reference correctly.
- `docker build .` — succeeds; `npm run build` completes (`tsc -b && vite build`), image produced.
- Ran the built image standalone with `-p 18080:80` (bypassing Traefik/the external network, which don't exist on this dev machine) — `GET /` returns `200` and serves the real `index.html`.

**Not verified (requires the actual server):**
- Actual routing through Traefik on the real `traefik_web` network.
- TLS certificate issuance via the `myresolver` certresolver (`tlschallenge` requires the server's public IP/port 443 to be reachable from Let's Encrypt).
- DNS for `editor.enricojoe.site` pointing at the server.
- The previous dev-mode verification (HMR, bind mount, `npm test`/`npm run lint` in-container) no longer applies to this file — v5 has no dev path. If local dev via Docker is needed again later, it would need to be a separate compose file, since the user chose to replace rather than split.
