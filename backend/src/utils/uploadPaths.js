const path = require("path");
const fs = require("fs");

const IMAGES_ROOT = "images";

const imagesRoot = () => path.join(process.cwd(), "public", IMAGES_ROOT);
const uploadDir = (folder) => {
  const dir =
    !folder || folder === IMAGES_ROOT
      ? imagesRoot()
      : path.join(imagesRoot(), folder);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};


const publicPath = (folder, filename) =>
  !folder || folder === IMAGES_ROOT
    ? `${IMAGES_ROOT}/${filename}`
    : `${IMAGES_ROOT}/${folder}/${filename}`;

module.exports = { IMAGES_ROOT, imagesRoot, uploadDir, publicPath };
