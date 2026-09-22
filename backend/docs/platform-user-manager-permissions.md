# Platform User Manager — Permission Matrix

> SuperAdmin / Platform Admin directory, roles, security, bulk operations.
> Store staff management is covered by the Store ticket (out of scope here).

## Core Rule

`User.role` contains **platform-scoped roles only** on this screen.
Store memberships are **read-only** via the `UserStore` junction table.

## Permission Codes

All codes live under the `platform.user` module.

| Code                        | Description                          | Super Admin | Platform User Manager | Notes                                                                 |
| --------------------------- | ------------------------------------ |:-----------:|:---------------------:| --------------------------------------------------------------------- |
| `platform.user.view`        | View user list, profile, permissions |   always    |        yes            | Includes store memberships (read-only)                                |
| `platform.user.create`      | Invite or create platform user       |   always    |        yes            | Must specify platform role; never silently assigns store_admin         |
| `platform.user.update`      | Edit profile, assign/remove platform roles, reset password, 2FA | always | yes | Role scope validated server-side — store roles rejected               |
| `platform.user.suspend`     | Suspend / block / archive            |   always    |        yes            | Reason required for suspend/block/archive                             |
| `platform.user.activate`    | Reactivate / unblock / unarchive     |   always    |        yes            |                                                                       |
| `platform.user.export`      | Bulk CSV/JSON export                 |   always    |        yes            | Export uses `UserStore` memberships, not legacy `storeIds`             |
| `platform.user.sessions`    | View sessions, logout all devices    |   always    |        yes            |                                                                       |
| `platform.user.impersonate` | Generate impersonation token         |   always    |         **no**        | Dedicated critical operation; reason + TTL + audit required            |
| `platform.user.delete`      | Soft-delete user                    |   always    |         **no**        | Reserved to Super Admin                                               |
| `platform.user.login_history` | Global login history              |   always    |         **no**        | Cross-store; reserved to Super Admin + impersonate holders            |

## Route Protection (platformUserRoutes.js)

Every route is behind `requirePermission("platform.user.<action>")`.
Only the following routes are further guarded with `requireSuperAdmin`:

- `DELETE /:userId` — delete (soft-delete)
- `POST /:userId/impersonate` — impersonation
- `POST /:userId/duplicate` — duplicate user
- `POST /:userId/resend-invitation` — resend invitation
- `POST /:userId/send-setup-email` — send setup email
- `POST /login-history` — global login history
- `POST /bulk/delete` — bulk delete

## Impersonation

- **Permission**: `platform.user.impersonate` (Super Admin only, not delegated)
- **Reason**: mandatory (validated server-side, rejects empty)
- **TTL**: bounded to [1, 1440] minutes (default 60)
- **Audit**: logged as `platform.user.impersonate` with severity `critical`
- **Token**: short-lived JWT with `impersonation` claim carrying actorId, targetUserId, reason, expiresAt
- **Guard**: Super Admins can never be impersonated (defence in depth)

## Role Scope Enforcement

Both `assignRole` and `bulkAssignRole` validate that the target role has
`scope === "platform"`. Attempting to assign a store-scoped role from the
platform context throws `InvalidRoleScope` (HTTP 422).

`updateUser` also filters role updates to `scope === "platform"` only.

## Frontend Enforcement

- `UserFilterPanel` — passes `platformOnly=true` by default; presets enforce
  platform-only or explicit scope filtering.
- `CreateUserWizard` — `platform_admin` and `superadmin` are platform types;
  role selector only shows platform-scoped roles for platform users.
- `EditUserModal` / `BulkActionModal` — role selectors receive only
  `roleOptions.filter((r) => r.scope === "platform")`.
- `UsersTable` — dedicated `platformRole` column; `storeCount` column shows
  memberships from `UserStore`.

## Store Memberships (read-only)

Store membership data is sourced from the `UserStore` junction table.
The user document's legacy `storeIds` array is no longer the source of truth
for membership display or export.
