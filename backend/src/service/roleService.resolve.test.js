const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const mockModule = (modulePath, mockExports) => {
  const resolved = require.resolve(modulePath);
  const original = require.cache[resolved]?.exports;
  require.cache[resolved] = { ...require.cache[resolved], exports: mockExports };
  return original;
};

const restoreModule = (modulePath, original) => {
  const resolved = require.resolve(modulePath);
  if (original === undefined) {
    delete require.cache[resolved];
  } else {
    require.cache[resolved].exports = original;
  }
};

const freshRequire = (modulePath) => {
  const resolved = require.resolve(modulePath);
  delete require.cache[resolved];
  return require(modulePath);
};

test("resolveStoreRoleId resolves by ObjectId within the correct store", async () => {
  const storeId = new mongoose.Types.ObjectId();
  const roleId = new mongoose.Types.ObjectId();
  const mockRole = { _id: roleId, name: "Admin", slug: "admin", scope: "store", storeId };

  const origRole = mockModule("../models/Role", {
    findOne: async (filter) => {
      if (filter._id && String(filter._id) === String(roleId) && String(filter.storeId) === String(storeId)) {
        return mockRole;
      }
      return null;
    },
  });

  try {
    const { RoleService } = freshRequire("./RoleService");
    const service = new RoleService();

    const result = await service.resolveStoreRoleId(String(roleId), storeId);
    assert.equal(String(result), String(roleId), "Should return the role's _id");
  } finally {
    restoreModule("../models/Role", origRole);
    delete require.cache[require.resolve("./RoleService")];
  }
});

test("resolveStoreRoleId resolves by role name within the store", async () => {
  const storeId = new mongoose.Types.ObjectId();
  const roleId = new mongoose.Types.ObjectId();
  const mockRole = { _id: roleId, name: "Admin", slug: "admin", scope: "store", storeId };

  const origRole = mockModule("../models/Role", {
    findOne: async (filter) => {
      if (filter.storeId && String(filter.storeId) === String(storeId)) {
        const or = filter.$or || [];
        if (or.some((c) => c.slug === "Admin" || c.name === "Admin")) {
          return mockRole;
        }
      }
      return null;
    },
  });

  try {
    const { RoleService } = freshRequire("./RoleService");
    const service = new RoleService();

    const result = await service.resolveStoreRoleId("Admin", storeId);
    assert.equal(String(result), String(roleId), "Should resolve role by name");
  } finally {
    restoreModule("../models/Role", origRole);
    delete require.cache[require.resolve("./RoleService")];
  }
});

test("resolveStoreRoleId resolves by role slug within the store", async () => {
  const storeId = new mongoose.Types.ObjectId();
  const roleId = new mongoose.Types.ObjectId();
  const mockRole = { _id: roleId, name: "Admin", slug: "admin", scope: "store", storeId };

  const origRole = mockModule("../models/Role", {
    findOne: async (filter) => {
      if (filter.storeId && String(filter.storeId) === String(storeId)) {
        const or = filter.$or || [];
        if (or.some((c) => c.slug === "admin" || c.name === "admin")) {
          return mockRole;
        }
      }
      return null;
    },
  });

  try {
    const { RoleService } = freshRequire("./RoleService");
    const service = new RoleService();

    const result = await service.resolveStoreRoleId("admin", storeId);
    assert.equal(String(result), String(roleId), "Should resolve role by slug");
  } finally {
    restoreModule("../models/Role", origRole);
    delete require.cache[require.resolve("./RoleService")];
  }
});

test("resolveStoreRoleId returns null for invalid role reference", async () => {
  const storeId = new mongoose.Types.ObjectId();

  const origRole = mockModule("../models/Role", {
    findOne: async () => null,
  });

  try {
    const { RoleService } = freshRequire("./RoleService");
    const service = new RoleService();

    const result = await service.resolveStoreRoleId("nonexistent-role", storeId);
    assert.equal(result, null, "Should return null for non-existent role");
  } finally {
    restoreModule("../models/Role", origRole);
    delete require.cache[require.resolve("./RoleService")];
  }
});

test("resolveStoreRoleId returns null when no roleRef provided", async () => {
  const storeId = new mongoose.Types.ObjectId();
  const origRole = mockModule("../models/Role", {
    findOne: async () => null,
  });

  try {
    const { RoleService } = freshRequire("./RoleService");
    const service = new RoleService();

    const result = await service.resolveStoreRoleId(null, storeId);
    assert.equal(result, null, "Should return null when roleRef is null");
  } finally {
    restoreModule("../models/Role", origRole);
    delete require.cache[require.resolve("./RoleService")];
  }
});

test("resolveStoreRoleId does not match role in a different store", async () => {
  const storeId = new mongoose.Types.ObjectId();
  const otherStoreId = new mongoose.Types.ObjectId();

  const origRole = mockModule("../models/Role", {
    findOne: async (filter) => {
      if (filter.storeId && String(filter.storeId) === String(storeId)) {
        return { _id: new mongoose.Types.ObjectId(), storeId, name: "Admin", slug: "admin", scope: "store" };
      }
      return null;
    },
  });

  try {
    const { RoleService } = freshRequire("./RoleService");
    const service = new RoleService();

    const result = await service.resolveStoreRoleId("Admin", otherStoreId);
    assert.equal(result, null, "Should not match role from a different store");
  } finally {
    restoreModule("../models/Role", origRole);
    delete require.cache[require.resolve("./RoleService")];
  }
});
