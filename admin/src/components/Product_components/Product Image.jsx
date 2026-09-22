import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiPlus, FiChevronUp, FiChevronDown, FiX } from "react-icons/fi";

//internal import
import Uploader from "@/components/image-uploader/Uploader";
import { notifyError } from "@/utils/toast";
import { uploadImage, UPLOAD_FOLDERS } from "@/utils/uploadImage";
import { C, cardStyle, sectionTitle } from "./styles";
import { Button } from "@sofia/ui";

// Two chevrons rather than one toggle: one closes the card, the other opens
// it, and whichever matches the current state has nothing to do, so it stays
// inert. Both cards in this file use it.
const CollapseToggle = ({ open, setOpen, collapseLabel, expandLabel }) => (
  <div className="flex items-center" style={{ gap: 10, color: C.textSecondary }}>
    {[
      {
        key: "collapse",
        Icon: FiChevronUp,
        label: collapseLabel,
        onClick: () => setOpen(false),
        disabled: !open,
      },
      {
        key: "expand",
        Icon: FiChevronDown,
        label: expandLabel,
        onClick: () => setOpen(true),
        disabled: open,
      },
    ].map(({ key, Icon, label, onClick, disabled }) => (
      <Button
        key={key}
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={label}
        aria-label={label}
        className="flex"
        style={{
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.4 : 1,
          transition: "opacity .15s ease",
        }}
      >
        <Icon size={16} />
      </Button>
    ))}
  </div>
);

const ProductImage = ({
  mainImage,
  setMainImage,
  extraGallery,
  setExtraGallery,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [imageOpen, setImageOpen] = useState(true);
  const [open, setOpen] = useState(true);
  // Thumbnail being dragged, and the one it is hovering over.
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const openFilePicker = () => fileInputRef.current?.click();

  // No cap on how many images the gallery takes: the store setting
  // `number_of_image_per_product` no longer gates this picker.
  const handleFiles = async (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    setUploading(true);
    for (const file of selected) {
      try {
        // reusable helper -> saved in public/Productimages, returns the URL
        const url = await uploadImage(file, { folder: UPLOAD_FOLDERS.PRODUCT });
        // No success toast: the thumbnail appearing is the confirmation, and
        // with no cap on the gallery a ten-image pick meant ten toasts.
        // Failures still speak up.
        setExtraGallery((prev) => [...prev, url]);
      } catch (err) {
        notifyError(err?.response?.data?.message || err?.message);
      }
    }
    setUploading(false);
    e.target.value = "";
  };

  const removeGalleryImage = (img) =>
    setExtraGallery((prev) => prev.filter((i) => i !== img));

  const makeImagePrimary = (img) => {
    if (!img || img === mainImage) return;
    setMainImage(img);
    setExtraGallery((prev) => prev.filter((i) => i !== img));
  };

  // The gallery is an ordered list â€” it is stored and shown in this order â€” so
  // the thumbnails can be dragged into place rather than removed and re-added.
  const moveImage = (from, to) => {
    if (from == null || to == null || from === to) return;
    setExtraGallery((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const endDrag = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const collapseLabel = t("productForm.collapse");
  const expandLabel = t("productForm.expand");

  return (
    <>
      {/* Product Image Card */}
      <div
        style={{
          ...cardStyle,
          // a collapsed card is just its title row, so the 280px floor that
          // sizes the uploader must not keep reserving that space
          ...(imageOpen && { minHeight: 280 }),
        }}
        className="p-5"
      >
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: imageOpen ? 12 : 0 }}
        >
          <h3 style={sectionTitle}>{t("productForm.productImage")}</h3>
          <CollapseToggle
            open={imageOpen}
            setOpen={setImageOpen}
            collapseLabel={collapseLabel}
            expandLabel={expandLabel}
          />
        </div>

        {imageOpen && (
          <>
            <p style={{ marginBottom: 12, fontSize: 13, color: C.textSecondary }}>
              {t("productForm.mainImageDesc")}
            </p>
            <Uploader
              folder="product"
              silentSuccess
              imageUrl={mainImage}
              setImageUrl={setMainImage}
            />
          </>
        )}
      </div>

      {/* Product Gallery Card */}
      <div
        style={{
          ...cardStyle,
          boxShadow: "0 1px 2px rgba(16, 24, 40, 0.05)",
        }}
      >
        {/* Header */}
        <div
          className="w-full flex items-center justify-between px-5"
          style={{ height: 52 }}
        >
          <span style={{ ...sectionTitle, fontSize: 15 }}>{t("productForm.productGallery")}</span>
          <CollapseToggle
            open={open}
            setOpen={setOpen}
            collapseLabel={collapseLabel}
            expandLabel={expandLabel}
          />
        </div>

        {/* Divider â€” only while the gallery is open, so a closed card is just
            its header rather than a bar with a line hanging under it */}
        {open && <div style={{ borderTop: `1px solid ${C.border}` }} />}

        {open && (
          <div style={{ padding: 20 }}>
            {/* hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/jpg, image/webp"
              multiple
              onChange={handleFiles}
              style={{ display: "none" }}
            />

            <p style={{ marginBottom: 12, fontSize: 13, color: C.textSecondary }}>
              {t("productForm.galleryDesc")}
              {extraGallery?.length > 1 && (
                <> {t("productForm.dragToReorder")}</>
              )}
            </p>
            <div className="flex flex-wrap items-start gap-3">
              {/* existing gallery thumbnails â€” draggable onto each other to
                  reorder. The dragged one fades, the one under the pointer
                  takes the accent border, so the drop target is never a guess. */}
              {extraGallery?.map((img, i) => (
                <div
                  key={img}
                  className="relative"
                  draggable
                  title={t("productForm.dragToReorder")}
                  onDragStart={(e) => {
                    setDragIndex(i);
                    e.dataTransfer.effectAllowed = "move";
                    // Firefox refuses to start a drag until data is set.
                    e.dataTransfer.setData("text/plain", String(i));
                  }}
                  // Only a thumbnail of this gallery highlights a target: a file
                  // dragged in from the desktop leaves `dragIndex` null, and
                  // would otherwise light up a drop target it cannot fill.
                  onDragEnter={() => dragIndex !== null && setOverIndex(i)}
                  onDragOver={(e) => {
                    // Without this the drop event never fires.
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    // The index comes from state, not from the payload: an
                    // outside drop carries no index, and reading it back would
                    // give 0 â€” a real position â€” instead of nothing.
                    moveImage(dragIndex, i);
                    endDrag();
                  }}
                  onDragEnd={endDrag}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 6,
                    border: `1px solid ${
                      overIndex === i && dragIndex !== i ? C.primary : C.border
                    }`,
                    overflow: "hidden",
                    cursor: dragIndex === i ? "grabbing" : "grab",
                    opacity: dragIndex === i ? 0.4 : 1,
                    transition: "opacity .15s ease, border-color .15s ease",
                  }}
                >
                  <img
                    src={img}
                    alt="gallery"
                    // Left draggable, the image would start a drag of its own.
                    draggable={false}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <Button
                    type="button"
                    onClick={() => makeImagePrimary(img)}
                    className="absolute flex items-center justify-center"
                    style={{
                      top: 2,
                      left: 2,
                      height: 18,
                      padding: "0 6px",
                      borderRadius: 999,
                      background: "rgba(17, 24, 39, 0.7)",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    {t("productForm.main")}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => removeGalleryImage(img)}
                    className="absolute flex items-center justify-center"
                    style={{
                      top: 2,
                      right: 2,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "rgba(17, 24, 39, 0.6)",
                      color: "#fff",
                    }}
                  >
                    <FiX size={12} />
                  </Button>
                </div>
              ))}

              {/* square upload button */}
              <Button
                type="button"
                onClick={openFilePicker}
                disabled={uploading}
                className="flex items-center justify-center"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 6,
                  background: "#F8F9FC",
                  border: `1px solid ${C.border}`,
                  color: C.textSecondary,
                  opacity: uploading ? 0.6 : 1,
                }}
              >
                <FiPlus size={20} />
              </Button>
            </div>

            {/* blue text link */}
            <Button
              type="button"
              onClick={openFilePicker}
              disabled={uploading}
              className="hover:underline"
              style={{
                display: "inline-block",
                marginTop: 14,
                fontFamily: "Inter, Roboto, ui-sans-serif, sans-serif",
                fontSize: 14,
                fontWeight: 500,
                color: C.primary,
                opacity: uploading ? 0.6 : 1,
              }}
            >
              {uploading ? t("productForm.uploading") : t("productForm.addGalleryImages")}
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default ProductImage;
