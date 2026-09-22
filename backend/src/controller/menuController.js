const Menu = require("../models/Menu");
const { hasStoreAccess } = require("../middleware/auth");

// SO-10: this file used to end with `module.exports = menuController` right
// after a block of five stub 501 handlers, then kept defining the real
// implementations below via `exports.x = ...`. Since `module.exports` had
// already been reassigned to a new object, `exports` no longer pointed at
// it  every real handler here was dead code, and every menu route actually
// served "Not implemented". Removing that stub/reassignment is what makes
// the real implementations (and the access checks below) reachable at all.

const assertStoreAccess = async (req, storeId) => {
  if (req.user?.isSuperAdmin) return;
  const granted = await hasStoreAccess(req.user, storeId);
  if (!granted) {
    throw { status: 403, error: "Accès refusé  ce store" };
  }
};

exports.createMenu = async (req, res) => {
  try {
    const { storeId, name, location, items, isActive } = req.body;
    if (!storeId) return res.status(400).json({ error: "storeId is required" });

    // SO-10: a menu's storeId is chosen by the caller (there's no other
    // resource to derive it from at create time), so it must be verified
    // against real membership before anything is written  never trusted
    // outright the way it was before.
    await assertStoreAccess(req, storeId);

    const menu = new Menu({
      storeId,
      name,
      location,
      items: items || [],
      isActive: isActive !== undefined ? isActive : true,
      updatedBy: req.user?.id,
    });
    await menu.save();
    res.status(201).json(menu);
  } catch (err) {
    if (err?.status) return res.status(err.status).json(err);
    res.status(500).json({ error: err.message });
  }
};

exports.getMenusByStore = async (req, res) => {
  try {
    // This is the storefront's own public read (menuRoutes.js mounts it with
    // no auth)  a visitor needs a store's menu to render its nav before
    // ever logging in. Scoping by :storeId is the whole check here, same as
    // a public product listing; it is not the back-office view.
    const { storeId } = req.params;
    const { location } = req.query;
    const filter = { storeId };
    if (location) filter.location = location;

    const menus = await Menu.find(filter).sort({ createdAt: -1 });
    res.json(menus);
  } catch (err) {
    if (err?.status) return res.status(err.status).json(err);
    res.status(500).json({ error: err.message });
  }
};

exports.getMenuById = async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id);
    if (!menu) return res.status(404).json({ error: "Menu not found" });

    await assertStoreAccess(req, menu.storeId);

    res.json(menu);
  } catch (err) {
    if (err?.status) return res.status(err.status).json(err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateMenu = async (req, res) => {
  try {
    // SO-10: access must be checked BEFORE the write, not after  the old
    // code ran findByIdAndUpdate first and only rejected the response
    // afterwards, by which point the update had already been persisted.
    const existing = await Menu.findById(req.params.id).select("storeId");
    if (!existing) return res.status(404).json({ error: "Menu not found" });

    await assertStoreAccess(req, existing.storeId);

    const { name, location, items, isActive } = req.body;
    const menu = await Menu.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          name,
          location,
          items,
          isActive,
          updatedBy: req.user?.id,
        },
      },
      { new: true }
    );

    res.json(menu);
  } catch (err) {
    if (err?.status) return res.status(err.status).json(err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteMenu = async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id);
    if (!menu) return res.status(404).json({ error: "Menu not found" });

    await assertStoreAccess(req, menu.storeId);

    await Menu.findByIdAndDelete(req.params.id);
    res.json({ message: "Menu deleted successfully" });
  } catch (err) {
    if (err?.status) return res.status(err.status).json(err);
    res.status(500).json({ error: err.message });
  }
};

exports.duplicateMenu = async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id);
    if (!menu) return res.status(404).json({ error: "Menu not found" });

    // SO-10: this had no access check at all  any authenticated user could
    // duplicate any other store's menu.
    await assertStoreAccess(req, menu.storeId);

    const newMenu = new Menu({
      storeId: menu.storeId,
      name: `${menu.name} (copy)`,
      location: menu.location,
      items: menu.items,
      isActive: false,
      updatedBy: req.user?.id,
    });
    await newMenu.save();
    res.status(201).json(newMenu);
  } catch (err) {
    if (err?.status) return res.status(err.status).json(err);
    res.status(500).json({ error: err.message });
  }
};
