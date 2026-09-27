# Infrastructure lessons

- **Context:** Asked to "add docker compose" to PhotoEditor, a client-side-only Vite/React SPA with no backend.
- **Mistake:** Over-built it: a multi-stage Dockerfile, a second `prod` service behind a compose profile, an nginx config and a `.dockerignore`. The user replied "just create a docker compose named photo-editor, and don't need that nginx" — they wanted one compose file, nothing more.
- **Correct Pattern:** For a bare "add docker compose" request, ship the smallest thing that runs the project (here: one `docker-compose.yml`, one service, stock `node` image, dev server). Don't add prod/nginx/multi-stage tiers, extra profiles or a Dockerfile unless asked or genuinely required — mention them as an optional follow-up instead. Also honour any name the user gives (`name:` at the top of the compose file sets the project name).
