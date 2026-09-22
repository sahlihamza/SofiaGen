# RBAC Role Matrix (SO-18)

Single source of truth for what each role can do, at which scope. No code should ever branch on a role's *name* (`role === "Manager"`) — every access decision goes through a permission code, checked against `req.authContext.scope` (see SO-16/SO-17). This table is the contract `config/rbac/roles.js`'s `DEFAULT_ROLES` permission codes must reflect.

## Golden rule

```
User.role           = who is this user at the Platform level?
UserStore.roleId    = what is their role in THIS Store?
currentStoreId      = which Store do they want to view (UX only)?
```

`storeIds` and `req.body.storeId` are never proof of authorization. Only `UserStore.status=active` **and** `Store.status=active` grant access to a store (see SO-02).

## Matrix

| Role | Platform | Store |
|---|---|---|
| Super Admin | Full bypass (`isSuperAdmin`) | Full bypass |
| Platform Admin | `platform.*` | ❌ none |
| Store Owner | ❌ none (unless explicitly also granted a platform role) | Full store permission set |
| Manager | ❌ | Products, orders, customers — operational, no billing/staff management |
| Accountant | ❌ | Finance/orders — view + update, no delete |
| Cashier | ❌ | Orders/payment handling |
| Driver | ❌ | Delivery/order status only |
| Security Guard | ❌ | View-only |

A permission's own `scope` field (`platform` or `store`) must always match the granting role's scope — a platform permission can never appear on a store-scope role's list and vice versa. `buildPermissionGuard` enforces this at request time (SO-17); this table is what the seed data should embody so that check never actually has anything to catch in practice.

## Where this lives in code

- `config/rbac/permissions.js` — canonical list of `{code, module, action, scope}`.
- `config/rbac/roles.js` — `DEFAULT_ROLES`, each an explicit `permissionCodes` list (never "all store permissions" as a shorthand — see SO-18.2).
- `script/seedPermissions.js` (the `Permission` collection) and `service/RoleTemplateService.js` (the `RoleTemplate` collection) both now derive directly from `config/rbac/permissions.js` / `roles.js` — one catalog, not two. An earlier version of this note flagged a drift between them; that's since been fixed (`seedPermissions.js` now imports `permissions` from `config/rbac/permissions.js` instead of keeping its own separate module list, and `RoleTemplateService.seedDefaultTemplates()` maps `DEFAULT_ROLES` directly rather than hand-maintaining its own template array).
