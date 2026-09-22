/**
 * Promo Banner Block with Countdown
 */

export const PromoBannerBlock = {
  id: "promo-banner-block",
  label: "< Bannière Promo",
  category: "E-Commerce",
  content: {
    type: "promo-banner-component",
  },
  attributes: {
    class: "fa fa-bullhorn",
  },
};

export const PromoBannerComponent = {
  isComponent: (el) => el.classList && el.classList.contains("promo-banner"),
  model: {
    defaults: {
      type: "promo-banner-component",
      tagName: "div",
      attributes: { class: "promo-banner" },
      styles: `
        .promo-banner {
          background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 15px;
          border-radius: 12px;
          margin: 20px 0;
          box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
        }
        .promo-title {
          font-size: 28px;
          font-weight: 800;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .promo-subtitle {
          font-size: 18px;
          margin: 0;
          opacity: 0.95;
        }
        .promo-countdown-wrapper {
          margin-top: 10px;
          background: rgba(0, 0, 0, 0.15);
          padding: 15px 25px;
          border-radius: 8px;
          backdrop-filter: blur(5px);
        }
      `,
      components: [
        {
          tagName: "h2",
          attributes: { class: "promo-title" },
          content: "Vente Flash ! -50%",
          selectable: false,
          hoverable: false,
          editable: false,
        },
        {
          tagName: "p",
          attributes: { class: "promo-subtitle" },
          content: "Dépéchez-vous, l'offre se termine bientît. Ne manquez pas ces offres exclusives !",
          selectable: false,
          hoverable: false,
          editable: false,
        },
        {
          tagName: "div",
          attributes: { class: "promo-countdown-wrapper" },
          selectable: false,
          hoverable: false,
          editable: false,
          components: [
            {
              type: "countdown",
            }
          ]
        }
      ],
      traits: [
        {
          name: "promoTitle",
          label: "Titre",
          type: "text",
          default: "Vente Flash ! -50%",
          changeProp: 1,
          category: "content",
          section: "Texte",
        },
        {
          name: "promoSubtitle",
          label: "Sous-titre",
          type: "text",
          default: "Dépéchez-vous, l'offre se termine bientît. Ne manquez pas ces offres exclusives !",
          changeProp: 1,
          category: "content",
          section: "Texte",
        },
        {
          name: "promoButtonText",
          label: "Texte du bouton",
          type: "text",
          default: "En profiter",
          changeProp: 1,
          category: "content",
          section: "Bouton",
        },
        {
          name: "promoButtonUrl",
          label: "Lien du bouton",
          type: "text",
          default: "#",
          changeProp: 1,
          category: "content",
          section: "Bouton",
        },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:promoTitle", this.updateTitle);
      this.on("change:promoSubtitle", this.updateSubtitle);
      this.on("change:promoButtonText change:promoButtonUrl", this.updateButton);
    },

    onRemove() {
      this.off("change:promoTitle change:promoSubtitle change:promoButtonText change:promoButtonUrl");
    },

    updateTitle() {
      const title = this.get("promoTitle");
      const el = this.view?.el;
      if (el) {
        const titleEl = el.querySelector(".promo-title");
        if (titleEl) titleEl.textContent = title || "";
      }
    },

    updateSubtitle() {
      const subtitle = this.get("promoSubtitle");
      const el = this.view?.el;
      if (el) {
        const subtitleEl = el.querySelector(".promo-subtitle");
        if (subtitleEl) subtitleEl.textContent = subtitle || "";
      }
    },

    updateButton() {
      const text = this.get("promoButtonText");
      const url = this.get("promoButtonUrl");
      const el = this.view?.el;
      if (!el) return;
      let btn = el.querySelector(".promo-btn");
      if (!btn && typeof document !== "undefined") {
        btn = document.createElement("a");
        btn.className = "promo-btn";
        btn.style.cssText = "display:inline-block;padding:12px 30px;background:white;color:#ff6b6b;border-radius:30px;font-weight:bold;text-decoration:none;";
        const wrapper = el.querySelector(".promo-countdown-wrapper");
        if (wrapper) wrapper.appendChild(btn);
      }
      if (btn) {
        btn.textContent = text || "En profiter";
        btn.href = url || "#";
      }
    },
  },
};
