import React, { useState, useRef, useEffect } from "react";
import { useEditor, GLOBAL_SECTION_IDS } from "../../hooks/editor/EditorProvider";
import LibraryPanel from "../LibraryPanel";
import SeoPanel from "../SeoPanel";
import { notifySuccess, notifyError } from "@/utils/toast";
import { Button } from "@sofia/ui";

export default function PageManager({ onClose }) {
  const {
    tk,
    pages,
    currentPageId,
    selectPage,
    addPage,
    saveCurrentPageAsTemplate,
    updatePageStatus,
    renamePage,
    updatePageSeo,
    duplicatePage,
    deletePage,
    setHomePage,
  } = useEditor();

  const [seoPageId, setSeoPageId] = useState(null);
  const seoPage = pages.find((p) => p._id === seoPageId);

  const [isCreating, setIsCreating] = useState(false);
  const [isChoosingTemplate, setIsChoosingTemplate] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingPageId, setEditingPageId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [schedulingPageId, setSchedulingPageId] = useState(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newPageName.trim()) return;
    try {
      await addPage({ name: newPageName.trim() });
      setNewPageName("");
      setIsCreating(false);
      notifySuccess("Page crÃ©Ã©e avec succÃ¨s !");
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message || "Failed to create page");
    }
  };

  const handlePickTemplate = async (template) => {
    const defaultName = `${template.name} (copie)`;
    const name = defaultName;

    try {
      await addPage({
        name,
        projectData: template.projectData,
        compiledHtml: template.compiledHtml,
        compiledCss: template.compiledCss,
      });
      setIsChoosingTemplate(false);
      notifySuccess("Page crÃ©Ã©e depuis le modÃ¨le !");
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message || "Ã‰chec de la crÃ©ation depuis ce modÃ¨le");
    }
  };

  const handleSaveAsTemplate = async (page) => {
    const name = `${page.title || page.name} (modÃ¨le)`;

    try {
      await saveCurrentPageAsTemplate(page._id, { name, category: "Autre" });
      notifySuccess("ModÃ¨le enregistrÃ© avec succÃ¨s.");
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message || "Ã‰chec de l'enregistrement du modÃ¨le.");
    }
    setActiveMenuId(null);
  };

  const startEditing = (page) => {
    setEditingPageId(page._id);
    setEditName(page.title || page.name);
    setEditSlug(page.slug);
    setActiveMenuId(null);
  };

  const saveEdit = async (pageId) => {
    try {
      await renamePage(pageId, editName, editSlug);
      notifySuccess("Page renommÃ©e avec succÃ¨s !");
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message || "Failed to update page");
    }
    setEditingPageId(null);
  };

  return (
    <>
      <div style={{
        position: "fixed", inset: 0, zIndex: 10001,
        display: "flex", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)",
        justifyContent: "flex-end"
      }}>
      <div style={{
        width: 380, height: "100%",
        background: tk.sidebar,
        borderLeft: `1px solid ${tk.sidebarBorder}`,
        display: "flex", flexDirection: "column",
        boxShadow: "-5px 0 25px rgba(0,0,0,0.2)",
        animation: "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
        {/* Header */}
        <div style={{
          height: 60, padding: "0 20px", display: "flex", alignItems: "center",
          justifyContent: "space-between", borderBottom: `1px solid ${tk.sidebarBorder}`
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: tk.headerText }}>Pages</h2>
          <Button onClick={onClose} style={{
            background: "transparent", border: "none", color: tk.tabText,
            fontSize: 24, cursor: "pointer", lineHeight: 1
          }}>&times;</Button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          <div style={{ marginBottom: 20, position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>ðŸ”</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une page..."
              style={{
                width: "100%", padding: "8px 12px 8px 36px", boxSizing: "border-box",
                background: tk.canvasBg, color: tk.headerText, border: `1px solid ${tk.sidebarBorder}`,
                borderRadius: 4, fontSize: 13, outline: "none"
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: tk.tabText, textTransform: "uppercase", letterSpacing: 1 }}>Store Pages</span>
            <div style={{ display: "flex", gap: 8 }}>
              <Button 
                onClick={() => setIsCreating(true)}
                style={{
                  background: tk.tabActive, color: tk.tabActiveText, border: `1px solid ${tk.tabActiveBorder}`,
                  borderRadius: 4, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                }}
              >
                + Create Page
              </Button>
              <Button
                onClick={() => setIsChoosingTemplate(true)}
                style={{
                  background: "transparent", color: tk.tabText, border: `1px solid ${tk.sidebarBorder}`,
                  borderRadius: 4, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                }}
              >
                From Template
              </Button>
            </div>
          </div>

          {isCreating && (
            <form onSubmit={handleCreateSubmit} style={{
              background: "rgba(0,0,0,0.1)", padding: 12, borderRadius: 6, marginBottom: 16,
              border: `1px solid ${tk.sidebarBorder}`
            }}>
              <input
                autoFocus
                value={newPageName}
                onChange={e => setNewPageName(e.target.value)}
                placeholder="Page Name (e.g. About Us)"
                style={{
                  width: "100%", padding: "8px 12px", boxSizing: "border-box",
                  background: tk.canvasBg, color: tk.headerText, border: `1px solid ${tk.sidebarBorder}`,
                  borderRadius: 4, fontSize: 13, marginBottom: 8, outline: "none"
                }}
              />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button type="button" onClick={() => setIsCreating(false)} style={{
                  background: "transparent", border: "none", color: tk.tabText, fontSize: 12, cursor: "pointer"
                }}>Cancel</Button>
                <Button type="submit" disabled={!newPageName.trim()} style={{
                  background: "#10b981", color: "#fff", border: "none", borderRadius: 4, padding: "4px 12px",
                  fontSize: 12, fontWeight: 600, cursor: newPageName.trim() ? "pointer" : "not-allowed"
                }}>Create</Button>
              </div>
            </form>
          )}

          <div style={{ marginBottom: 18, padding: 14, borderRadius: 12, background: "rgba(219, 234, 254, 0.95)", border: "1px solid rgba(147, 197, 253, 0.9)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 10, color: "#1e3a8a" }}>Sections globales</div>
            <Button
              onClick={() => selectPage(GLOBAL_SECTION_IDS.header)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "10px 12px",
                marginBottom: 8,
                borderRadius: 10,
                border: currentPageId === GLOBAL_SECTION_IDS.header ? "1px solid #2563EB" : "1px solid rgba(147, 197, 253, 0.7)",
                background: currentPageId === GLOBAL_SECTION_IDS.header ? "rgba(37, 99, 235, 0.12)" : "white",
                color: "#1e3a8a",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span>ðŸ”</span><span>Header</span></span>
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#2563EB", color: "white" }}>Global</span>
            </Button>
            <Button
              onClick={() => selectPage(GLOBAL_SECTION_IDS.footer)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                border: currentPageId === GLOBAL_SECTION_IDS.footer ? "1px solid #2563EB" : "1px solid rgba(147, 197, 253, 0.7)",
                background: currentPageId === GLOBAL_SECTION_IDS.footer ? "rgba(37, 99, 235, 0.12)" : "white",
                color: "#1e3a8a",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span>ðŸ”»</span><span>Footer</span></span>
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#2563EB", color: "white" }}>Global</span>
            </Button>
            <Button
              onClick={() => selectPage(GLOBAL_SECTION_IDS.announcement_bar)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "10px 12px",
                marginTop: 8,
                borderRadius: 10,
                border: currentPageId === GLOBAL_SECTION_IDS.announcement_bar ? "1px solid #2563EB" : "1px solid rgba(147, 197, 253, 0.7)",
                background: currentPageId === GLOBAL_SECTION_IDS.announcement_bar ? "rgba(37, 99, 235, 0.12)" : "white",
                color: "#1e3a8a",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span>ðŸ“¢</span><span>Barre d'annonce</span></span>
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#2563EB", color: "white" }}>Global</span>
            </Button>
            <Button
              onClick={() => selectPage(GLOBAL_SECTION_IDS.cookie_banner)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "10px 12px",
                marginTop: 8,
                borderRadius: 10,
                border: currentPageId === GLOBAL_SECTION_IDS.cookie_banner ? "1px solid #2563EB" : "1px solid rgba(147, 197, 253, 0.7)",
                background: currentPageId === GLOBAL_SECTION_IDS.cookie_banner ? "rgba(37, 99, 235, 0.12)" : "white",
                color: "#1e3a8a",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span>ðŸª</span><span>Bandeau cookies</span></span>
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#2563EB", color: "white" }}>Global</span>
            </Button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(() => {
              const filteredPages = pages.filter(page => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const title = (page.title || page.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const slug = (page.slug || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                return title.includes(q) || slug.includes(q);
              });

              if (filteredPages.length === 0 && searchQuery) {
                return (
                  <div style={{
                    padding: 20, textAlign: "center", color: tk.tabText,
                    border: `1px dashed ${tk.sidebarBorder}`, borderRadius: 6, fontSize: 13
                  }}>
                    Aucune page ne correspond Ã  Â« {searchQuery} Â»
                  </div>
                );
              }

              return filteredPages.map(page => {
              const isActive = page._id === currentPageId;
              const isEditing = editingPageId === page._id;

              if (isEditing) {
                return (
                  <div key={page._id} style={{
                    background: "rgba(0,0,0,0.1)", padding: 12, borderRadius: 6,
                    border: `1px solid ${tk.sidebarBorder}`
                  }}>
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="Page Name"
                      style={{
                        width: "100%", padding: "6px 10px", boxSizing: "border-box",
                        background: tk.canvasBg, color: tk.headerText, border: `1px solid ${tk.sidebarBorder}`,
                        borderRadius: 4, fontSize: 13, marginBottom: 8, outline: "none"
                      }}
                    />
                    <input
                      value={editSlug}
                      onChange={e => setEditSlug(e.target.value.toLowerCase().replace(/[^\w-]/g, ""))}
                      placeholder="URL Slug"
                      style={{
                        width: "100%", padding: "6px 10px", boxSizing: "border-box",
                        background: tk.canvasBg, color: tk.headerText, border: `1px solid ${tk.sidebarBorder}`,
                        borderRadius: 4, fontSize: 12, marginBottom: 8, outline: "none", fontFamily: "monospace"
                      }}
                    />
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <Button onClick={() => setEditingPageId(null)} style={{
                        background: "transparent", border: "none", color: tk.tabText, fontSize: 12, cursor: "pointer"
                      }}>Cancel</Button>
                      <Button onClick={() => saveEdit(page._id)} style={{
                        background: tk.tabActive, color: tk.tabActiveText, border: "none", borderRadius: 4, padding: "4px 12px",
                        fontSize: 12, fontWeight: 600, cursor: "pointer"
                      }}>Save</Button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={page._id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", borderRadius: 6,
                  background: isActive ? "rgba(102, 126, 234, 0.1)" : tk.canvasBg,
                  border: `1px solid ${isActive ? "#667eea" : tk.sidebarBorder}`,
                  cursor: "pointer", transition: "all 0.2s"
                }} onClick={() => !isActive && selectPage(page._id)}>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: tk.headerText }}>
                        {page.title || page.name}
                      </span>
                      {page.isHome && (
                        <span title="Home Page" style={{ fontSize: 11 }}>ðŸ </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: tk.tabText, fontFamily: "monospace" }}>
                      {page.slug === "/" ? "/" : `/${page.slug}`}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {page.scheduleStatus === "scheduled" && page.scheduledAt ? (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                        background: "rgba(139, 92, 246, 0.15)",
                        color: "#8b5cf6",
                      }}>
                        PROGRAMMÃ‰E â€” {new Date(page.scheduledAt).toLocaleString()}
                      </span>
                    ) : (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                        background: page.isPublished ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                        color: page.isPublished ? "#10b981" : "#f59e0b",
                      }}>
                        {page.isPublished ? "PUBLISHED" : "DRAFT"}
                      </span>
                    )}

                    <div style={{ position: "relative" }}>
                      <Button 
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === page._id ? null : page._id); }}
                        style={{
                          background: "transparent", border: "none", color: tk.tabText,
                          fontSize: 16, cursor: "pointer", padding: "4px 8px", borderRadius: 4,
                        }}
                      >â‹®</Button>

                        {activeMenuId === page._id && (
                        <div ref={menuRef} style={{
                          position: "absolute", top: "100%", right: 0, marginTop: 4, width: 160,
                          background: tk.sidebar, border: `1px solid ${tk.sidebarBorder}`,
                          borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                          zIndex: 100, overflow: "hidden"
                        }}>
                          <MenuBtn onClick={(e) => { e.stopPropagation(); startEditing(page); }}>âœï¸ Rename</MenuBtn>
                          <MenuBtn onClick={async (e) => { e.stopPropagation(); try { await duplicatePage(page._id); notifySuccess("Page dupliquÃ©e !"); } catch (err) { notifyError(err?.response?.data?.message || err?.message || "Ã‰chec de la duplication"); } setActiveMenuId(null); }}>ðŸ“‹ Duplicate</MenuBtn>
                          {!page.isHome && (
                            <MenuBtn onClick={async (e) => { e.stopPropagation(); try { await setHomePage(page._id); notifySuccess("Page d'accueil dÃ©finie !"); } catch (err) { notifyError(err?.response?.data?.message || err?.message || "Ã‰chec"); } setActiveMenuId(null); }}>ðŸ  Set as Home</MenuBtn>
                          )}
                          <MenuBtn onClick={async (e) => { e.stopPropagation(); try { await updatePageStatus(page._id, !page.isPublished); notifySuccess(page.isPublished ? "Page dÃ©publiÃ©e" : "Page publiÃ©e !"); } catch (err) { notifyError(err?.response?.data?.message || err?.message || "Ã‰chec"); } setActiveMenuId(null); }}>
                            {page.isPublished ? "ðŸ“¥ Unpublish" : "ðŸ“¤ Publish"}
                          </MenuBtn>
                          
                          {page.scheduleStatus === "scheduled" ? (
                            <MenuBtn onClick={async (e) => { e.stopPropagation(); try { await cancelPageSchedule(page._id); notifySuccess("Programmation annulÃ©e"); } catch (err) { notifyError(err?.response?.data?.message || err?.message || "Ã‰chec"); } setActiveMenuId(null); }}>
                              âŒ Annuler la programmation
                            </MenuBtn>
                          ) : (
                            <MenuBtn onClick={(e) => {
                              e.stopPropagation();
                              setSchedulingPageId(page._id);
                              const d = new Date();
                              d.setHours(d.getHours() + 1);
                              d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                              setScheduleDate(d.toISOString().slice(0, 16));
                              setActiveMenuId(null);
                            }}>
                              ðŸ•“ Programmer la publication
                            </MenuBtn>
                          )}

                          <MenuBtn onClick={(e) => { e.stopPropagation(); handleSaveAsTemplate(page); }}>ðŸ’¾ Save as Template</MenuBtn>

                          <MenuBtn onClick={(e) => { e.stopPropagation(); setSeoPageId(page._id); setActiveMenuId(null); }}>ðŸ” SEO</MenuBtn>
                          
                          <div style={{ height: 1, background: tk.sidebarBorder, margin: "4px 0" }} />
                          
                          <MenuBtn 
                            onClick={async (e) => { 
                              e.stopPropagation(); 
                              try {
                                await deletePage(page._id);
                                notifySuccess("Page supprimÃ©e !");
                              } catch (err) {
                                notifyError(err?.response?.data?.message || err?.message || "Ã‰chec de la suppression");
                              }
                              setActiveMenuId(null); 
                            }} 
                            disabled={pages.length <= 1}
                            color="#ef4444"
                          >
                            ðŸ—‘ï¸ Delete
                          </MenuBtn>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
              });
            })()}
          </div>
          
          {schedulingPageId && (
            <div style={{
              position: "absolute", bottom: 20, left: 20, right: 20,
              background: tk.sidebar, border: `1px solid ${tk.sidebarBorder}`, borderRadius: 8,
              padding: 16, boxShadow: "0 10px 25px rgba(0,0,0,0.2)", zIndex: 1000
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: tk.headerText, marginBottom: 12 }}>
                Programmer la publication
              </div>
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={e => setScheduleDate(e.target.value)}
                style={{
                  width: "100%", padding: "8px 12px", boxSizing: "border-box",
                  background: tk.canvasBg, color: tk.headerText, border: `1px solid ${tk.sidebarBorder}`,
                  borderRadius: 4, fontSize: 13, marginBottom: 12, outline: "none", colorScheme: "dark"
                }}
              />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button onClick={() => setSchedulingPageId(null)} style={{
                  background: "transparent", border: "none", color: tk.tabText, fontSize: 12, cursor: "pointer"
                }}>Cancel</Button>
                <Button onClick={async () => {
                  if (!scheduleDate) return;
                  const dateObj = new Date(scheduleDate);
                  if (dateObj <= new Date()) {
                    notifyError("La date doit Ãªtre dans le futur");
                    return;
                  }
                  try {
                    await schedulePageAt(schedulingPageId, dateObj.toISOString());
                    setSchedulingPageId(null);
                  } catch (e) {
                    notifyError("Erreur lors de la programmation");
                  }
                }} style={{
                  background: tk.tabActive, color: tk.tabActiveText, border: "none", borderRadius: 4, padding: "6px 14px",
                  fontSize: 12, fontWeight: 600, cursor: "pointer"
                }}>Programmer</Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
    {isChoosingTemplate && (
        <LibraryPanel
          onClose={() => setIsChoosingTemplate(false)}
          allowedTypes={["page"]}
        />
    )}
      {seoPage && (
        <SeoPanel page={seoPage} onClose={() => setSeoPageId(null)} />
      )}
  </>
);
}

function MenuBtn({ children, onClick, disabled, color }) {
  const { tk } = useEditor();
  return (
    <Button
      onClick={disabled ? undefined : onClick}
      style={{
        display: "block", width: "100%", textAlign: "left",
        padding: "8px 12px", background: "transparent", border: "none",
        fontSize: 12, color: disabled ? tk.sidebarBorder : (color || tk.headerText),
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1
      }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.background = tk.canvasBg)}
      onMouseLeave={e => !disabled && (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </Button>
  );
}

