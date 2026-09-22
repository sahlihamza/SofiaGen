# Catalogue commercial — Plan / PlanVersion / PlanPrice

## Modèle

```
Plan (identité commerciale)
 ├── PlanVersion (snapshot fonctionnel : features + quotas, figé à la publication)
 └── PlanPrice   (prix commercial : devise, cycle, paliers)
```

- **Plan** = identité seule. Ne porte plus aucune donnée tarifaire ni fonctionnelle exploitable.
- **PlanVersion** = source de vérité unique des features et quotas. Immuable dès `status: "published"`.
- **PlanPrice** = source de vérité unique du prix.

## Statut des champs legacy de `Plan`

| Champ | Statut | Détail |
|---|---|---|
| `pricing` | **Déprécié — lecture seule** | Remplacé par `PlanPrice`. Rejeté en écriture par `PUT /plans/:id` (`PLAN_FIELD_NOT_EDITABLE`). `required` retiré sur `monthly`/`yearly` pour permettre la création d'un plan sans tarif inline. Migré vers `PlanPrice`. À supprimer du schéma après 1‑2 sprints. |
| `features` | **Déprécié — lecture seule** | Remplacé par `PlanVersion.snapshot.featureRefs`. Rejeté en écriture. Migré. |
| `limits` | **Déprécié — lecture seule** | Remplacé par `PlanVersion.snapshot.quotaRefs`. Rejeté en écriture. Migré. Le fallback de `SoftLimitService` ne le lit plus. |
| `pricingHistory` | **Déprécié — lecture seule** | Remplacé par l'historique `PlanVersion` + `PlanPrice.effectiveFrom/effectiveTo`. Rejeté en écriture. |
| `version` | **Dérivé** | Recopié depuis `PlanVersion.version` à chaque publication. Ne pas écrire directement. |
| `featureRefs` | **Conservé** | Référence `PlanFeature`, distinct du snapshot de version. |
| `currentVersionId` | **Nouveau** | Pointeur vers la `PlanVersion` live. |
| `code` | **Nouveau** | Identifiant commercial stable, `unique: true, sparse: true` (sparse : les plans existants n'en ont pas). |
| `category` | **Nouveau** | `starter` / `business` / `enterprise` / `custom`. |
| `deletedAt` | **Nouveau** | Soft-delete. `null` = actif. |

`slug` et `name` étaient **déjà** `unique: true` — aucune contrainte à ajouter de ce côté.

## Endpoints Super Admin

Montés sur `/api/platform/plans` (et `/api/billing/plans`, même routeur).

| Méthode | Chemin | Permission | Notes |
|---|---|---|---|
| `GET` | `/plans` | `platform.plan.view` | Filtres `status`, `category`, `search`, pagination |
| `GET` | `/plans/:id` | `platform.plan.view` | Renvoie plan + versions + prix + nb d'abonnements actifs |
| `POST` | `/plans` | — | `status: "draft"` par défaut |
| `PUT` | `/plans/:id` | — | **Rejette** `pricing`, `features`, `limits`, `pricingHistory`, `version` |
| `DELETE` | `/plans/:id` | — | **409 `PLAN_IN_USE`** si des abonnements actifs référencent le plan, sinon soft-delete |
| `GET` | `/plans/:id/versions` | `platform.plan.view` | |
| `POST` | `/plans/:id/versions` | `platform.plan.update` | Crée une version `draft`, clonée de la précédente |
| `PUT` | `/plans/:id/versions/:versionId` | `platform.plan.update` | **409 `PLAN_VERSION_NOT_DRAFT`** si publiée |
| `GET` | `/plans/:id/versions/:versionId/impact` | `platform.plan.view` | Nombre de stores concernés, avant publication |
| `POST` | `/plans/:id/versions/:versionId/publish` | `platform.plan.update` | `published` + `isImmutable`, devient `currentVersionId` |
| `GET` | `/plans/:id/prices` | `platform.plan.view` | |
| `POST` | `/plans/:id/prices` | `platform.plan.update` | |

### Codes d'erreur

| Code | HTTP | Sens |
|---|---|---|
| `PLAN_IN_USE` | 409 | Des abonnements actifs référencent le plan |
| `PLAN_DUPLICATE` | 409 | `slug`, `name` ou `code` déjà pris |
| `PLAN_FIELD_NOT_EDITABLE` | 400 | Tentative d'écrire un champ legacy sur le Plan |
| `PLAN_VERSION_NOT_DRAFT` | 409 | Édition d'une version publiée ou archivée |
| `PLAN_VERSION_IMMUTABLE` | — | Mutation d'un snapshot publié (levé par le modèle) |
| `PLAN_VERSION_ALREADY_PUBLISHED` | 409 | Republication |
| `FEATURE_NOT_INCLUDED` | 403 | Entitlement refusé |

## Entitlements

```js
const { hasFeature, requireFeature, requireFeatureMiddleware, getQuota } =
  require("../service/EntitlementService");

await hasFeature(storeId, "builder");     // -> boolean
await requireFeature(storeId, "builder"); // -> throw 403 FEATURE_NOT_INCLUDED
router.post("/pages/builder", requireFeatureMiddleware("builder"), handler);
```

Résolution : `Subscription.planVersionId` en priorité, sinon `Plan.currentVersionId`. Statuts ouvrant droit : `active`, `trial`, `past_due`. Jamais de lecture de `Plan.features` / `Plan.limits`.

Endpoints pilotes déjà branchés : `GET /api/analytics/dashboard`, `GET /api/analytics/sales` (`analytics`), `POST /api/store/exports` (`exports`).

## Quotas — source unique

`PlanQuota` reste la source des **seuils** (`warningThreshold`, `criticalThreshold`, `blockedThreshold`, `softLimitEnabled`). Quand aucun `PlanQuota` n'existe, `SoftLimitService.getEffectiveQuota` dérive la limite de la `PlanVersion` publiée via `EntitlementService.getQuota` — plus jamais de `Plan.limits`. Un même quota est donc interprété identiquement côté plan, abonnement et suivi d'usage.

## Migration

```bash
node src/script/migratePlanCatalogue.js            # dry-run, n'écrit rien
node src/script/migratePlanCatalogue.js apply      # applique, affiche le batchId
node src/script/migratePlanCatalogue.js rollback <batchId>
```

Chaque écriture est tracée dans la collection `plan_migration_backups` (état antérieur), purgée par le rollback. Étapes : `PlanVersion` v1 publiée + immuable depuis `Plan.features`/`limits` → `PlanPrice` depuis `Plan.pricing` → `Plan.currentVersionId` → `Subscription.planVersionId`.

## Reste à faire

- Supprimer `pricing` / `features` / `limits` / `pricingHistory` du schéma `Plan` après la période de lecture seule.
- Renseigner `Subscription.planPriceId` (le champ existe, la migration ne le remplit pas : il faut arbitrer quel `PlanPrice` correspond à un abonnement déjà facturé).
- Backfill du champ `Plan.code` (aucun plan existant n'en a ; l'index est `sparse`).
