/**
 * TestimonialsBlock  widget "Témoignages" PRO pour le builder visuel.
 *
 * Rôle :
 *  - exposer les options du builder via les `traits` organisés en onglets ;
 *  - produire un placeholder `<div data-widget="testimonials"
 *    data-config='{...}' data-store-id="..."></div>` monté côté storefront
 *    par `mountStorefrontWidgets.js` ;
 *  - afficher un aperçu dynamique dans le canvas (admin) en rechargeant
 *    les témoignages depuis le backend.
 *
 * Runtime React : store/src/components/testimonial-widget/TestimonialWidget.jsx
 */

import {
  colorTraits,
  spacingTraits,
  borderTraits,
  shadowTraits,
  typographyTraits,
} from "../../traits/utils/commonStyleTraits";
import {
  applyColorStyle,
  applyBorderStyle,
  applyTypographyStyle,
  applyShadowStyle,
} from "../../traits/utils/applyCommonStyles";
import { syncWidgetPlaceholder } from "../../traits/utils/widgetPlaceholder";
import TestimonialServices from "@/services/TestimonialServices";

/* ----------------------------------------------------------------------- */
/* Block definition (palette)                                              */
/* ----------------------------------------------------------------------- */
export const TestimonialsBlock = {
  id: "testimonials-block",
  label: "P Témoignages Pro",
  category: "Marketing",
  section: "Marketing",
  content: { type: "testimonials-component" },
  attributes: { class: "fa fa-comments" },
};

/* ----------------------------------------------------------------------- */
/* Component                                                               */
/* ----------------------------------------------------------------------- */
export const TestimonialsBlockComponent = {
  isComponent: (el) =>
    el && el.classList && el.classList.contains("testimonials-component"),

  model: {
    defaults: {
      type: "testimonials-component",
      tagName: "div",
      draggable: true,
      droppable: false,
      attributes: { class: "testimonials-component" },

      styles: `
        .testimonials-component {
          padding: var(--tw-spacing, 60px) 20px;
          background: var(--tw-bg, #f9f9f9);
          min-height: 160px;
        }
        .testimonials-component .tw-canvas-head { text-align: center; margin-bottom: 32px; }
        .testimonials-component .tw-canvas-head h2 { font-size: 28px; font-weight: 700; color: #111827; margin: 0 0 6px; }
        .testimonials-component .tw-canvas-head p { margin: 0; color: #6b7280; font-size: 14px; }
        .testimonials-component .tw-grid { display: grid; grid-template-columns: repeat(var(--tw-col-mobile, 1), minmax(0, 1fr)); gap: 16px; }
        .testimonials-component .tw-list { display: flex; flex-direction: column; gap: 16px; }
        .testimonials-component .tw-single { max-width: 720px; margin: 0 auto; }
        .testimonials-component .tw-masonry { column-count: var(--tw-col-desktop, 3); gap: 16px; }
        .testimonials-component .tw-loading { display: grid; gap: 16px; }
        .testimonials-component .tw-pager { text-align: center; margin-top: 24px; }
        .testimonials-component .tw-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; transition: transform .2s ease, box-shadow .2s ease; }
        .testimonials-component .tw-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,.08); }
        .testimonials-component .tw-card-author { display: flex; align-items: center; gap: 10px; margin: 12px 0 8px; }
        .testimonials-component .tw-card-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; background: #e5e7eb; }
        .testimonials-component .tw-card-name { font-weight: 600; color: #111827; font-size: 14px; }
        .testimonials-component .tw-card-role { font-size: 12px; color: #6b7280; }
        .testimonials-component .tw-text { color: #374151; font-size: 14px; line-height: 1.6; }
        .testimonials-component .tw-stars { color: #f59e0b; font-size: 14px; letter-spacing: 2px; }
        .testimonials-component .tw-empty { text-align: center; color: #9ca3af; padding: 40px 20px; }
        .testimonials-component .tw-ai-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; border: 1px dashed #d1d5db; background: #f9fafb; cursor: pointer; font-size: 12px; color: #6b7280; }
        .testimonials-component .tw-ai-btn:hover { border-color: #667eea; color: #667eea; }
      `,

      content: `
        <div class="tw-canvas-head">
          <h2>Ce que disent nos clients</h2>
          <p>Rejoignez des milliers de clients satisfaits.</p>
        </div>
        <div id="tw-items"><div class="tw-empty">Chargement des témoignages&</div></div>
      `,

      // Default trait values (synchronized into data-config)
      mode: "manual",
      layout: "grid",
      items: [],
      storeId: "",
      category: "",
      rating: 0,
      sortBy: "newest",
      limit: 12,
      title: "Ce que disent nos clients",
      subtitle: "Rejoignez des milliers de clients satisfaits.",
      columnsDesktop: 3,
      columnsTablet: 2,
      columnsMobile: 1,
      showAvatar: true,
      showName: true,
      showRole: true,
      showRating: true,
      showDate: true,
      showCompany: true,
      showCompanyLogo: false,
      showQuoteIcon: true,
      showLink: true,
      cardStyle: "default",
      autoplay: true,
      autoplaySpeed: 4000,
      loop: true,
      showArrows: true,
      showDots: true,
      cssId: "",
      cssClass: "",
      animationIn: "none",
      lazyLoading: true,
      aiSuggestions: "",
      source: "", // "manual" | "" | dynamicDataSources keys

      // StoreId selector  localized across duties
      storeIdAlias: "",

      traits: [
        // ===================== CONTENT =====================
        {
          name: "mode",
          label: "Mode",
          type: "select",
          default: "manual",
          options: [
            { id: "manual", label: "Manuel" },
            { id: "dynamic", label: "Dynamique" },
            { id: "mixed", label: "Mixte (manuel + dynamique)" },
          ],
          changeProp: 1,
          category: "content",
          section: "Donnés",
        },
        {
          name: "title",
          label: "Titre de la section",
          type: "text",
          default: "Ce que disent nos clients",
          changeProp: 1,
          category: "content",
          section: "Donnés",
        },
        {
          name: "subtitle",
          label: "Sous-titre",
          type: "text",
          default: "Rejoignez des milliers de clients satisfaits.",
          changeProp: 1,
          category: "content",
          section: "Donnés",
        },
        {
          name: "layout",
          label: "Mise en page",
          type: "select",
          default: "grid",
          options: [
            { id: "grid", label: "Grille" },
            { id: "carousel", label: "Carrousel" },
            { id: "masonry", label: "Masonry" },
            { id: "list", label: "Liste" },
            { id: "single", label: "Seul (featured)" },
          ],
          changeProp: 1,
          category: "content",
          section: "Donnés",
        },
        {
          name: "limit",
          label: "Limite",
          type: "number",
          default: 12,
          min: 1,
          max: 60,
          changeProp: 1,
          category: "content",
          section: "Donnés",
        },
        {
          name: "sortBy",
          label: "Tri",
          type: "select",
          default: "newest",
          options: [
            { id: "newest", label: "Plus récent" },
            { id: "rating-high", label: "Note décroissante" },
            { id: "rating-low", label: "Note croissante" },
            { id: "name-asc", label: "Nom A à Z" },
            { id: "name-desc", label: "Nom Z  A" },
          ],
          changeProp: 1,
          category: "content",
          section: "Donnés",
        },
        {
          name: "category",
          label: "Catégorie (filtre)",
          type: "text",
          default: "",
          placeholder: "ex: service-client",
          changeProp: 1,
          category: "content",
          section: "Donnés",
        },
        {
          name: "rating",
          label: "Note minimale",
          type: "select",
          default: 0,
          options: [
            { id: 0, label: "Toutes" },
            { id: 1, label: " +" },
            { id: 2, label: " +" },
            { id: 3, label: " +" },
            { id: 4, label: " +" },
            { id: 5, label: "" },
          ],
          changeProp: 1,
          category: "content",
          section: "Donnés",
        },
        {
          name: "storeId",
          label: "Store ID",
          type: "text",
          default: "",
          placeholder: "64a1b2c3d4...",
          changeProp: 1,
          category: "content",
          section: "Donnés",
        },
        {
          name: "source",
          label: "Source (dynamicData)",
          type: "select",
          default: "",
          options: [
            { id: "", label: "API /testimonials standard" },
            { id: "testimonials.latest", label: "Derniers témoignages" },
            { id: "testimonials.featured", label: "Témoignages en vedette" },
            { id: "testimonials.byRating", label: "Témoignages par note" },
            { id: "testimonials.random", label: "Témoignages aléatoires" },
          ],
          changeProp: 1,
          category: "content",
          section: "Donnés",
        },

        // ===================== ITEMS (manual) =====================
        {
          name: "items",
          label: "Témoignages (manuel)",
          type: "item-list",
          changeProp: 1,
          itemSchema: [
            { key: "name", label: "Nom", type: "text" },
            { key: "role", label: "Rôle", type: "text" },
            { key: "company", label: "Entreprise", type: "text" },
            { key: "email", label: "Email", type: "text" },
            { key: "avatar", label: "Avatar (URL)", type: "text" },
            { key: "rating", label: "Note (1-5)", type: "number" },
            { key: "title", label: "Titre", type: "text" },
            { key: "text", label: "Texte", type: "textarea" },
            { key: "date", label: "Date (YYYY-MM-DD)", type: "text" },
            { key: "link", label: "Lien", type: "text" },
            { key: "companyLogo", label: "Logo entreprise (URL)", type: "text" },
            { key: "videoUrl", label: "Vidéo (URL)", type: "text" },
          ],
          default: [
            {
              name: "Claire L.",
              role: "Directrice marketing",
              company: "Shoppe",
              email: "claire@example.com",
              avatar: "https://i.pravatar.cc/150?img=1",
              rating: 5,
              title: "Service exceptionnel",
              text: "Livraison ultra rapide et équipe  l'écoute. Je recommande vivement cette boutique.",
              date: "2025-03-14",
            },
            {
              name: "Antoine M.",
              role: "Entrepreneur",
              company: "StartupLab",
              email: "antoine@example.com",
              avatar: "https://i.pravatar.cc/150?img=3",
              rating: 5,
              title: "Qualité au rendez-vous",
              text: "Produit conforme  la description, emballage soigné et service client réactif.",
              date: "2025-04-02",
            },
          ],
          category: "content",
          section: "Témoignages",
        },

        // ===================== GRID =====================
        {
          name: "columnsDesktop",
          label: "Colonnes (desktop)",
          type: "number",
          default: 3,
          min: 1,
          max: 6,
          changeProp: 1,
          category: "content",
          section: "Disposition",
        },
        {
          name: "columnsTablet",
          label: "Colonnes (tablette)",
          type: "number",
          default: 2,
          min: 1,
          max: 6,
          changeProp: 1,
          category: "content",
          section: "Disposition",
        },
        {
          name: "columnsMobile",
          label: "Colonnes (mobile)",
          type: "number",
          default: 1,
          min: 1,
          max: 6,
          changeProp: 1,
          category: "content",
          section: "Disposition",
        },

        // ===================== SHOW =====================
        {
          name: "showAvatar",
          label: "Afficher l'avatar",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Affichage",
        },
        {
          name: "showName",
          label: "Afficher le nom",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Affichage",
        },
        {
          name: "showRole",
          label: "Afficher le rôle",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Affichage",
        },
        {
          name: "showCompany",
          label: "Afficher l'entreprise",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Affichage",
        },
        {
          name: "showRating",
          label: "Afficher la note",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Affichage",
        },
        {
          name: "showDate",
          label: "Afficher la date",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Affichage",
        },
        {
          name: "showCompanyLogo",
          label: "Afficher le logo entreprise",
          type: "checkbox",
          default: false,
          changeProp: 1,
          category: "style",
          section: "Affichage",
        },
        {
          name: "showQuoteIcon",
          label: "Afficher le guillemet décoratif",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Affichage",
        },
        {
          name: "showLink",
          label: "Afficher le lien",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Affichage",
        },

        // ===================== CARD STYLE =====================
        {
          name: "cardStyle",
          label: "Style des cartes",
          type: "select",
          default: "default",
          options: [
            { id: "default", label: "Défaut" },
            { id: "modern", label: "Moderne" },
            { id: "minimal", label: "Minimal" },
            { id: "bordered", label: "Bordure" },
            { id: "shadow", label: "Ombre" },
          ],
          changeProp: 1,
          category: "style",
          section: "Carte",
        },

        // ===================== CAROUSEL =====================
        {
          name: "autoplay",
          label: "Autoplay (carrousel)",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Carrousel",
        },
        {
          name: "autoplaySpeed",
          label: "Vitesse autoplay (ms)",
          type: "number",
          default: 4000,
          min: 1000,
          max: 20000,
          changeProp: 1,
          category: "style",
          section: "Carrousel",
        },
        {
          name: "loop",
          label: "Boucle (loop)",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Carrousel",
        },
        {
          name: "showArrows",
          label: "Afficher les fléches",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Carrousel",
        },
        {
          name: "showDots",
          label: "Afficher les points",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "style",
          section: "Carrousel",
        },

        // ===================== ANIMATION =====================
        {
          name: "animationIn",
          label: "Animation d'entré",
          type: "select",
          default: "none",
          options: [
            { id: "none", label: "Aucune" },
            { id: "fade", label: "Fondu" },
            { id: "slide-up", label: "Glisser vers le haut" },
            { id: "slide-left", label: "Glisser de gauche" },
          ],
          changeProp: 1,
          category: "style",
          section: "Animation",
        },

        // ===================== AI HELPER =====================
        {
          name: "aiSuggestions",
          label: "= Suggérer du contenu (IA simulée)",
          type: "action",
          category: "ai",
          section: "IA",
        },

        // ===================== ADVANCED =====================
        ...spacingTraits({
          prefix: "tw",
          defaults: { padding: 60 },
          section: "Espacement",
        }),
        ...colorTraits({
          prefix: "tw",
          fields: ["background", "text"],
          defaults: { background: "#f9f9f9", text: "#111827" },
          section: "Couleurs",
        }),
        ...borderTraits({
          prefix: "tw",
          defaults: { color: "#e5e7eb", width: 1, style: "solid", radius: 12 },
          section: "Carte / Bordure",
        }),
        ...shadowTraits({ prefix: "tw", section: "Carte / Ombre" }),
        ...typographyTraits({ prefix: "tw", defaults: { size: 16 }, section: "Texte" }),
        {
          name: "cssId",
          label: "ID CSS",
          type: "text",
          default: "",
          changeProp: 1,
          category: "advanced",
          section: "Attributs",
        },
        {
          name: "cssClass",
          label: "Classes CSS",
          type: "text",
          default: "",
          changeProp: 1,
          category: "advanced",
          section: "Attributs",
        },
        {
          name: "lazyLoading",
          label: "Lazy loading",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "advanced",
          section: "Performance",
        },
      ],
    },

    /* ----------------------------- Lifecycle ---------------------------- */
    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);

      // Re-sync on config changes.
      this.on(
        "change:mode change:title change:subtitle change:layout change:limit change:sortBy change:category change:rating change:storeId change:source change:items",
        () => {
          this.syncConfigAndPreview();
          this.loadPreview();
        }
      );
      this.on(
        "change:columnsDesktop change:columnsTablet change:columnsMobile",
        () => {
          this.updateColumns();
          this.syncConfigAndPreview();
        }
      );
      this.on(
        "change:autoplay change:autoplaySpeed change:loop change:showArrows change:showDots",
        this.syncConfigAndPreview
      );
      this.on(
        "change:showAvatar change:showName change:showRole change:showCompany change:showRating change:showDate change:showCompanyLogo change:showQuoteIcon change:showLink change:cardStyle change:animationIn",
        () => {
          this.updateCardVisibility();
          this.loadPreview();
        }
      );
      this.on(
        "change:twSpacing change:twBackgroundColor change:twBackgroundTextColor change:twBorderColor change:twBorderWidth change:twBorderStyle change:twBorderRadius change:twTextTypography change:twShadow",
        this.updateStyles
      );
      this.on("change:cssId change:cssClass change:lazyLoading", this.syncConfigAndPreview);
      this.on("change:aiSuggestions", this.handleAI);

      this.once("added", () => {
        this.syncConfigAndPreview();
        this.updateStyles();
        this.loadPreview();
      });
    },

    onRemove() {
      this.off("change:mode change:title change:subtitle change:layout change:limit change:sortBy change:category change:rating change:storeId change:source change:items");
      this.off("change:columnsDesktop change:columnsTablet change:columnsMobile");
      this.off("change:autoplay change:autoplaySpeed change:loop change:showArrows change:showDots");
      this.off("change:showAvatar change:showName change:showRole change:showCompany change:showRating change:showDate change:showCompanyLogo change:showQuoteIcon change:showLink change:cardStyle change:animationIn");
      this.off("change:twSpacing change:twBackgroundColor change:twBackgroundTextColor change:twBorderColor change:twBorderWidth change:twBorderStyle change:twBorderRadius change:twTextTypography change:twShadow");
      this.off("change:cssId change:cssClass change:lazyLoading");
      this.off("change:aiSuggestions");
    },

    /* ----------------------------- Helpers ---------------------------- */
    getEl() {
      return this.view?.el;
    },

    buildConfig() {
      const columns = {
        desktop: this.get("columnsDesktop") || 3,
        tablet: this.get("columnsTablet") || 2,
        mobile: this.get("columnsMobile") || 1,
      };

      return {
        widgetId: "testimonials",
        configVersion: 1,
        mode: this.get("mode") || "manual",
        layout: this.get("layout") || "grid",
        items: Array.isArray(this.get("items")) ? this.get("items") : [],
        storeId: this.get("storeId") || "",
        category: this.get("category") || "",
        rating: Number(this.get("rating")) || 0,
        sortBy: this.get("sortBy") || "newest",
        limit: Number(this.get("limit")) || 12,
        title: this.get("title") || "",
        subtitle: this.get("subtitle") || "",
        columns,
        showAvatar: this.get("showAvatar") !== false,
        showName: this.get("showName") !== false,
        showRole: this.get("showRole") !== false,
        showCompany: this.get("showCompany") !== false,
        showRating: this.get("showRating") !== false,
        showDate: this.get("showDate") !== false,
        showCompanyLogo: this.get("showCompanyLogo") === true,
        showQuoteIcon: this.get("showQuoteIcon") !== false,
        showLink: this.get("showLink") !== false,
        cardStyle: this.get("cardStyle") || "default",
        autoplay: this.get("autoplay") !== false,
        autoplaySpeed: Number(this.get("autoplaySpeed")) || 4000,
        loop: this.get("loop") !== false,
        showArrows: this.get("showArrows") !== false,
        showDots: this.get("showDots") !== false,
        cssId: this.get("cssId") || "",
        cssClass: this.get("cssClass") || "",
        animationIn: this.get("animationIn") || "none",
        lazyLoading: this.get("lazyLoading") !== false,
        source: this.get("source") || "",
      };
    },

    syncConfigAndPreview() {
      const el = this.getEl();
      if (!el) return;
      const cfg = this.buildConfig();
      syncWidgetPlaceholder(this, cfg);

      this.updateCanvasHead();
    },

    /* ----------------------------- Canvas preview ---------------------- */
    updateCanvasHead() {
      const el = this.getEl();
      if (!el) return;
      this.updateColumns();

      const head = el.querySelector(".tw-canvas-head");
      if (!head) return;

      const container = el.querySelector("#tw-items");
      if (!container) return;

      // prefer title/subtitle from model traits.
      const h2 = head.querySelector("h2");
      const p = head.querySelector("p");
      if (h2) h2.textContent = this.get("title") || "Témoignages clients";
      if (p) p.textContent = this.get("subtitle") || "";
    },

    async loadPreview() {
      const el = this.getEl();
      if (!el || typeof window === "undefined") return;
      const container = el.querySelector("#tw-items");
      if (!container) return;

      const storeId = this.get("storeId") || "";
      const mode = this.get("mode") || "manual";
      const items = Array.isArray(this.get("items")) ? this.get("items") : [];
      const cfg = this.buildConfig();

      if (mode === "manual" || (mode === "mixed" && items.length > 0)) {
        this.renderPreview(items);
      }

      if (mode === "dynamic" || mode === "mixed") {
        if (!storeId) {
          container.innerHTML = `<div class="tw-empty">Renseignez un "Store ID" pour prévisualiser les témoignages dynamiques.</div>`;
          return;
        }
        try {
          const res = await TestimonialServices.getAll({
            storeId,
            category: cfg.category,
            rating: cfg.rating,
            sortBy: cfg.sortBy,
            page: 1,
            limit: Number(cfg.limit) || 12,
          });
          const data = res?.data || (Array.isArray(res) ? res : []);
          if (mode === "mixed") {
            this.renderPreview([...items, ...(Array.isArray(data) ? data : [])]);
          } else {
            this.renderPreview(Array.isArray(data) ? data : []);
          }
        } catch (err) {
          container.innerHTML = `<div class="tw-empty">Erreur de chargement des témoignages.</div>`;
        }
      }
    },

    flattenVisible(it) {
      const show = (k) => this.get(k) !== false;
      return {
        ...it,
        showAvatar: show("showAvatar"),
        showName: show("showName"),
        showRole: show("showRole"),
        showCompany: show("showCompany"),
        showRating: show("showRating"),
        showDate: show("showDate"),
        showCompanyLogo: show("showCompanyLogo"),
        showQuoteIcon: show("showQuoteIcon"),
        showLink: show("showLink"),
      };
    },

    renderPreview(items = []) {
      const el = this.getEl();
      if (!el) return;
      const container = el.querySelector("#tw-items");
      if (!container) return;

      if (!items.length) {
        container.innerHTML = `<div class="tw-empty">Aucun témoignage. Ajoutez-en dans l'onglet "Témoignages" ou configurez une source dynamique.</div>`;
        return;
      }

      const layout = this.get("layout") || "grid";
      const visible = items.map((it) => this.flattenVisible(it));

      container.innerHTML = visible
        .map((it, i) => {
          const stars = "".repeat(it.rating || 5) + "".repeat(5 - (it.rating || 5));
          const dateStr = it.date || it.createdAt
            ? new Date(it.date || it.createdAt).toLocaleDateString("fr-FR")
            : "";
          const avatar = it.avatar
            ? `<img class="tw-card-avatar" src="${it.avatar}" alt="${it.name}" />`
            : `<div class="tw-card-avatar" style="display:flex;align-items:center;justify-content:center;font-weight:700;color:#6b7280;background:#f3f4f6">${(it.name || "?").charAt(0).toUpperCase()}</div>`;
          const companyLogo = it.companyLogo ? `<img src="${it.companyLogo}" alt="${it.company || ""}" style="height:24px;opacity:.7;filter:grayscale(1)" />` : "";
          const companyHtml = it.company ? `<div style="font-size:12px;color:#6b7280">${it.company}</div>` : "";
          const linkHtml = it.link ? `<a href="${it.link}" target="_blank" rel="noopener" style="color:#667eea;font-size:12px">Lien</a>` : "";

          return `
            <div class="tw-card" style="break-inside:avoid" data-tw-slide="${layout === 'carousel' ? 1 : 0}">
              ${this.get("showQuoteIcon") !== false ? `<span style="position:absolute;top:12px;right:16px;font-size:40px;color:#e5e7eb;line-height:1" aria-hidden="true">"</span>` : ""}
              <div class="tw-card-author">
                ${this.get("showAvatar") !== false && it.avatar ? avatar : ""}
                <div>
                  <div class="tw-card-name">${this.es(it.name || "Anonyme")}</div>
                  ${this.get("showRole") !== false && it.role ? `<div class="tw-card-role">${this.es(it.role)}</div>` : ""}
                </div>
              </div>
              ${this.get("showRating") !== false ? `<div class="tw-stars" aria-label="Note ${it.rating || 5} sur 5">${stars}</div>` : ""}
              <p class="tw-text">${this.get("showLink") !== false ? linkHtml : ""}${this.get("showCompanyLogo") !== false && it.companyLogo ? companyLogo : ""}${companyHtml}${this.get("showCompany") !== false && it.company ? companyHtml : ""}${it.title ? `<strong style="display:block;margin-bottom:4px;color:#111827">${this.es(it.title)}</strong>` : ""}${this.es(it.text || "")}</p>
              ${this.get("showDate") !== false && dateStr ? `<time>${dateStr}</time>` : ""}
            </div>`;
        })
        .join("");
    },

    es(value) {
      return (value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    },

    updateCardVisibility() {
      // Lazy: handled on next preview render
    },

    updateColumns() {
      const el = this.getEl();
      if (!el) return;
      const desktop = this.get("columnsDesktop") || 3;
      const tablet = this.get("columnsTablet") || 2;
      const mobile = this.get("columnsMobile") || 1;
      el.style.setProperty("--tw-col-desktop", desktop);
      el.style.setProperty("--tw-col-tablet", tablet);
      el.style.setProperty("--tw-col-mobile", mobile);
    },

    updateStyles() {
      const el = this.getEl();
      if (!el) return;

      const padding = this.get("twSpacing") || 60;
      el.style.setProperty("--tw-spacing", `${padding}px`);

      applyColorStyle(el, this, {
        prefix: "tw",
        selector: ".testimonials-component",
        fields: ["background", "text"],
      });
      applyBorderStyle(el, this, { prefix: "tw", selector: ".tw-card" });
      applyShadowStyle(el, this, { prefix: "tw", selector: ".tw-card" });
      applyTypographyStyle(el, this, { prefix: "tw", selector: ".tw-text" });
    },

    async handleAI() {
      // Appel  la route backend /testimonials/ai/generate (GLM-5.2 avec
      // fallback mock côté serveur si pas de clé API). On ajoute ensuite le
      // ou les témoignages générés  la liste manuelle (mode mixte/manuel).
      const el = this.getEl();
      if (!el) return;
      const container = el.querySelector("#tw-items");
      if (container) container.innerHTML = `<div class="tw-empty">Génération IA en cours&</div>`;
      try {
        const res = await TestimonialServices.generateAI({
          context: this.get("title") || "",
          category: this.get("category") || "",
          count: 1,
        });
        const suggestions = res?.data || (Array.isArray(res) ? res : []);
        const items = Array.isArray(this.get("items")) ? [...this.get("items")] : [];
        const merged = [...items, ...suggestions];
        this.set("items", merged);
        this.set("aiLastSuggestions", suggestions);
        this.loadPreview();
      } catch (err) {
        if (container) container.innerHTML = `<div class="tw-empty">échec de la génération IA.</div>`;
      }
    },
  },

  view: {
    init() {
      this.listenTo(this.model, "change:columnsDesktop change:columnsTablet change:columnsMobile", () => {
        this.model.updateColumns();
        this.model.syncConfigAndPreview();
      });
      this.listenTo(
        this.model,
        "change:mode change:title change:subtitle change:layout change:items change:storeId change:category change:rating change:sortBy change:limit change:source",
        () => {
          this.model.loadPreview();
          this.model.syncConfigAndPreview();
        }
      );
      this.listenTo(this.model, "change:showAvatar change:showName change:showRole change:showCompany change:showRating change:showDate change:showLink change:cardStyle change:animationIn", () => {
        this.model.loadPreview();
      });
      this.listenTo(this.model, "change:cssId change:cssClass", this.model.syncConfigAndPreview);
      this.listenTo(
        this.model,
        "change:twSpacing change:twBackgroundColor change:twBorderColor change:twBorderRadius change:twTextTypography change:twShadow",
        this.model.updateStyles
      );
    },

    onRender() {
      this.model.syncConfigAndPreview();
      this.model.updateColumns();
      this.model.updateStyles();
    },
  },
};

/* ----------------------------------------------------------------------- */
/* IA : la génération est désormais géré côté serveur (service/aiService.js)
   via la route POST /testimonials/ai/generate (GLM-5.2 + fallback mock).
   L'admin appelle TestimonialServices.generateAI() depuis handleAI(). */
