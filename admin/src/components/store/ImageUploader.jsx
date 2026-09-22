import { useState, useRef } from "react";
import { FiUpload, FiX } from "react-icons/fi";
import { getLogoUrl } from "@/utils/getLogoUrl";
import { getAccessToken } from "@/services/tokenStore";
import { Button } from "@sofia/ui";

const IMAGE_LOAD_MAX_RETRIES = 5;
const IMAGE_LOAD_RETRY_DELAY_MS = 400;

const ImageUploader = ({ imageUrl, setImageUrl }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageRetryCount, setImageRetryCount] = useState(0);
  const [imageBroken, setImageBroken] = useState(false);
  const inputRef = useRef();

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("image", file);

    try {
      const baseUrl = import.meta.env.VITE_APP_API_BASE_URL.replace(/\/api\/?$/, "");
      const res = await fetch(`${baseUrl}/api/store-logo-upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        body: formData,
      });
      const data = await res.json();
      if (data.path) {
        setImageRetryCount(0);
        setImageBroken(false);
        setImageUrl(data.path);
      } else {
        setError(data.message || "Upload failed.");
      }
    } catch (err) {
      setError(err?.message || "Upload failed. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setImageUrl("");
    setImageBroken(false);
    setImageRetryCount(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  // The upload endpoint responds once the file is written, but on some setups
  // (e.g. a project folder synced by OneDrive) the file can be briefly
  // unreadable right after creation, so the very first <img> load can 404.
  // Retry a few times with a short delay before giving up.
  const handleImageError = () => {
    if (imageRetryCount >= IMAGE_LOAD_MAX_RETRIES) {
      setImageBroken(true);
      return;
    }
    setTimeout(() => setImageRetryCount((count) => count + 1), IMAGE_LOAD_RETRY_DELAY_MS);
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {imageUrl ? (
        <div style={{ position: "relative", display: "inline-block", width: "96px", height: "96px" }}>
          {imageBroken ? (
            <div className="w-24 h-24 rounded-xl border border-gray-200 flex items-center justify-center">
              <p className="text-xs text-red-500 text-center px-1">Image unavailable</p>
            </div>
          ) : (
            <img
              src={`${getLogoUrl(imageUrl)}${imageRetryCount ? `?retry=${imageRetryCount}` : ""}`}
              alt="Store logo"
              className="w-24 h-24 rounded-xl object-cover border border-gray-200"
              style={{ display: "block" }}
              onError={handleImageError}
            />
          )}
          <Button
            type="button"
            onClick={handleRemove}
            style={{
              position: "absolute",
              top: "-8px",
              right: "-8px",
              width: "22px",
              height: "22px",
              borderRadius: "9999px",
              backgroundColor: "#EF4444",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid white",
              cursor: "pointer",
              zIndex: 10,
            }}
          >
            <FiX size={11} />
          </Button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          style={{ width: "260px" }}
          className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
        >
          {loading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-400">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <FiUpload size={24} className="text-gray-300" />
              <p className="text-sm text-gray-500">Click to upload image</p>
              <p className="text-xs text-gray-400">JPG, PNG, WEBP â€” max 5MB</p>
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />

      {error && (
        <p className="text-xs text-red-500 mt-1">
          {error?.response?.data?.message || error?.message || String(error)}
        </p>
      )}
    </div>
  );
};

export default ImageUploader;