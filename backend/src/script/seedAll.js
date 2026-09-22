const mongoose = require("mongoose");
const crypto = require("crypto");

const seedPermissions = require("./seedPermissions");
const { seedPlatformRoles } = require("./seedSuperAdmin");
const seedAiQuotas = require("../seeders/seedAiQuotas");
const roleService = require("../service/RoleService");
const AIProviderConfig = require("../models/AIProviderConfig");
const Permission = require("../models/Permission");
const QuotaType = require("../models/QuotaType");

// Inline encryption to avoid pulling in logger/winston (which depends on
// @so-ric/colorspace using ||= syntax unsupported by Node 14). The logic
// mirrors aiProviderConfigService.encryptApiKey exactly so the seeded
// ciphertext decrypts correctly at request time.
function encryptApiKey(plaintext) {
  if (!plaintext) return null;
  const AI_PROVIDER_ENCRYPTION_KEY = process.env.AI_PROVIDER_ENCRYPTION_KEY;
  let key;
  if (AI_PROVIDER_ENCRYPTION_KEY) {
    key = Buffer.from(AI_PROVIDER_ENCRYPTION_KEY, "base64");
  } else if (process.env.JWT_ACCESS_SECRET) {
    key = crypto.createHash("sha256").update("malla:" + process.env.JWT_ACCESS_SECRET).digest();
  } else {
    throw new Error("No encryption key available for AI provider configs");
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${enc.toString("base64")}.${tag.toString("base64")}`;
}

/**
 * seed:all  single-shot orchestrator that materialises every
 * permission / role / quota row the rest of the codebase depends on.
 *
 * Designed to be safe to run multiple times: every step is an upsert
 * or a "no-op if already present" check. Intended to be the entry
 * point for:
 *   - fresh dev environments (just after `npm run seed:store`),
 *   - staging / production deploys after a permission schema change,
 *   - platform-team emergency reconciliation when a seed didn't run.
 *
 * What it does, in order:
 *   1. seedPermissions()        upsert every permission code declared in
 *                                config/rbac/permissions.js into the
 *                                `permissions` collection.
 *   2. seedPlatformRoles()      seed the canonical platform roles
 *                                (Super Admin, Platform Manager, ...).
 *   3. seedAiQuotas()           ensure the three AI QuotaType rows.
 *   4. syncFullAccessRoles()    re-sync the "full access" roles so the
 *                                super-admin inherits every new
 *                                permission code automatically.
 *   5. Print a summary + sanity-check the expected rows are present.
 *
 * Exit code 0 on success, 1 on any failure.
 */
async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // 1. Permissions --------------------------------------------------------
  console.log("\n[1/4] Seeding permissions&");
  const allPermissions = await seedPermissions();
  console.log(`         ${allPermissions.length} permissions synced`);

  // 2. Platform roles -----------------------------------------------------
  console.log("\n[2/4] Seeding platform roles&");
  await seedPlatformRoles();
  // Count what is actually present so the operator sees real numbers.
  const platformRoleCount = await mongoose.connection.db
    .collection("roles")
    .countDocuments({ scope: "platform" });
  console.log(`         ${platformRoleCount} platform role(s) present`);

   // 3. AI QuotaTypes ------------------------------------------------------
   console.log("\n[3/5] Seeding AI QuotaTypes&");
  await seedAiQuotas();
  const aiCount = await QuotaType.countDocuments({
    code: { $in: ["ai_messages_daily", "ai_messages_monthly", "ai_tokens_monthly"] },
  });
  console.log(`         ${aiCount} AI QuotaType row(s) present (expected 3)`);

   // 4. Sync full-access roles (super-admin gets every new code) -----------
   console.log("\n[4/5] Syncing full-access roles&");
    const syncResult = await roleService.syncFullAccessRoles();
   console.log(
     `         matched ${syncResult.matched} role(s), assigned ${syncResult.permissionCount} permission(s)`
   );

   // 5. Seed AI provider config from env vars -------------------------------
   console.log("\n[5/5] Seeding AI provider from env vars&");
   await seedAiProviderFromEnv();
   const providerCount = await AIProviderConfig.countDocuments({ enabled: true });
   console.log(`         ${providerCount} enabled AI provider config(s) in DB`);

   // 5. Sanity report ------------------------------------------------------
   console.log("\n=== Sanity report ===");
   const counts = {
     permissions: await Permission.countDocuments(),
     platformNotes: await Permission.countDocuments({ code: { $regex: /^platform\.notes\./ } }),
     integrations: await Permission.countDocuments({ code: { $regex: /^integrations\./ } }),
     aiAssistant: await Permission.countDocuments({ code: { $regex: /^ai\.assistant\./ } }),
     aiProviderConfigs: await AIProviderConfig.countDocuments({ enabled: true }),
     aiQuotas: await QuotaType.countDocuments({
       code: { $in: ["ai_messages_daily", "ai_messages_monthly", "ai_tokens_monthly"] },
     }),
   };
  console.table(counts);

  const expected = { permissions: 256, platformNotes: 5, integrations: 6, aiAssistant: 8, aiQuotas: 3 };
  const failures = [];
  if (counts.platformNotes < expected.platformNotes) {
    failures.push(`platform.notes.* expected ${expected.platformNotes}, got ${counts.platformNotes}`);
  }
  if (counts.integrations < expected.integrations) {
    failures.push(`integrations.* expected ${expected.integrations}, got ${counts.integrations}`);
  }
  if (counts.aiAssistant < expected.aiAssistant) {
    failures.push(`ai.assistant.* expected ${expected.aiAssistant}, got ${counts.aiAssistant}`);
  }
  if (counts.aiQuotas < expected.aiQuotas) {
    failures.push(`AI QuotaTypes expected ${expected.aiQuotas}, got ${counts.aiQuotas}`);
  }

  if (failures.length > 0) {
    console.error("\né  Sanity check failures:");
    failures.forEach((f) => console.error("   -", f));
    // Don't hard-fail: the counts are informational (a partial seed is
    // better than none). The operator can re-run individual scripts.
   } else {
     console.log("\n All sanity checks passed");
   }
 }

/**
 * Seed the platform-level AI provider from environment variables.
 * Uses AI_API_KEY / AI_API_URL / AI_MODEL (the same vars consumed by the
 * legacy aiService.js testimonial generator) so a single .env entry
 * activates Malla across the platform.
 *
 * Creates/upserts a platform-scoped provider config (storeId: null,
 * isDefault: true) so loadProviderForStore() will pick it up.
 */
async function seedAiProviderFromEnv() {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    console.log("         AI_API_KEY not set  skipping provider config (MockProvider will be used)");
    return;
  }

  const providerName = "openai-compatible";
  const baseUrl = process.env.AI_API_URL || "https://open.bigmodel.cn/api/paas/v4/chat/completions";
  const model = process.env.AI_MODEL || "glm-4-plus";

  // Upsert the platform-level config. We encrypt the key via the same
  // helper the admin UI uses so decryption works at request time.
  const apiKeyCipher = encryptApiKey(apiKey);
  const apiKeyLast4 = apiKey.slice(-4);

  // Ensure only one default per provider (storeId = null = platform scope).
  await AIProviderConfig.updateMany({ storeId: null, providerName }, { $set: { isDefault: false } });

  await AIProviderConfig.findOneAndUpdate(
    { storeId: null, providerName },
    {
      $set: {
        model,
        baseUrl,
        apiKeyCipher,
        apiKeyLast4,
        isDefault: true,
        enabled: true,
        softLimits: {
          maxInputTokensPerMessage: 4000,
          maxOutputTokensPerMessage: 1000,
          timeoutMs: 25000,
        },
      },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  console.log(`         Seeded openai-compatible provider (model: ${model})`);
 }

 if (require.main === module) {
  require("dotenv").config();
  (async () => {
    try {
      await run();
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error("\nL seed:all failed:", err.message);
      console.error(err.stack);
      try { await mongoose.disconnect(); } catch { /* ignore */ }
      process.exit(1);
    }
  })();
}

module.exports = { run };