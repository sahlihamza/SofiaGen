const Section = require("../models/Section");
const Page = require("../models/Page");
const { hasStoreAccess } = require("../middleware/auth");

const assertStoreAccess = async (req, storeId) => {
  if (req.user?.isSuperAdmin) return;
  const granted = await hasStoreAccess(req.user, storeId);
  if (!granted) throw { status: 403, message: "Accès refusé  ce store" };
};

// ========== Section Controller ==========

/**
 * Create a new section
 * POST /api/sections
 */
const createSection = async (req, res) => {
  try {
    const { name, type, pageId, componentData, html, css, settings, displayOrder } =
      req.body;

    if (!type || !pageId) {
      return res.status(400).json({
        message: "type and pageId are required",
      });
    }

    // THEME-03: this used to check access against req.body.storeId  a
    // value the caller controls  instead of the target page's real
    // storeId. A store owner could pass their OWN (legitimate) storeId
    // alongside a pageId belonging to a DIFFERENT store: the access check
    // passed, and the section was pushed straight onto the victim page's
    // sections array. storeId is now derived from the page itself, never
    // trusted from the request body.
    const page = await Page.findById(pageId).select("storeId");
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }
    const storeId = page.storeId;

    try {
      await assertStoreAccess(req, storeId);
    } catch (err) {
      return res.status(err.status || 403).json(err);
    }

    const section = new Section({
      name: name || type,
      type,
      pageId,
      storeId,
      componentData,
      html,
      css,
      settings,
      displayOrder: displayOrder || 0,
      createdBy: req.user?.id,
    });

    await section.save();

    // Add section to page
    await Page.findByIdAndUpdate(pageId, {
      $push: { sections: section._id },
    });

    res.status(201).json({
      success: true,
      message: "Section created successfully",
      data: section,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/**
 * Get all sections for a page
 * GET /api/sections?pageId=xxx
 */
const getSectionsForPage = async (req, res) => {
  try {
    const { pageId } = req.query;

    if (!pageId) {
      return res.status(400).json({
        message: "pageId is required",
      });
    }

    const sections = await Section.find({ pageId })
      .sort({ displayOrder: 1 })
      .select("-__v");

    res.status(200).json({
      success: true,
      data: sections,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/**
 * Get section by ID
 * GET /api/sections/:id
 */
const getSectionById = async (req, res) => {
  try {
    const section = await Section.findById(req.params.id)
      .populate("pageId", "title slug")
      .populate("storeId", "name");

    if (!section) {
      return res.status(404).json({
        message: "Section not found",
      });
    }

    res.status(200).json({
      success: true,
      data: section,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/**
 * Update section
 * PUT /api/sections/:id
 */
const updateSection = async (req, res) => {
  try {
    const { name, componentData, html, css, settings, displayOrder, isVisible } = req.body;

    const existing = await Section.findById(req.params.id).select("storeId");
    if (!existing) {
      return res.status(404).json({ message: "Section not found" });
    }
    try {
      await assertStoreAccess(req, existing.storeId);
    } catch (err) {
      return res.status(err.status || 403).json(err);
    }

    const section = await Section.findByIdAndUpdate(
      req.params.id,
      {
        name,
        componentData,
        html,
        css,
        settings,
        displayOrder,
        isVisible,
        updatedBy: req.user?.id,
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Section updated successfully",
      data: section,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/**
 * Delete section
 * DELETE /api/sections/:id
 */
const deleteSection = async (req, res) => {
  try {
    const section = await Section.findById(req.params.id);

    if (!section) {
      return res.status(404).json({
        message: "Section not found",
      });
    }

    try {
      await assertStoreAccess(req, section.storeId);
    } catch (err) {
      return res.status(err.status || 403).json(err);
    }

    // Remove section from page
    await Page.findByIdAndUpdate(section.pageId, {
      $pull: { sections: section._id },
    });

    await Section.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Section deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/**
 * Reorder sections
 * POST /api/sections/reorder
 */
const reorderSections = async (req, res) => {
  try {
    const { sections } = req.body; // Array of { id, displayOrder }

    if (!Array.isArray(sections)) {
      return res.status(400).json({
        message: "sections array is required",
      });
    }

    // Bulk update display order
    const updatePromises = sections.map((section) =>
      Section.findByIdAndUpdate(
        section.id,
        { displayOrder: section.displayOrder },
        { new: true }
      )
    );

    const updatedSections = await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: "Sections reordered successfully",
      data: updatedSections,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  createSection,
  getSectionsForPage,
  getSectionById,
  updateSection,
  deleteSection,
  reorderSections,
};
