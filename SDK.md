# Admin extension SDK

Package with Node 24+: `npm ci && npm pack`. The public package entry is
`@go-cms/admin/sdk`; component styles are exported as `@go-cms/admin/sdk.css`.
`prepack` rebuilds the SDK and validates its JavaScript, declarations and CSS
before creating the archive. Only `dist-app`, `dist-sdk`, this guide and package metadata
are packaged. The package is publishable; these commands do not publish it.
`npm run build:sdk` remains available for local development.

Run `npm pack` and install the archive in an independent Vite host to verify
its exports. Vue and the shared UI libraries remain peer dependencies.

The SDK exports:

- `AdminPlugin`, `AdminRouteDefinition`, `AdminPluginRegistry`;
- the registry, access-token and permission injection keys;
- field/configuration metadata types, `DynamicField`, `DynamicFieldsForm`,
  `ConfigurationEditor`;
- `useFieldValidation`, value initialization/validation helpers;
- `useSelectedSite`, `adminRequest`, `adminBlob`, `AdminAPIError`.

A plugin exports an `AdminPlugin` and uses its namespace for routes and editors.
Pass it to `createAdminApp({ plugins: [plugin] })` or `mountAdmin({ plugins: [plugin] })`.
Backend modules contribute semantic route/editor codes; installing Go code does
not install Vue components. Rebuild the admin application for new UI packages.

Libraries must externalize `vue` and `@go-cms/admin/sdk` and declare them as peer
dependencies. The SDK itself externalizes its UI libraries. Do not bundle a
second SDK or Vue instance: injection keys, selected-site state and reactivity
must be shared. The host Vite config resolves the public SDK entry to its own
source entry; independently installed consumers use the built package exports.

The host provides `adminPluginRegistryKey`, `adminAccessTokenKey` and
`adminPermissionsKey`. A field editor accepts `field`, `v-model`, `siteId`,
`accessToken`, and `resourceTemplates`. Disable attribute fallthrough or declare
these props so credentials never become HTML attributes. A configuration editor
accepts `fields`, an object `v-model`, `siteId`, `accessToken`, and `context`, and
may expose a synchronous `validate()` that throws on invalid input.

Use `useFieldValidation()` inside components; it binds validation to the injected
registry used for rendering. Outside components pass the registry explicitly to
`validateFieldValues(fields, values, registry)` and
`unsupportedFieldTypes(fields, registry)`. An absent custom editor fails
validation, including children of empty repeaters, without changing values.
Backend validation and authorization remain authoritative.

Pass shell routes as the second argument to `AdminPluginRegistry` so plugin
paths cannot collide with the shell. Structurally identical parameter routes
are rejected; static and parameter routes may coexist. This follows the host's
default case-insensitive, non-strict Vue Router configuration.

Each `createAdminApp` call creates its own router and registry. Components
resolve the injected registry; mounting another app does not mutate it.

`options.multiple: true` opts a scalar field into the shared ordered-list editor,
including custom semantic types. The registered editor receives one scalar value
per item; list bounds and indexed errors are handled by the SDK. The backend
compiler must support the same list options and validate the resulting array.

The built-in `file` editor uses the file manager's tile UI and consumes the
backend options `disk`, `virtual_path`, `settings_code`, optional `mime_types`,
and `multiple`. This editor is part of the admin application, not a separately
exported SDK component. Its user-visible upload, selection, ordering and
deletion behavior is described in the [admin README](README.md#file-fields);
the authoritative validation and deletion contract is in the [kernel guide](https://github.com/vernal96/go-cms-kernel/blob/main/docs/modules/core/fields.md#файловое-поле).
Hosts that render `DynamicField`, `DynamicFieldsForm`, or `ConfigurationEditor`
outside the bundled editors must pass the optional `fileUploadContext` prop.
Its `endpoint` and owner `target` identify a trusted backend schema; the
component appends `field_path` itself, including repeater indexes. Without this
context the upload action is disabled, while selection from the configured disk
continues to work. The `FileUploadContext` type is exported from the SDK.

## Explicit replacements (0.2.0)

```ts
import { mountAdmin } from '@go-cms/admin/app'
import projectPlugin from './project-plugin'
import ProjectTextEditor from './ProjectTextEditor.vue'

mountAdmin({
  target: '#app',
  plugins: [projectPlugin],
  overrides: { fieldEditors: { 'core.choices': ProjectTextEditor } },
})
```

`overrides` supports existing routes (component/props only), field editors,
configuration editors and icons. An unknown replacement target or accidental
duplicate is an error. Route names and paths remain stable. Custom histories
can be supplied with `history` (for example `createMemoryHistory()` in tests).

## Widget areas

The SDK exports `WidgetArea` (a dynamic string code), `WidgetAreaDescriptor`,
`TemplateWidgetAreaItem`, `ResourceTemplate` and `ResourceWidget`. Template
`widget_areas` is an ordered array of `{ code, label, admin_span,
supports_resource_widgets, items }` descriptors. `items` is the compiled order
of `{ kind: 'widget', code }` static template widgets and the
`{ kind: 'resource_widgets' }` editable resource-widget slot. Static template
widgets display their definition label and description without edit actions.
The editor uses Element Plus 24-column layout, with full-width columns below
992px. Area widths do not change individual widget presentation columns.

Bindings retain persisted `area` codes. An absent/non-editable code is displayed
in the system `default` container (`Страница сайта`); returning the declared
editable area restores the binding unless it was explicitly moved. Full reorder
requests must retain original codes for untouched bindings. Empty default is
visible only when the template has no declared containers. Otherwise it appears
last while it contains bindings, including disabled ones.
