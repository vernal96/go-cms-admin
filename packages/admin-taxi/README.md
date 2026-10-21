# @go-cms/admin-taxi

Opt-in administration plugin for the Taxi registry module.

Install alongside `@go-cms/admin`, then register the plugin explicitly:

```ts
import { mountAdmin } from '@go-cms/admin/app'
import taxiAdminPlugin from '@go-cms/admin-taxi'
import '@go-cms/admin-taxi/style.css'

mountAdmin({ target: '#app', plugins: [taxiAdminPlugin] })
```

The package uses the host's Vue and Admin SDK instances. Taxi records are
scoped to the site selected in the admin sidebar. The backend remains the
authority for permissions and validation.

## Development

From this workspace package directory, run `npm test`, `npm run typecheck`, and
`npm run build`. The test script uses the host Admin SDK alias from the
repository root. `npm pack` builds and tests the standalone output.
