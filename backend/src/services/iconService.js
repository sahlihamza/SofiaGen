const CustomIcon = require("../models/CustomIcon");

const escapeRegExp = (value) => {
  if (typeof value !== "string") return String(value);
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const limitLength = (value, max = 100) => {
  if (typeof value !== "string") return String(value);
  return value.slice(0, max);
};

const iconService = {
  async listIcons({ storeId, search, tags, favoritesOnly, page = 1, limit = 50 }) {
    const query = { storeId };

    if (search) {
      const safeSearch = escapeRegExp(limitLength(search, 100));
      query.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { tags: { $in: [new RegExp(safeSearch, "i")] } },
      ];
    }

    if (tags && tags.length > 0) {
      const safeTags = tags.map((t) => escapeRegExp(limitLength(t, 100)));
      query.tags = { $in: safeTags.map((t) => new RegExp(t, "i")) };
    }

    if (favoritesOnly) {
      query.isFavorite = true;
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      CustomIcon.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      CustomIcon.countDocuments(query),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getIcon(storeId, name) {
    return CustomIcon.findOne({ storeId, name }).lean();
  },

  async createIcon({ storeId, name, svgContent, filename, mimeType, size, tags, uploadedBy }) {
    const normalizedName = name.toLowerCase().replace(/[^a-z0-9-_]+/g, "-");
    const existing = await CustomIcon.findOne({ storeId, name: normalizedName });
    if (existing) {
      const err = new Error(`Icon "${normalizedName}" already exists`);
      err.statusCode = 409;
      throw err;
    }

    const doc = await CustomIcon.create({
      storeId,
      name: normalizedName,
      filename: filename || `${normalizedName}.svg`,
      mimeType: mimeType || "image/svg+xml",
      size: size || Buffer.byteLength(svgContent, "utf8"),
      svgContent,
      tags: tags || [normalizedName.split("-")[0]],
      uploadedBy,
    });

    return doc.toObject();
  },

  async batchCreateIcons({ storeId, icons, uploadedBy }) {
    const results = [];
    const errors = [];

    for (const icon of icons) {
      try {
        const created = await this.createIcon({
          storeId,
          name: icon.name,
          svgContent: icon.svgContent,
          filename: icon.filename,
          mimeType: icon.mimeType,
          size: icon.size,
          tags: icon.tags,
          uploadedBy,
        });
        results.push(created);
      } catch (err) {
        if (err.statusCode === 409) {
          errors.push({ name: icon.name, error: "already_exists" });
        } else {
          errors.push({ name: icon.name, error: err.message });
        }
      }
    }

    return { created: results, errors };
  },

  async toggleFavorite(storeId, name) {
    const icon = await CustomIcon.findOne({ storeId, name });
    if (!icon) {
      const err = new Error("Icon not found");
      err.statusCode = 404;
      throw err;
    }
    icon.isFavorite = !icon.isFavorite;
    await icon.save();
    return icon.toObject();
  },

  async deleteIcon(storeId, name) {
    const result = await CustomIcon.findOneAndDelete({ storeId, name });
    if (!result) {
      const err = new Error("Icon not found");
      err.statusCode = 404;
      throw err;
    }
    return result.toObject();
  },

  async deleteManyIcons(storeId, names) {
    const result = await CustomIcon.deleteMany({ storeId, name: { $in: names } });
    return { deletedCount: result.deletedCount };
  },
};

module.exports = iconService;
