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

const setupCommonMocks = (storeId, roleId) => {
  const storeIdStr = String(storeId);
  const roleIdStr = String(roleId);

  const userStoreCalls = [];
  const userStoreMock = {
    create: async (data) => {
      userStoreCalls.push(data);
      return data;
    },
    findOne: async () => null,
  };

  const bcryptMock = {
    genSalt: async () => "salt",
    hash: async (pw) => `hashed_${pw}`,
    compare: async () => true,
  };

  const emitMock = { emitEvent: () => {} };

  let savedId = 1;
  function UserCtor(data) {
    const inst = Object.assign({}, data);
    inst._id = new mongoose.Types.ObjectId(String(savedId).padStart(24, "0"));
    savedId++;
    inst.save = async function () {
      return Object.assign({}, inst, { _id: inst._id });
    };
    this._id = inst._id;
    Object.assign(this, inst);
    this.save = inst.save;
    return this;
  }
  UserCtor.find = async () => [];
  UserCtor.findByIdAndUpdate = async () => null;
  UserCtor.updateMany = async () => ({ nModified: 0 });
  UserCtor.findById = async () => null;

  // Mock roleService.resolveStoreRoleId
  const roleServiceMock = {
    resolveStoreRoleId: async (roleRef, sid) => {
      const refs = Array.isArray(roleRef) ? roleRef.filter(Boolean) : [roleRef];
      for (const ref of refs) {
        if (mongoose.Types.ObjectId.isValid(ref) && ref === roleIdStr) {
          return roleId;
        }
        if (ref === "Admin" || ref === "admin") {
          return roleId;
        }
      }
      return null;
    },
    seedDefaultRolesForStore: async () => [],
    _fullAccessRoleNames: () => [],
  };

  const mocks = {
    "bcryptjs": bcryptMock,
    "../models/User": UserCtor,
    "../models/Role": { findOne: async () => null, findById: async () => null },
    "../models/UserStore": userStoreMock,
    "../models/LoginHistory": {},
    "../models/AuditLog": {},
    "../models/Store": {},
    "../lib/eventBus": emitMock,
    "./RoleService": roleServiceMock,
  };

  const originals = {};
  for (const [path, mock] of Object.entries(mocks)) {
    originals[path] = mockModule(path, mock);
  }

  return { originals, userStoreCalls, userStoreMock };
};

const restoreAll = (originals) => {
  for (const [path, orig] of Object.entries(originals)) {
    restoreModule(path, orig);
  }
  delete require.cache[require.resolve("./userService")];
};

test("addStaff resolves roleId by name and sets it on UserStore", async () => {
  const storeId = new mongoose.Types.ObjectId();
  const roleId = new mongoose.Types.ObjectId();

  const { originals, userStoreCalls } = setupCommonMocks(storeId, roleId);

  try {
    const UserService = freshRequire("./userService");
    const userService = new UserService.constructor();

    await userService.addStaff(
      { name: "Test User", email: "test@test.com", password: "pass123", role: "Admin" },
      storeId
    );

    assert.equal(userStoreCalls.length, 1, "UserStore.create should be called once");
    assert.ok(userStoreCalls[0].roleId, "UserStore.roleId should be set");
    assert.equal(String(userStoreCalls[0].roleId), String(roleId), "Should resolve role by name");
    assert.equal(String(userStoreCalls[0].storeId), String(storeId), "UserStore should have correct storeId");
  } finally {
    restoreAll(originals);
  }
});

test("addStaff resolves roleId by slug and sets it on UserStore", async () => {
  const storeId = new mongoose.Types.ObjectId();
  const roleId = new mongoose.Types.ObjectId();

  const { originals, userStoreCalls } = setupCommonMocks(storeId, roleId);

  try {
    const UserService = freshRequire("./userService");
    const userService = new UserService.constructor();

    await userService.addStaff(
      { name: "Test User", email: "test@test.com", password: "pass123", role: "admin" },
      storeId
    );

    assert.equal(userStoreCalls.length, 1, "UserStore.create should be called once");
    assert.ok(userStoreCalls[0].roleId, "UserStore.roleId should be set");
    assert.equal(String(userStoreCalls[0].roleId), String(roleId), "Should resolve role by slug");
  } finally {
    restoreAll(originals);
  }
});

test("addStaff resolves roleId by ObjectId and sets it on UserStore", async () => {
  const storeId = new mongoose.Types.ObjectId();
  const roleId = new mongoose.Types.ObjectId();

  const { originals, userStoreCalls } = setupCommonMocks(storeId, roleId);

  try {
    const UserService = freshRequire("./userService");
    const userService = new UserService.constructor();

    await userService.addStaff(
      { name: "Test User", email: "test@test.com", password: "pass123", role: [String(roleId)] },
      storeId
    );

    assert.equal(userStoreCalls.length, 1, "UserStore.create should be called once");
    assert.ok(userStoreCalls[0].roleId, "UserStore.roleId should be set");
    assert.equal(String(userStoreCalls[0].roleId), String(roleId), "Should resolve role by ObjectId");
  } finally {
    restoreAll(originals);
  }
});

test("addStaff sets UserStore.roleId to null when role not found", async () => {
  const storeId = new mongoose.Types.ObjectId();
  const roleId = new mongoose.Types.ObjectId();

  const { originals, userStoreCalls } = setupCommonMocks(storeId, roleId);

  try {
    const UserService = freshRequire("./userService");
    const userService = new UserService.constructor();

    await userService.addStaff(
      { name: "Test User", email: "test2@test.com", password: "pass123", role: "NonExistent" },
      storeId
    );

    assert.equal(userStoreCalls.length, 1, "UserStore.create should be called once");
    assert.equal(userStoreCalls[0].roleId, null, "UserStore.roleId should be null when role not found");
  } finally {
    restoreAll(originals);
  }
});
