const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const multer = require("multer");
const path = require("path");

const { IMAGES_ROOT, uploadDir, publicPath } = require("../utils/uploadPaths");

const router = express.Router();

// through the "/static" static middleware.
const DEFAULT_FOLDER = IMAGES_ROOT;

// Friendly aliases so short names map to consistent directories.
const FOLDER_ALIASES = {
  product: "Productimages",
  products: "Productimages",
  staff: "staffImages",
  admin: "staffImages",
  category: "categoryImages",
  coupon: "couponImages",
  customer: "customerImages",
  branding: "brandingImages",
  brand: "brandImages",
  rider: "riderImages",
  riders: "riderImages",
  post: "postImages",
  posts: "postImages",
};

// Keep only safe characters so the folder can never escape public/ (no "..", no
// slashes). Falls back to the default folder when nothing usable remains.
const sanitizeFolder = (name) =>
  String(name || "")
    .replace(/[^a-z0-9_-]/gi, "")
    .slice(0, 40);

const resolveFolder = (folder) => {
  if (!folder) return DEFAULT_FOLDER;
  const mapped = FOLDER_ALIASES[folder] || folder;
  return sanitizeFolder(mapped) || DEFAULT_FOLDER;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // NOTE: clients must append the "folder" field BEFORE the file so it is
    // parsed and available on req.body here.
    const folder = resolveFolder(req.body.folder);
    cb(null, uploadDir(folder));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${base}-${unique}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (/^image\//.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// Review media (images or short videos) get their own multer instance so the
// shared image-only 5 MB pipeline above stays untouched for other modules.
const reviewMediaStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir("reviewImages")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${base}-${unique}${ext}`);
  },
});

const reviewMediaFilter = (req, file, cb) => {
  if (/^(image|video)\//.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image or video files are allowed!"));
  }
};

const reviewUpload = multer({
  storage: reviewMediaStorage,
  fileFilter: reviewMediaFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB (short videos)
});

const buildUrl = (req, folder, filename) =>
  `${req.protocol}://${req.get("host")}/static/${publicPath(folder, filename)}`;

// upload a single image -> { url }
router.post("/", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: "No file uploaded!" });
  }
  const folder = resolveFolder(req.body.folder);
  res.send({
    message: "Image uploaded successfully!",
    url: buildUrl(req, folder, req.file.filename),
  });
});

// upload multiple images -> { urls: [] }
router.post("/multiple", upload.array("images", 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).send({ message: "No files uploaded!" });
  }
  const folder = resolveFolder(req.body.folder);
  res.send({
    message: "Images uploaded successfully!",
    urls: req.files.map((file) => buildUrl(req, folder, file.filename)),
  });
});

// upload review media (images/videos) -> { media: [{ url, path, type }] }
// `path` is the relative form ("reviewImages/<file>") that gets persisted in
// the DB so media stay valid across environments; `url` is for immediate
// browser preview only.
router.post("/review-media", reviewUpload.array("media", 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).send({ message: "No files uploaded!" });
  }
  res.send({
    message: "Media uploaded successfully!",
    media: req.files.map((file) => ({
      url: buildUrl(req, "reviewImages", file.filename),
      path: publicPath("reviewImages", file.filename),
      type: /^video\//.test(file.mimetype) ? "video" : "image",
    })),
  });
});

module.exports = router;
