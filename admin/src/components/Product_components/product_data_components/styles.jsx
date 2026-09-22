import React from "react";
import { FiHelpCircle } from "react-icons/fi";

// ---- WooCommerce design tokens ------------------------------------------
// Colors resolve to CSS variables (defined in assets/css/custom.css) so the
// Product data card follows the app light/dark theme.
export const W = {
  bg: "var(--w-bg)",
  sidebar: "var(--w-sidebar)",
  border: "var(--w-border)",
  inputBorder: "var(--w-input-border)",
  primary: "var(--w-primary)",
  text: "var(--w-text)",
  textSecondary: "var(--w-text-secondary)",
};

export const WFONT = "Inter, 'Open Sans', ui-sans-serif, system-ui, sans-serif";

export const wInput = {
  height: 36,
  width: "100%",
  borderRadius: 4,
  border: `1px solid ${W.inputBorder}`,
  padding: "0 8px",
  fontSize: 14,
  color: W.text,
  background: "var(--w-input-bg)",
  outline: "none",
};

// Red asterisk marking a field the form will not submit without. Rendered by
// the label components so every required field is flagged the same way, in the
// WordPress admin red rather than the app's own danger color, to match the
// palette the rest of this card uses.
export const RequiredMark = ({ title }) => (
  <span title={title} style={{ color: "#D63638", marginLeft: 3 }}>
    *
  </span>
);

// small circular help icon shown at the far right of a field row
export const HelpIcon = ({ title }) => (
  <span title={title} className="flex items-center justify-center cursor-help">
    <FiHelpCircle size={16} style={{ color: W.textSecondary }} />
  </span>
);

// label column (170px) + control column (300px) + help icon on the far right
export const Field = ({ label, help, required, requiredTitle, children }) => (
  <div className="flex items-start" style={{ marginBottom: 18 }}>
    <label
      style={{
        width: 170,
        minWidth: 170,
        fontSize: 14,
        fontWeight: 600,
        color: W.text,
        paddingTop: 8,
      }}
    >
      {label}
      {required && <RequiredMark title={requiredTitle} />}
    </label>
    <div style={{ width: 300, maxWidth: "100%" }}>{children}</div>
    <div className="flex-1 flex justify-end" style={{ paddingTop: 9 }}>
      {help ? <HelpIcon title={help} /> : null}
    </div>
  </div>
);

// placeholder for tabs that have no backend fields yet
export const TabPlaceholder = ({ name }) => (
  <p style={{ fontSize: 14, color: W.textSecondary }}>
    No {name} options available for this product yet.
  </p>
);
