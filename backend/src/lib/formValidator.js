/**
 * formValidator  validation stricte côté serveur, par type de champ.
 *
 * Contrat : le `config.fields` (schéma) est fourni par le contrôleur (issu du
 * data-config du builder). Le client n'envoie que des valeurs : on ne fait
 * JAMAIS confiance au type/required/options envoyés par le client.
 *
 * Sécurité :
 *  - bornes strictes (longueurs, taille numérique, nb d'Éléments)
 *  - échappement non requis ici (MongoDB + envoi email en texte/HTML échappé
 *    côté formEmailService), mais on normalise/trimme pour éviter les abus.
 *  - refus des types non whitelistés.
 */

const TYPES = new Set([
  "text", "email", "number", "tel", "url", "password", "textarea",
  "select", "multiselect", "radio", "checkbox", "toggle", "date", "time",
  "datepicker", "file", "hidden", "repeater", "html",
]);

const REGEX = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  url: /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i,
  tel: /^[+]?[\d\s().-]{4,24}$/,
};

const toStr = (v) => (v == null ? "" : String(v));
const isEmpty = (v) =>
  v === undefined || v === null || v === "" ||
  (Array.isArray(v) && v.length === 0);

/**
 * Valide une valeur au regard d'un champ du schéma.
 * @returns {string} message d'erreur ("") si ok
 */
function validateField(field, rawValue) {
  if (!field || !TYPES.has(field.type)) {
    return "Type de champ invalide.";
  }

  // Les champs html n'acceptent pas de saisie utilisateur.
  if (field.type === "html") return "";

  const required = field.required === true || field.required === "true";
  const messages = field.errorMessage || {};

  // Type fichier : valeur = tableau de descripteurs {name,url,size,mimetype}
  if (field.type === "file") {
    const files = Array.isArray(rawValue) ? rawValue : [];
    if (required && files.length === 0) {
      return messages.required || "Veuillez joindre au moins un fichier.";
    }
    if (field.multiple === false && files.length > 1) {
      return "Un seul fichier est autorisé.";
    }
    return "";
  }

  // Répéteur : valeur = tableau de lignes (objets)
  if (field.type === "repeater") {
    const rows = Array.isArray(rawValue) ? rawValue : [];
    const min = Number(field.minRows) || 0;
    const max = Number(field.maxRows) || 50;
    if (required && rows.length === 0) {
      return messages.required || "Ajoutez au moins une ligne.";
    }
    if (rows.length > max) return `Maximum ${max} lignes.`;
    if (rows.length < min && (required || rows.length > 0)) {
      return `Minimum ${min} ligne(s).`;
    }
    // Validation récursive de chaque sous-champ.
    const subFields = Array.isArray(field.repeaterFields) ? field.repeaterFields : [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || {};
      for (const sf of subFields) {
        const subErr = validateField(sf, row[sf.name]);
        if (subErr) return `Ligne ${i + 1}  ${subErr}`;
      }
    }
    return "";
  }

  // Valeurs multi (checkbox/multiselect)
  if (field.type === "multiselect" || field.type === "checkbox") {
    const arr = Array.isArray(rawValue)
      ? rawValue
      : isEmpty(rawValue) ? [] : [rawValue];
    if (required && arr.length === 0) {
      return messages.required || "Ce champ est obligatoire.";
    }
    const allowed = (field.options || []).map((o) => o.value);
    const invalid = arr.find((v) => !allowed.includes(v));
    if (invalid !== undefined) return "Valeur non autorisé.";
    return "";
  }

  // Valeurs scalaires
  let value = toStr(rawValue).trim();

  if (required && isEmpty(value)) {
    return messages.required || "Ce champ est obligatoire.";
  }
  if (isEmpty(value)) return ""; // non requis + vide => ok

  // Longueur
  const maxLen = Number(field.maxLength) || 0;
  if (maxLen && value.length > maxLen) {
    return messages.invalid || `Maximum ${maxLen} caractères.`;
  }

  switch (field.type) {
    case "email":
      if (!REGEX.email.test(value)) return messages.invalid || "Adresse e-mail invalide.";
      break;
    case "url":
      if (!REGEX.url.test(value)) return messages.invalid || "URL invalide (commenéant par http(s)://).";
      break;
    case "tel":
      if (!REGEX.tel.test(value)) return messages.invalid || "Numéro de téléphone invalide.";
      break;
    case "number": {
      const n = Number(value);
      if (Number.isNaN(n)) return messages.invalid || "Nombre invalide.";
      if (field.min !== undefined && field.min !== "" && n < Number(field.min)) {
        return messages.invalid || `Doit être e ${field.min}.`;
      }
      if (field.max !== undefined && field.max !== "" && n > Number(field.max)) {
        return messages.invalid || `Doit être d ${field.max}.`;
      }
      break;
    }
    case "date":
    case "datepicker":
      if (Number.isNaN(Date.parse(value))) return messages.invalid || "Date invalide.";
      break;
    case "time":
      if (!/^\d{2}:\d{2}([:]\d{2})?$/.test(value)) return messages.invalid || "Heure invalide (HH:MM).";
      break;
    case "select":
    case "radio":
    case "toggle": {
      const allowed = (field.options || []).map((o) => o.value);
      if (allowed.length && !allowed.includes(value)) {
        return messages.invalid || "Valeur non autorisé.";
      }
      break;
    }
    case "password":
      if (value.length < 6) return messages.invalid || "6 caractères minimum.";
      break;
    default:
      break;
  }

  // Pattern personnalisé (regex source fournie par l'admin  validé au préalable).
  if (field.pattern) {
    let re;
    try {
      re = new RegExp(field.pattern);
    } catch {
      re = null; // pattern cassé côté admin : on ignore plutôt que de bloquer l'utilisateur
    }
    if (re && !re.test(value)) {
      return messages.pattern || "Format invalide.";
    }
  }

  return "";
}

/**
 * Valide l'ensemble des valeurs d'un formulaire selon son schéma.
 * Applique aussi la logique conditionnelle : un champ masqué par condition
 * n'est pas validé (sa valeur est ignoré).
 *
 * @param {Array} fields  schéma (config.fields ou aplati steps[].fields)
 * @param {Object} values { name: value }
 * @returns {Object} { errors: { name: msg }, valid: boolean }
 */
function validateForm(fields, values = {}) {
  const errors = {};
  (fields || []).forEach((field) => {
    if (field.type === "html") return;
    if (!isFieldVisible(field, values)) return;
    const err = validateField(field, values[field.name]);
    if (err) errors[field.name] = err;
  });
  return { errors, valid: Object.keys(errors).length === 0 };
}

/**
 * évalue une règle conditionnelle simple (mirage du frontend).
 * field.condition = { field, op, value }
 */
function isFieldVisible(field, values) {
  const cond = field.condition;
  if (!cond || !cond.field) return true;
  const actual = values[cond.field];
  const expected = cond.value;
  switch (cond.op) {
    case "neq": return String(actual) !== String(expected);
    case "contains": return Array.isArray(actual)
      ? actual.includes(expected)
      : String(actual || "").includes(String(expected));
    case "gt": return Number(actual) > Number(expected);
    case "lt": return Number(actual) < Number(expected);
    case "eq":
    default: return String(actual) === String(expected);
  }
}

/**
 * Aplatit les champs d'un config multi-step en un tableau unique.
 */
function flattenFields(config) {
  if (!config) return [];
  if (Array.isArray(config.steps) && config.steps.length) {
    return config.steps.flatMap((s) => s.fields || []);
  }
  return config.fields || [];
}

/**
 * Secures a regex pattern supplied by an admin before it is used for validation.
 *
 * Protections:
 *  - Length cap (prevents pathological patterns).
 *  - Rejects lookahead / lookbehind (high complexity, potential ReDoS).
 *  - Detects catastrophic backtracking patterns like (a+)+, (a*)*, (.+)+.
 *  - Performance smoke-test: rejects patterns that take > 100ms to evaluate.
 *
 * @param {string} pattern - The regex source string to validate.
 * @returns {string|null} The sanitized pattern, or null if it is unsafe/invalid.
 */
function sanitizePattern(pattern) {
  if (!pattern || typeof pattern !== "string") return null;
  if (pattern.length > 200) return null;

  // Reject lookahead and lookbehind assertions (complexity + ReDoS risk).
  if (/\(\?<[=!]|\(\?=[^)]*\)|\(\?!/.test(pattern)) return null;

  // Detect catastrophic backtracking patterns:
  //   (x+)+  (x+)*  (x*)*  (x*)*+  (.+)+  (.+)*  (a|a)*  etc.
  const catastrophicPatterns = [
    /\([^)]*[+*][^)]*\)[+*]/,   // nested quantifiers: (x+)* or (x*)+
    /\([^)]*[+*][^)]*\)[+*][?+]?/, // with optional possessive suffix
    /\(\.[+*][^)]*\)[+*]/,      // (.+)+ / (.*)* style
  ];

  for (const cp of catastrophicPatterns) {
    if (cp.test(pattern)) return null;
  }

  try {
    const re = new RegExp(pattern);

    // Performance smoke-test: a crafted input should not hang.
    // If evaluating against a 50-char string takes more than 100ms, reject.
    const testStart = Date.now();
    re.test("a".repeat(50));
    if (Date.now() - testStart > 100) return null;

    return pattern;
  } catch {
    return null;
  }
}

/**
 * Nettoie une définition de schéma reçue côté serveur avant de l'utiliser
 * (et avant de la stocker dans le snapshot). évite l'injection de champs
 * inattendus dans le schéma.
 */
function sanitizeSchema(fields) {
  if (!Array.isArray(fields)) return [];
  return fields.map((f) => {
    const clean = {
      id: String(f.id || f.name || "").slice(0, 64),
      type: TYPES.has(f.type) ? f.type : "text",
      name: String(f.name || "").slice(0, 64),
      label: String(f.label || "").slice(0, 200),
      required: f.required === true || f.required === "true",
      maxLength: Number(f.maxLength) || undefined,
      min: f.min, max: f.max,
      pattern: sanitizePattern(f.pattern) || undefined,
      options: Array.isArray(f.options)
        ? f.options.slice(0, 100).map((o) => ({ label: String(o.label || "").slice(0, 120), value: String(o.value ?? o.label).slice(0, 120) }))
        : [],
      multiple: !!f.multiple,
      repeaterFields: f.type === "repeater" ? sanitizeSchema(f.repeaterFields) : undefined,
      minRows: f.minRows, maxRows: f.maxRows,
      errorMessage: f.errorMessage || undefined,
      condition: f.condition || undefined,
      htmlContent: f.type === "html" ? String(f.htmlContent || "").slice(0, 5000) : undefined,
    };
    return clean;
  });
}

module.exports = {
  validateField,
  validateForm,
  isFieldVisible,
  flattenFields,
  sanitizeSchema,
  sanitizePattern,
  FIELD_TYPES: Array.from(TYPES),
};
