# Go CMS Admin

Standalone Vue administration UI and extension package for Go CMS.

## Development

```sh
npm ci
cp .env.example .env
npm run dev -- --host 0.0.0.0
```

The UI communicates with the backend exclusively through HTTP. The Vite proxy
forwards `/api` requests to `ADMIN_API_TARGET`.

For a containerized local host, use the included compose file:

```sh
ADMIN_API_TARGET=http://host.docker.internal:8080 docker compose up --build
```

The admin host is then available at `http://localhost:5173`. The backend is
started separately from `go-cms-start`.

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
dependencies and the declarative `src/admin-plugins.ts` composition point.
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
