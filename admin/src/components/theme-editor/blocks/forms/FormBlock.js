/**
 * FormBlock â€” widget Form professionnel (niveau Elementor Pro).

 *
 * RÃ´le : configurer le formulaire dans le builder (3 onglets) et Ã©mettre un
 * placeholder <div data-widget="form" data-config='{...}'></div> qui sera
 * montÃ© cÃ´tÃ© storefront par mountFormWidgets.js (React runtime).
 *
 * Le runtime React vit dans store/src/components/form-widget/FormWidget.jsx.
 * Ce block ne fait que configurer + sÃ©rialiser + afficher un aperÃ§u statique.
 */

import { colorTraits, spacingTraits, borderTraits, typographyTraits, shadowTraits } from "../../traits/utils/commonStyleTraits";
import { applyColorStyle, applyBorderStyle, applyTypographyStyle, applyShadowStyle } from "../../traits/utils/applyCommonStyles";
import { syncWidgetPlaceholder } from "../../traits/utils/widgetPlaceholder";
import { FORM_TEMPLATES, getTemplate } from "./formTemplates";
import { Button } from "@sofia/ui";

const FIELD_TYPES = [
  { label: "Texte", value: "text" },
  { label: "Email", value: "email" },
  { label: "Nombre", value: "number" },
  { label: "TÃ©lÃ©phone", value: "tel" },
  { label: "URL", value: "url" },
  { label: "Mot de passe", value: "password" },
  { label: "Zone de texte", value: "textarea" },
  { label: "Liste dÃ©roulante", value: "select" },
  { label: "Multi-sÃ©lection", value: "multiselect" },
  { label: "Boutons radio", value: "radio" },
  { label: "Cases Ã  cocher", value: "checkbox" },

  { label: "Interrupteur", value: "toggle" },
  { label: "Date", value: "date" },
  { label: "Heure", value: "time" },
  { label: "Date picker", value: "datepicker" },
  { label: "Fichier", value: "file" },
  { label: "Champ cachÃ©", value: "hidden" },
  { label: "RÃ©pÃ©teur", value: "repeater" },
  { label: "HTML", value: "html" },
];

const fieldSchema = [
  { key: "type", label: "Type", type: "select", options: FIELD_TYPES, default: "text" },
  { key: "label", label: "LibellÃ©", type: "text", default: "Champ" },
  { key: "name", label: "Nom (technique)", type: "text", default: "field" },
  { key: "placeholder", label: "Placeholder", type: "text", default: "" },
  { key: "defaultValue", label: "Valeur par dÃ©faut", type: "text", default: "" },
  { key: "helpText", label: "Texte d'aide", type: "text", default: "" },
  { key: "required", label: "Obligatoire", type: "select", default: "false", options: [{ label: "Oui", value: "true" }, { label: "Non", value: "false" }] },
  { key: "width", label: "Largeur (colonnes)", type: "number", default: 1, min: 1, max: 6 },
  { key: "maxLength", label: "Longueur max", type: "number", default: 100 },
  { key: "pattern", label: "Regex (pattern)", type: "text", default: "" },
  { key: "labelPosition", label: "Position label", type: "select", default: "top", options: [{ label: "Haut", value: "top" }, { label: "Gauche", value: "left" }, { label: "Droite", value: "right" }, { label: "MasquÃ©", value: "hidden" }] },
];

const stepSchema = [
  { key: "title", label: "Titre Ã©tape", type: "text", default: "Ã‰tape" },

  { key: "fields", label: "Champs", type: "listField", itemSchema: fieldSchema, default: "[]" },
];

export const FormBlock = {
  id: "form-block",
  label: "ðŸ§© Form",

  category: "Forms",
  content: { type: "form-component" },
  attributes: { class: "fa fa-wpforms" },
};

export const FormComponent = {
  isComponent: (el) => el.classList && el.classList.contains("form-component"),

  model: {
    defaults: {
      type: "form-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "form-component", role: "form" },
      styles: `
        .form-component { padding: var(--ts-section-spacing,24px); background: var(--ts-color-surface,#fff); border-radius: var(--ts-card-radius,12px); }
        .form-component .fw-canvas-title { font-size:20px; font-weight:700; margin:0 0 4px; color:#111827; }
        .form-component .fw-canvas-sub { color:#6b7280; font-size:13px; margin:0 0 16px; }
        .form-component .fw-canvas-grid { display:grid; grid-template-columns:repeat(var(--fw-cols,1),1fr); gap:12px; }
        .form-component .fw-canvas-field { display:flex; flex-direction:column; gap:4px; }
        .form-component .fw-canvas-label { font-size:13px; font-weight:600; color:#374151; }
        .form-component .fw-canvas-input { padding:8px 10px; border:1px solid #d1d5db; border-radius:8px; font-size:13px; background:#f9fafb; color:#9ca3af; }
        .form-component .fw-canvas-submit { margin-top:16px; padding:10px 18px; border:0; border-radius:8px; background:#2563eb; color:#fff; font-weight:600; cursor:default; }
      `,
      content: `<div class="fw-canvas-title">Contactez-nous</div><div class="fw-canvas-sub">Une question ? Ã‰crivez-nous.</div><div class="fw-canvas-grid"></div><Button class="fw-canvas-submit">Envoyer</Button>`,
      // --- valeurs par dÃ©faut (config initiale = template contact) ---
      templateId: "contact",
      formTitle: "Contactez-nous",
      formSubtitle: "Une question ? Ã‰crivez-nous.",

      submitText: "Envoyer",
      columns: 2,
      labelPosition: "top",
      fields: JSON.stringify(getTemplate("contact").fields),
      steps: "[]",
      multiStep: false,
      successMessage: "Merci, votre message a bien Ã©tÃ© envoyÃ©.",
      successSubMessage: "Nous vous rÃ©pondrons dans les plus brefs dÃ©lais.",

      errorMessage: "Veuillez corriger les erreurs ci-dessus.",
      // Actions
      emailEnabled: true,
      emailTo: "",
      emailSubject: "",
      webhookEnabled: false,
      webhookUrl: "",
      redirectEnabled: false,
      redirectUrl: "",
      honeypotEnabled: true,
      captchaProvider: "none",
      // Advanced
      cssId: "",
      cssClass: "",
      customCss: "",

      traits: [
        /* ===== CONTENT ===== */
        { name: "templateId", label: "ModÃ¨le", type: "select", default: "contact", options: FORM_TEMPLATES.map((t) => ({ id: t.id, label: t.label })), changeProp: 1, category: "content", section: "ModÃ¨les" },
        { name: "formTitle", label: "Titre", type: "text", default: "Contactez-nous", changeProp: 1, category: "content", section: "Texte" },
        { name: "formSubtitle", label: "Sous-titre", type: "text", default: "Une question ? Ã‰crivez-nous.", changeProp: 1, category: "content", section: "Texte" },
        { name: "submitText", label: "Texte du bouton", type: "text", default: "Envoyer", changeProp: 1, category: "content", section: "Texte" },
        { name: "multiStep", label: "Formulaire en Ã©tapes", type: "checkbox", default: false, changeProp: 1, category: "content", section: "Disposition" },

        { name: "columns", label: "Colonnes (1-6)", type: "number", default: 2, min: 1, max: 6, changeProp: 1, category: "content", section: "Disposition" },
        { name: "labelPosition", label: "Position des labels", type: "select", default: "top", options: [{ id: "top", label: "Haut" }, { id: "left", label: "Gauche" }, { id: "right", label: "Droite" }, { id: "hidden", label: "MasquÃ©" }], changeProp: 1, category: "content", section: "Disposition" },
        { name: "fields", label: "Champs", type: "listField", itemSchema: fieldSchema, default: JSON.stringify(getTemplate("contact").fields), changeProp: 1, category: "content", section: "Champs" },
        { name: "steps", label: "Ã‰tapes", type: "listField", itemSchema: stepSchema, default: "[]", changeProp: 1, category: "content", section: "Ã‰tapes (multi-step)" },
        { name: "successMessage", label: "Message de succÃ¨s", type: "text", default: "Merci, votre message a bien Ã©tÃ© envoyÃ©.", changeProp: 1, category: "content", section: "Messages" },
        { name: "successSubMessage", label: "Sous-message succÃ¨s", type: "text", default: "Nous vous rÃ©pondrons dans les plus brefs dÃ©lais.", changeProp: 1, category: "content", section: "Messages" },

        { name: "errorMessage", label: "Message d'erreur", type: "text", default: "Veuillez corriger les erreurs ci-dessus.", changeProp: 1, category: "content", section: "Messages" },
        { name: "emailEnabled", label: "Notification email", type: "checkbox", default: true, changeProp: 1, category: "content", section: "Actions" },
        { name: "emailTo", label: "Destinataire(s) email", type: "text", default: "", placeholder: "contact@boutique.com", changeProp: 1, category: "content", section: "Actions" },
        { name: "emailSubject", label: "Objet email", type: "text", default: "", changeProp: 1, category: "content", section: "Actions" },
        { name: "webhookEnabled", label: "Webhook", type: "checkbox", default: false, changeProp: 1, category: "content", section: "Actions" },
        { name: "webhookUrl", label: "URL webhook", type: "text", default: "", changeProp: 1, category: "content", section: "Actions" },
        { name: "redirectEnabled", label: "Redirection aprÃ¨s succÃ¨s", type: "checkbox", default: false, changeProp: 1, category: "content", section: "Actions" },

        { name: "redirectUrl", label: "URL redirection", type: "text", default: "", changeProp: 1, category: "content", section: "Actions" },

        /* ===== STYLE ===== */
        ...spacingTraits({ prefix: "formWidget", defaults: { padding: 24, gap: 16 }, section: "Disposition" }),
        ...colorTraits({ prefix: "formInput", fields: ["background", "text"], defaults: { background: "#ffffff", text: "#111827" }, section: "Champs" }),
        ...borderTraits({ prefix: "formInput", defaults: { color: "#d1d5db", width: 1, style: "solid", radius: 8 }, section: "Champs" }),
        ...colorTraits({ prefix: "formLabel", fields: ["background"], defaults: { background: "#374151" }, section: "Labels" }),
        ...typographyTraits({ prefix: "formLabel", defaults: { size: 14, weight: "600" }, section: "Labels" }),
        ...colorTraits({ prefix: "formBtn", fields: ["background", "text"], defaults: { background: "#2563eb", text: "#ffffff" }, section: "Bouton" }),
        ...borderTraits({ prefix: "formBtn", defaults: { color: "transparent", width: 0, style: "solid", radius: 8 }, section: "Bouton" }),
        ...typographyTraits({ prefix: "formBtn", defaults: { size: 14, weight: "600" }, section: "Bouton" }),
        ...shadowTraits({ prefix: "formWidget" }, "Conteneur"),

        /* ===== ADVANCED ===== */
        { name: "cssId", label: "ID CSS", type: "text", default: "", changeProp: 1, category: "advanced", section: "Attributs" },
        { name: "cssClass", label: "Classes CSS", type: "text", default: "", changeProp: 1, category: "advanced", section: "Attributs" },
        { name: "honeypotEnabled", label: "Honeypot (anti-spam)", type: "checkbox", default: true, changeProp: 1, category: "advanced", section: "SÃ©curitÃ©" },
        { name: "captchaProvider", label: "Captcha", type: "select", default: "none", options: [{ id: "none", label: "Aucun" }, { id: "recaptcha", label: "reCAPTCHA v3" }, { id: "turnstile", label: "Cloudflare Turnstile" }], changeProp: 1, category: "advanced", section: "SÃ©curitÃ©" },
        { name: "customCss", label: "CSS personnalisÃ©", type: "textarea", default: "", changeProp: 1, category: "advanced", section: "Attributs" },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:templateId change:formTitle change:formSubtitle change:submitText change:multiStep change:columns change:labelPosition change:fields change:steps change:successMessage change:successSubMessage change:errorMessage change:emailEnabled change:emailTo change:emailSubject change:webhookEnabled change:webhookUrl change:redirectEnabled change:redirectUrl change:honeypotEnabled change:captchaProvider change:cssId change:cssClass", this.syncConfigAndPreview);
      this.on("change:formWidgetPadding change:formWidgetGap change:formInputBackgroundColor change:formInputTextColor change:formInputBorder change:formLabelBackgroundColor change:formLabelTypography change:formBtnBackgroundColor change:formBtnTextColor change:formBtnBorder change:formBtnTypography change:formWidgetShadow", this.updateStyles);
      this.once("added", () => { this.syncConfigAndPreview(); this.updateStyles(); });
    },

    onRemove() {
      this.off("change:templateId change:formTitle change:formSubtitle change:submitText change:multiStep change:columns change:labelPosition change:fields change:steps change:successMessage change:successSubMessage change:errorMessage change:emailEnabled change:emailTo change:emailSubject change:webhookEnabled change:webhookUrl change:redirectEnabled change:redirectUrl change:honeypotEnabled change:captchaProvider change:cssId change:cssClass");
      this.off("change:formWidgetPadding change:formWidgetGap change:formInputBackgroundColor change:formInputTextColor change:formInputBorder change:formLabelBackgroundColor change:formLabelTypography change:formBtnBackgroundColor change:formBtnTextColor change:formBtnBorder change:formBtnTypography change:formWidgetShadow");
    },

    getEl() { return this.view?.el; },

    parseList(val) {
      if (!val) return [];
      try { const p = typeof val === "string" ? JSON.parse(val) : val; return Array.isArray(p) ? p : []; } catch { return []; }
    },

    buildConfig() {
      const multiStep = this.get("multiStep") === true || this.get("multiStep") === "true";
      const steps = multiStep ? this.parseList(this.get("steps")) : [];
      const fields = this.parseList(this.get("fields"));
      const formId = `form-${this.getId()}`;
      return {
        widgetId: "form",
        configVersion: 1,
        formId,
        title: this.get("formTitle") || "",
        subtitle: this.get("formSubtitle") || "",
        submitText: this.get("submitText") || "Envoyer",
        layout: { columns: this.get("columns") || 1, labelPosition: this.get("labelPosition") || "top" },
        multiStep,
        steps,
        fields,
        messages: { success: this.get("successMessage") || "", successSub: this.get("successSubMessage") || "", error: this.get("errorMessage") || "" },
        actions: {
          email: { enabled: this.get("emailEnabled") !== false, to: this.get("emailTo") || "", subject: this.get("emailSubject") || "" },
          webhook: { enabled: this.get("webhookEnabled") === true || this.get("webhookEnabled") === "true", url: this.get("webhookUrl") || "" },
          redirect: { enabled: this.get("redirectEnabled") === true || this.get("redirectEnabled") === "true", url: this.get("redirectUrl") || "" },
        },
        honeypotName: this.get("honeypotEnabled") !== false ? "website" : null,
        captchaToken: this.get("captchaProvider") !== "none" ? "" : undefined,
        cssId: this.get("cssId") || "",
        cssClass: this.get("cssClass") || "",
      };
    },

    syncConfigAndPreview() {
      const el = this.getEl();
      if (!el) return;
      const cfg = this.buildConfig();
      syncWidgetPlaceholder(this, cfg);
      el.style.setProperty("--fw-cols", cfg.layout.columns);
      this.renderCanvas(cfg);
    },

    renderCanvas(cfg) {
      const el = this.getEl();
      if (!el) return;
      const title = el.querySelector(".fw-canvas-title");
      const sub = el.querySelector(".fw-canvas-sub");
      const grid = el.querySelector(".fw-canvas-grid");
      const btn = el.querySelector(".fw-canvas-submit");
      if (title) title.textContent = cfg.title || "Formulaire";
      if (sub) sub.textContent = cfg.subtitle || "";
      if (btn) btn.textContent = cfg.submitText || "Envoyer";
      if (grid) {
        const fields = cfg.multiStep && cfg.steps.length
          ? cfg.steps.flatMap((s) => s.fields || [])
          : cfg.fields;
        grid.style.setProperty("--fw-cols", cfg.layout.columns);
        grid.innerHTML = fields.slice(0, 8).map((f) => `
          <div class="fw-canvas-field" style="grid-column:span ${f.width || 1}">
            <span class="fw-canvas-label">${f.label || f.name}${f.required === "true" || f.required === true ? " *" : ""}</span>
            <div class="fw-canvas-input">${f.placeholder || f.type}</div>
          </div>`).join("") || `<div class="fw-canvas-input">Ajoutez des champs dans l'onglet Content</div>`;
      }
    },

    applyTemplate(templateId) {
      const tpl = getTemplate(templateId);
      if (!tpl) return;
      this.set({
        formTitle: tpl.title || "", formSubtitle: tpl.subtitle || "", submitText: tpl.submitText || "Envoyer",
        columns: tpl.layout?.columns || 1, labelPosition: tpl.layout?.labelPosition || "top",
        multiStep: !!tpl.steps, fields: JSON.stringify(tpl.fields || []),
        steps: JSON.stringify(tpl.steps || []),
        successMessage: tpl.messages?.success || "", successSubMessage: tpl.messages?.successSub || "",
        errorMessage: tpl.messages?.error || "",
      });
      this.syncConfigAndPreview();
    },

    updateStyles() {
      const el = this.getEl();
      if (!el) return;
      el.style.setProperty("--ts-section-spacing", `${this.get("formWidgetPadding") || 24}px`);
      el.style.setProperty("--ts-card-radius", `${this.get("formInputBorder")?.radius || 8}px`);
      applyColorStyle(el, this, { prefix: "formInput", selector: ".fw-canvas-input", fields: ["background", "text"] });
      applyBorderStyle(el, this, { prefix: "formInput", selector: ".fw-canvas-input" });
      applyColorStyle(el, this, { prefix: "formLabel", selector: ".fw-canvas-label", fields: ["background"] });
      applyTypographyStyle(el, this, { prefix: "formLabel", selector: ".fw-canvas-label" });
      applyColorStyle(el, this, { prefix: "formBtn", selector: ".fw-canvas-submit", fields: ["background", "text"] });
      applyBorderStyle(el, this, { prefix: "formBtn", selector: ".fw-canvas-submit" });
      applyShadowStyle(el, this, { prefix: "formWidget", selector: ".form-component" });
    },
  },

  view: {
    init() {
      this.listenTo(this.model, "change:templateId", () => this.model.applyTemplate(this.model.get("templateId")));
      this.listenTo(this.model, "change:formTitle change:formSubtitle change:submitText change:multiStep change:columns change:labelPosition change:fields change:steps", this.model.syncConfigAndPreview);
    },
    onRender() { this.model.syncConfigAndPreview(); this.model.updateStyles(); },
  },
};
