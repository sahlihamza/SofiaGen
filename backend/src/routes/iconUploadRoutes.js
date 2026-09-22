const multer = require("multer");
const AdmZip = require("adm-zip");
const path = require("path");
const { parseSvgString, sanitizeSvg, extractSvgNameFromFilename } = require("../utils/svgParser");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const parseZipHandler = async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "No file uploaded" });
    return;
  }

  try {
    const zip = new AdmZip(req.file.buffer);
    const entries = zip.getEntries();
    const icons = [];
    const errors = [];

    for (const entry of entries) {
      if (entry.entryName.endsWith(".svg") && !entry.isDirectory) {
        try {
          const content = sanitizeSvg(entry.getData().toString("utf8"));
          const parsed = parseSvgString(content);
          if (!parsed) {
            errors.push({ filename: entry.entryName, error: "invalid_svg" });
            continue;
          }
          const name = extractSvgNameFromFilename(path.basename(entry.entryName));
          icons.push({
            name,
            filename: path.basename(entry.entryName),
            svgContent: content,
            tags: [name.split("-")[0]],
            viewBox: parsed.viewBox,
            width: parsed.width,
            height: parsed.height,
          });
        } catch (err) {
          errors.push({ filename: entry.entryName, error: err.message });
        }
      }
    }

    res.json({ icons, errors, total: icons.length });
  } catch (err) {
    res.status(500).json({ message: "Failed to parse ZIP file", error: err.message });
  }
};

const uploadAndParseRouter = (req, res) => {
  const singleUpload = upload.single("iconsZip");
  singleUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: "Upload failed", error: err.message });
    }
    parseZipHandler(req, res);
  });
};

module.exports = uploadAndParseRouter;
