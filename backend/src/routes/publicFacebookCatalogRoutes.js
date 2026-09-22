const express = require("express");
const router = express.Router();
const {
  getPublicFeed,
  getPublicFeedInfo,
} = require("../controller/facebookCatalogController");

router.get("/:slug/info", getPublicFeedInfo);
router.get("/:slug/feed.xml", getPublicFeed);

module.exports = router;