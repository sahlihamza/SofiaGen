import React, { useState, useEffect } from "react";
import { useEditor } from "../hooks/editor/EditorProvider";
import { notifySuccess, notifyError } from "@/utils/toast";
import { Button } from "@sofia/ui";

/**
 * Per-page SEO editor.
 * Reads from page.seo (metaTitle / metaDescription) and page.slug / urlSlug,
 * persists via updatePageSeo (which calls updatePageSettings -> PUT /pages/:id).
 */
export default function SeoPanel({ page, onClose }) {
  const { tk, updatePageSeo } = useEditor();
  const [metaTitle, setMetaTitle] = useState(page?.seo?.metaTitle || page?.title || "");
  const [metaDescription, setMetaDescription] = useState(page?.seo?.metaDescription || "");
  const [urlSlug, setUrlSlug] = useState(page?.slug || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMetaTitle(page?.seo?.metaTitle || page?.title || "");
    setMetaDescription(page?.seo?.metaDescription || "");
    setUrlSlug(page?.slug || "");
  }, [page]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePageSeo(page._id, {
        seo: { metaTitle, metaDescription },
        slug: urlSlug,
      });
      notifySuccess("SEO enregistrÃ© avec succÃ¨s");
      onClose && onClose();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message || "Ã‰chec de l'enregistrement SEO");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    boxSizing: "border-box",
    background: tk.canvasBg,
    color: tk.headerText,
    border: `1px solid ${tk.sidebarBorder}`,
    borderRadius: 4,
    fontSize: 13,
    outline: "none",
  };

  const labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: tk.tabText,
    marginBottom: 6,
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10004,
      display: "flex", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)",
      justifyContent: "center", alignItems: "center", padding: 20,
    }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}>
      <div style={{
        width: 520, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto",
        background: tk.sidebar, border: `1px solid ${tk.sidebarBorder}`,
        borderRadius: 12, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", color: tk.headerText,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>ðŸ” SEO â€” {page?.title || page?.name}</h2>
          <Button onClick={() => onClose && onClose()} style={{
            background: "transparent", border: "none", color: tk.tabText, fontSize: 24, cursor: "pointer", lineHeight: 1,
          }}>&times;</Button>
        </div>

        {/* Meta title */}
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Titre SEO (meta title)</label>
          <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value.slice(0, 70))} maxLength={70} style={inputStyle} />
          <div style={{ textAlign: "right", fontSize: 11, color: tk.tabText, marginTop: 4 }}>{metaTitle.length}/70</div>
        </div>

        {/* Meta description */}
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Description (meta description)</label>
          <textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value.slice(0, 200))} maxLength={200} rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
          <div style={{ textAlign: "right", fontSize: 11, color: tk.tabText, marginTop: 4 }}>{metaDescription.length}/200</div>
        </div>

        {/* URL slug */}
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>URL Slug</label>
          <input
            value={urlSlug}
            onChange={(e) => setUrlSlug(e.target.value.toLowerCase().replace(/[^\w-]/g, ""))}
            style={{ ...inputStyle, fontFamily: "monospace" }}
          />
        </div>

        {/* Google-style preview */}
        <div style={{ border: `1px solid ${tk.sidebarBorder}`, padding: 14, borderRadius: 8, marginBottom: 20, background: tk.canvasBg }}>
          <div style={{ color: "#1a0dab", fontSize: 16, fontWeight: 600 }}>{metaTitle || "Titre de la page"}</div>
          <div style={{ color: "#006621", fontSize: 12, margin: "2px 0 4px" }}>
            votresite.com/{urlSlug || ""}
          </div>
          <div style={{ color: "#545454", fontSize: 13 }}>
            {metaDescription || "Aucune description dÃ©finie."}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Button onClick={() => onClose && onClose()} style={{
            background: "transparent", border: `1px solid ${tk.sidebarBorder}`, color: tk.headerText,
            borderRadius: 6, padding: "8px 16px", fontSize: 13, cursor: "pointer",
          }}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving} style={{
            background: saving ? tk.sidebarBorder : "#10b981", color: "#fff", border: "none",
            borderRadius: 6, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
          }}>{saving ? "Enregistrementâ€¦" : "Enregistrer le SEO"}</Button>
        </div>
      </div>
    </div>
  );
}

