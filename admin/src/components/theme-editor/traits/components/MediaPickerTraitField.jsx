import React, { useRef, useState } from "react";
import { useEditor } from "../../hooks/editor/EditorProvider";
import { getAccessToken } from "@/services/tokenStore";
import Cookies from "js-cookie";
import { Button } from "@sofia/ui";

const BASE_URL = import.meta.env.VITE_APP_API_BASE_URL || "/api";

function MediaPickerTraitField({ value, onChange, onOpenLibrary }) {
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef(null);

  const handleDirectUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const token = getAccessToken();
      const adminInfo = Cookies.get("adminInfo") ? JSON.parse(Cookies.get("adminInfo")) : null;
      const company = Cookies.get("company") || adminInfo?.company || adminInfo?.storeId || adminInfo?._id || "";

      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "/");

      const res = await fetch(`${BASE_URL}/assets/upload`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          company: company,
        },
        body: fd,
      });

      if (res.ok) {
        const data = await res.json();
        onChange(data.url || data.src);
      } else {
        // Fallback to local Data URL
        const reader = new FileReader();
        reader.onload = (event) => onChange(event.target.result);
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error("Direct upload failed, fallback to Data URL", err);
      const reader = new FileReader();
      reader.onload = (event) => onChange(event.target.result);
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {value && (
        <div style={{ position: "relative", width: "100%", height: 80, borderRadius: 6, overflow: "hidden", border: "1px solid #374151" }}>
          <img
            src={value}
            alt="Preview"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,.svg,.png,.jpg,.jpeg,.webp,.gif"
        onChange={handleDirectUpload}
        style={{ display: "none" }}
      />

      <div style={{ display: "flex", gap: 6 }}>
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          style={{
            flex: 1,
            padding: "6px 8px",
            background: "#10b981",
            color: "#ffffff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
          }}
        >
          {isUploading ? "Upload..." : "ðŸ“¤ TÃ©lÃ©verser"}
        </Button>
        <Button

          type="button"
          onClick={onOpenLibrary}
          style={{
            flex: 1,
            padding: "6px 8px",
            background: "#3b82f6",
            color: "#ffffff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
          }}
        >
          ðŸ–¼ï¸ MÃ©diathÃ¨que
        </Button>

      </div>

      {showUrlInput ? (
        <input
          type="text"
          value={value || ""}
          placeholder="https://..."
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "6px 8px",
            fontSize: 11,
            borderRadius: 6,
            border: "1px solid #374151",
            background: "#0b1220",
            color: "#e5e7eb",
          }}
        />
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Button
            type="button"
            onClick={() => setShowUrlInput(true)}
            style={{
              fontSize: 10,
              color: "#9ca3af",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              textDecoration: "underline",
            }}
          >
            Entrer une URL
          </Button>

          {value && (
            <Button
              type="button"
              onClick={() => onChange("")}
              style={{
                fontSize: 10,
                color: "#ef4444",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Supprimer
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function MediaPickerTraitFieldWrapper({ value, onChange }) {
  const { openMediaLibrary } = useEditor();

  const handleOpenLibrary = () => {
    openMediaLibrary((asset) => {
      onChange(asset.src || asset.url);
    });
  };

  return React.createElement(MediaPickerTraitField, {
    value,
    onChange,
    onOpenLibrary: handleOpenLibrary,
  });
}
