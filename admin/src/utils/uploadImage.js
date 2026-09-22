import Pica from "pica";
import requests from "@/services/httpService";

/**
 * Reusable image-upload helpers.
 *
 * Any developer can upload an image with a single call:
 *
 *   import { uploadImage, UPLOAD_FOLDERS } from "@/utils/uploadImage";
 */

// Known destination folders (must match the backend whitelist).
export const UPLOAD_FOLDERS = {
  PRODUCT: "Productimages",
  STAFF: "staffImages",
  CATEGORY: "categoryImages",
  COUPON: "couponImages",
};

const DEFAULT_FOLDER = UPLOAD_FOLDERS.PRODUCT;

const pica = Pica();

// Resize an image file to fixed dimensions before upload (keeps payload small
// and thumbnails consistent). Falls back to the original file on any error.
const resizeImage = async (file, width, height) => {
  try {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const result = await pica.resize(img, canvas, {
      unsharpAmount: 80,
      unsharpRadius: 0.6,
      unsharpThreshold: 2,
    });
    const blob = await pica.toBlob(result, file.type, 0.9);
    URL.revokeObjectURL(img.src);
    return new File([blob], file.name, { type: file.type });
  } catch {
    return file;
  }
};

/**
 * Upload a single image and return its public URL.
 *
 * @param {File} file - the image file to upload
 * @param {Object} [options]
 * @param {string} [options.folder="Productimages"] - destination folder
 * @param {boolean} [options.resize=true] - resize before upload
 * @param {number} [options.width=800]
 * @param {number} [options.height=800]
 * @returns {Promise<string>} the served image URL
 */
export const uploadImage = async (
  file,
  { folder = DEFAULT_FOLDER, resize = true, width = 800, height = 800 } = {}
) => {
  if (!file) throw new Error("No file provided to uploadImage!");

  const payloadFile = resize ? await resizeImage(file, width, height) : file;

  const formData = new FormData();
  // IMPORTANT: append the folder BEFORE the file so the backend can read it
  // in multer's destination callback.
  formData.append("folder", folder);
  formData.append("image", payloadFile);

  // POST /api/upload requires isAuth + "media.upload" (routes/uploadRoutes.js).
  // Raw axios here never carried the Authorization/company headers the
  // shared httpService instance's interceptor attaches, so every image
  // upload across the admin 401'd with "Accès refusé, token manquant"
  // regardless of the caller's actual permissions.
  const res = await requests.post("/upload", formData);
  return res?.url;
};

/**
 * Upload several images and return an array of their public URLs.
 * Uploads run sequentially so ordering is preserved.
 *
 * @param {File[]} files
 * @param {Object} [options] - same options as uploadImage
 * @returns {Promise<string[]>}
 */
export const uploadImages = async (files = [], options = {}) => {
  const urls = [];
  for (const file of files) {
    // eslint-disable-next-line no-await-in-loop
    urls.push(await uploadImage(file, options));
  }
  return urls;
};

export default uploadImage;
