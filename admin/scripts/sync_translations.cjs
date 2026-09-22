const fs = require('fs');
const path = require('path');

/**
 * sync_translations.cjs
 *
 * Scans the admin source code for i18n translation key usage (t('key') / t("key")),
 * finds keys that are missing from translation files, adds the missing keys
 * (humanized English placeholder for en.json, English fallback for other languages),
 * creates a new Arabic (ar) language file, and updates the i18n configuration.
 *
 * Usage:
 *   node scripts/sync_translations.cjs
 *
 * Options:
 *   --dry-run    Scan and report only — do not write any files.
 *   --no-arabic  Skip Arabic language creation / i18n.js update.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const config = {
  root: path.resolve(__dirname, '..'),          // admin/
  srcDir: path.join(path.resolve(__dirname, '..'), 'src'),
  translationDir: path.join(path.resolve(__dirname, '..'), 'src', 'utils', 'translation'),
  lang: 'fr',                                    // human language for humanize()
  baseLang: 'en',                                // source of truth
  managedLangs: ['en', 'fr', 'es', 'ar'],        // all languages we manage
  fileExtensions: ['.js', '.jsx', '.ts', '.tsx'],
};

// Regex: matches t('key') and t("key") and t('key', 'default')
// Negative lookbehind avoids false positives from identifiers ending in "t"
// e.g. createElement("a")  →  ...t("a")  would NOT match
//       d.format("YY")     →  ...t("YY") would NOT match
const keyPattern = /(?<![a-zA-Z0-9_])t\(\s*['"]([A-Za-z0-9_.-]+?)['"]/g;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Read a JSON file as a string, stripping any BOM.
 */
function readRaw(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  return content;
}

/**
 * Parse a JSON file. If parsing fails, attempt common repairs:
 *  1. Remove trailing comma issues
 *  2. Insert missing "notes": { wrapper (known fr.json issue)
 * Returns the parsed object or throws.
 */
function loadTranslations(filePath) {
  let raw = readRaw(filePath);

  try {
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`  [WARN] ${path.basename(filePath)} failed to parse, attempting repair...`);

    // Repair: insert missing "notes": { wrapper between "modalKeepBtn" and nested keys
    const notesPattern = /("modalKeepBtn"\s*:\s*"[^"]*",\s*\n)(\s{4}"addTitle")/;
    if (raw.match(notesPattern)) {
      raw = raw.replace(notesPattern, '$1  "notes": {\n$2');
      console.warn(`  [INFO] Inserted missing "notes": { wrapper in ${path.basename(filePath)}.`);
    }

    // Repair: remove trailing commas before closing braces
    raw = raw.replace(/,\s*([}\]])/g, '$1');

    try {
      return JSON.parse(raw);
    } catch (err2) {
      console.error(`  [ERROR] Could not repair ${path.basename(filePath)}: ${err2.message}`);
      throw err2;
    }
  }
}

/**
 * Save a JSON object to file with 2-space indentation, no BOM.
 */
function saveTranslations(filePath, data) {
  const json = JSON.stringify(data, null, 2) + '\n';
  fs.writeFileSync(filePath, json, 'utf8');
}

/**
 * Recursively collect all dot-notation keys from a nested JSON object.
 * e.g. { ai: { action: { close: "x" } } }  →  ["ai.action.close", ...]
 * Flat keys (including literal dots like "productForm.actions") are preserved as-is.
 */
function collectAllKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      // Only recurse if the object is non-empty (nested translations)
      const childKeys = Object.keys(v);
      if (childKeys.length > 0) {
        keys.push(...collectAllKeys(v, fullKey));
      }
    }
    keys.push(fullKey);
  }
  return keys;
}

/**
 * Get a nested value from a JSON object using dot notation.
 * Also checks for a literal dot-notation key (e.g. "productForm.actions").
 */
function getByKey(obj, dotKey) {
  // First try as a literal key (for flat dot-notation keys)
  if (dotKey in obj) return obj[dotKey];

  // Then try as a nested path
  const parts = dotKey.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Set a nested value in a JSON object using dot notation.
 * Creates intermediate objects as needed.
 */
function setByKey(obj, dotKey, value) {
  const parts = dotKey.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current) || typeof current[parts[i]] !== 'object' || current[parts[i]] === null) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

/**
 * Convert a camelCase / snake_case / kebab-case key into a human-readable label.
 * e.g. "productForm.addNewCategory"  →  "Add New Category"
 *      "free_trial_days_help"        →  "Free Trial Days Help"
 */
function humanize(key) {
  // Take the last segment after any dot
  let segment = key.split('.').pop();
  // Preserve known acronyms
  segment = segment
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ');
  // Capitalize each word
  return segment
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Scan all source files for t('key') / t("key") usage and return a Set of keys.
 */
function collectUsedKeys(srcDir) {
  const keys = new Set();
  const extensions = new Set(config.fileExtensions);

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules
        if (entry.name !== 'node_modules' && entry.name !== '.next') {
          walk(fullPath);
        }
      } else if (extensions.has(path.extname(entry.name).toLowerCase())) {
        const content = fs.readFileSync(fullPath, 'utf8');
        let match;
        keyPattern.lastIndex = 0;
        while ((match = keyPattern.exec(content)) !== null) {
          keys.add(match[1]);
        }
      }
    }
  }

  walk(srcDir);
  return keys;
}

/**
 * Add missing keys to a translations object.
 * For the base language (en): humanize the key name.
 * For other languages: use the English value if available, otherwise humanize.
 */
function addMissingKeys(translations, usedKeys, enTranslations) {
  let added = 0;
  for (const key of usedKeys) {
    const existing = getByKey(translations, key);
    if (existing === undefined) {
      const enValue = getByKey(enTranslations, key);
      const value = enValue !== undefined ? enValue : humanize(key);
      setByKey(translations, key, value);
      added++;
    }
  }
  return added;
}

// ---------------------------------------------------------------------------
// i18n.js update
// ---------------------------------------------------------------------------

function updateI18nConfig(dryRun) {
  const i18nPath = path.join(config.srcDir, 'i18n.js');
  let content = fs.readFileSync(i18nPath, 'utf8');
  let changed = false;

  // Add Arabic import
  if (!content.includes('import ar from')) {
    const esImportPattern = /import es from ["']@\/utils\/translation\/es\.json["'];/;
    if (esImportPattern.test(content)) {
      content = content.replace(
        esImportPattern,
        `import es from "@/utils/translation/es.json";\nimport ar from "@/utils/translation/ar.json";`
      );
      changed = true;
    }
  }

  // Add Arabic to resources
  if (!content.includes('ar: { translation: ar }')) {
    content = content.replace(
      /  es: \{ translation: es \},/,
      `  es: { translation: es },\n  ar: { translation: ar },`
    );
    changed = true;
  }

  // Add RTL direction handler for Arabic
  if (!content.includes('languageChanged')) {
    if (/(\.init\(\{[\s\S]*?\}\));/.test(content)) {
      content = content.replace(
        /(\.init\(\{[\s\S]*?\}\));/,
        `$1\n\ni18n.on("languageChanged", (lng) => {\n  const isRtl = ["ar", "he", "fa"].includes(lng?.lng || lng);\n  document.documentElement.dir = isRtl ? "rtl" : "ltr";\n});`
      );
      changed = true;
    }
  }

  if (!changed) {
    console.log('  i18n.js already includes Arabic.');
    return;
  }

  if (!dryRun) {
    fs.writeFileSync(i18nPath, content, 'utf8');
    console.log('  Updated i18n.js — added Arabic (ar) language + RTL support.');
  } else {
    console.log('  [DRY-RUN] Would update i18n.js — added Arabic (ar) language + RTL support.');
  }
}

// ---------------------------------------------------------------------------
// SidebarContext.js update
// ---------------------------------------------------------------------------

function updateSupportedLanguages(dryRun) {
  const sidebarPath = path.join(config.srcDir, 'context', 'SidebarContext.jsx');
  let content = fs.readFileSync(sidebarPath, 'utf8');

  if (content.includes('"ar"') || content.includes("'ar'")) {
    console.log('  SidebarContext.jsx already includes Arabic.');
  } else {
    content = content.replace(
      /const supportedInterfaceLanguages = \[.*?\]/,
      'const supportedInterfaceLanguages = ["en", "fr", "es", "ar"]'
    );
    if (!dryRun) {
      fs.writeFileSync(sidebarPath, content, 'utf8');
      console.log('  Updated SidebarContext.jsx — added "ar" to supportedInterfaceLanguages.');
    } else {
      console.log('  [DRY-RUN] Would update SidebarContext.jsx — added "ar" to supportedInterfaceLanguages.');
    }
  }

  // Also add Arabic to defaultInterfaceLanguages list
  if (content.includes('{ iso_code: "ar"')) {
    console.log('  SidebarContext.jsx defaultInterfaceLanguages already includes Arabic.');
  } else {
    content = content.replace(
      /  \{ iso_code: "fr", name: "French", flag: "FR" \}/,
      `  { iso_code: "fr", name: "French", flag: "FR" },\n  { iso_code: "ar", name: "Arabic", flag: "SA" }`
    );
    if (!dryRun) {
      fs.writeFileSync(sidebarPath, content, 'utf8');
      console.log('  Updated SidebarContext.jsx — added Arabic to defaultInterfaceLanguages.');
    } else {
      console.log('  [DRY-RUN] Would update SidebarContext.jsx — added Arabic to defaultInterfaceLanguages.');
    }
  }
}

function updateSelectLanguage(dryRun) {
  const selectLangPath = path.join(config.srcDir, 'components', 'form', 'selectOption', 'SelectLanguage.jsx');
  let content = fs.readFileSync(selectLangPath, 'utf8');
  let changed = false;

  // Add Arabic to fallbackLanguages
  if (!content.includes('fallback-ar')) {
    content = content.replace(
      /  \{ _id: "fallback-es", name: "Español", iso_code: "es", flag: "ES" \},/,
      `  { _id: "fallback-es", name: "Español", iso_code: "es", flag: "ES" },\n  { _id: "fallback-ar", name: "Arabic", iso_code: "ar", flag: "SA" },`
    );
    changed = true;
    console.log('  Added Arabic to SelectLanguage fallbackLanguages.');
  }

  // Add es and ar to allowedCodes
  if (!content.includes('"es", "ar"]')) {
    content = content.replace(
      /const allowedCodes = \["en", "fr"\];/,
      'const allowedCodes = ["en", "fr", "es", "ar"];'
    );
    changed = true;
    console.log('  Added es and ar to SelectLanguage allowedCodes.');
  }

  // Add Arabic to flagMap
  if (!content.includes('ar: "sa"')) {
    content = content.replace(
      /    fr: "fr",\n  \};/,
      `    fr: "fr",\n    ar: "sa",\n  };`
    );
    changed = true;
    console.log('  Added Arabic to SelectLanguage flagMap.');
  }

  if (!changed) {
    console.log('  SelectLanguage.jsx already includes Arabic support.');
    return;
  }

  if (!dryRun) {
    fs.writeFileSync(selectLangPath, content, 'utf8');
    console.log('  Updated SelectLanguage.jsx — added Arabic support.');
  } else {
    console.log('  [DRY-RUN] Would update SelectLanguage.jsx — added Arabic support.');
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const skipArabic = process.argv.includes('--no-arabic');

  console.log(`Configuration:\n  Root: ${config.root}\n  Source dir: ${config.srcDir}\n  Translation dir: ${config.translationDir}\n  Dry run: ${dryRun}\n`);

  // 1. Collect all used translation keys from source code
  console.log('1. Scanning source files for translation key usage...');
  const usedKeys = collectUsedKeys(config.srcDir);
  console.log(`   Found ${usedKeys.size} unique translation keys in source code.`);

  // 2. Load existing translation files
  console.log('\n2. Loading translation files...');
  const enPath = path.join(config.translationDir, 'en.json');
  const frPath = path.join(config.translationDir, 'fr.json');
  const esPath = path.join(config.translationDir, 'es.json');

  const en = loadTranslations(enPath);
  const fr = loadTranslations(frPath);
  const es = loadTranslations(esPath);

  console.log(`   en.json: ${Object.keys(en).length} top-level keys`);
  console.log(`   fr.json: ${Object.keys(fr).length} top-level keys`);
  console.log(`   es.json: ${Object.keys(es).length} top-level keys`);

  // 3. Find existing keys in each file (including nested)
  const enKeys = new Set(collectAllKeys(en));
  const frKeys = new Set(collectAllKeys(fr));
  const esKeys = new Set(collectAllKeys(es));

  // 4. Find missing keys
  console.log('\n3. Identifying missing keys...');

  const missingEn = [...usedKeys].filter(k => !enKeys.has(k));
  const missingFr = [...usedKeys].filter(k => !frKeys.has(k));
  const missingEs = [...usedKeys].filter(k => !esKeys.has(k));

  console.log(`   Missing from en.json: ${missingEn.length}`);
  console.log(`   Missing from fr.json: ${missingFr.length}`);
  console.log(`   Missing from es.json: ${missingEs.length}`);

  if (missingEn.length > 0) {
    console.log(`   Sample missing from en: ${missingEn.slice(0, 10).join(', ')}...`);
  }
  if (missingEs.length > 0) {
    console.log(`   Sample missing from es: ${missingEs.slice(0, 10).join(', ')}...`);
  }

  // 5. Add missing keys to each translation file
  console.log('\n4. Adding missing keys to translation files...');

  const enAdded = addMissingKeys(en, usedKeys, en);
  console.log(`   en.json: added ${enAdded} missing keys (humanized values)`);

  const frAdded = addMissingKeys(fr, usedKeys, en);
  console.log(`   fr.json: added ${frAdded} missing keys (English fallback)`);

  const esAdded = addMissingKeys(es, usedKeys, en);
  console.log(`   es.json: added ${esAdded} missing keys (English fallback)`);

  if (!dryRun) {
    saveTranslations(enPath, en);
    saveTranslations(frPath, fr);
    saveTranslations(esPath, es);
    console.log('\n   Files saved: en.json, fr.json, es.json');
  } else {
    console.log('\n   [DRY-RUN] No files written.');
  }

  // 6. Create Arabic language file
  let arKeyCount = 0;
  let arExists = false;
  if (!skipArabic) {
    console.log('\n5. Creating Arabic (ar) language...');
    const arPath = path.join(config.translationDir, 'ar.json');

    // Check if ar.json already exists and is up to date
    try {
      const arExisting = loadTranslations(arPath);
      const arKeys = new Set(collectAllKeys(arExisting));
      arExists = usedKeys.size > 0 && [...usedKeys].every(k => arKeys.has(k));
    } catch { /* file doesn't exist or is invalid */ }

    const ar = {};
    for (const key of usedKeys) {
      const enValue = getByKey(en, key);
      setByKey(ar, key, enValue !== undefined ? enValue : humanize(key));
    }
    arKeyCount = Object.keys(ar).length;

    if (!dryRun) {
      if (!arExists) {
        saveTranslations(arPath, ar);
        console.log(`   Created ar.json with ${Object.keys(ar).length} top-level entries (English placeholders).`);
      } else {
        console.log(`   ar.json already exists and is up to date.`);
      }
    } else {
      console.log(`   [DRY-RUN] ${arExists ? 'ar.json already exists' : 'Would create ar.json'} with ${Object.keys(ar).length} top-level entries.`);
    }

    // 7. Update i18n.js to register Arabic
    console.log('\n6. Updating i18n configuration...');
    updateI18nConfig(dryRun);

    // 8. Update SidebarContext.jsx to include Arabic
    console.log('\n7. Updating SidebarContext.jsx...');
    updateSupportedLanguages(dryRun);

    // 9. Update SelectLanguage.jsx to include Arabic
    console.log('\n8. Updating SelectLanguage.jsx...');
    updateSelectLanguage(dryRun);
  }

  // 9. Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Summary:');
  console.log(`  Translation keys used in source: ${usedKeys.size}`);
  console.log(`  en.json missing: ${missingEn.length} → added ${enAdded}`);
  console.log(`  fr.json missing: ${missingFr.length} → added ${frAdded}`);
  console.log(`  es.json missing: ${missingEs.length} → added ${esAdded}`);
  if (!skipArabic) {
    const arStatus = dryRun ? '(dry-run)' : (arExists ? 'already existed' : 'created');
    console.log(`  ar.json: ${arStatus}, ${arKeyCount} top-level entries`);
    console.log(`  i18n.js: Arabic registered ${dryRun ? '(dry-run)' : ''}`);
    console.log(`  SidebarContext.jsx: "ar" added ${dryRun ? '(dry-run)' : ''}`);
    console.log(`  SelectLanguage.jsx: Arabic added ${dryRun ? '(dry-run)' : ''}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main();
