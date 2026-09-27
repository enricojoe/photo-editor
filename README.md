# React + TypeScript + Vite

## Running with Docker

Requires Docker with the Compose plugin. The app is fully client-side (no backend or database).

```bash
# Vite dev server with hot reload -> http://localhost:5173
docker compose up
```

Run the other scripts inside the running container:

```bash
docker compose exec app npm test
docker compose exec app npm run lint
```

Notes:

- The `photo-editor` compose project bind-mounts the repo into a `node:24-alpine` container, so edits on your machine hot-reload. Its `node_modules` lives in a named volume (your host's macOS binaries can't run in the Linux container).
- `npm install` runs on every start (a no-op when nothing changed), so after editing `package.json` just restart. If `node_modules` ever gets into a bad state, reset it with `docker compose down -v`.
- Change the host port with `APP_PORT`, e.g. `APP_PORT=3000 docker compose up`, if 5173 is already in use.
- Background removal downloads its model from imgly's CDN in the browser on first use, so the *browser* (not the container) needs internet access for that tool.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
