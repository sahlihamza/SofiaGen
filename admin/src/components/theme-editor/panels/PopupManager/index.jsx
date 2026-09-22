import React, { useState, useEffect } from "react";
import { useEditor } from "../../hooks/editor/EditorProvider";
import ThemeEditorServices from "@/services/ThemeEditorServices";
import { Field, Select, Input, Toggle } from "../ThemeSettings/SettingsUi"; // Reusing UI components
import { Button } from "@sofia/ui";

export default function PopupManager({ onClose }) {
  const { tk, effectiveStoreId, storeId, currentPageId, setCurrentPageId, loadPage } = useEditor();
  const [popups, setPopups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPopup, setSelectedPopup] = useState(null); // When editing settings
  
  const activeStoreId = effectiveStoreId || storeId;

  const fetchPopups = async () => {
    try {
      setLoading(true);
      const res = await ThemeEditorServices.getTemplates(activeStoreId, "popup");
      setPopups(res);
    } catch (err) {
      console.error("Failed to fetch popups:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeStoreId) fetchPopups();
  }, [activeStoreId]);

  const handleCreatePopup = async () => {
    try {
      const name = "Nouveau Popup";
      const res = await ThemeEditorServices.saveTemplate(activeStoreId, {
        name,
        type: "popup",
        projectData: { pages: [{ frames: [{ component: { type: "wrapper", components: [{ type: "text", content: "Nouveau Popup", style: { padding: "20px" } }] } }] }] },
        popupSettings: { trigger: "page-load", triggerValue: 0, frequency: "once-per-session" },
        isActive: false
      });
      setPopups([res, ...popups]);
    } catch (err) {
      console.error("Erreur lors de la crÃ©ation du popup", err);
    }
  };

  const handleEditDesign = (popupId) => {
    loadPage(`__popup_${popupId}`);
    onClose();
  };

  const handleDelete = async (popupId) => {
    try {
      await ThemeEditorServices.deleteTemplate(activeStoreId, popupId);
      setPopups(popups.filter(p => p._id !== popupId));
      if (selectedPopup?._id === popupId) setSelectedPopup(null);
    } catch (err) {
      console.error("Erreur lors de la suppression", err);
    }
  };

  const handleUpdateSettings = async (updates) => {
    if (!selectedPopup) return;
    try {
      const updated = await ThemeEditorServices.updateTemplate(activeStoreId, selectedPopup._id, updates);
      setPopups(popups.map(p => p._id === updated._id ? updated : p));
      setSelectedPopup(updated);
    } catch (err) {
      console.error("Erreur lors de la mise Ã  jour", err);

    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10005, display: "flex", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)", justifyContent: "flex-start" }}>
      <div style={{ width: 450, height: "100%", background: tk.sidebar, borderRight: `1px solid ${tk.sidebarBorder}`, display: "flex", flexDirection: "column", boxShadow: "5px 0 25px rgba(0,0,0,0.2)", animation: "slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
        
        {/* Header */}
        <div style={{ height: 60, padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${tk.sidebarBorder}` }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: tk.headerText }}>ðŸªŸ Popups</h2>
          <Button onClick={onClose} style={{ background: "transparent", border: "none", color: tk.tabText, fontSize: 24, cursor: "pointer", lineHeight: 1 }}>&times;</Button>

        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {selectedPopup ? (
            <div>
              <Button onClick={() => setSelectedPopup(null)} style={{ background: "transparent", border: "none", color: tk.tabText, fontSize: 13, cursor: "pointer", marginBottom: 16 }}>&larr; Retour</Button>
              <h3 style={{ margin: "0 0 16px 0", color: tk.headerText, fontSize: 15 }}>ParamÃ¨tres : {selectedPopup.name}</h3>
              
              <Field label="Statut" hint="Le popup sera-t-il affichÃ© sur la boutique ?">

                <Toggle checked={selectedPopup.isActive} onChange={v => handleUpdateSettings({ isActive: v })} />
              </Field>

              <Field label="DÃ©clencheur">
                <Select 
                  value={selectedPopup.popupSettings?.trigger || "page-load"} 
                  onChange={v => handleUpdateSettings({ popupSettings: { ...selectedPopup.popupSettings, trigger: v } })}
                  options={[
                    { value: "page-load", label: "Au chargement de la page" },
                    { value: "exit-intent", label: "Intention de sortie (Exit Intent)" },
                    { value: "scroll-percentage", label: "% de scroll" },
                    { value: "delay", label: "AprÃ¨s un dÃ©lai" }

                  ]}
                />
              </Field>

              {["delay", "scroll-percentage"].includes(selectedPopup.popupSettings?.trigger) && (
                <Field label="Valeur du dÃ©clencheur" hint={selectedPopup.popupSettings?.trigger === "delay" ? "En millisecondes (ex: 5000 = 5s)" : "En pourcentage (ex: 50)"}>
                  <Input 
                    type="number" 
                    value={selectedPopup.popupSettings?.triggerValue || 0} 
                    onChange={v => handleUpdateSettings({ popupSettings: { ...selectedPopup.popupSettings, triggerValue: Number(v) } })} 
                  />
                </Field>
              )}

              <Field label="FrÃ©quence">
                <Select 
                  value={selectedPopup.popupSettings?.frequency || "once-per-session"} 
                  onChange={v => handleUpdateSettings({ popupSettings: { ...selectedPopup.popupSettings, frequency: v } })}
                  options={[
                    { value: "every-visit", label: "Ã€ chaque visite (Debug)" },

                    { value: "once-per-session", label: "Une fois par session (Onglet actif)" },
                    { value: "once-per-visitor", label: "Une fois par visiteur (Cookies)" }
                  ]}
                />
              </Field>

              <div style={{ marginTop: 30, display: "flex", gap: 10 }}>
                <Button 
                  onClick={() => handleEditDesign(selectedPopup._id)}
                  style={{ flex: 1, padding: "10px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
                >
                  âœï¸ Ã‰diter le design
                </Button>
                <Button 

                  onClick={() => handleDelete(selectedPopup._id)}
                  style={{ flex: 1, padding: "10px", background: "transparent", color: "#ef4444", border: "1px solid #ef4444", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
                >
                  Supprimer
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <Button 
                onClick={handleCreatePopup}
                style={{ width: "100%", padding: "10px", background: "rgba(37, 99, 235, 0.1)", color: "#3b82f6", border: "1px dashed #3b82f6", borderRadius: 8, cursor: "pointer", fontWeight: 600, marginBottom: 20 }}
              >
                + CrÃ©er un nouveau popup
              </Button>


              {loading ? (
                <div style={{ color: tk.tabText, textAlign: "center", padding: 20 }}>Chargement...</div>
              ) : popups.length === 0 ? (
                <div style={{ color: tk.tabText, textAlign: "center", padding: 20, fontSize: 13 }}>Aucun popup existant.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {popups.map(p => (
                    <div key={p._id} style={{ border: `1px solid ${tk.sidebarBorder}`, borderRadius: 8, padding: 12, background: tk.canvasBg, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ color: tk.headerText, fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                        <div style={{ color: tk.tabText, fontSize: 11, marginTop: 4 }}>
                          {p.isActive ? <span style={{ color: "#10b981" }}>â— Actif</span> : <span>â—‹ Inactif</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Button onClick={() => setSelectedPopup(p)} style={{ padding: "6px 12px", background: tk.sidebar, border: `1px solid ${tk.sidebarBorder}`, borderRadius: 6, color: tk.headerText, cursor: "pointer", fontSize: 12 }}>ParamÃ¨tres</Button>
                        <Button onClick={() => handleEditDesign(p._id)} style={{ padding: "6px 12px", background: "#2563eb", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontSize: 12 }}>Ã‰diter</Button>

                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
