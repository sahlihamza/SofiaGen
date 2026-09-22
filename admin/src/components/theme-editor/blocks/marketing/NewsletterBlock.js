import { Button } from "@sofia/ui";
/**
 * Newsletter Block
 */

export const NewsletterBlock = {
  id: "newsletter-block",
  label: "âœ‰ï¸ Newsletter",
  category: "E-Commerce",
  content: {
    type: "newsletter-component",
  },
  attributes: { class: "fa fa-envelope" },
};

export const NewsletterComponent = {
  isComponent: (el) => el.classList && el.classList.contains("newsletter-section"),
  model: {
    defaults: {
      type: "newsletter-component",
      tagName: "section",
      attributes: { class: "newsletter-section" },
      styles: `
        .newsletter-section {
          padding: 80px 20px;
          background-color: #10b981;
          color: white;
          text-align: center;
        }
        .nl-container {
          max-width: 600px;
          margin: 0 auto;
        }
        .nl-title {
          font-size: 32px;
          font-weight: bold;
          margin: 0 0 15px 0;
        }
        .nl-desc {
          font-size: 16px;
          margin: 0 0 30px 0;
          opacity: 0.9;
        }
        .nl-form {
          display: flex;
          gap: 10px;
          justify-content: center;
        }
        .nl-input {
          flex: 1;
          padding: 15px 20px;
          border: none;
          border-radius: 30px;
          font-size: 16px;
          outline: none;
        }
        .nl-btn {
          padding: 15px 30px;
          background: #111827;
          color: white;
          border: none;
          border-radius: 30px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.3s;
        }
        .nl-btn:hover {
          background: #374151;
        }
        .nl-message {
          margin-top: 15px;
          font-size: 14px;
          opacity: 0.9;
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        @media (max-width: 480px) {
          .nl-form {
            flex-direction: column;
          }
          .nl-btn {
            width: 100%;
          }
        }
      `,
      content: `
        <div class="nl-container">
          <h2 class="nl-title">Inscrivez-vous Ã  notre newsletter</h2>
          <p class="nl-desc">Inscrivez-vous pour recevoir des offres spÃ©ciales, des cadeaux gratuits et des promotions exceptionnelles.</p>

          <form class="nl-form" onsubmit="event.preventDefault()" role="form">
            <label class="sr-only" for="newsletter-email">Adresse email</label>
            <input id="newsletter-email" name="email" type="email" class="nl-input" placeholder="Entrez votre email" required>
            <Button type="submit" class="nl-btn">S'abonner</Button>
          </form>
          <div class="nl-message" aria-live="polite"></div>
          <script>
            (function() {
              var root = document.currentScript && document.currentScript.parentElement;
              if (!root) root = document.querySelector('.newsletter-section');
              if (!root) return;
              var form = root.querySelector('.nl-form');
              var msgEl = root.querySelector('.nl-message');
              var endpoint = root.getAttribute('data-api-endpoint') || '/api/newsletter/subscribe';
              var successMsg = root.getAttribute('data-success-message') || 'Merci pour votre inscription !';
              if (form) {
                form.addEventListener('submit', function(e) {
                  e.preventDefault();
                  var input = form.querySelector('.nl-input');
                  var email = input ? input.value : '';
                  if (!email || !email.includes('@')) {
                    if (msgEl) { msgEl.textContent = 'Veuillez entrer une adresse email valide.'; msgEl.style.color = '#fecaca'; }
                    return;
                  }
                  fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email }),
                  }).then(function(r) { return r.json().catch(function() { return {}; }); }).then(function() {
                    if (msgEl) { msgEl.textContent = successMsg; msgEl.style.color = '#d1fae5'; }
                    if (input) input.value = '';
                  }).catch(function() {
                    if (msgEl) { msgEl.textContent = 'Une erreur est survenue. Veuillez rÃ©essayer.'; msgEl.style.color = '#fecaca'; }

                  });
                });
              }
            })();
          </script>
        </div>
      `,
      traits: [
        {
          name: "newsletterTitle",
          label: "Titre",
          type: "text",
          default: "Inscrivez-vous Ã  notre newsletter",
          changeProp: 1,
          category: "content",
          section: "Texte",
        },
        {
          name: "newsletterDescription",
          label: "Description",
          type: "textarea",
          default: "Inscrivez-vous pour recevoir des offres spÃ©ciales, des cadeaux gratuits et des promotions exceptionnelles.",
          changeProp: 1,
          category: "content",
          section: "Texte",
        },
        {
          name: "newsletterButtonText",
          label: "Texte du bouton",
          type: "text",
          default: "S'abonner",
          changeProp: 1,
          category: "content",
          section: "Bouton",
        },
        {
          name: "newsletterSuccessMessage",
          label: "Message de succÃ¨s",
          type: "text",
          default: "Merci pour votre inscription !",
          changeProp: 1,
          category: "content",
          section: "Message",
        },
        {
          name: "newsletterApiEndpoint",
          label: "Endpoint API",
          type: "text",
          default: "/api/newsletter/subscribe",
          changeProp: 1,
          category: "content",
          section: "IntÃ©gration",
        },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:newsletterTitle", this.updateTitle);
      this.on("change:newsletterDescription", this.updateDescription);
      this.on("change:newsletterButtonText", this.updateButtonText);
      this.on("change:newsletterSuccessMessage", this.updateSuccessMessage);

      if (typeof document !== "undefined") {
        this._newsletterSubmitHandler = (e) => {
          const form = e.target.closest(".nl-form");
          if (!form) return;
          e.preventDefault();
          this.handleSubmit(e);
        };
        document.addEventListener("submit", this._newsletterSubmitHandler);
      }
    },

    onRemove() {
      this.off("change:newsletterTitle change:newsletterDescription change:newsletterButtonText change:newsletterSuccessMessage");
      if (typeof document !== "undefined" && this._newsletterSubmitHandler) {
        document.removeEventListener("submit", this._newsletterSubmitHandler);
        this._newsletterSubmitHandler = null;
      }
    },

    updateTitle() {
      const title = this.get("newsletterTitle");
      const el = this.view?.el;
      if (el) {
        const titleEl = el.querySelector(".nl-title");
        if (titleEl) titleEl.textContent = title || "";
      }
    },

    updateDescription() {
      const desc = this.get("newsletterDescription");
      const el = this.view?.el;
      if (el) {
        const descEl = el.querySelector(".nl-desc");
        if (descEl) descEl.textContent = desc || "";
      }
    },

    updateButtonText() {
      const text = this.get("newsletterButtonText");
      const el = this.view?.el;
      if (el) {
        const btn = el.querySelector(".nl-btn");
        if (btn) btn.textContent = text || "S'abonner";
      }
    },

    updateSuccessMessage() {
      const message = this.get("newsletterSuccessMessage");
      const el = this.view?.el;
      if (el) {
        const msgEl = el.querySelector(".nl-message");
        if (msgEl) msgEl.textContent = message || "";
      }
    },

    handleSubmit(e) {
      const endpoint = this.get("newsletterApiEndpoint") || "/api/newsletter/subscribe";
      const input = this.view?.el?.querySelector?.(".nl-input");
      const email = input?.value || "";
      const messageEl = this.view?.el?.querySelector?.(".nl-message");

      if (!email || !email.includes("@")) {
        if (messageEl) {
          messageEl.textContent = "Veuillez entrer une adresse email valide.";
          messageEl.style.color = "#fecaca";
        }
        return;
      }

      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
        .then((r) => r.json().catch(() => ({})))
        .then(() => {
          if (messageEl) {
            messageEl.textContent = this.get("newsletterSuccessMessage") || "Merci pour votre inscription !";
            messageEl.style.color = "#d1fae5";
          }
          if (input) input.value = "";
        })
        .catch(() => {
          if (messageEl) {
            messageEl.textContent = "Une erreur est survenue. Veuillez rÃ©essayer.";
            messageEl.style.color = "#fecaca";
          }
        });
    },
  },
};
