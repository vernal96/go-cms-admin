# Changelog

## Unreleased

## 0.9.0

- Add the optional `@go-cms/admin-taxi` package with site-scoped record management, search, validation, and explicit host registration. Extend the public Admin SDK for package routes and navigation.
- Allow editing a user with an empty email while keeping email required when creating a user. Show a generic repair hint when Forms validation returns no structured field errors.
- Update Vue, Vite, and transitive dependencies to versions with no reported npm audit vulnerabilities. Run UI test files serially to avoid intermittent shared-harness timing failures.
- Synchronize this release with go-cms-kernel v0.19.0. The kernel adds site-scoped OAuth sign-in and cache outage bounds; these backend features keep their own public contracts.

## 0.8.6

- Reset the resource editor to its first tab when navigating to another resource. Keep the selected tab while saving or updating the current resource.
- Keep media field editing on numeric IDs while public media field responses gain file details in go-cms-kernel v0.18.0.

## 0.8.5

- Synchronize the release set with go-cms-kernel v0.17.1. Backend API 5xx errors now retain their cause in server access logs while keeping the existing safe response contract; admin functionality is unchanged.

## 0.8.4

- Synchronize the release set with go-cms-kernel v0.17.0. Typed Go field declarations preserve the existing admin HTTP and JSON contracts; admin functionality is unchanged.

## 0.8.3

- Synchronize the release set with go-cms-kernel v0.16.0. Module contributions are a backend extension API; admin functionality is unchanged.

## 0.8.2

- Synchronize the release set with go-cms-kernel v0.15.0. The site publication flag now controls anonymous access to published site content without global guest grants; admin functionality is unchanged.

## 0.8.1

- Synchronize the release set with go-cms-kernel v0.14.0. Public resource breadcrumbs are a backend API addition; admin functionality is unchanged.

## 0.8.0

- Add a template-field picker for the Core `core_resource_fields` widget. It shows only fields from the current resource template, preserves unavailable saved keys for repair, and prevents empty or invalid selections.
- Keep the widget save button accessible while selecting multiple fields, prevent duplicate submissions, and close the dialog before refreshing resource details.
- Requires go-cms-kernel v0.13.0 for the widget definition and validation contract.

## 0.7.1

- Synchronize the release set with go-cms-kernel v0.12.0. Console password input changed in the backend; admin functionality is unchanged.

## 0.7.0

- Use one folder-free `Media` tile field for single and multiple file values across site settings, resources, LibraryItems, templates, widgets, Forms, and Mail. Keep the user avatar control separate. Single selections span the field width; multiple selections support drag ordering.
- Read trusted upload settings from each Media definition, including the profile-provided resource image and Mail static attachment. Open the disk-restricted file manager for existing files, validate MIME before upload, and expose image editing, per-field metadata, draft removal, and confirmed reference-checked physical deletion from the tile menu.

## 0.6.1

- Synchronize the release set with go-cms-kernel v0.10.0. The Redis configuration boundary changes only backend composition; admin behavior is unchanged.

## 0.6.0

- Show the saved resource view total in the resource and LibraryItem editors, including the shared original total for library mirrors.
- Read `views_total` from the matching go-cms-kernel v0.9.0 management details without making the statistic editable or changing content versions.

## 0.5.1

- Synchronize the release set; no admin functional changes.

## 0.5.0

- Compose Font Awesome Solid classes from bare backend icon names in the resource template selector and resource tree. Use `file-lines` when an icon name is empty. Requires the matching kernel icon-name API.
- Render `file` fields as folder-free tiles with configured-disk selection, trusted-path uploads, single/multiple limits and drag ordering. Add image editing, per-field media metadata, draft removal and confirmed permanent deletion with reference-conflict feedback.

## 0.4.0

- Show template-preset widgets in each resource widget area at their declared positions. Read-only cards display the widget name and description with subdued styling, while resource widgets keep their editing and drag-and-drop controls.
- Consume the ordered `widget_areas[].items` metadata from the matching kernel release.


## 0.3.0

- Bundle the Font Awesome Free solid stylesheet and render backend icon class strings verbatim; use `fa-solid fa-file-lines` when no icon is supplied. Put `page` first and select it by default in resource creation.
- Use the `Логин` and `Пароль` placeholders on the sign-in form.
- Add semantic Resource List editors for resource types, fields, filters, and sorting; preserve backend-shaped values through save and reopen.
- Show server field validation in a shared persistent summary across editors, with field labels, nested paths and readable builtin messages. Keep local field errors inline and retain structured server errors for future highlighting.

- Validate membership per list element and discard removed configuration editor references so deleted validators and Mail variables no longer block saving.
- Replace string field rules with typed validator definitions throughout admin DTOs and dynamic fields. Forms and Mail editors configure validators from site-scoped backend metadata and retain contributed custom options.
- Keep backend validation authoritative while checking simple built-ins locally; structured field errors carry codes and parameters.


## 0.2.0

- Expose plugins, explicit overrides and router history through createAdminApp/mountAdmin. Each application has its own router and registry.
- Resolve navigation and editors from the injected registry. Reject accidental duplicate registrations and unknown override targets.
- Revoke the current server session on logout. Preserve local credentials and show a retry error when revocation fails. Password changes invalidate all server sessions.
- Requires the authentication/session endpoints from kernel 0.2.0.
