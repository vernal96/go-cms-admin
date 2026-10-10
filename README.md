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

## Icons and resource creation

The admin bundles Font Awesome Free's solid icon stylesheet. Resource and
template metadata may provide an icon as a CSS class string, for example
`fa-solid fa-house`; the UI applies a nonempty value verbatim and does not
validate it. An empty or missing value displays `fa-solid fa-file-lines`.
Projects can supply other icon classes if their host loads the matching CSS.

The sign-in form labels its fields with the placeholders `Логин` and `Пароль`.
In resource creation, the standard `page` type is listed first and selected by
default when it is available; the remaining types retain backend order.

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

## Field validation errors

Local checks remain attached to individual fields. Server validation failures are displayed in a shared persistent summary inside the form or dialog. Messages use schema labels and one-based item numbers for nested lists; unknown fields retain their keys, and custom validator codes use a generic readable message.

The existing `error.details.fields` API remains unchanged. The UI retains each original key, code and parameter object separately from display text, so field highlighting can be added later. When the server reports validation failure without field details (including some Forms/Mail operations), the summary asks the user to check their values without exposing the internal server message. Errors clear before retrying or switching editors; rejected values remain in the draft.

## File fields

Dynamic `file` fields use the file manager's tile presentation and hide folders.
Each selected value is a distinct Media ID and may refer to any file type
allowed by the field's MIME constraints; image editing is available only for
supported image formats.
The field definition supplies a disk, a virtual upload path and a media-settings
code; optional MIME patterns are checked before upload in the UI and again by
the backend when values are saved. The virtual path is the destination for new
uploads. Existing files can be selected from any folder on the configured disk.
Tile uploads use an owner-scoped endpoint. The UI sends only the owner identity,
the structured field path and the file; it never sends a disk or folder. The
server resolves the trusted field definition, detects the real MIME type before
storage and creates the configured virtual folder when needed. The generic file
manager upload endpoint remains separate.

A single-value field displays one full-width tile. A multiple-value field
displays ordered tiles that can be rearranged by dragging. Clicking the field
opens the file manager. The context menu can edit supported images, open that
field's media metadata, remove a tile from the form draft, or permanently delete
the file after confirmation. Ordinary removal takes effect when the owning form
is saved. Permanent deletion acts immediately and can be rejected while another
reference exists; the UI reports when byte cleanup is still pending and polls
the operation status. Forms results and other protected references prevent
physical deletion.

The backend contract, including response statuses and reference conflicts, is
documented in [Core's file-field deletion guide](https://github.com/vernal96/go-cms-kernel/blob/main/docs/modules/core/file-field-deletion.md).
