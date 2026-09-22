import React, { useState, useEffect } from "react";
import { useEditor } from "../hooks/editor/EditorProvider";
import ThemeEditorServices from "@/services/ThemeEditorServices";
import ImagePicker from "../components/ImagePicker";
import { Button } from "@sofia/ui";

const Field = ({ label, children }) => (
  <div style={{ padding: 12, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{label}</div>
    {children}
  </div>
);

const PageSeoPanel = () => {
  const { currentPageId, isEditingPopup, updatePageSeo } = useEditor();
  const [seo, setSeo] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!currentPageId || isEditingPopup) return;
      try {
        const res = await ThemeEditorServices.getPageContent(currentPageId);
        const page = res?.data || res;
        if (!mounted) return;
        setSeo(page.seo || {});
      } catch (err) {
        console.error("Failed to load page SEO:", err);
      }
    };
    load();
    return () => { mounted = false; };
  }, [currentPageId]);

  const updateField = (key, value) => setSeo((s) => ({ ...s, [key]: value }));

  const save = async () => {
    if (!currentPageId || isEditingPopup) return;
    setSaving(true);
    try {
      await updatePageSeo(currentPageId, seo);
    } catch (err) {
      console.error("Failed to save SEO:", err);
    } finally {
      setSaving(false);
    }
  };

  if (isEditingPopup) {
    return (
      <div style={{ padding: 16, color: "#334155" }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Le SEO ne s'applique pas aux popups.</div>
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>Cet onglet est dÃ©sactivÃ© pour les popups car elles ne sont pas indexables comme des pages normales.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 8 }}>
      <Field label="SEO Title">
        <input
          value={seo.title || ""}
          onChange={(e) => updateField("title", e.target.value)}
          style={{ width: "100%", padding: 8 }}
        />
        <div style={{ fontSize: 11, color: "#666", marginTop: 6 }}>{(seo.title || "").length} / 60</div>
      </Field>

      <Field label="Meta Description">
        <textarea
          value={seo.metaDescription || ""}
          onChange={(e) => updateField("metaDescription", e.target.value)}
          style={{ width: "100%", padding: 8, minHeight: 80 }}
        />
        <div style={{ fontSize: 11, color: "#666", marginTop: 6 }}>{(seo.metaDescription || "").length} / 160</div>
      </Field>

      <Field label="OG Image">
        <ImagePicker label="OG Image" value={seo.ogImage || ""} onChange={(v) => updateField("ogImage", v)} />
      </Field>

      <Field label="Canonical URL">
        <input
          value={seo.canonicalUrl || ""}
          onChange={(e) => updateField("canonicalUrl", e.target.value)}
          style={{ width: "100%", padding: 8 }}
        />
      </Field>

      <Field label="Indexing">
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={Boolean(seo.noIndex)}
            onChange={(e) => updateField("noIndex", e.target.checked)}
          />
          <span style={{ fontSize: 13 }}>No index (noindex)</span>
        </label>
      </Field>

      <div style={{ padding: 12, display: "flex", justifyContent: "flex-end" }}>
        <Button onClick={save} disabled={saving} style={{ padding: "8px 12px" }}>
          {saving ? "Saving..." : "Enregistrer le SEO"}
        </Button>
      </div>
    </div>
  );
};

export default PageSeoPanel;
