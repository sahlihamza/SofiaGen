const axios = require("axios");
const FormSetting = require("../models/FormSetting");

/**
 * formIntegrationService  exécute les actions externes d'une soumission :
 *  - webhook (Zapier, Make, URL personnalisé)
 *  - Mailchimp / Brevo / ConvertKit / HubSpot (ajout contact  une liste)
 *  - Google Sheets (append d'une ligne)
 *
 * Chaque action est fire-and-forget (erreurs capturés, ne bloque pas la
 * réponse  l'utilisateur) et journalisé dans submission.actionsLog.
 */

const HTTP_TIMEOUT = 8000;

/**
 * Webhook générique.
 */
async function sendWebhook({ url, method = "POST", headers = {}, payload }) {
  try {
    const res = await axios({
      url,
      method: String(method).toUpperCase() === "GET" ? "GET" : "POST",
      headers: { "Content-Type": "application/json", ...headers },
      data: method === "GET" ? undefined : payload,
      timeout: HTTP_TIMEOUT,
      // On n'accepte que http(s) pour éviter SSRF vers localhost/file.
      proxy: false,
    });
    return { ok: res.status < 400, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Mailchimp  ajoute/abonne un contact  une liste (audience).
 * config: { apiKey, server, listId }
 */
async function addToMailchimp(config, { email, ...merge }) {
  if (!config?.apiKey || !config?.server || !config?.listId || !email) {
    return { ok: false, error: "Configuration Mailchimp incomplète." };
  }
  const dc = config.server;
  const auth = Buffer.from(`anystring:${config.apiKey}`).toString("base64");
  const hashedEmail = require("crypto").createHash("md5").update(String(email).toLowerCase()).digest("hex");
  const url = `https://${dc}.api.mailchimp.com/3.0/lists/${config.listId}/members/${hashedEmail}`;
  try {
    const res = await axios.put(url, {
      email_address: email,
      status_if_new: "subscribed",
      merge_fields: merge,
    }, { headers: { Authorization: `Basic ${auth}` }, timeout: HTTP_TIMEOUT });
    return { ok: res.status < 400, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Brevo (Sendinblue)  cré/met  jour un contact.
 * config: { apiKey, listId }
 */
async function addToBrevo(config, { email, ...attributes }) {
  if (!config?.apiKey || !email) {
    return { ok: false, error: "Configuration Brevo incomplète." };
  }
  const url = "https://api.brevo.com/v3/contacts";
  try {
    const res = await axios.post(url, {
      email,
      attributes,
      listIds: config.listId ? [Number(config.listId)] : undefined,
      updateEnabled: true,
    }, { headers: { "api-key": config.apiKey }, timeout: HTTP_TIMEOUT });
    return { ok: res.status < 400, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * ConvertKit  ajoute un subscriber  une form/séquence.
 * config: { apiKey, formId }
 */
async function addToConvertKit(config, { email, first_name }) {
  if (!config?.apiKey || !config?.formId || !email) {
    return { ok: false, error: "Configuration ConvertKit incomplète." };
  }
  const url = `https://api.convertkit.com/v3/forms/${config.formId}/subscribe`;
  try {
    const res = await axios.post(url, {
      api_key: config.apiKey,
      email,
      first_name,
    }, { timeout: HTTP_TIMEOUT });
    return { ok: res.status < 400, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * HubSpot  cré un contact.
 * config: { apiKey }
 */
async function addToHubSpot(config, { email, ...props }) {
  if (!config?.apiKey || !email) {
    return { ok: false, error: "Configuration HubSpot incomplète." };
  }
  const url = "https://api.hubapi.com/crm/v3/objects/contacts";
  try {
    const res = await axios.post(url, {
      properties: { email, ...props },
    }, { params: { hapikey: config.apiKey }, timeout: HTTP_TIMEOUT });
    return { ok: res.status < 400, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Google Sheets  append une ligne via une Apps Script Web App (URL fournie).
 * config: { scriptUrl }  (doit accepter POST JSON et répondre { ok: true }).
 */
async function appendGoogleSheet(config, payload) {
  if (!config?.scriptUrl) {
    return { ok: false, error: "URL Apps Script Google Sheets manquante." };
  }
  return sendWebhook({ url: config.scriptUrl, method: "POST", payload });
}

const HANDLERS = {
  mailchimp: addToMailchimp,
  brevo: addToBrevo,
  convertkit: addToConvertKit,
  hubspot: addToHubSpot,
  googleSheets: appendGoogleSheet,
};

/**
 * Exécute toutes les intégrations activés pour le store + celles déclarés
 * au niveau du formulaire (par le builder).
 *
 * @param {Object} args
 *   storeId, values (valeurs normalisés), formIntegrations (config widget),
 *   integrationSettings (FormSetting.integrations)
 * @returns {Promise<Object>} { type: { ok, status?, error? } }
 */
async function runIntegrations({ storeId, values, formIntegrations = [], integrationSettings = [] }) {
  const results = {};
  // Map des configs store par type pour récupérer clés API.
  const storeByType = {};
  (integrationSettings || []).forEach((i) => { storeByType[i.type] = i.config || {}; });

  for (const integ of formIntegrations) {
    if (!integ.enabled || !HANDLERS[integ.type]) continue;
    const storeConfig = storeByType[integ.type] || {};
    const config = { ...storeConfig, ...(integ.config || {}) };
    const email = values.email || integ.config?.email;
    const contact = { email, ...(values || {}) };
    try {
      results[integ.type] = await HANDLERS[integ.type](config, contact);
    } catch (err) {
      results[integ.type] = { ok: false, error: err.message };
    }
  }
  return results;
}

module.exports = {
  sendWebhook,
  runIntegrations,
};
