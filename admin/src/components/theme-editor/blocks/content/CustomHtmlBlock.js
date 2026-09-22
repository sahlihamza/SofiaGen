/**
 * Custom HTML Block - Raw HTML input with role restrictions
 * GrapesJS custom block for advanced users only
 */

export const CustomHtmlBlock = {
  id: "custom-html-block",
  label: "= Custom HTML",
  category: "Advanced",
  content: {
    type: "custom-html-component",
  },
  attributes: {
    class: "fa fa-code",
  },
};

/**
 * Custom HTML Component
 */
export const CustomHtmlBlockComponent = {
  isComponent: (el) => {
    return el.classList && el.classList.contains("custom-html-component");
  },

  model: {
    defaults: {
      type: "custom-html-component",
      draggable: true,
      droppable: false,
      attributes: {
        class: "custom-html-component",
      },
      styles: `
        .custom-html-component {
          padding: 20px;
          border: 2px dashed #ccc;
          border-radius: 4px;
          background-color: #f8f8f8;
          min-height: 100px;
          position: relative;
        }

        .custom-html-component.preview-mode {
          border: none;
          background-color: transparent;
          min-height: auto;
        }

        .custom-html-editor-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          background-color: #ffc107;
          color: #333;
          padding: 4px 8px;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 600;
          z-index: 10;
          pointer-events: none;
        }

        .custom-html-warning {
          background-color: #fff3cd;
          border: 1px solid #ffc107;
          color: #856404;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 15px;
          font-size: 13px;
        }

        .custom-html-warning strong {
          display: block;
          margin-bottom: 5px;
        }
      `,
      content: `
        <div class="custom-html-component">
          <div class="custom-html-editor-badge">HTML EDITOR</div>
          <div class="custom-html-warning">
            <strong> Security Notice:</strong>
            Only use this block if you trust the HTML. XSS attacks are possible.
          </div>
          <div class="custom-html-preview">
            <!-- Custom HTML will be rendered here -->
          </div>
        </div>
      `,
      htmlContent: "",
      allowedRoles: ["admin", "developer"], // Restrict to admin and developer roles
      traits: [
        {
          name: "htmlContent",
          label: "Code HTML",
          type: "textarea",
          default: "<p>Ajoutez votre HTML personnalisé ici</p>",
          changeProp: 1,
          category: "content",
          section: "Contenu",
        },
        {
          name: "allowScripts",
          label: "Autoriser les scripts",
          type: "checkbox",
          default: false,
          changeProp: 1,
          category: "advanced",
          section: "Avancé",
        },
        {
          name: "sanitize",
          label: "Nettoyer le HTML",
          type: "checkbox",
          default: true,
          changeProp: 1,
          category: "advanced",
          section: "Avancé",
        },
      ],
    },

    init() {
      const rootId = this.getId();
      this.addClass(`widget-${rootId}`);
      this.on("change:htmlContent", this.updateHtml);
      this.on("change:allowScripts", this.updateHtml);
      this.on("change:sanitize", this.updateHtml);
    },

    checkRoleAccess() {
      // Get user role from context or localStorage
      const userRole = this.getUserRole();
      const allowedRoles = this.get("allowedRoles") || [];

      if (!allowedRoles.includes(userRole)) {
        console.warn(
          `Custom HTML block is restricted to: ${allowedRoles.join(", ")}`
        );
        this.set("locked", true);
        this.set("traits", []);
      }
    },

    getUserRole() {
      // Get role from context or localStorage
      // This should be integrated with your auth system
      if (typeof document === "undefined") return "user";
      try {
        const authData = localStorage.getItem("auth");
        if (authData) {
          const parsed = JSON.parse(authData);
          return parsed.role || "user";
        }
      } catch (e) {
        console.error("Error getting user role:", e);
      }
      return "user";
    },

    updateHtml() {
      if (!this.view) return;

      let html = this.get("htmlContent") || "";
      const allowScripts = this.get("allowScripts");
      const sanitize = this.get("sanitize");

      // Sanitize if enabled
      if (sanitize) {
        html = this.sanitizeHtml(html);
      }

      // Remove script tags if not allowed
      if (!allowScripts) {
        html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
      }

      const preview = this.view.el.querySelector(".custom-html-preview");
      if (preview) {
        preview.innerHTML = html;
      }
    },

    sanitizeHtml(html) {
      // Basic HTML sanitization
      // For production, use a library like DOMPurify
      if (typeof document === "undefined") return html;
      const tempDiv = document.createElement("div");
      tempDiv.textContent = html;
      let sanitized = tempDiv.innerHTML;

      // Remove dangerous attributes
      const dangerousAttrs = [
        "onload",
        "onerror",
        "onclick",
        "onmouseover",
        "onmouseout",
        "onkeydown",
        "onkeyup",
      ];
      dangerousAttrs.forEach((attr) => {
        const regex = new RegExp(`\\s*${attr}\\s*=\\s*["\'][^"\']*["\']`, "gi");
        sanitized = sanitized.replace(regex, "");
      });

      return sanitized;
    },
  },

  view: {
    init() {
      this.listenTo(this.model, "change:htmlContent", this.updateHtml);
      this.listenTo(this.model, "change:allowScripts", this.updateHtml);
      this.listenTo(this.model, "change:sanitize", this.updateHtml);
    },

    updateHtml() {
      const htmlContent = this.model.get("htmlContent") || "";
      const allowScripts = this.model.get("allowScripts");
      const sanitize = this.model.get("sanitize");

      let html = htmlContent;

      // Sanitize if enabled
      if (sanitize) {
        html = this.sanitizeHtml(html);
      }

      // Remove scripts if not allowed
      if (!allowScripts) {
        html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
      }

      const preview = this.el.querySelector(".custom-html-preview");
      if (preview) {
        preview.innerHTML = html;
      }
    },

    sanitizeHtml(html) {
      if (typeof document === "undefined") return html;
      const tempDiv = document.createElement("div");
      tempDiv.textContent = html;
      let sanitized = tempDiv.innerHTML;

      const dangerousAttrs = [
        "onload",
        "onerror",
        "onclick",
        "onmouseover",
        "onmouseout",
        "onkeydown",
        "onkeyup",
      ];
      dangerousAttrs.forEach((attr) => {
        const regex = new RegExp(`\\s*${attr}\\s*=\\s*["\'][^"\']*["\']`, "gi");
        sanitized = sanitized.replace(regex, "");
      });

      return sanitized;
    },
  },
};

