const mongoose = require("mongoose");

/**
 * FormSubmission  enregistre une soumission de formulaire storefront.
 *
 * On conserve un instantané du schéma de champs (`fields`) au moment de la
 * soumission afin de garder l'historique lisible même si l'admin modifie
 * ensuite la définition du formulaire.
 */
const submissionSchema = new mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", index: true },
    formId: { type: String, required: true, index: true }, // id logique du widget (config.formId)
    formTitle: { type: String, default: "" },
    // Snapshot du schéma tel que reçu (sans donnés sensibles brutes si besoin).
    fields: { type: mongoose.Schema.Types.Mixed, default: [] },
    // Valeurs saisies (objet plat name->value ; fichiers = [{name,url,size,mimetype}]).
    values: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["new", "read", "replied", "archived", "spam"],
      default: "new",
      index: true,
    },
    isSpam: { type: Boolean, default: false },
    // Résultat des actions exécutés (email/webhook/intégrations).
    actionsLog: { type: mongoose.Schema.Types.Mixed, default: {} },
    meta: {
      ip: { type: String, default: "" },
      userAgent: { type: String, default: "" },
      referrer: { type: String, default: "" },
    },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

submissionSchema.index({ storeId: 1, createdAt: -1 });
submissionSchema.index({ formId: 1, createdAt: -1 });

module.exports = mongoose.model("FormSubmission", submissionSchema);
