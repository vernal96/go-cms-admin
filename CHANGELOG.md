# Changelog

## Unreleased

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
