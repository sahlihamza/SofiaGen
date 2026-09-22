const UserStore = require("../models/UserStore");
const GeneralSettings = require("../models/GeneralSettings");

const getMyContext = async (req, res) => {
  try {
    const userId = req.user._id;

    const memberships = await UserStore.find({
      userId,
      status: "active",
    })
      .populate("storeId", "name slug")
      .populate("roleId", "name slug scope")
      .lean();

    const availableStores = memberships
      .filter((m) => m.storeId)
      .map((m) => ({
        id: m.storeId._id.toString(),
        name: m.storeId.name,
        slug: m.storeId.slug,
      }));

    const currentStoreId = req.user.currentStoreId;
    let currentStore = null;
    let role = null;

    if (currentStoreId) {
      const currentMembership = memberships.find(
        (m) => String(m.storeId?._id) === String(currentStoreId)
      );
      if (currentMembership) {
        const currentSettings = await GeneralSettings.findOne({
          storeId: currentStoreId,
        }).populate("currencyId");

        currentStore = {
          id: currentMembership.storeId._id.toString(),
          name: currentMembership.storeId.name,
          slug: currentMembership.storeId.slug,
          currency: currentSettings?.currencyId
            ? {
                isoCode: currentSettings.currencyId.isoCode,
                symbol: currentSettings.currencyId.symbol,
                decimalDigits: currentSettings.currencyId.decimalDigits,
                locale: currentSettings.currencyId.locale,
              }
            : null,
        };
        if (currentMembership.roleId) {
          role = {
            id: currentMembership.roleId._id.toString(),
            name: currentMembership.roleId.name,
            slug: currentMembership.roleId.slug,
            scope: currentMembership.roleId.scope,
          };
        }
      }
    }

    if (!role && req.user.role?.length > 0) {
      const firstRole = req.user.role[0];
      if (firstRole) {
        role = {
          id: firstRole._id?.toString() || firstRole,
          name: firstRole.name || firstRole,
          slug: firstRole.slug || "",
          scope: firstRole.scope || "platform",
        };
      }
    }

    const permissions = Array.from(req.authContext.permissions);
    const accessibleModules = req.authContext.accessibleModules || [];

    const platformPermissions = permissions.filter((code) => {
      const perm = req.authContext.permissionByCode.get(code);
      return perm?.scope === "platform";
    });
    const storePermissions = permissions.filter(
      (code) => !platformPermissions.includes(code)
    );

    let userType = req.user.userType;
    if (!userType && req.user.isSuperAdmin) {
      userType = "superadmin";
    }

    const hasStore = availableStores.length > 0;
    const canCreateStore =
      !hasStore || Boolean(req.user.isSuperAdmin) || permissions.includes("platform.store.create");

    res.send({
      userId: userId.toString(),
      isSuperAdmin: Boolean(req.user.isSuperAdmin),
      userType,
      currentStore,
      hasStore,
      canCreateStore,
      stores: availableStores,
      availableStores,
      role,
      permissions,
      platformPermissions,
      storePermissions,
      accessibleModules,
    });
  } catch (err) {
    res.status(500).send({
      success: false,
      message: err.message,
    });
  }
};

module.exports = { getMyContext };
