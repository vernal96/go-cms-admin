# Changelog

## Unreleased

- Show server field validation in a shared persistent summary across editors, with field labels, nested paths and readable builtin messages. Keep local field errors inline and retain structured server errors for future highlighting.

- Validate membership per list element and discard removed configuration editor references so deleted validators and Mail variables no longer block saving.
- Replace string field rules with typed validator definitions throughout admin DTOs and dynamic fields. Forms and Mail editors configure validators from site-scoped backend metadata and retain contributed custom options.
- Keep backend validation authoritative while checking simple built-ins locally; structured field errors carry codes and parameters.


## 0.2.0

- Expose plugins, explicit overrides and router history through createAdminApp/mountAdmin. Each application has its own router and registry.
- Resolve navigation and editors from the injected registry. Reject accidental duplicate registrations and unknown override targets.
- Revoke the current server session on logout. Preserve local credentials and show a retry error when revocation fails. Password changes invalidate all server sessions.
- Requires the authentication/session endpoints from kernel 0.2.0.
