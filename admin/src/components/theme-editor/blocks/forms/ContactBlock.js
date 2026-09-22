/**
 * Contact Block
 */

import { colorTraits, spacingTraits, borderTraits, typographyTraits } from "../../traits/utils/commonStyleTraits";

export const ContactBlock = {
  id: "contact-block",
  label: "= Contact",
  category: "Sections",
  content: {
    type: "contact-component",
  },
  attributes: { class: "fa fa-phone" },
};

export const ContactComponent = {
  isComponent: (el) => el.classList && el.classList.contains("contact-section"),
  model: {
    defaults: {
      type: "contact-component",
      tagName: "section",
      attributes: { class: "contact-section" },
      styles: `
        .contact-section {
          padding: 80px 20px;
          background-color: #f9fafb;
        }
        .contact-container {
          max-width: 1000px;
          margin: 0 auto;
          display: flex;
          gap: 50px;
        }
        .contact-info {
          flex: 1;
        }
        .contact-title {
          font-size: 32px;
          color: #111827;
          margin: 0 0 20px 0;
        }
        .contact-desc {
          font-size: 16px;
          color: #4b5563;
          margin: 0 0 30px 0;
          line-height: 1.6;
        }
        .info-item {
          margin-bottom: 20px;
        }
        .info-label {
          font-weight: bold;
          color: #111827;
          display: block;
          margin-bottom: 5px;
        }
        .info-value {
          color: #4b5563;
        }
        .contact-form {
          flex: 1;
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #374151;
        }
        .form-input, .form-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          outline: none;
          font-family: inherit;
        }
        .form-textarea {
          resize: vertical;
          min-height: 120px;
        }
        .form-submit {
          background: #10b981;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
          width: 100%;
        }
        .form-submit:hover {
          background: #059669;
        }
        .form-message {
          margin-top: 15px;
          font-size: 14px;
          text-align: center;
        }
        @media (max-width: 768px) {
          .contact-container {
            flex-direction: column;
          }
        }
      `,
      components: [
        {
          tagName: "div",
          attributes: { class: "contact-container" },
          selectable: false,
          hoverable: false,
          editable: false,
          components: [
            {
              tagName: "div",
              attributes: { class: "contact-info" },
              selectable: false,
              hoverable: false,
              editable: false,
              components: [
                { tagName: "h2", attributes: { class: "contact-title" }, content: "Contactez-nous", selectable: false, hoverable: false, editable: false },
                { tagName: "p", attributes: { class: "contact-desc" }, content: "Vous avez une question ou besoin d'aide ? Remplissez le formulaire et nous vous répondrons dans les plus brefs délais.", selectable: false, hoverable: false, editable: false },
                {
                  tagName: "div",
                  attributes: { class: "info-item" },
                  selectable: false,
                  hoverable: false,
                  editable: false,
                  components: [
                    { tagName: "span", attributes: { class: "info-label" }, content: "Email", selectable: false, hoverable: false, editable: false },
                    { tagName: "span", attributes: { class: "info-value" }, content: "support@boutique.fr", selectable: false, hoverable: false, editable: false }
                  ]
                },
                {
                  tagName: "div",
                  attributes: { class: "info-item" },
                  selectable: false,
                  hoverable: false,
                  editable: false,
                  components: [
                    { tagName: "span", attributes: { class: "info-label" }, content: "Téléphone", selectable: false, hoverable: false, editable: false },
                    { tagName: "span", attributes: { class: "info-value" }, content: "+33 1 23 45 67 89", selectable: false, hoverable: false, editable: false }
                  ]
                }
              ]
            },
            {
              tagName: "form",
              attributes: { class: "contact-form", onsubmit: "event.preventDefault()", role: "form" },
              selectable: false,
              hoverable: false,
              editable: false,
              components: [
                {
                  tagName: "div",
                  attributes: { class: "form-group" },
                  selectable: false,
                  hoverable: false,
                  editable: false,
                  components: [
                    { tagName: "label", attributes: { class: "form-label", for: "contact-name" }, content: "Nom", selectable: false, hoverable: false, editable: false },
                    { tagName: "input", type: "text", attributes: { class: "form-input", placeholder: "Votre nom", required: true, id: "contact-name", name: "name" }, selectable: false, hoverable: false, editable: false }
                  ]
                },
                {
                  tagName: "div",
                  attributes: { class: "form-group" },
                  selectable: false,
                  hoverable: false,
                  editable: false,
                  components: [
                    { tagName: "label", attributes: { class: "form-label", for: "contact-email" }, content: "Email", selectable: false, hoverable: false, editable: false },
                    { tagName: "input", type: "email", attributes: { class: "form-input", placeholder: "votre@email.fr", required: true, id: "contact-email", name: "email" }, selectable: false, hoverable: false, editable: false }
                  ]
                },
                {
                  tagName: "div",
                  attributes: { class: "form-group" },
                  selectable: false,
                  hoverable: false,
                  editable: false,
                  components: [
                    { tagName: "label", attributes: { class: "form-label", for: "contact-message" }, content: "Message", selectable: false, hoverable: false, editable: false },
                    { tagName: "textarea", attributes: { class: "form-textarea", placeholder: "Comment pouvons-nous vous aider ?", required: true, id: "contact-message", name: "message" }, selectable: false, hoverable: false, editable: false }
                  ]
                },
                { tagName: "button", type: "submit", attributes: { class: "form-submit" }, content: "Envoyer le message", selectable: false, hoverable: false, editable: false },
                { tagName: "div", attributes: { class: "form-message", "aria-live": "polite" }, content: "", selectable: false, hoverable: false, editable: false }
              ]
            }
          ]
        }
      ],
      traits: [
        {
          name: "contactTitle",
          label: "Titre",
          type: "text",
          default: "Contactez-nous",
          changeProp: 1,
          category: "content",
          section: "Texte",
        },
        {
          name: "contactDescription",
          label: "Description",
          type: "textarea",
          default: "Vous avez une question ou besoin d'aide ? Remplissez le formulaire et nous vous répondrons dans les plus brefs délais.",
          changeProp: 1,
          category: "content",
          section: "Texte",
        },
        {
          name: "contactEmail",
          label: "Email",
          type: "text",
          default: "support@boutique.fr",
          changeProp: 1,
          category: "content",
          section: "Coordonnés",
        },
        {
          name: "contactPhone",
          label: "Téléphone",
          type: "text",
          default: "+33 1 23 45 67 89",
          changeProp: 1,
          category: "content",
          section: "Coordonnés",
        },
        {
          name: "contactSubmitEndpoint",
          label: "Endpoint de soumission",
          type: "text",
          default: "/api/contact/submit",
          changeProp: 1,
          category: "content",
          section: "Intégration",
        },
        ...colorTraits({ prefix: "contact", fields: ["background"], defaults: { background: "#f9fafb" } }),
        ...spacingTraits({ prefix: "contact", defaults: { padding: 80 } }),
        ...borderTraits({ prefix: "contact", defaults: { width: 0, color: "#e5e7eb", radius: 12 } }),
        ...typographyTraits({ prefix: "contact", defaults: { size: 16, weight: "500" } }),
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:contactTitle", this.updateTitle);
      this.on("change:contactDescription", this.updateDescription);
      this.on("change:contactEmail", this.updateEmail);
      this.on("change:contactPhone", this.updatePhone);

      if (typeof document !== "undefined") {
        this._contactSubmitHandler = (e) => {
          const form = e.target.closest(".contact-form");
          if (!form) return;
          e.preventDefault();
          this.handleSubmit(e);
        };
        document.addEventListener("submit", this._contactSubmitHandler);
      }
    },

    onRemove() {
      this.off("change:contactTitle change:contactDescription change:contactEmail change:contactPhone");
      if (typeof document !== "undefined" && this._contactSubmitHandler) {
        document.removeEventListener("submit", this._contactSubmitHandler);
        this._contactSubmitHandler = null;
      }
    },

    updateTitle() {
      const title = this.get("contactTitle");
      const el = this.view?.el;
      if (el) {
        const titleEl = el.querySelector(".contact-title");
        if (titleEl) titleEl.textContent = title || "";
      }
    },

    updateDescription() {
      const desc = this.get("contactDescription");
      const el = this.view?.el;
      if (el) {
        const descEl = el.querySelector(".contact-desc");
        if (descEl) descEl.textContent = desc || "";
      }
    },

    updateEmail() {
      const email = this.get("contactEmail");
      const el = this.view?.el;
      if (el) {
        const infoValues = el.querySelectorAll(".info-value");
        if (infoValues.length >= 1) infoValues[0].textContent = email || "";
      }
    },

    updatePhone() {
      const phone = this.get("contactPhone");
      const el = this.view?.el;
      if (el) {
        const infoValues = el.querySelectorAll(".info-value");
        if (infoValues.length >= 2) infoValues[1].textContent = phone || "";
      }
    },

    handleSubmit(e) {
      const endpoint = this.get("contactSubmitEndpoint") || "/api/contact/submit";
      const form = e.target;
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      const messageEl = this.view?.el?.querySelector?.(".form-message");

      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
        .then((r) => r.json().catch(() => ({})))
        .then(() => {
          if (messageEl) {
            messageEl.textContent = "Message envoyé avec succès !";
            messageEl.style.color = "#059669";
          }
          form.reset();
        })
        .catch(() => {
          if (messageEl) {
            messageEl.textContent = "Une erreur est survenue. Veuillez réssayer.";
            messageEl.style.color = "#dc2626";
          }
        });
    },
  }
};
