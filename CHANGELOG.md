# Changelog

## 0.2.0

- Expose plugins, explicit overrides and router history through createAdminApp/mountAdmin. Each application has its own router and registry.
- Resolve navigation and editors from the injected registry. Reject accidental duplicate registrations and unknown override targets.
- Revoke the current server session on logout. Preserve local credentials and show a retry error when revocation fails. Password changes invalidate all server sessions.
- Requires the authentication/session endpoints from kernel 0.2.0.
