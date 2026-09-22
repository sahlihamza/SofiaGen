import React, { useState, useEffect, useRef, useCallback } from "react";
import { useEditor } from "../hooks/editor/EditorProvider";
import { getAccessToken } from "@/services/tokenStore";
import Cookies from "js-cookie";
import ImageCropModal from "./ImageCropModal";
import { Button } from "@sofia/ui";

const BASE_URL = import.meta.env.VITE_APP_API_BASE_URL;

const MediaLibraryModal = () => {
  const { tk, showMediaLibrary, closeMediaLibrary, mediaLibraryCallback } = useEditor();
  const [activeTab, setActiveTab] = useState("library"); // 'upload' or 'library'
  const [assets, setAssets] = useState([]);
  const [folders, setFolders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isDragging, setIsDragging] = useState(false);
  
  // Folder & Tags state
  const [currentFolder, setCurrentFolder] = useState("/");
  const [uploadFolder, setUploadFolder] = useState("/");
  const [uploadTags, setUploadTags] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [folderError, setFolderError] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  
  const fileInputRef = useRef(null);

  // â”€â”€ Crop state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // pendingCropFile: raw File waiting for crop before upload
  // cropAssetSrc: URL of an already-uploaded asset being cropped as a variant
  const [pendingCropFile, setPendingCropFile] = useState(null);
  const [cropAssetSrc, setCropAssetSrc] = useState(null);
  const [cropMimeType, setCropMimeType] = useState("image/jpeg");

  useEffect(() => {
    if (!showMediaLibrary) return;
    fetchFolders();
    setUploadFolder(currentFolder);
    if (activeTab === "library") {
      fetchAssets();
    }
  }, [showMediaLibrary, activeTab, currentFolder]);

  useEffect(() => {
    if (!showMediaLibrary || activeTab !== "library") return;
    const timeout = setTimeout(fetchAssets, 250);
    return () => clearTimeout(timeout);
  }, [searchQuery, categoryFilter, activeTab, showMediaLibrary, currentFolder]);

  const fetchFolders = async () => {
    try {
      const token = getAccessToken();
      const adminInfo = Cookies.get("adminInfo") ? JSON.parse(Cookies.get("adminInfo")) : null;
      const company = Cookies.get("company") || adminInfo?.company || adminInfo?.storeId || adminInfo?._id || "";
      const res = await fetch(`${BASE_URL}/asset-folders`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          company: company,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setFolders(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching asset folders:", err);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      setFolderError("Le nom du dossier est requis.");
      return;
    }

    setIsCreatingFolder(true);
    setFolderError("");

    try {
      const token = getAccessToken();
      const adminInfo = Cookies.get("adminInfo") ? JSON.parse(Cookies.get("adminInfo")) : null;
      const company = Cookies.get("company") || adminInfo?.company || adminInfo?.storeId || adminInfo?._id || "";
      const res = await fetch(`${BASE_URL}/asset-folders`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          company: company,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newFolderName.trim(), parentPath: currentFolder }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.error || error?.message || "Impossible de crÃ©er le dossier.");
      }

      const folder = await res.json();
      setFolders((prev) => [...prev.filter((f) => f._id !== folder._id), folder]);
      setNewFolderName("");
    } catch (err) {
      console.error("Create folder failed", err);
      setFolderError(err.message || "Impossible de crÃ©er le dossier.");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const fetchAssets = async () => {
    setIsLoading(true);
    try {
      const token = getAccessToken();
      const adminInfo = Cookies.get("adminInfo") ? JSON.parse(Cookies.get("adminInfo")) : null;
      const company = Cookies.get("company") || adminInfo?.company || adminInfo?.storeId || adminInfo?._id || "";
      const params = new URLSearchParams();
      if (currentFolder) params.set("folder", currentFolder);
      if (categoryFilter && categoryFilter !== "all") params.set("category", categoryFilter);
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`${BASE_URL}/assets?${params.toString()}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          company: company,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setAssets(data);
      }
    } catch (err) {
      console.error("Error fetching assets:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const files = e.target.files || e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    // If a single image file, show crop modal first
    if (files.length === 1 && files[0].type.startsWith("image/")) {
      setPendingCropFile(files[0]);
      setCropMimeType(files[0].type || "image/jpeg");
      // Reset input so the same file can be re-selected later
      if (fileInputRef.current) fileInputRef.current.value = "";
      return; // upload happens after crop confirm
    }

    // Multiple files or non-images: upload directly
    await uploadFiles(files);
  };

  // â”€â”€ Upload helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const getAuthHeaders = useCallback(() => {
    const token = getAccessToken();
    const adminInfo = Cookies.get("adminInfo") ? JSON.parse(Cookies.get("adminInfo")) : null;
    const company = Cookies.get("company") || adminInfo?.company || adminInfo?.storeId || adminInfo?._id || "";
    return { Authorization: token ? `Bearer ${token}` : "", company };
  }, []);

  const uploadBlob = useCallback(async (blob, filename) => {
    const fd = new FormData();
    fd.append("file", blob, filename);
    fd.append("folder", uploadFolder);
    fd.append("tags", uploadTags);
    const res = await fetch(`${BASE_URL}/assets/upload`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: fd,
    });
    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || "Upload failed");
    }
    return res.json();
  }, [uploadFolder, uploadTags, getAuthHeaders]);

  const uploadFiles = useCallback(async (files) => {
    setIsUploading(true);
    const uploaded = [];
    for (const file of Array.from(files)) {
      try {
        const asset = await uploadBlob(file, file.name);
        uploaded.push(asset);
      } catch (err) {
        console.error("Upload failed", err);
      }
    }
    if (uploaded.length > 0) {
      setAssets((prev) => [...uploaded, ...prev]);
      setActiveTab("library");
      setSelectedAsset(uploaded[0]);
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [uploadBlob]);

  // Called when user confirms crop (new upload path)
  const handleCropConfirm = useCallback(async (blob, mime) => {
    const ext = mime.split("/")[1] || "jpg";
    const filename = pendingCropFile
      ? pendingCropFile.name.replace(/\.[^.]+$/, `_cropped.${ext}`)
      : `cropped_variant.${ext}`;
    setPendingCropFile(null);
    setCropAssetSrc(null);
    setIsUploading(true);
    try {
      const asset = await uploadBlob(blob, filename);
      setAssets((prev) => [asset, ...prev]);
      setActiveTab("library");
      setSelectedAsset(asset);
    } catch (err) {
      console.error("Cropped upload failed", err);
    }
    setIsUploading(false);
  }, [pendingCropFile, uploadBlob]);

  const handleCropCancel = useCallback(() => {
    if (pendingCropFile) {
      // Upload original as-is
      uploadFiles([pendingCropFile]);
    }
    setPendingCropFile(null);
    setCropAssetSrc(null);
  }, [pendingCropFile, uploadFiles]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    await handleUpload(e);
  };

  const renderThumbnail = (asset, isGrid = true) => {
    if (asset.mimeType?.startsWith("image/")) {
      return <img src={asset.url} alt={asset.filename} style={{ width: "100%", height: "100%", objectFit: isGrid ? "cover" : "contain" }} />;
    }
    if (asset.mimeType?.startsWith("video/")) {
      return <video src={asset.url} style={{ width: "100%", height: "100%", objectFit: isGrid ? "cover" : "contain", background: "#000" }} muted loop playsInline onMouseEnter={(e) => isGrid && e.target.play()} onMouseLeave={(e) => isGrid && e.target.pause()} />;
    }
    // Document / Other
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.2)", color: tk.tabText, padding: 10, boxSizing: "border-box" }}>
        <div style={{ fontSize: isGrid ? 30 : 50, marginBottom: 10 }}>ðŸ“„</div>
        {isGrid && <div style={{ fontSize: 10, textAlign: "center", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset.filename.split('.').pop().toUpperCase()}</div>}
      </div>
    );
  };

  const handleDelete = async (id) => {
    try {
      const token = getAccessToken();
      const adminInfo = Cookies.get("adminInfo") ? JSON.parse(Cookies.get("adminInfo")) : null;
      const company = Cookies.get("company") || adminInfo?.company || adminInfo?.storeId || adminInfo?._id || "";

      const res = await fetch(`${BASE_URL}/assets/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          company: company,
        },
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || json?.message || "Suppression Ã©chouÃ©e");
      }

      setAssets((prev) => prev.filter((a) => a._id !== id));
      if (selectedAsset?._id === id) setSelectedAsset(null);
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const handleSelect = () => {
    if (selectedAsset && mediaLibraryCallback) {
      mediaLibraryCallback({
        type: "image",
        src: selectedAsset.url,
        name: selectedAsset.filename,
      });
      closeMediaLibrary();
    }
  };

  if (!showMediaLibrary) return null;

  // â”€â”€ Crop modal (shown on top of everything) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const cropSrc = pendingCropFile
    ? URL.createObjectURL(pendingCropFile)
    : cropAssetSrc || null;

  if (cropSrc) {
    return (
      <ImageCropModal
        imageSrc={cropSrc}
        mimeType={cropMimeType}
        onCancel={handleCropCancel}
        onCropComplete={handleCropConfirm}
      />
    );
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999
    }}>
      <div style={{
        background: tk.sidebar, width: "90%", height: "90%", borderRadius: 8, display: "flex", flexDirection: "column", overflow: "hidden", border: `1px solid ${tk.sidebarBorder}`
      }}>
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: `1px solid ${tk.sidebarBorder}` }}>
          <h2 style={{ margin: 0, color: tk.headerText, fontSize: 20 }}>MÃ©diathÃ¨que</h2>
          <Button onClick={closeMediaLibrary} style={{ background: "transparent", border: "none", color: tk.tabText, cursor: "pointer", fontSize: 24 }}>&times;</Button>
        </div>

        {/* TABS */}
        <div style={{ display: "flex", padding: "0 24px", borderBottom: `1px solid ${tk.sidebarBorder}` }}>
          <Button
            onClick={() => setActiveTab("upload")}
            style={{
              padding: "16px 20px", background: "transparent", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600,
              color: activeTab === "upload" ? tk.headerText : tk.tabText,
              borderBottom: activeTab === "upload" ? `2px solid ${tk.headerText}` : "2px solid transparent",
            }}
          >
            TÃ©lÃ©verser des fichiers
          </Button>
          <Button
            onClick={() => setActiveTab("library")}
            style={{
              padding: "16px 20px", background: "transparent", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600,
              color: activeTab === "library" ? tk.headerText : tk.tabText,
              borderBottom: activeTab === "library" ? `2px solid ${tk.headerText}` : "2px solid transparent",
            }}
          >
            MÃ©diathÃ¨que
          </Button>
        </div>

        {/* SEARCH BAR (Only in Library Tab) */}
        {activeTab === "library" && (
          <div style={{ padding: "12px 24px", borderBottom: `1px solid ${tk.sidebarBorder}`, background: tk.canvasBg }}>
            <input
              type="text"
              placeholder="Rechercher par nom de fichier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%", maxWidth: 400, padding: "8px 12px", borderRadius: 4, border: `1px solid ${tk.sidebarBorder}`,
                background: tk.sidebar, color: tk.headerText, outline: "none"
              }}
            />
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}>
              {[
                { value: "all", label: "Tous" },
                { value: "image", label: "Images" },
                { value: "video", label: "VidÃ©os" },
                { value: "audio", label: "Audio" },
                { value: "document", label: "Documents" },
                { value: "font", label: "Fonts" },
                { value: "archive", label: "Archives" },
                { value: "other", label: "Autres" },
              ].map((option) => (
                <Button
                  key={option.value}
                  onClick={() => setCategoryFilter(option.value)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    border: `1px solid ${categoryFilter === option.value ? tk.headerText : tk.sidebarBorder}`,
                    background: categoryFilter === option.value ? tk.headerText : "transparent",
                    color: categoryFilter === option.value ? tk.sidebar : tk.tabText,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* CONTENT */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          
          {/* UPLOAD TAB */}
          {activeTab === "upload" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 24, overflowY: "auto", background: tk.canvasBg }}>
              <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: tk.tabText, marginBottom: 4, fontWeight: 600 }}>Dossier de destination</label>
                  <input type="text" value={uploadFolder} onChange={e => setUploadFolder(e.target.value)} placeholder="/images" style={{ width: "100%", padding: "8px 12px", borderRadius: 4, border: `1px solid ${tk.sidebarBorder}`, background: tk.sidebar, color: tk.headerText, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: tk.tabText, marginBottom: 4, fontWeight: 600 }}>Tags (sÃ©parÃ©s par des virgules)</label>
                  <input type="text" value={uploadTags} onChange={e => setUploadTags(e.target.value)} placeholder="logo, header, summer" style={{ width: "100%", padding: "8px 12px", borderRadius: 4, border: `1px solid ${tk.sidebarBorder}`, background: tk.sidebar, color: tk.headerText, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", border: `2px dashed ${isDragging ? "#3b82f6" : tk.sidebarBorder}`, borderRadius: 8, padding: 60, textAlign: "center", background: isDragging ? "rgba(59, 130, 246, 0.1)" : tk.sidebar, transition: "all 0.2s" }}
              >
                <h3 style={{ color: tk.headerText, marginBottom: 16 }}>DÃ©posez des fichiers n'importe oÃ¹ pour les tÃ©lÃ©verser</h3>
                <p style={{ color: tk.tabText, marginBottom: 24 }}>ou</p>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.svg,.woff,.woff2,.ttf"
                  onChange={handleUpload}
                  style={{ display: "none" }}
                  ref={fileInputRef}
                />
                <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} style={{ padding: "10px 24px", background: tk.headerText, color: tk.sidebar, border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}>
                  {isUploading ? "TÃ©lÃ©versement..." : "SÃ©lectionner des fichiers"}
                </Button>
              </div>
            </div>
          )}

          {/* LIBRARY TAB */}
          {activeTab === "library" && (
            <>
              {/* GRID */}
              <div style={{ flex: 1, padding: 24, overflowY: "auto", background: tk.canvasBg }}>
                
                {/* BREADCRUMBS */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, color: tk.tabText, fontSize: 14 }}>
                  <span onClick={() => setCurrentFolder("/")} style={{ cursor: "pointer", color: currentFolder === "/" ? tk.headerText : tk.tabText, fontWeight: currentFolder === "/" ? 600 : 400 }}>Home</span>
                  {currentFolder !== "/" && currentFolder.split("/").filter(Boolean).map((part, i, arr) => {
                    const path = "/" + arr.slice(0, i + 1).join("/");
                    const isLast = i === arr.length - 1;
                    return (
                      <React.Fragment key={path}>
                        <span>/</span>
                        <span onClick={() => setCurrentFolder(path)} style={{ cursor: isLast ? "default" : "pointer", color: isLast ? tk.headerText : tk.tabText, fontWeight: isLast ? 600 : 400 }}>
                          {part}
                        </span>
                      </React.Fragment>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Nouveau dossier"
                      style={{ padding: "8px 12px", borderRadius: 4, border: `1px solid ${tk.sidebarBorder}`, background: tk.sidebar, color: tk.headerText, outline: "none" }}
                    />
                    <Button
                      onClick={createFolder}
                      disabled={isCreatingFolder}
                      style={{ padding: "8px 16px", borderRadius: 4, border: "none", background: tk.headerText, color: tk.sidebar, cursor: "pointer", fontWeight: 600 }}
                    >
                      {isCreatingFolder ? "CrÃ©ation..." : "CrÃ©er le dossier"}
                    </Button>
                  </div>
                  {folderError && <div style={{ color: "#f87171", fontSize: 12 }}>{folderError}</div>}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
                  {(folders.filter((folder) => folder.parentPath === currentFolder).map((folder) => (
                    <div
                      key={folder._id}
                      onClick={() => setCurrentFolder(folder.path)}
                      style={{
                        padding: "10px 16px",
                        borderRadius: 8,
                        border: `1px solid ${tk.sidebarBorder}`,
                        background: tk.sidebar,
                        color: tk.headerText,
                        cursor: "pointer",
                      }}
                    >
                      ðŸ“ {folder.name}
                    </div>
                  ))).length === 0 && (
                    <div style={{ color: tk.tabText, fontSize: 12 }}>Aucun sous-dossier dans ce dossier.</div>
                  )}
                </div>

                {isLoading ? (
                  <div style={{ color: tk.tabText }}>Chargement...</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 16 }}>
                    
                    {/* FOLDERS */}
                    {Array.from(new Set(
                      assets.filter(a => a.folder !== currentFolder && (a.folder || "/").startsWith(currentFolder))
                            .map(a => {
                              const remaining = (a.folder || "/").substring(currentFolder === "/" ? 1 : currentFolder.length + 1);
                              return remaining.split("/")[0];
                            })
                            .filter(Boolean)
                    )).map(folderName => {
                      const targetPath = currentFolder === "/" ? `/${folderName}` : `${currentFolder}/${folderName}`;
                      return (
                        <div
                          key={targetPath}
                          onClick={() => setCurrentFolder(targetPath)}
                          style={{
                            aspectRatio: "1/1", background: tk.sidebar, border: `1px solid ${tk.sidebarBorder}`, borderRadius: 4, cursor: "pointer",
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: tk.headerText
                          }}
                        >
                          <div style={{ fontSize: 40, marginBottom: 10 }}>ðŸ“</div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{folderName}</div>
                        </div>
                      );
                    })}

                    {/* FILES */}
                    {assets.filter(a => (a.folder || "/") === currentFolder && a.filename.toLowerCase().includes(searchQuery.toLowerCase())).map((asset) => {
                      const isSelected = selectedAsset?._id === asset._id;
                      return (
                        <div
                          key={asset._id}
                          onClick={() => setSelectedAsset(asset)}
                          style={{
                            position: "relative",
                            aspectRatio: "1/1",
                            background: tk.sidebar,
                            border: `3px solid ${isSelected ? "#3b82f6" : tk.sidebarBorder}`,
                            borderRadius: 4,
                            cursor: "pointer",
                            overflow: "hidden"
                          }}
                        >
                          {renderThumbnail(asset, true)}
                          {isSelected && (
                            <div style={{ position: "absolute", top: 4, right: 4, background: "#3b82f6", color: "white", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              âœ“
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* DETAILS PANE */}
              <div style={{ width: 300, background: tk.sidebar, borderLeft: `1px solid ${tk.sidebarBorder}`, padding: 24, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                <h3 style={{ margin: "0 0 16px 0", color: tk.headerText }}>DÃ©tails du fichier</h3>
                {selectedAsset ? (
                  <>
                    <div style={{ marginBottom: 16, background: tk.canvasBg, padding: 8, borderRadius: 4, aspectRatio: "1/1" }}>
                      {renderThumbnail(selectedAsset, false)}
                    </div>
                    <div style={{ color: tk.headerText, fontSize: 13, wordBreak: "break-all", marginBottom: 8 }}>
                      <strong>Nom:</strong><br /> {selectedAsset.filename}
                    </div>
                    <div style={{ color: tk.headerText, fontSize: 13, marginBottom: 8 }}>
                      <strong>Type:</strong> {selectedAsset.mimeType}
                    </div>
                    <div style={{ color: tk.headerText, fontSize: 13, marginBottom: 8 }}>
                      <strong>Dossier:</strong> {selectedAsset.folder || "/"}
                    </div>
                    {selectedAsset.tags && selectedAsset.tags.length > 0 && (
                      <div style={{ color: tk.headerText, fontSize: 13, marginBottom: 8 }}>
                        <strong>Tags:</strong> {selectedAsset.tags.join(", ")}
                      </div>
                    )}
                    {selectedAsset.size && (
                      <div style={{ color: tk.headerText, fontSize: 13, marginBottom: 8 }}>
                        <strong>Taille:</strong> {(selectedAsset.size / 1024).toFixed(1)} KB
                      </div>
                    )}
                    <div style={{ marginTop: "auto", paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                      {selectedAsset?.mimeType?.startsWith("image/") && (
                        <Button
                          onClick={() => {
                            setCropAssetSrc(selectedAsset.url);
                            setCropMimeType(selectedAsset.mimeType || "image/jpeg");
                          }}
                          style={{
                            background: "rgba(37,99,235,0.12)", color: "#60a5fa",
                            border: "1px solid rgba(96,165,250,0.4)", borderRadius: 4,
                            cursor: "pointer", padding: "6px 12px", fontWeight: 600, fontSize: 13,
                          }}
                        >
                          âœ‚ï¸ Recadrer (variante)
                        </Button>
                      )}
                      <Button
                        onClick={() => handleDelete(selectedAsset._id)}
                        style={{ color: "#ef4444", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                      >
                        Supprimer dÃ©finitivement
                      </Button>
                    </div>
                  </>
                ) : (
                  <div style={{ color: tk.tabText, fontSize: 13 }}>SÃ©lectionnez un fichier pour voir ses dÃ©tails.</div>
                )}
              </div>
            </>
          )}
        </div>

        {/* FOOTER */}
        {activeTab === "library" && (
          <div style={{ padding: "16px 24px", borderTop: `1px solid ${tk.sidebarBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ color: tk.tabText, fontSize: 13 }}>
              {selectedAsset ? "1 Ã©lÃ©ment sÃ©lectionnÃ©" : ""}
            </div>
            <Button
              onClick={handleSelect}
              disabled={!selectedAsset}
              style={{
                padding: "8px 24px", background: selectedAsset ? "#3b82f6" : tk.sidebarBorder, color: "white", border: "none", borderRadius: 4,
                cursor: selectedAsset ? "pointer" : "not-allowed", fontWeight: 600
              }}
            >
              SÃ©lectionner
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaLibraryModal;
