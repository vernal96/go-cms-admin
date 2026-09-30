# Go CMS Admin

Standalone Vue administration UI and extension package for Go CMS.

## Development

Requires Node.js >=24 and npm. The backend must already be running.

```sh
npm ci
cp .env.example .env
npm run dev -- --host 0.0.0.0
```

The UI communicates with the backend exclusively through HTTP. The Vite proxy
forwards `/api` requests to `ADMIN_API_TARGET` from `.env` (defaults to
`http://localhost:8080`). Process environment variables override `.env`.
`ADMIN_PORT` controls the local Vite port (default 5173).

For a containerized local host, use the included compose file:

```sh
ADMIN_API_TARGET=http://host.docker.internal:8080 docker compose up -d --build --wait
```

The admin host is then available at `http://localhost:5173`. The backend is
started separately from [`go-cms`](https://github.com/vernal96/go-cms). `host.docker.internal` is explicitly
mapped by Compose on Linux. The command above overrides a local `.env` target,
which would otherwise point at localhost inside the container.

For a second independent installation, use another project and host port:

```sh
ADMIN_PORT=15173 ADMIN_API_TARGET=http://host.docker.internal:18080 docker compose -p second-admin up -d --build --wait
```

The container always listens on 5173; `ADMIN_PORT` selects its published host port.
Use `docker compose down` to stop this admin host. This Dockerfile runs the
development server; use `npm run build` and a configured HTTP server for production.

Forms and Mail field editors load validator metadata from the backend. They render option editors from the catalog, preserve validator order, and mark incompatible validators after a field type change. Dynamic fields check simple built-in constraints locally; backend validation remains authoritative. See the [kernel field validation contract](https://github.com/vernal96/go-cms-kernel/blob/main/docs/field-validation.md).

## Package contract

The package name is `@go-cms/admin`. It publishes:

- `@go-cms/admin` / `@go-cms/admin/app` — `createAdminApp`, `mountAdmin` and
  the root `AdminApp` component;
- `@go-cms/admin/app.css` — styles required by the public admin app entrypoint;
- `@go-cms/admin/sdk` — extension contracts and helpers;
- `@go-cms/admin/sdk.css` — SDK styles.

An independent host can install the package and mount the shell:

```ts
import { mountAdmin } from '@go-cms/admin/app'
import '@go-cms/admin/app.css'
import '@go-cms/admin/sdk.css'

mountAdmin({ target: '#app' })
```

Vue, Vue Router, Element Plus, TinyMCE and other runtime libraries remain peer
dependencies. New components and admin plugins are added through npm
dependencies and the public `plugins` / `overrides` options of `mountAdmin`
or `createAdminApp` (see [SDK.md](SDK.md)).
The backend contributes semantic route/navigation data and never receives Vue
component names or executable JavaScript.

## Checks

```sh
npm ci
npm test
npm run typecheck
npm run build
npm pack
```

Install the generated tarball in a clean host to validate the public `app` and
`sdk` exports.
