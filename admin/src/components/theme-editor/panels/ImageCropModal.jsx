import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@sofia/ui";

/**
 * ImageCropModal â€” zero-dependency crop UI built on plain Canvas API.
 *
 * Props:
 *   imageSrc    {string}   â€” objectURL or https URL to crop
 *   onCancel    {fn}       â€” called when user clicks "Passer" or closes
 *   onCropComplete {fn(Blob, mimeType)} â€” called with the cropped Blob
 *   mimeType    {string}   â€” output mime type (default "image/jpeg")
 */
const ASPECT_PRESETS = [
  { label: "Libre", value: null },
  { label: "1:1", value: 1 },
  { label: "16:9", value: 16 / 9 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
];

const HANDLE_SIZE = 10;
const MIN_CROP_PX = 20;

export default function ImageCropModal({ imageSrc, onCancel, onCropComplete, mimeType = "image/jpeg" }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const containerRef = useRef(null);

  // Displayed image dimensions inside canvas
  const [displayScale, setDisplayScale] = useState({ x: 1, y: 1 });
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 400 });

  // Crop rect in canvas-pixel coords
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [aspectRatio, setAspectRatio] = useState(null); // null = free

  // Drag state
  const dragState = useRef(null); // { type: "move"|"tl"|"tr"|"bl"|"br"|"new", startX, startY, origCrop }

  // â”€â”€ Load image & initialise crop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      const container = containerRef.current;
      if (!container) return;

      const maxW = container.clientWidth - 48;
      const maxH = container.clientHeight - 48;
      const scaleW = maxW / img.naturalWidth;
      const scaleH = maxH / img.naturalHeight;
      const scale = Math.min(scaleW, scaleH, 1);

      const cw = Math.round(img.naturalWidth * scale);
      const ch = Math.round(img.naturalHeight * scale);
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      setCanvasSize({ w: cw, h: ch });
      setDisplayScale({ x: img.naturalWidth / cw, y: img.naturalHeight / ch });

      // Default crop = 80% centred
      const margin = 0.1;
      setCrop({
        x: Math.round(cw * margin),
        y: Math.round(ch * margin),
        w: Math.round(cw * (1 - 2 * margin)),
        h: Math.round(ch * (1 - 2 * margin)),
      });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // â”€â”€ Draw â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Dark overlay outside crop
    ctx.fillStyle = "rgba(0,0,0,0.52)";
    ctx.fillRect(0, 0, canvas.width, crop.y);                               // top
    ctx.fillRect(0, crop.y, crop.x, crop.h);                                // left
    ctx.fillRect(crop.x + crop.w, crop.y, canvas.width - crop.x - crop.w, crop.h); // right
    ctx.fillRect(0, crop.y + crop.h, canvas.width, canvas.height - crop.y - crop.h); // bottom

    // Crop border
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(crop.x, crop.y, crop.w, crop.h);

    // Rule-of-thirds grid
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(crop.x + (crop.w / 3) * i, crop.y); ctx.lineTo(crop.x + (crop.w / 3) * i, crop.y + crop.h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(crop.x, crop.y + (crop.h / 3) * i); ctx.lineTo(crop.x + crop.w, crop.y + (crop.h / 3) * i); ctx.stroke();
    }

    // Corner handles
    ctx.fillStyle = "#fff";
    const hs = HANDLE_SIZE;
    [
      [crop.x - hs / 2, crop.y - hs / 2],
      [crop.x + crop.w - hs / 2, crop.y - hs / 2],
      [crop.x - hs / 2, crop.y + crop.h - hs / 2],
      [crop.x + crop.w - hs / 2, crop.y + crop.h - hs / 2],
    ].forEach(([hx, hy]) => ctx.fillRect(hx, hy, hs, hs));
  }, [crop]);

  useEffect(() => { draw(); }, [draw, canvasSize]);

  // â”€â”€ Mouse helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const getCanvasPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const hitHandle = (pos) => {
    const hs = HANDLE_SIZE;
    const { x, y, w, h } = crop;
    if (Math.abs(pos.x - x) <= hs && Math.abs(pos.y - y) <= hs) return "tl";
    if (Math.abs(pos.x - (x + w)) <= hs && Math.abs(pos.y - y) <= hs) return "tr";
    if (Math.abs(pos.x - x) <= hs && Math.abs(pos.y - (y + h)) <= hs) return "bl";
    if (Math.abs(pos.x - (x + w)) <= hs && Math.abs(pos.y - (y + h)) <= hs) return "br";
    if (pos.x >= x && pos.x <= x + w && pos.y >= y && pos.y <= y + h) return "move";
    return "new";
  };

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const applyAspect = (w, h, aspect) => {
    if (!aspect) return { w, h };
    return { w, h: Math.round(w / aspect) };
  };

  const onMouseDown = (e) => {
    const pos = getCanvasPos(e);
    const type = hitHandle(pos);
    dragState.current = { type, startX: pos.x, startY: pos.y, origCrop: { ...crop } };
  };

  const onMouseMove = useCallback((e) => {
    if (!dragState.current) return;
    const pos = getCanvasPos(e);
    const dx = pos.x - dragState.current.startX;
    const dy = pos.y - dragState.current.startY;
    const orig = dragState.current.origCrop;
    const cw = canvasSize.w, ch = canvasSize.h;

    setCrop((prev) => {
      let next = { ...prev };
      const { type } = dragState.current;

      if (type === "move") {
        next.x = clamp(orig.x + dx, 0, cw - orig.w);
        next.y = clamp(orig.y + dy, 0, ch - orig.h);
      } else if (type === "new") {
        const x1 = clamp(Math.min(dragState.current.startX, pos.x), 0, cw);
        const y1 = clamp(Math.min(dragState.current.startY, pos.y), 0, ch);
        const x2 = clamp(Math.max(dragState.current.startX, pos.x), 0, cw);
        const y2 = clamp(Math.max(dragState.current.startY, pos.y), 0, ch);
        const rawW = x2 - x1, rawH = y2 - y1;
        const { w, h } = applyAspect(rawW, rawH, aspectRatio);
        next = { x: x1, y: y1, w: Math.max(w, MIN_CROP_PX), h: Math.max(h, MIN_CROP_PX) };
      } else {
        // Handle resize
        let { x, y, w, h } = orig;
        if (type === "tl") { x = clamp(orig.x + dx, 0, orig.x + orig.w - MIN_CROP_PX); y = clamp(orig.y + dy, 0, orig.y + orig.h - MIN_CROP_PX); w = orig.x + orig.w - x; h = orig.y + orig.h - y; }
        if (type === "tr") { w = clamp(orig.w + dx, MIN_CROP_PX, cw - orig.x); y = clamp(orig.y + dy, 0, orig.y + orig.h - MIN_CROP_PX); h = orig.y + orig.h - y; }
        if (type === "bl") { x = clamp(orig.x + dx, 0, orig.x + orig.w - MIN_CROP_PX); w = orig.x + orig.w - x; h = clamp(orig.h + dy, MIN_CROP_PX, ch - orig.y); }
        if (type === "br") { w = clamp(orig.w + dx, MIN_CROP_PX, cw - orig.x); h = clamp(orig.h + dy, MIN_CROP_PX, ch - orig.y); }
        const adjusted = applyAspect(w, h, aspectRatio);
        next = { x, y, w: adjusted.w, h: adjusted.h };
      }
      return next;
    });
  }, [canvasSize, aspectRatio]);

  const onMouseUp = () => { dragState.current = null; };

  // â”€â”€ Aspect preset change â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const changeAspect = (ratio) => {
    setAspectRatio(ratio);
    if (ratio) {
      setCrop((c) => ({ ...c, h: Math.round(c.w / ratio) }));
    }
  };

  // â”€â”€ Crop & export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;
    const outputCanvas = document.createElement("canvas");
    // Map canvas coords back to natural image coords
    const sx = Math.round(crop.x * displayScale.x);
    const sy = Math.round(crop.y * displayScale.y);
    const sw = Math.round(crop.w * displayScale.x);
    const sh = Math.round(crop.h * displayScale.y);
    outputCanvas.width = sw;
    outputCanvas.height = sh;
    const ctx = outputCanvas.getContext("2d");
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    outputCanvas.toBlob((blob) => {
      if (blob) onCropComplete(blob, mimeType);
    }, mimeType, 0.92);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100100,
      background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 16,
    }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14, marginRight: 8 }}>âœ‚ï¸ Recadrer</span>
        {ASPECT_PRESETS.map((p) => (
          <Button
            key={p.label}
            onClick={() => changeAspect(p.value)}
            style={{
              padding: "5px 12px", borderRadius: 6, border: "1px solid",
              borderColor: aspectRatio === p.value ? "#60a5fa" : "#475569",
              background: aspectRatio === p.value ? "rgba(96,165,250,0.15)" : "transparent",
              color: aspectRatio === p.value ? "#93c5fd" : "#94a3b8",
              cursor: "pointer", fontSize: 12, fontWeight: 600,
            }}
          >
            {p.label}
          </Button>
        ))}
        <div style={{ width: 1, height: 24, background: "#334155", margin: "0 4px" }} />
        <span style={{ color: "#64748b", fontSize: 12 }}>
          {crop.w && crop.h ? `${Math.round(crop.w * displayScale.x)} Ã— ${Math.round(crop.h * displayScale.y)} px` : ""}
        </span>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        style={{ width: "80vw", maxWidth: 900, height: "65vh", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          style={{ display: "block", cursor: "crosshair", userSelect: "none", maxWidth: "100%", maxHeight: "100%" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12 }}>
        <Button
          onClick={onCancel}
          style={{
            padding: "8px 24px", borderRadius: 6, border: "1px solid #475569",
            background: "transparent", color: "#94a3b8", cursor: "pointer", fontWeight: 600,
          }}
        >
          Passer / Utiliser l'original
        </Button>
        <Button
          onClick={handleConfirm}
          style={{
            padding: "8px 24px", borderRadius: 6, border: "none",
            background: "#2563eb", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14,
          }}
        >
          âœ“ Appliquer le recadrage
        </Button>
      </div>
    </div>
  );
}
