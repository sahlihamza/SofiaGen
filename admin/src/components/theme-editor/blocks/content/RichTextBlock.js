/**
 * Rich Text Block - Flexible text content with formatting options
 * GrapesJS custom block for content sections
 */

export const RichTextBlock = {
  id: "rich-text-block",
  label: "= Rich Text",
  category: "Basic",
  content: {
    type: "rich-text-component",
  },
  attributes: {
    class: "fa fa-file-text",
  },
};

/**
 * Rich Text Component
 */
export const RichTextBlockComponent = {
  isComponent: (el) => {
    return el.classList && el.classList.contains("rich-text-component");
  },

  model: {
    defaults: {
      type: "rich-text-component",
      draggable: true,
      droppable: false,
      attributes: {
        class: "rich-text-component",
      },
      styles: `
        .rich-text-component {
          padding: 40px 20px;
          max-width: 800px;
          margin: 0 auto;
        }

        .rich-text-content h2 {
          font-family: var(--ts-font-heading, 'Inter', sans-serif);
          font-size: 28px;
          margin-bottom: 20px;
          font-weight: bold;
          color: var(--ts-color-text-primary, #333);
        }

        .rich-text-content h3 {
          font-family: var(--ts-font-heading, 'Inter', sans-serif);
          font-size: 22px;
          margin-top: 25px;
          margin-bottom: 15px;
          font-weight: 600;
          color: var(--ts-color-text-primary, #333);
        }

        .rich-text-content p {
          font-family: var(--ts-font-body, 'Inter', sans-serif);
          font-size: 16px;
          line-height: var(--ts-line-height, 1.8);
          color: var(--ts-color-text-secondary, #666);
          margin-bottom: 20px;
        }

        .rich-text-content ul,
        .rich-text-content ol {
          margin: 20px 0;
          padding-left: 30px;
          font-size: 16px;
          line-height: var(--ts-line-height, 1.8);
          color: var(--ts-color-text-secondary, #666);
        }

        .rich-text-content li {
          margin-bottom: 10px;
        }

        .rich-text-content a {
          color: var(--ts-color-link, #667eea);
          text-decoration: none;
          transition: color var(--ts-anim-speed, 0.3s) var(--ts-anim-easing, ease);
        }

        .rich-text-content a:hover {
          opacity: 0.8;
          text-decoration: underline;
        }

        .rich-text-content strong {
          font-weight: 600;
          color: var(--ts-color-text-primary, #333);
        }

        .rich-text-content em {
          font-style: italic;
          color: var(--ts-color-text-secondary, #666);
        }

        .rich-text-content blockquote {
          border-left: 4px solid var(--ts-color-primary, #667eea);
          padding-left: 20px;
          margin: 20px 0;
          color: var(--ts-color-text-secondary, #666);
          font-style: italic;
        }
      `,
      content: `
        <div class="rich-text-content">
          <h2>Titre de la section</h2>
          <p>
            Ceci est un bloc de texte enrichi o vous pouvez ajouter des paragraphes, des liens et du contenu formaté.
            Vous avez un contrôle total sur le style et la mise en page.
          </p>
           
          <h3>Fonctionnalités clés</h3>
          <ul>
            <li>Facile  modifier et personnaliser</li>
            <li>Prend en charge plusieurs formats de texte</li>
            <li>Conception responsive</li>
            <li>Optimisé pour le référencement</li>
          </ul>
           
          <p>
            Vous pouvez continuer  ajouter du contenu au besoin. Ajoutez du <strong>texte en gras</strong>, 
            <em>texte en italique</em>, ou des <a href="#">liens</a> pour rendre votre contenu attractif.
          </p>
           
          <blockquote>
             Ceci est une citation. Utilisez-la pour mettre en avant des témoignages ou des citations importantes. 
          </blockquote>
        </div>
      `,
      traits: [
        {
          name: "maxWidth",
          label: "Max Width (px)",
          type: "number",
          default: 800,
          changeProp: 1,
          section: "Style",
        },
        {
          name: "textColor",
          label: "Text Color",
          type: "color",
          default: "#333",
          changeProp: 1,
          section: "Couleurs",
        },
        {
          name: "fontSize",
          label: "Base Font Size (px)",
          type: "number",
          default: 16,
          changeProp: 1,
          section: "Typographie",
        },
        {
          name: "textAlign",
          label: "Text Alignment",
          type: "select",
          default: "left",
          options: [
            { id: "left", label: "Left" },
            { id: "center", label: "Center" },
            { id: "right", label: "Right" },
            { id: "justify", label: "Justify" },
          ],
          changeProp: 1,
          section: "Style",
        },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:maxWidth", this.updateMaxWidth);
      this.on("change:textColor", this.updateTextColor);
      this.on("change:fontSize", this.updateFontSize);
      this.on("change:textAlign", this.updateTextAlign);
    },

    updateMaxWidth() {
      const width = this.get("maxWidth");
      this.view.el.style.maxWidth = `${width}px`;
    },

    updateTextColor() {
      const color = this.get("textColor");
      this.view.el.style.color = color;
    },

    updateFontSize() {
      const size = this.get("fontSize");
      this.view.el.style.fontSize = `${size}px`;
    },

    updateTextAlign() {
      const align = this.get("textAlign");
      this.view.el.style.textAlign = align;
    },
  },

  view: {
    init() {
      this.listenTo(this.model, "change:maxWidth", this.updateMaxWidth);
      this.listenTo(this.model, "change:textColor", this.updateTextColor);
      this.listenTo(this.model, "change:fontSize", this.updateFontSize);
      this.listenTo(this.model, "change:textAlign", this.updateTextAlign);
    },

    updateMaxWidth() {
      const width = this.model.get("maxWidth");
      this.el.style.maxWidth = `${width}px`;
    },

    updateTextColor() {
      const color = this.model.get("textColor");
      this.el.style.color = color;
    },

    updateFontSize() {
      const size = this.model.get("fontSize");
      this.el.style.fontSize = `${size}px`;
    },

    updateTextAlign() {
      const align = this.model.get("textAlign");
      this.el.style.textAlign = align;
    },
  },
};

