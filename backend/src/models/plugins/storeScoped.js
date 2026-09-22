const mongoose = require("mongoose");

module.exports = function storeScopedPlugin(schema) {
  if (!schema.paths.storeId) {
    schema.add({
      storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Store",
        required: true,
        index: true,
      },
    });
  }

  const enforceStoreId = schema.options.enforceStoreId !== false;

  if (enforceStoreId) {
    // Takes the query explicitly: an arrow function here would close over the
    // module's `this` (not the Query), so every message read "Query on
    // undefined" and gave no hint which model tripped the guard.
    const guard = (query) => {
      const modelName = query?.model?.modelName || "unknown model";
      const stack = new Error().stack;
      if (process.env.NODE_ENV !== "production") {
        throw new Error(
          `[storeScoped] Query on ${modelName} is missing storeId in filter.\n${stack}`
        );
      }
      console.error(`[storeScoped] Query on ${modelName} is missing storeId in filter.`);
    };

    schema.pre("find", function () {
      const filter = this.getFilter();
      if (filter.storeId !== undefined) return;
      if (filter.$and?.some((c) => c && c.storeId !== undefined)) return;
      guard(this);
    });

    schema.pre("findOne", function () {
      const filter = this.getFilter();
      if (filter.storeId !== undefined) return;
      if (filter._id !== undefined) return;
      if (filter.$and?.some((c) => c && c.storeId !== undefined)) return;
      if (filter.$and?.some((c) => c && c._id !== undefined)) return;
      guard(this);
    });

    schema.pre("findOneAndUpdate", function () {
      const filter = this.getFilter();
      if (filter.storeId !== undefined) return;
      if (filter._id !== undefined) return;
      if (filter.$and?.some((c) => c && c.storeId !== undefined)) return;
      if (filter.$and?.some((c) => c && c._id !== undefined)) return;
      guard(this);
    });

    schema.pre("updateOne", function () {
      const filter = this.getFilter();
      if (filter.storeId !== undefined) return;
      if (filter._id !== undefined) return;
      if (filter.$and?.some((c) => c && c.storeId !== undefined)) return;
      if (filter.$and?.some((c) => c && c._id !== undefined)) return;
      guard(this);
    });

    schema.pre("updateMany", function () {
      const filter = this.getFilter();
      if (filter.storeId !== undefined) return;
      if (filter.$and?.some((c) => c && c.storeId !== undefined)) return;
      guard(this);
    });

    schema.pre("deleteOne", function () {
      const filter = this.getFilter();
      if (filter.storeId !== undefined) return;
      if (filter._id !== undefined) return;
      if (filter.$and?.some((c) => c && c.storeId !== undefined)) return;
      if (filter.$and?.some((c) => c && c._id !== undefined)) return;
      if (Object.keys(filter).length === 0) return;
      guard(this);
    });

    schema.pre("deleteMany", function () {
      const filter = this.getFilter();
      if (filter.storeId !== undefined) return;
      if (filter.$and?.some((c) => c && c.storeId !== undefined)) return;
      if (Object.keys(filter).length === 0) return;
      guard(this);
    });
  }
};
