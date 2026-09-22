const iconService = require("../services/iconService");

const iconController = {
  listIcons: async (req, res) => {
    try {
      const { storeId, search, tags, favoritesOnly, page = 1, limit = 50 } = req.query;
      const result = await iconService.listIcons({
        storeId: req.user?.storeId || storeId,
        search: search || "",
        tags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
        favoritesOnly: favoritesOnly === "true",
        page: Number(page),
        limit: Number(limit),
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  getIcon: async (req, res) => {
    try {
      const { name } = req.params;
      const icon = await iconService.getIcon(req.user?.storeId, name);
      if (!icon) {
        res.status(404).json({ message: "Icon not found" });
        return;
      }
      res.json(icon);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  createIcon: async (req, res) => {
    try {
      const { name, svgContent, filename, mimeType, size, tags } = req.body;
      const icon = await iconService.createIcon({
        storeId: req.user?.storeId,
        name,
        svgContent,
        filename,
        mimeType,
        size,
        tags,
        uploadedBy: req.user?._id,
      });
      res.status(201).json(icon);
    } catch (err) {
      res.status(err.statusCode || 500).json({ message: err.message });
    }
  },

  batchCreateIcons: async (req, res) => {
    try {
      const { icons } = req.body;
      const result = await iconService.batchCreateIcons({
        storeId: req.user?.storeId,
        icons,
        uploadedBy: req.user?._id,
      });
      res.status(201).json(result);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  toggleFavorite: async (req, res) => {
    try {
      const { name } = req.params;
      const icon = await iconService.toggleFavorite(req.user?.storeId, name);
      res.json(icon);
    } catch (err) {
      res.status(err.statusCode || 500).json({ message: err.message });
    }
  },

  deleteIcon: async (req, res) => {
    try {
      const { name } = req.params;
      const icon = await iconService.deleteIcon(req.user?.storeId, name);
      res.json(icon);
    } catch (err) {
      res.status(err.statusCode || 500).json({ message: err.message });
    }
  },

  deleteManyIcons: async (req, res) => {
    try {
      const { names } = req.body;
      const result = await iconService.deleteManyIcons(req.user?.storeId, names);
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
};

module.exports = iconController;
