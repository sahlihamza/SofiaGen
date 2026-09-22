const { Schema, model, Types } = require("mongoose");

/**
 * SavedBlock  un composant que le marchand a sauvegardé depuis le canvas
 * pour le réutiliser ailleurs (Elementor "Global Widgets" / Webflow
 * "Symbols"). Scopé par storeId  chaque boutique a sa propre
 * bibliothèque de blocs, jamais partagé entre stores.
 *
 * componentJson est le résultat brut de `component.toJSON()` GrapesJS 
 * rejoué tel quel via `bm.add(id, { content: componentJson })` pour
 * recrér le composant au moment du drag & drop.
 */
const SavedBlockSchema = new Schema(
  {
    storeId: { type: Types.ObjectId, ref: "Store", required: true, index: true },

    name: { type: String, required: true, trim: true },
    category: { type: String, default: "P Mes Blocs" },

    componentJson: { type: Schema.Types.Mixed, required: true },

    // Aperçu simple (facultatif)  miniature future, non bloquant pour v1
    thumbnail: { type: String, default: "" },

    isSynced: { type: Boolean, default: false },
    isGlobalComponent: { type: Boolean, default: false },

    createdBy: { type: Types.ObjectId, ref: "User", default: null },
    favoritedBy: { type: [Types.ObjectId], ref: "User", default: [] },
  },
  { timestamps: true }
);

SavedBlockSchema.index({ storeId: 1, createdAt: -1 });

module.exports = model("SavedBlock", SavedBlockSchema);
