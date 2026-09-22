import React, { useState } from "react";
import {
  FiBold,
  FiItalic,
  FiList,
  FiLink,
  FiImage,
  FiCode,
  FiChevronUp,
  FiChevronDown,
} from "react-icons/fi";

// Shared WooCommerce-style tokens used by the Product Data card. Re-exported
// here so the sidebar cards (Publish / Categories / Tags) match its look.
import { W, WFONT, wInput } from "./product_data_components/styles";
import { Button } from "@sofia/ui";
export { W, WFONT, wInput };

// ---- Design tokens -------------------------------------------------------
// Colors resolve to CSS variables (defined in assets/css/custom.css) so the
// whole product form follows the app light/dark theme. success/danger stay
// fixed since they read well on both themes.
export const C = {
  primary: "var(--wc-primary)",
  bg: "var(--wc-bg)",
  card: "var(--wc-card)",
  border: "var(--wc-border)",
  textPrimary: "var(--wc-text-primary)",
  textSecondary: "var(--wc-text-secondary)",
  success: "#22C55E",
  danger: "#EF4444",
  activeTab: "var(--wc-active-tab)",
};

export const FONT = "Poppins, ui-sans-serif, system-ui, sans-serif";

export const cardStyle = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
};

export const sectionTitle = {
  fontSize: 20,
  fontWeight: 600,
  color: C.textPrimary,
};

export const labelStyle = {
  width: 150,
  minWidth: 150,
  fontSize: 14,
  fontWeight: 500,
  color: C.textPrimary,
};

export const inputStyle = {
  height: 42,
  width: 300,
  maxWidth: "100%",
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  padding: "0 12px",
  fontSize: 14,
  fontWeight: 400,
  color: C.textPrimary,
  background: C.card,
  outline: "none",
};

// ---- Shared helpers ------------------------------------------------------
export const FieldRow = ({ label, children }) => (
  <div className="flex items-center" style={{ marginBottom: 20 }}>
    <label style={labelStyle}>{label}</label>
    <div className="flex-1">{children}</div>
  </div>
);

// WooCommerce-style meta box: a bordered card (radius 4) with a 44px header
// bar holding the title, matching the Product Data card. `style` sizes the
// card; internal layout is a flex column so scrollable bodies work.
//
// Pass `collapsible` to get the two header chevrons: one closes the card, the
// other opens it, and whichever matches the current state stays inert. Labels
// are props rather than looked up here so this stays a styling module.
export const MetaBox = ({
  title,
  children,
  className = "",
  style,
  bodyStyle,
  collapsible = false,
  collapseLabel,
  expandLabel,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const headerIcons = [
    {
      key: "collapse",
      Icon: FiChevronUp,
      label: collapseLabel,
      onClick: () => setCollapsed(true),
      disabled: collapsed,
    },
    {
      key: "expand",
      Icon: FiChevronDown,
      label: expandLabel,
      onClick: () => setCollapsed(false),
      disabled: !collapsed,
    },
  ];

  return (
    <div
      className={`flex flex-col ${className}`}
      style={{
        background: W.bg,
        border: `1px solid ${W.border}`,
        borderRadius: 4,
        fontFamily: WFONT,
        ...style,
        // a collapsed card is just its header, so any height the caller set
        // for the body must not keep reserving that space
        ...(collapsed && { height: "auto" }),
      }}
    >
      <div
        className="flex items-center justify-between px-4"
        style={{
          height: 44,
          flexShrink: 0,
          borderBottom: collapsed ? "none" : `1px solid ${W.border}`,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: W.text }}>
          {title}
        </span>

        {collapsible && (
          <div
            className="flex items-center"
            style={{ gap: 10, color: W.textSecondary }}
          >
            {headerIcons.map(({ key, Icon, label, onClick, disabled }) => (
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
        )}
      </div>

      {!collapsed && (
        <div
          className="flex-1 min-h-0 flex flex-col"
          style={{ padding: 16, ...bodyStyle }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

// WooCommerce-style primary button (radius 4, blue). Pass extra style to size.
export const wButton = {
  height: 36,
  borderRadius: 4,
  background: W.primary,
  color: "#fff",
  fontSize: 14,
  fontWeight: 500,
  border: "none",
  cursor: "pointer",
};

export const EditorToolbar = ({ height }) => (
  <div
    className="flex items-center gap-3 px-4"
    style={{
      height,
      borderBottom: `1px solid ${C.border}`,
      color: C.textSecondary,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      background: "var(--wc-toolbar-bg)",
    }}
  >
    <FiBold />
    <FiItalic />
    <FiList />
    <FiLink />
    <FiImage />
    <FiCode />
  </div>
);
