const express = require('express');
const router = express.Router();

const globalSectionController = {
  getGlobalSection: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
  updateGlobalSection: (req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
};

module.exports = globalSectionController;
const GlobalSection = require("../models/GlobalSection");
const Theme = require("../models/Theme");

const VALID_TYPES = ["header", "footer", "announcement_bar"];
const DEFAULT_PROJECT_DATA = {
  header: null,
  footer: null,
  announcement_bar: null,
};

const getGlobalSection = async (req, res) => {
  try {
    const { storeId, type } = req.params;

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: "Invalid section type" });
    }

    const theme = await Theme.findOne({ storeId, isActive: true });
    if (!theme) {
      return res.status(404).json({ error: "No active theme for this store" });
    }

    let section = await GlobalSection.findOne({ storeId, themeId: theme._id, type });

    if (!section) {
      section = await GlobalSection.create({
        storeId,
        themeId: theme._id,
        type,
        projectData: DEFAULT_PROJECT_DATA[type],
        compiledHtml: "",
        compiledCss: "",
      });
    }

    return res.json(section);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const updateGlobalSection = async (req, res) => {
  try {
    const { storeId, type } = req.params;
    const { projectData, compiledHtml, compiledCss } = req.body;

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: "Invalid section type" });
    }

    const theme = await Theme.findOne({ storeId, isActive: true });
    if (!theme) {
      return res.status(404).json({ error: "No active theme for this store" });
    }

    const section = await GlobalSection.findOneAndUpdate(
      { storeId, themeId: theme._id, type },
      {
        $set: {
          projectData,
          compiledHtml,
          compiledCss,
          updatedBy: req.user?.id || req.user?._id || null,
        },
      },
      { new: true, upsert: true }
    );

    return res.json(section);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getGlobalSection,
  updateGlobalSection,
};
