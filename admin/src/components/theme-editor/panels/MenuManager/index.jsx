import React, { useState, useEffect } from "react";
import { useEditor } from "../../hooks/editor/EditorProvider";
import ThemeEditorServices from "../../../../services/ThemeEditorServices";
import userService from "../../../../services/userService";
import MenuItemEditor from "./MenuItemEditor";
import { Button } from "@sofia/ui";

const MenuManager = ({ onClose }) => {
  const { tk, refetchMenus } = useEditor();
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState(null);
  const [selectedMenuId, setSelectedMenuId] = useState(null);

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const me = await userService.getMe();
        const sid = me?.company || me?.storeId || me?.store || null;
        setStoreId(sid);
        if (sid) {
          const fetched = await ThemeEditorServices.getMenusByStore(sid);
          setMenus(fetched);
        }
      } catch (err) {
        console.error("Failed to load menus", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMenus();
  }, []);

const handleCreateMenu = async () => {
     let targetStoreId = storeId;
     if (!targetStoreId) {
       try {
         const me = await userService.getMe();
         targetStoreId = me?.company || me?.storeId || me?.store || null;
       } catch (_) { /* keep null */ }
     }
      if (!targetStoreId) {
        console.error("Impossible de crÃ©er un menu : aucun magasin associÃ© Ã  votre compte.");

        return;
      }
      try {
        const name = "";
        const location = "header";
        const newMenu = await ThemeEditorServices.createMenu({ storeId: targetStoreId, name, location, items: [] });
        setMenus([newMenu, ...menus]);
        if (refetchMenus) refetchMenus();
      } catch (err) {
        console.error("Error creating menu:", err);
      }
    };

   const handleDelete = async (id) => {
    try {
      await ThemeEditorServices.deleteMenu(id);
      setMenus(menus.filter(m => m._id !== id));
      if (selectedMenuId === id) setSelectedMenuId(null);
      if (refetchMenus) refetchMenus();
    } catch (err) {
      console.error("Erreur lors de la suppression", err);
    }
  };

  const selectedMenu = menus.find(m => m._id === selectedMenuId);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: tk.canvasBg,
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ height: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", borderBottom: `1px solid ${tk.sidebarBorder}`, background: tk.header }}>
        <h2 style={{ fontSize: 16, margin: 0, color: tk.headerText }}>Menu Navigation</h2>
        <Button onClick={onClose} style={{ background: "transparent", border: "none", color: tk.headerText, fontSize: 24, cursor: "pointer" }}>&times;</Button>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {!selectedMenu ? (
          <div style={{ flex: 1, padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0, color: tk.headerText }}>Store Menus</h3>
              <Button onClick={handleCreateMenu} style={{ background: tk.tabActive, color: tk.tabActiveText, border: "none", padding: "6px 12px", borderRadius: 4, cursor: "pointer" }}>+ CrÃ©er un menu</Button>

            </div>

            {loading ? (
              <div style={{ color: tk.tabText }}>Chargement...</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {menus.length === 0 ? (
                  <div style={{ color: tk.tabText }}>Aucun menu trouvÃ©.</div>
                ) : (
                  menus.map(menu => (
                    <div key={menu._id} style={{ display: "flex", justifyContent: "space-between", background: tk.sidebar, padding: 16, borderRadius: 8, border: `1px solid ${tk.sidebarBorder}`, cursor: "pointer" }} onClick={() => setSelectedMenuId(menu._id)}>
                      <div>
                        <div style={{ fontWeight: "bold", color: tk.headerText }}>{menu.name}</div>
                        <div style={{ fontSize: 12, color: tk.tabText }}>Location: {menu.location}</div>
                        <div style={{ fontSize: 11, color: tk.tabText }}>{menu.items?.length || 0} liens</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                        <Button onClick={() => setSelectedMenuId(menu._id)} style={{ background: tk.tabActive, color: tk.tabActiveText, border: "none", padding: "4px 12px", borderRadius: 4, cursor: "pointer" }}>Ã‰diter</Button>
                        <Button onClick={() => handleDelete(menu._id)} style={{ background: "#ef4444", color: "white", border: "none", padding: "4px 8px", borderRadius: 4, cursor: "pointer" }}>Supprimer</Button>

                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, padding: 20, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <Button onClick={() => setSelectedMenuId(null)} style={{ marginBottom: 12, padding: "6px 12px", border: "1px solid #d1d5db", borderRadius: 4, background: "white", cursor: "pointer", fontSize: 13, alignSelf: "flex-start" }}>â† Retour Ã  la liste</Button>

            <MenuItemEditor menu={selectedMenu} onClose={() => { setSelectedMenuId(null); if (refetchMenus) refetchMenus(); }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuManager;
