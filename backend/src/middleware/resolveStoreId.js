const express = require('express');

const resolveStoreId = (req, res, next) => {
  const storeId = req.params.storeId || req.body.storeId || req.query.storeId;
  if (!storeId) {
    const isSuperAdmin =
      req.user?.isSuperAdmin ||
      req.user?.userType === 'superadmin' ||
      (req.user?.role &&
        typeof req.user.role === 'object' &&
        req.user.role.name === 'Super Admin');
    if (isSuperAdmin) {
      return next();
    }
    return res.status(400).json({ success: false, message: 'storeId is required' });
  }
  req.storeId = storeId;
  next();
};

module.exports = resolveStoreId;
module.exports = (req, res, next) => {
  const storeId = req.get("company") || req.headers["company"] || null;
  req.storeId = storeId;
  next();
};
