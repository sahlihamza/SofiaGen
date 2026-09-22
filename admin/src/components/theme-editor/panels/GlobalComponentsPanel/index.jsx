import React, { useEffect, useState } from "react";
import { useEditor } from "../../hooks/editor/EditorProvider";
import savedBlockService from "@/services/savedBlockService";
import { Button } from "@sofia/ui";

export default function GlobalComponentsPanel({ onClose }) {
  const { tk, effectiveStoreId, globalEditorBlockId, setShowGlobalComponentsPanel, editor } = useEditor();
  const storeId = effectiveStoreId;
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    savedBlockService.listSavedBlocks(storeId).then((all) => {
      const globals = (all || []).filter(b => b.isGlobalComponent);
      setBlocks(globals);
      setLoading(false);
    }).catch((err) => {
      console.error('Failed to load global components', err);
      setLoading(false);
    });
  }, [storeId]);

  const handleEdit = (block) => {
    // Open editor panel and focus this block (EditorProvider listens to saved-blocks:open-editor events too)
    try {
      if (editor && typeof editor.trigger === 'function') {
        editor.trigger('saved-blocks:open-editor', { blockId: block._id });
      }
    } catch (e) {
      console.debug('Failed to trigger open editor event', e);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10002, display: "flex", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)", justifyContent: "flex-end" }}>
      <div style={{ width: 640, height: "100%", background: tk.sidebar, borderLeft: `1px solid ${tk.sidebarBorder}`, display: "flex", flexDirection: "column" }}>
        <div style={{ height: 60, padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${tk.sidebarBorder}` }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: tk.headerText }}>ðŸŒ Composants Globaux</h2>
            <div style={{ color: tk.tabText, fontSize: 12, marginTop: 4 }}>Newsletter, CTA et Product Card synchronisÃ©s</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={() => { setShowGlobalComponentsPanel(false); onClose?.(); }} style={{ background: 'transparent', border: 'none', color: tk.tabText, fontSize: 20 }}>âœ•</Button>

          </div>
        </div>

        <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
          {loading && <div style={{ color: tk.tabText }}>Chargement...</div>}
          {!loading && blocks.length === 0 && <div style={{ color: tk.tabText }}>Aucun composant global pour cette boutique.</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {blocks.map((b) => (
              <div key={b._id} style={{ padding: 12, borderRadius: 10, border: `1px solid ${tk.sidebarBorder}`, background: tk.canvasBg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: tk.headerText }}>{b.name}</div>
                    <div style={{ fontSize: 12, color: tk.tabText }}>{b.category || 'ðŸŒ Composants Globaux'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button onClick={() => handleEdit(b)} style={{ padding: '6px 10px', borderRadius: 6, background: '#2563EB', color: 'white', border: 'none' }}>âœï¸ Modifier</Button>

                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
