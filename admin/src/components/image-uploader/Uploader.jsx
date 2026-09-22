import React, { useEffect, useState } from "react";
import { t } from "i18next";
import { useDropzone } from "react-dropzone";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { FiUploadCloud, FiXCircle, FiEdit2, FiUser } from "react-icons/fi";
import Pica from "pica";

// Internal imports
import useUtilsFunction from "@/hooks/useUtilsFunction";
import { notifyError, notifySuccess } from "@/utils/toast";
import { uploadImage } from "@/utils/uploadImage";
import Container from "@/components/image-uploader/Container";
import { Button } from "@sofia/ui";

const Uploader = ({
  setImageUrl,
  imageUrl,
  product,
  folder,
  alt = "image",
  silentSuccess = false,
  targetWidth = 800, // Set default fixed width
  targetHeight = 800, // Set default fixed height
  profile = false,
  wrapperClassName = "",
  avatar = false,
}) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setError] = useState("");
  const pica = Pica(); // Initialize Pica instance
  const { globalSetting } = useUtilsFunction();

  const { getRootProps, getInputProps, fileRejections } = useDropzone({
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    multiple: product ? true : false,
    maxSize: 5242880, // 5 MB in bytes
    maxFiles: globalSetting?.number_of_image_per_product || 2,
    onDrop: async (acceptedFiles) => {
      const resizedFiles = await Promise.all(
        acceptedFiles.map((file) =>
          resizeImageToFixedDimensions(file, targetWidth, targetHeight)
        )
      );
      setFiles(
        resizedFiles.map((file) =>
          Object.assign(file, {
            preview: URL.createObjectURL(file),
          })
        )
      );
    },
  });

  const resizeImageToFixedDimensions = async (file, width, height) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = objectUrl;

    try {
      // decode() throws "EncodingError: The source image cannot be
      // decoded" for files the browser can't rasterize as an <img> â€”
      // HEIC/HEIC photos straight off an iPhone are the most common real
      // case, but any corrupt/truncated file hits the same path. That
      // used to be an unhandled rejection that killed the whole upload;
      // falling back to the original, un-resized file lets the upload
      // still go through instead of failing outright.
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
      return new File([blob], file.name, { type: file.type });
    } catch (err) {
      console.error("Image resize failed, uploading original file instead:", err);
      notifyError(
        t(
          "ImageResizeFallback",
          "This image couldn't be resized automatically â€” uploading it as-is."
        )
      );
      return file;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  useEffect(() => {
    if (fileRejections) {
      fileRejections.map(({ file, errors }) => (
        <li key={file.path}>
          {file.path} - {file.size} bytes
          <ul>
            {errors.map((e) => (
              <li key={e.code}>
                {e.code === "too-many-files"
                  ? notifyError(
                      product
                        ? `Maximum ${globalSetting?.number_of_image_per_product} Image Can be Upload!`
                        : "Only one image can be uploaded!"
                    )
                  : notifyError(e.message)}
              </li>
            ))}
          </ul>
        </li>
      ));
    }

    if (files) {
      files.forEach((file) => {
        if (
          product &&
          imageUrl?.length + files?.length >
            globalSetting?.number_of_image_per_product
        ) {
          return notifyError(
            `Maximum ${globalSetting?.number_of_image_per_product} Image Can be Upload!`
          );
        }

        setLoading(true);
        setError("Uploading....");

        // reusable helper: files are already resized above, so skip re-resizing.
        // `folder` picks the destination (e.g. "product" -> public/Productimages).
        uploadImage(file, { folder, resize: false })
          .then((uploadedUrl) => {
            if (!silentSuccess) notifySuccess("Image Uploaded successfully!");
            setLoading(false);
            if (product) {
              setImageUrl((imgUrl) => [...imgUrl, uploadedUrl]);
            } else {
              setImageUrl(uploadedUrl);
            }
          })
          .catch((err) => {
            notifyError(err?.response?.data?.message || err?.message);
            setLoading(false);
          });
      });
    }
  }, [files]);

  const thumbs = files.map((file) => (
    <div key={file.name}>
      <div>
        <img
          className="inline-flex border-2 border-gray-100 w-24 max-h-24"
          src={file.preview}
          alt={file.name}
        />
      </div>
    </div>
  ));

  useEffect(
    () => () => {
      files.forEach((file) => URL.revokeObjectURL(file.preview));
    },
    [files]
  );

  useEffect(() => {
    if (!product && !imageUrl && files.length > 0) {
      files.forEach((file) => URL.revokeObjectURL(file.preview));
      setFiles([]);
    }
  }, [imageUrl, product, files]);

  const handleRemoveImage = async (img) => {
    try {
      setLoading(false);
      if (!silentSuccess) notifySuccess("Image delete successfully!");
      if (product) {
        const result = imageUrl?.filter((i) => i !== img);
        setImageUrl(result);
      } else {
        setImageUrl("");
      }
    } catch (err) {
      notifyError(err.Message);
      setLoading(false);
    }
  };

  if (avatar) {
    return (
      <div className="w-full text-center">
        <div
          className="relative inline-block cursor-pointer"
          {...getRootProps()}
        >
          <input {...getInputProps()} />
          <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto">
            {imageUrl ? (
              <img
                className="w-full h-full object-cover"
                src={imageUrl}
                alt={alt}
              />
            ) : (
              <FiUser className="text-5xl text-gray-400" />
            )}
          </div>
          <span
            className="absolute bottom-1 right-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full p-2 shadow-md"
            title={t("ChangeProfilePicture")}
          >
            <FiEdit2 className="w-4 h-4" />
          </span>
        </div>

        <div className="text-emerald-500 mt-2">{loading && err}</div>
        <em className="text-xs text-gray-400 block mt-1">{t("imageFormat")}</em>
      </div>
    );
  }

  return (
    <div className={`w-full text-center ${wrapperClassName}`}>
      <div
        className={profile
          ? "group relative mx-auto h-40 w-40 cursor-pointer rounded-full overflow-hidden border-4 border-white bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 shadow-xl shadow-slate-200 transition-all duration-300 hover:scale-[1.03] hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none"
          : "border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md cursor-pointer px-6 pt-5 pb-6"
        }
        {...getRootProps()}
      >
        <input {...getInputProps()} />

        {profile ? (
          <>
            {imageUrl ? (
              <img
                className="h-full w-full object-cover rounded-full transition-transform duration-300 group-hover:scale-105"
                src={imageUrl}
                alt={alt}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <FiUploadCloud className="text-3xl text-emerald-500" />
                <p className="mt-2 text-sm">{t("DragYourImage")}</p>
                <em className="text-xs text-gray-400">{t("imageFormat")}</em>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 text-sm text-white opacity-0 transition duration-300 group-hover:bg-black/30 group-hover:opacity-100">
              {imageUrl ? t("ChangePhoto", "Change photo") : t("UploadPhoto", "Upload photo")}
            </div>
          </>
        ) : (
          <>
            <span className="mx-auto flex justify-center">
              <FiUploadCloud className="text-3xl text-emerald-500" />
            </span>
            <p className="text-sm mt-2">{t("DragYourImage")}</p>
            <em className="text-xs text-gray-400">{t("imageFormat")}</em>
          </>
        )}
      </div>

      <div className="text-emerald-500">{loading && err}</div>

      {profile ? (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t("imageFormat")}</p>
      ) : (
        <aside className="flex flex-row flex-wrap mt-4">
          {product ? (
            <DndProvider backend={HTML5Backend}>
              <Container
                setImageUrl={setImageUrl}
                imageUrl={imageUrl}
                handleRemoveImage={handleRemoveImage}
              />
            </DndProvider>
          ) : imageUrl ? (
            <div className="relative">
              <img
                className="inline-flex border rounded-md border-gray-100 dark:border-gray-600 w-24 max-h-24 p-2"
                src={imageUrl}
                alt={alt}
              />
              <Button
                type="button"
                className="absolute top-0 right-0 text-red-500 focus:outline-none"
                onClick={() => handleRemoveImage(imageUrl)}
              >
                <FiXCircle />
              </Button>
            </div>
          ) : files.length > 0 ? (
            thumbs
          ) : (
            <p className="w-full text-xs italic text-orange-500">
              {t("UploaderNoImageWarning")}
            </p>
          )}
        </aside>
      )}
    </div>
  );
};

export default Uploader;
