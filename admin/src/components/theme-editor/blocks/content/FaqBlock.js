/**
 * FAQ Block
 */

import { colorTraits, borderTraits, typographyTraits } from "../../traits/utils/commonStyleTraits";
import { applyColorStyle, applyBorderStyle, applyTypographyStyle } from "../../traits/utils/applyCommonStyles";
import { bindItemListSync } from "../../traits/utils/repeater";
import { attachPlaceholderContentListener } from "../../traits/utils/placeholder";

export const FaqBlock = {
  id: "faq-block",
  label: "S FAQ",
  category: "Sections",
  content: {
    type: "faq-component",
  },
  attributes: { class: "fa fa-question-circle" },
};

export const FaqComponent = {
  isComponent: (el) => el.classList && el.classList.contains("faq-section"),
  model: {
    defaults: {
      type: "faq-component",
      tagName: "section",
      attributes: { class: "faq-section", "data-placeholder-content": "true" },
      styles: `
        .faq-section {
          padding: 80px 20px;
          background-color: #fff;
        }
        .faq-container {
          max-width: 800px;
          margin: 0 auto;
        }
        .faq-header {
          text-align: center;
          margin-bottom: 50px;
        }
        .faq-title {
          font-size: 32px;
          color: #333;
          margin: 0 0 15px 0;
        }
        .faq-item {
          margin-bottom: 15px;
          border: 1px solid var(--faq-border-color, #eee);
          border-radius: var(--faq-border-radius, 8px);
          overflow: hidden;
        }
        .faq-question {
          width: 100%;
          text-align: left;
          background: var(--faq-question-bg, #fafafa);
          padding: 20px;
          font-size: var(--faq-question-font-size, 18px);
          font-weight: var(--faq-question-font-weight, 600);
          color: var(--faq-question-color, #333);
          border: none;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .faq-answer {
          padding: 20px;
          color: var(--faq-answer-color, #666);
          font-size: 16px;
          line-height: 1.6;
          display: none;
          border-top: 1px solid var(--faq-border-color, #eee);
          background: var(--faq-answer-bg, #fff);
        }
        .faq-item.open .faq-answer {
          display: block;
        }
      `,
      traits: [
        {
          name: "items",
          label: "Questions",
          type: "item-list",
          changeProp: 1,
          itemSchema: [
            { key: "question", label: "Question", type: "text" },
            { key: "answer", label: "Réponse", type: "textarea" },
          ],
          default: [
            { question: "Quels sont les délais de livraison ?", answer: "La plupart des commandes sont expédiés sous 24  48h ouvrés. La livraison standard arrive en 2  5 jours selon votre localisation." },
            { question: "Puis-je retourner un article ?", answer: "Oui, vous pouvez retourner un article dans les 30 jours suivant la réception,  condition qu'il soit dans son état d'origine." },
            { question: "Comment suivre ma commande ?", answer: "Un email de confirmation contenant un lien de suivi vous est envoyé dés l'expédition de votre colis." },
          ],
          category: "content",
          section: "Contenu",
        },
        ...colorTraits({ prefix: "faq", fields: ["questionBackground", "questionText", "answerBackground", "answerText"], defaults: { questionBackground: "#fafafa", questionText: "#333", answerBackground: "#fff", answerText: "#666" }, section: "Couleurs" }),
        ...borderTraits({ prefix: "faq", defaults: { color: "#eee", width: 1, style: "solid", radius: 8 }, section: "Bordure" }),
        ...typographyTraits({ prefix: "faqQuestion", defaults: { size: 18, weight: "600", transform: "none" }, section: "Typographie" }),
      ],
      components: [
        {
          tagName: "div",
          attributes: { class: "faq-container", selectable: false, hoverable: false, editable: false },
          components: [
            {
              tagName: "div",
              attributes: { class: "faq-header", selectable: false, hoverable: false, editable: false },
              components: [
                { tagName: "h2", attributes: { class: "faq-title" }, content: "Foire aux questions", selectable: false, hoverable: false, editable: false }
              ]
            },
            {
              tagName: "div",
              attributes: { class: "faq-items", selectable: false, hoverable: false, editable: false },
              components: []
            }
          ]
        }
      ]
    }
    ,

    buildIfFresh() {
      if (this.components().length === 0) this.syncItems && this.syncItems();
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:items", this.syncItems);
      this.on("updated", this.bindPreview);
      this.on("change:faqQuestionBackgroundColor change:faqQuestionTextColor change:faqAnswerBackgroundColor change:faqAnswerTextColor change:faqBorderColor change:faqBorderWidth change:faqBorderStyle change:faqBorderRadius change:faqQuestionFontSize change:faqQuestionFontWeight change:faqQuestionTextTransform", this.updateFaqStyles);
      attachPlaceholderContentListener(this, ["change:items"]);
      this.buildIfFresh();
      this.once("added", () => this.buildIfFresh());

      try {
        const itemToComponentDef = (it, i) => ({
          tagName: "div",
          attributes: { class: "faq-item" + (i === 0 ? " open" : "") },
          droppable: false,
          components: [
            { tagName: "button", attributes: { class: "faq-question", type: "button" }, content: it.question || `Question ${i + 1}` },
            { tagName: "div", attributes: { class: "faq-answer" }, content: it.answer || "", droppable: true },
          ],
        });

        bindItemListSync && bindItemListSync(this, "items", ".faq-items", itemToComponentDef);
      } catch (e) {}

      if (typeof document !== "undefined") {
        this._faqClickHandler = (e) => {
          const btn = e.target.closest(".faq-question");
          if (!btn) return;
          const item = btn.closest(".faq-item");
          if (item) item.classList.toggle("open");
        };
        document.addEventListener("click", this._faqClickHandler);
      }
    },

    onRemove() {
      if (typeof document !== "undefined" && this._faqClickHandler) {
        document.removeEventListener("click", this._faqClickHandler);
        this._faqClickHandler = null;
      }
    },

    parseItems() {
      let items = this.get("items") || [];
      try {
        if (typeof items === "string") items = JSON.parse(items);
      } catch (e) { items = []; }
      return items && items.length ? items : [];
    },

    syncItems() {
      const items = this.parseItems();
      const container = this.components().filter((c) => c.getClasses?.().includes("faq-container"))[0];
      if (!container) return;
      const wrapper = container.components().filter((c) => c.getClasses?.().includes("faq-items"))[0];
      if (!wrapper) return;
      wrapper.components().reset();
      items.forEach((it, i) => {
        const item = wrapper.append({ tagName: "div", attributes: { class: "faq-item" + (i === 0 ? " open" : "") }, droppable: false })[0];
        item.append({ tagName: "button", attributes: { type: "button", class: "faq-question" }, content: `<span>${it.question || `Question ${i + 1}`}</span><span></span>` });
        item.append({ tagName: "div", attributes: { class: "faq-answer", "data-gjs-droppable": "true", "data-gjs-type": "faq-answer" }, content: it.answer || "", droppable: true });
      });
      this.updateFaqStyles();
      this.bindPreview && this.bindPreview();
    },

    bindPreview() {
      const el = this.view?.el;
      if (!el) return;
    },

    updateFaqStyles() {
      const el = this.view?.el;
      if (!el) return;
      applyColorStyle(el, this, { prefix: "faq", selector: ".faq-question", fields: ["questionBackground", "questionText"] });
      applyColorStyle(el, this, { prefix: "faq", selector: ".faq-answer", fields: ["answerBackground", "answerText"] });
      applyBorderStyle(el, this, { prefix: "faq", selector: ".faq-item" });

      // Prefer composite border trait for faq items
      try {
        const b = this.get("faqBorder");
        if (b) {
          const col = b.color ?? this.get("faqBorderColor") ?? "#eee";
          const w = b.width ?? this.get("faqBorderWidth") ?? 1;
          const st = b.style ?? this.get("faqBorderStyle") ?? "solid";
          const r = b.radius ?? this.get("faqBorderRadius") ?? 8;
          el.querySelectorAll('.faq-item').forEach((it) => {
            it.style.borderColor = col;
            it.style.borderWidth = `${w}px`;
            it.style.borderStyle = st;
            it.style.borderRadius = `${r}px`;
          });
        }
      } catch (e) {}
      applyTypographyStyle(el, this, { prefix: "faqQuestion", selector: ".faq-question" });
    },
  },
};
