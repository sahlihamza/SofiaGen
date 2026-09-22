# Quota API + Middleware Documentation

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Modèles de données](#modèles-de-données)
4. [Middleware quotaMiddleware](#middleware-quotamiddleware)
5. [Middleware usageTracking](#middleware-usagetracking)
6. [Rate Limiting](#rate-limiting)
7. [Endpoints API](#endpoints-api)
8. [Codes d'erreur](#codes-derreur)
9. [Exemples d'utilisation](#exemples-dutilisation)
10. [Tests](#tests)

---

## Vue d'ensemble

Le système de quota permet de limiter l'utilisation des ressources par store selon le plan d'abonnement actif. Il repose sur :

- **PlanQuota** : définit les limites par type de quota pour chaque plan
- **UsageCounter** : compteur d'usage par période de facturation
- **GracePeriod** : période de grâce quand un quota est dépassé
- **quotaMiddleware** : middleware Express pour vérifier les quotas
- **usageTracking** : auto-décrémentation des quotas après DELETE

### États d'un quota

| État | Description |
|------|-------------|
| `normal` | Usage < warningThreshold |
| `warning` | Usage >= warningThreshold (défaut: 80%) |
| `critical` | Usage >= criticalThreshold (défaut: 95%) |
| `blocked` | Usage >= limit |
| `grace_period` | Dépassé mais grace period active |
| `unlimited` | Pas de limite définie |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Express Router                          │
│                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │  isAuth     │───▶│  loadUser    │───▶│ quotaMiddleware│ │
│  └─────────────┘    └──────────────┘    └───────┬───────┘  │
│                                                  │          │
│                    ┌─────────────────────────────┘          │
│                    ▼                                         │
│           ┌───────────────┐                                 │
│           │  Controller   │                                 │
│           └───────┬───────┘                                 │
│                   │                                         │
│  ┌────────────────▼────────────────┐                        │
│  │     incrementQuota / decrement  │                        │
│  └─────────────────────────────────┘                        │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    Modèles MongoDB                       ││
│  │  Subscription → PlanQuota → UsageCounter → GracePeriod  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Modèles de données

### PlanQuota

Définit les limites pour un type de quota sur un plan donné.

| Champ | Type | Description |
|-------|------|-------------|
| `planId` | ObjectId | Référence au Plan |
| `quotaTypeCode` | String | Code du type de quota (`products`, `orders`, `storage`, etc.) |
| `limitValue` | Number | Limite numérique (`null` = illimité) |
| `isUnlimited` | Boolean | Flag de quota illimité |
| `warningThreshold` | Number | Seuil d'avertissement (%) (défaut: 80) |
| `criticalThreshold` | Number | Seuil critique (%) (défaut: 95) |
| `blockedThreshold` | Number | Seuil de blocage (%) (défaut: 100) |
| `blockedAction` | String | Action quand bloqué: `block`, `read_only`, `grace_period`, `notify` |
| `softLimitEnabled` | Boolean | Active les soft limits |

### UsageCounter

Compteur d'usage par store, par type de quota, par période de facturation.

| Champ | Type | Description |
|-------|------|-------------|
| `storeId` | ObjectId | Référence au Store |
| `subscriptionId` | ObjectId | Référence à la Subscription |
| `quotaTypeCode` | String | Code du type de quota |
| `periodStart` | Date | Début de la période de facturation |
| `periodEnd` | Date | Fin de la période de facturation |
| `used` | Number | Quantité utilisée |
| `softLimitLevel` | String | Niveau actuel: `normal`, `warning`, `critical`, `blocked` |
| `overridden` | Boolean | Si le quota a été outrepassé |
| `lastIncrementAt` | Date | Date de dernière incrémentation |
| `lastIncrementSource` | String | Source de l'incrémentation (`api`, `batch`, `manual`) |

**Index unique** : `{ storeId, quotaTypeCode, periodStart, periodEnd }`

### GracePeriod

Période de grâce accordée quand un quota est dépassé.

| Champ | Type | Description |
|-------|------|-------------|
| `subscriptionId` | ObjectId | Référence à la Subscription |
| `storeId` | ObjectId | Référence au Store |
| `quotaTypeCode` | String | Code du type de quota concerné |
| `graceStartDate` | Date | Début de la grace period |
| `graceEndDate` | Date | Fin de la grace period |
| `status` | String | `active`, `expired`, `resolved`, `escalated` |
| `reason` | String | Raison de la grace period |
| `resolvedAt` | Date | Date de résolution |

---

## Middleware quotaMiddleware

### Signature

```javascript
quotaMiddleware(quotaTypeCode, options)
```

### Arguments

| Param | Type | Défaut | Description |
|-------|------|--------|-------------|
| `quotaTypeCode` | String | **requis** | Code du type de quota (`products`, `orders`, `storage`, `customers`, `emails_sent`, `api_calls`) |
| `options.increment` | Number | `1` | Nombre à incrémenter |
| `options.sizeMb` | Number | `0` | Taille en MB (pour les quotas de stockage) |
| `options.onExceeded` | Function | `null` | Callback custom quand quota dépassé |
| `options.skipIncrement` | Boolean | `false` | Vérifier sans incrémenter |
| `options.allowGrace` | Boolean | `true` | Autoriser la grace period |

### Réponse en cas de quota dépassé

```json
{
  "success": false,
  "message": "Quota products atteint (100/100). Passez à un plan supérieur.",
  "code": "QUOTA_EXCEEDED",
  "quota": {
    "type": "products",
    "used": 100,
    "limit": 100,
    "remaining": 0,
    "state": "blocked"
  }
}
```

### Attaches sur `req`

| Propriété | Type | Description |
|-----------|------|-------------|
| `req.quotaInfo` | Object | Informations du quota après vérification |

```javascript
{
  type: "products",
  used: 42,
  limit: 100,
  remaining: 58,
  state: "normal"
}
```

### Comportement fail-open

En cas d'erreur interne du middleware, la requête est laissée passer et l'erreur est loggée :

```javascript
logger.error(`quotaMiddleware[${quotaTypeCode}] failed: ${err.message}`);
next(); // fail-open
```

---

## Middleware usageTracking

### decrementAfterDelete

Attache une fonction de décrémentation au `req` pour l'utiliser après un DELETE.

```javascript
router.delete("/:id", isAuth, loadUser, decrementAfterDelete("products"), controller);
```

Dans le controller :
```javascript
async function deleteProduct(req, res) {
  // ... suppression du produit ...
  if (req._decrementQuota) {
    await req._decrementQuota();
  }
  res.json({ success: true });
}
```

### withQuotaDecrement

Wrapper qui exécute un handler puis décrémente automatiquement si la réponse est 2xx.

```javascript
router.delete("/:id", isAuth, loadUser, withQuotaDecrement("products", productController.delete));
```

---

## Rate Limiting

### Configuration par défaut

| Type | Max requêtes | Fenêtre | Nom |
|------|-------------|---------|-----|
| `email` | 10 | 60s | emails |
| `login` | 5 | 15min | logins |
| `api` | 100 | 60s | api_calls |
| `password_reset` | 3 | 1h | password_resets |
| `webhook` | 1000 | 60s | webhooks |
| `store_create` | 3 | 1h | store_creation |
| `auth_register` | 5 | 1h | registration |

### Usage

```javascript
const rateLimit = require("../utils/rateLimit");

// Rate limit standard par IP
router.post("/api/endpoint", rateLimit.middleware("api"), controller);

// Rate limit custom
router.post("/login", rateLimit.middleware("login", (req) => req.body.email), controller);
```

### Headers de réponse

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
Retry-After: 15
```

### Réponse en cas de dépassement

```json
{
  "success": false,
  "message": "Trop de requêtes",
  "code": "RATE_LIMITED",
  "retryAfter": 15
}
```

### Backend de cache

Le rate limiter utilise `../lib/cache` qui supporte :
- **Redis** (si `REDIS_URL` est configuré et `ioredis` installé)
- **In-memory** (fallback si Redis indisponible)

---

## Endpoints API

### GET /stores/{storeId}/quotas

Récupère le statut complet des quotas d'un store.

**Authentification** : Requiert un JWT valide

**Réponse 200** :

```json
{
  "subscription": {
    "status": "active",
    "planId": "60a7c5...",
    "planVersion": 1,
    "periodStart": "2024-01-01T00:00:00.000Z",
    "periodEnd": "2024-01-31T23:59:59.000Z"
  },
  "quotas": [
    {
      "quotaTypeCode": "products",
      "used": 42,
      "limit": 100,
      "remaining": 58,
      "percentage": 42,
      "state": "normal",
      "isUnlimited": false,
      "resetAt": "2024-01-31T23:59:59.000Z"
    },
    {
      "quotaTypeCode": "storage",
      "used": 1024,
      "limit": 5000,
      "remaining": 3976,
      "percentage": 20,
      "state": "normal",
      "isUnlimited": false,
      "resetAt": "2024-01-31T23:59:59.000Z"
    }
  ]
}
```

### POST /products

Crée un produit. Vérifie le quota `products`.

**Authentification** : Requiert un JWT valide + permission `product.create`

**Body** :

```json
{
  "name": "Mon Produit",
  "price": 29.99,
  "categoryId": "xxx"
}
```

**Réponse 201** :

```json
{
  "success": true,
  "data": { "_id": "xxx", "name": "Mon Produit", ... }
}
```

**Réponse 403 (QUOTA_EXCEEDED)** :

```json
{
  "success": false,
  "message": "Quota products atteint (100/100). Passez à un plan supérieur.",
  "code": "QUOTA_EXCEEDED",
  "quota": {
    "type": "products",
    "used": 100,
    "limit": 100,
    "remaining": 0,
    "state": "blocked"
  }
}
```

### DELETE /products/:id

Supprime un produit. Décrémente le quota `products`.

**Authentification** : Requiert un JWT valide + permission `product.delete`

**Réponse 200** :

```json
{
  "success": true,
  "message": "Produit supprimé"
}
```

---

## Codes d'erreur

| Code | HTTP | Description |
|------|------|-------------|
| `PERMISSION_DENIED` | 403 | Permission manquante |
| `QUOTA_EXCEEDED` | 403 | Quota atteint |
| `NO_ACTIVE_STORE` | 400 | Pas de store actif |
| `RATE_LIMITED` | 429 | Rate limit atteint |
| `VALIDATION_ERROR` | 400 | Données invalides |
| `INTERNAL_ERROR` | 500 | Erreur serveur |

---

## Exemples d'utilisation

### Exemple 1 : Route produit basique

```javascript
// src/routes/productRoutes.js
const router = require("express").Router();
const { quotaMiddleware } = require("../middleware/quotaMiddleware");
const productController = require("../controller/productController");
const { isAuth, loadUser } = require("../middleware/auth");

router.post(
  "/add",
  isAuth,
  loadUser,
  quotaMiddleware("products"),
  productController.addProduct
);

module.exports = router;
```

### Exemple 2 : Upload avec quota de stockage

```javascript
// src/routes/uploadRoutes.js
const multer = require("multer");
const router = require("express").Router();
const { quotaMiddleware } = require("../middleware/quotaMiddleware");

const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } });

router.post(
  "/upload",
  isAuth,
  loadUser,
  upload.single("file"),
  (req, res, next) => {
    if (!req.file) return res.status(400).json({ success: false, message: "No file" });
    req.quotaSizeMb = req.file.size / (1024 * 1024);
    next();
  },
  quotaMiddleware("storage", { sizeMb: (req) => req.quotaSizeMb }),
  uploadController.handleUpload
);

module.exports = router;
```

### Exemple 3 : Import batch avec incrément dynamique

```javascript
// src/routes/customerRoutes.js
router.post(
  "/import",
  isAuth,
  loadUser,
  quotaMiddleware("customers", { increment: (req) => req.body.customers?.length || 1 }),
  customerController.importMany
);
```

### Exemple 4 : Vérification sans incrémenter (preview)

```javascript
// src/routes/productRoutes.js
router.post(
  "/check-quota",
  isAuth,
  loadUser,
  quotaMiddleware("products", { skipIncrement: true }),
  productController.checkCanCreate
);
```

### Exemple 5 : Décrémentation après suppression

```javascript
// src/routes/productRoutes.js
const { decrementAfterDelete } = require("../middleware/usageTracking");

router.delete(
  "/:id",
  isAuth,
  loadUser,
  decrementAfterDelete("products"),
  productController.deleteProduct
);
```

### Exemple 6 : Callback custom onExceeded

```javascript
router.post(
  "/checkout",
  isAuth,
  loadUser,
  quotaMiddleware("orders", {
    onExceeded: (req, res, result) => {
      return res.status(403).json({
        success: false,
        message: `Limite d'ordres atteinte. Upgrade requis.`,
        code: "QUOTA_EXCEEDED",
        upgradeUrl: "/billing/upgrade",
      });
    },
  }),
  orderController.create
);
```

### Exemple 7 : Rate limiting sur login

```javascript
const rateLimit = require("../utils/rateLimit");

router.post(
  "/login",
  rateLimit.middleware("login"),
  authController.login
);
```

### Exemple 8 : Rate limiting custom key

```javascript
router.post(
  "/api/webhook",
  rateLimit.middleware("webhook", (req) => `webhook:${req.body.source}`),
  webhookController.handle
);
```

---

## Tests

### Lancer les tests

```bash
# Tous les tests
npm test

# Tests spécifiques du quota middleware
npx jest tests/quotaMiddleware.test.js
```

### Structure des tests

```
tests/
├── setup.js          # Connexion MongoDB (mongodb-memory-server)
├── teardown.js       # Nettoyage après tests
└── quotaMiddleware.test.js
```

### Couverture des tests

- ✅ Autorise la création si quota non atteint
- ✅ Rejette la création si quota atteint
- ✅ Passe en warning à 80%
- ✅ Incrémente correctement le compteur
- ✅ Décrémente correctement le compteur
- ✅ Retourne le statut complet des quotas
- ✅ Considère un quota illimité

---

## Intégration dans les routes

### Pattern recommandé

```javascript
const router = require("express").Router();
const { isAuth, loadUser } = require("../middleware/auth");
const { quotaMiddleware } = require("../middleware/quotaMiddleware");
const controller = require("../controllers/myController");

// GET : lecture, pas de quota
router.get("/", isAuth, loadUser, controller.list);

// POST : création, vérifie le quota
router.post("/", isAuth, loadUser, quotaMiddleware("my_resource"), controller.create);

// PUT : modification, pas de quota (optionnel)
router.put("/:id", isAuth, loadUser, controller.update);

// DELETE : suppression, décrémente le quota
const { decrementAfterDelete } = require("../middleware/usageTracking");
router.delete("/:id", isAuth, loadUser, decrementAfterDelete("my_resource"), controller.delete);
```

### Ordre des middlewares

```
isAuth → loadUser → quotaMiddleware → controller → (decrementAfterDelete)
```

1. **isAuth** : vérifie le JWT
2. **loadUser** : charge l'utilisateur et les rôles
3. **quotaMiddleware** : vérifie et incrémente le quota
4. **controller** : exécute la logique métier
5. **decrementAfterDelete** : décrémente le quota après suppression

---

## Variables d'environnement

```env
# Redis pour le cache (optionnel, fallback in-memory)
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=your-secret-key

# MongoDB
MONGO_URI=mongodb://localhost:27017/sofiagen
```

---

## Performance

### Cache

- Les résultats de `checkQuota` sont mis en cache via `cache.delPattern('quota:${storeId}:${quotaTypeCode}:*')`
- TTL par défaut du cache : 45 secondes
- En cas d'incrémentation, le cache est invalidé

### Index MongoDB

```javascript
// PlanQuota
{ planId: 1, quotaTypeCode: 1 } // unique

// UsageCounter
{ storeId: 1, quotaTypeCode: 1, periodStart: 1, periodEnd: 1 } // unique
{ subscriptionId: 1, quotaTypeCode: 1 }
{ storeId: 1, quotaTypeCode: 1 } // index

// GracePeriod
{ subscriptionId: 1, createdAt: -1 }
{ storeId: 1, createdAt: -1 }
{ status: 1, graceEndDate: 1 }
```

---

## FAQ

**Q : Que se passe-t-il si un quota est illimité ?**

Le middleware retourne `allowed: true` avec `state: "unlimited"` et n'incrémente pas le compteur.

**Q : Comment fonctionne la grace period ?**

Quand `blockedAction === "grace_period"` et que le quota est bloqué, le middleware cherche une `GracePeriod` active. Si trouvée et non expirée, la requête est autorisée avec `state: "grace_period"`.

**Q : Le middleware est-il fail-open ?**

Oui. En cas d'erreur inattendue, la requête passe et l'erreur est loggée. Cela évite de bloquer tout le trafic en cas de problème de base de données.

**Q : Comment ajouter un nouveau type de quota ?**

Ajoutez simplement le code dans le middleware — aucun fichier de configuration n'est nécessaire. Le `quotaTypeCode` est libre.

```javascript
router.post("/invoices", isAuth, loadUser, quotaMiddleware("invoices"), controller);
```

**Q : Le rate limiter fonctionne-t-il en cluster ?**

Oui, si `REDIS_URL` est configuré. Sinon, chaque instance Node.js a son propre rate limiter en mémoire (non partagé en cluster).
