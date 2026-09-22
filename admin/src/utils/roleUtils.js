const toRoleArray = (roleValue) => {
  if (Array.isArray(roleValue)) {
    return roleValue.filter(Boolean);
  }

  return roleValue ? [roleValue] : [];
};

const resolveRoleIds = (roleValue, availableRoles = []) => {
  return toRoleArray(roleValue)
    .map((item) => {
      if (typeof item === "string") {
        const matchedRole = availableRoles.find(
          (roleOption) => roleOption._id === item || roleOption.name === item
        );

        return matchedRole?._id || item;
      }

      const matchedRole = availableRoles.find(
        (roleOption) => roleOption._id === item?._id || roleOption.name === item?.name
      );

      return matchedRole?._id || item?._id || item?.name;
    })
    .filter(Boolean);
};

const resolveRoleName = (roleItem, availableRoles = []) => {
  if (typeof roleItem === "string") {
    const matchedRole = availableRoles.find(
      (roleOption) => roleOption._id === roleItem || roleOption.name === roleItem
    );

    return matchedRole?.name || roleItem;
  }

  if (roleItem?._id) {
    const matchedRole = availableRoles.find(
      (roleOption) => roleOption._id === roleItem._id || roleOption.name === roleItem.name
    );

    return matchedRole?.name || roleItem.name || roleItem._id;
  }

  return roleItem?.name || "";
};

const resolveRoleNames = (roleValue, availableRoles = []) => {
  return toRoleArray(roleValue)
    .map((item) => resolveRoleName(item, availableRoles))
    .filter(Boolean);
};

export { toRoleArray, resolveRoleIds, resolveRoleName, resolveRoleNames };