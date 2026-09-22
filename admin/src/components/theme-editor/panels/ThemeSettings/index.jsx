import React, { useState } from "react";
import { useEditor } from "../../hooks/editor/EditorProvider";
import { DEFAULT_THEME_SETTINGS } from "../../core/defaultThemeSettings";
import {
import { Button } from "@sofia/ui";
  BrandingSection,
  ColorsSection,
  SpacingSection,
  RadiusSection,
  ShadowsSection,
  TypographyScaleSection,
  BreakpointsSection,
  TypographySection,
  LayoutSection,
  ButtonsSection,
  CardsSection,
  FormsSection,
  AnimationsSection,
  CustomCssSection,
  DarkModeSection,
} from "./sections";

/* â”€â”€â”€ 9-section navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const NAV = [
  { id: "branding",    icon: "ðŸŽ¨", label: "Branding" },
  { id: "colors",      icon: "ðŸŒˆ", label: "Colors",      badge: "â­" },
  { id: "darkMode",    icon: "ðŸŒ™", label: "Dark Mode" },
  { id: "typography",  icon: "Tt", label: "Typography" },
  { id: "typescale",   icon: "Aa", label: "Type Scale" },
  { id: "spacing",     icon: "â†”ï¸", label: "Spacing" },
  { id: "radius",      icon: "â—»ï¸", label: "Radius" },
  { id: "shadows",     icon: "â˜ï¸", label: "Shadows" },
  { id: "breakpoints", icon: "ðŸ“±", label: "Breakpoints" },
  { id: "layout",      icon: "âŠž",  label: "Layout" },
  { id: "buttons",     icon: "â–¡",  label: "Buttons" },
  { id: "cards",       icon: "â–­",  label: "Cards" },
  { id: "forms",       icon: "âœŽ",  label: "Forms" },
  { id: "animations",  icon: "âœ¨", label: "Animations" },
  { id: "customCss",   icon: "</>", label: "Custom CSS" },
];

const SECTION_MAP = {
  branding:   BrandingSection,
  colors:     ColorsSection,
  darkMode:   DarkModeSection,
  typescale:  TypographyScaleSection,
  spacing:    SpacingSection,
  radius:     RadiusSection,
  shadows:    ShadowsSection,
  breakpoints: BreakpointsSection,
  typography: TypographySection,
  layout:     LayoutSection,
  buttons:    ButtonsSection,
  cards:      CardsSection,
  forms:      FormsSection,
  animations: AnimationsSection,
  customCss:  CustomCssSection,
};

/* â”€â”€â”€ Merge stored settings with defaults (only the nav sections) â”€â”€â”€â”€â”€â”€â”€ */
function buildInitialSettings(theme) {
  const merged = {};
  NAV.forEach(({ id }) => {
    merged[id] = {
      ...DEFAULT_THEME_SETTINGS[id],
      ...(theme?.settings?.[id] ?? {}),
    };
  });
  return merged;
}

/* â”€â”€â”€ Inline styles (all driven by tk tokens â€” zero hardcoded colors) â”€â”€â”€â”€â”€â”€ */
const styles = {
  overlay: (tk) => ({
    position: "fixed", inset: 0, zIndex: 10001,
    display: "flex",
    background: "rgba(0,0,0,0.55)",
    backdropFilter: "blur(4px)",
  }),
  panel: (tk) => ({
    width: 740, maxWidth: "96vw", height: "100%",
    display: "flex", flexDirection: "column",
    background: tk.sidebar,
    borderLeft: `1px solid ${tk.sidebarBorder}`,
    boxShadow: "-8px 0 40px rgba(0,0,0,0.45)",
  }),
  header: (tk) => ({
    padding: "14px 20px",
    borderBottom: `1px solid ${tk.sidebarBorder}`,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: tk.header, flexShrink: 0,
  }),
  headerTitle: (tk) => ({
    fontWeight: 700, fontSize: 15, color: tk.headerText,
  }),
  headerSub: (tk) => ({
    fontSize: 11, color: tk.tabText, marginTop: 2,
  }),
  btnReset: (tk) => ({
    padding: "5px 12px", background: "transparent",
    border: `1px solid ${tk.sidebarBorder}`,
    color: tk.tabText, borderRadius: 6,
    cursor: "pointer", fontSize: 12,
  }),
  btnSave: (saved, tk) => ({
    padding: "5px 16px",
    background: saved ? tk.tabActiveText : tk.tabActiveBorder,
    color: tk.header, border: "none", borderRadius: 6,
    cursor: "pointer", fontSize: 12, fontWeight: 700,
    transition: "background 0.2s",
    opacity: 1,
  }),
  btnClose: (tk) => ({
    background: "transparent", border: "none",
    color: tk.tabText, fontSize: 20, cursor: "pointer",
    padding: "4px 8px", lineHeight: 1,
  }),
  body: { display: "flex", flex: 1, overflow: "hidden" },
  nav: (tk) => ({
    width: 168, flexShrink: 0,
    borderRight: `1px solid ${tk.sidebarBorder}`,
    overflowY: "auto", padding: "10px 0",
    background: tk.sidebar,
  }),
  navBtn: (isActive, tk) => ({
    width: "100%", textAlign: "left",
    padding: "9px 14px", display: "flex",
    alignItems: "center", gap: 9,
    background: isActive ? tk.tabActive : "transparent",
    color: isActive ? tk.tabActiveText : tk.tabText,
    borderLeft: isActive ? `3px solid ${tk.tabActiveBorder}` : "3px solid transparent",
    border: "none", cursor: "pointer",
    fontSize: 12.5, fontWeight: isActive ? 700 : 400,
    transition: "all 0.15s",
  }),
  content: { flex: 1, overflowY: "auto", padding: "20px 24px" },
  footer: (tk) => ({
    padding: "11px 20px", borderTop: `1px solid ${tk.sidebarBorder}`,
    background: tk.header, flexShrink: 0,
    display: "flex", justifyContent: "space-between", alignItems: "center",
  }),
  footerHint: (tk) => ({
    fontSize: 11, color: tk.tabText,
  }),
  btnSaveFooter: (saved, tk) => ({
    padding: "8px 24px",
    background: saved ? tk.tabActiveText : tk.tabActiveBorder,
    color: tk.header, border: "none", borderRadius: 8,
    cursor: "pointer", fontSize: 13, fontWeight: 700,
    transition: "background 0.2s",
  }),
};

/* â”€â”€â”€ Main Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const ThemeSettingsPanel = ({ onClose }) => {
  const { tk, theme, updateThemeSettings } = useEditor();
  const [activeSection, setActiveSection] = useState("colors");
  const [settings, setSettings] = useState(() => buildInitialSettings(theme));
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  /* Update a single key inside a section */
  const updateSection = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (saving) return;
    try {
      setSaving(true);
      // Merge nav sections back with the hidden sections already in theme.settings
      const fullSettings = {
        ...(theme?.settings ?? {}),
        ...settings,
      };
      await updateThemeSettings(fullSettings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error("Failed to save theme settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const fresh = {};
    NAV.forEach(({ id }) => { fresh[id] = { ...DEFAULT_THEME_SETTINGS[id] }; });
    setSettings(fresh);
    setSaved(false);
  };

  const ActiveSection = SECTION_MAP[activeSection];
  const activeNav = NAV.find(n => n.id === activeSection);

  return (
    <div style={styles.overlay(tk)}>
      {/* Backdrop */}
      <div style={{ flex: 1 }} onClick={onClose} />

      {/* Sliding panel */}
      <div style={styles.panel(tk)}>

        {/* â”€â”€ Header â”€â”€ */}
        <div style={styles.header(tk)}>
          <div>
            <div style={styles.headerTitle(tk)}>âš™ï¸ Theme Settings</div>
            <div style={styles.headerSub(tk)}>
              {activeNav?.icon} {activeNav?.label}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Button onClick={handleReset} style={styles.btnReset(tk)}>Reset</Button>
            <Button onClick={handleSave} style={styles.btnSave(saved, tk)} disabled={saving}>
              {saving ? "Savingâ€¦" : saved ? "âœ“ Saved!" : "Save"}
            </Button>
            <Button onClick={onClose} style={styles.btnClose(tk)}>âœ•</Button>
          </div>
        </div>

        {/* â”€â”€ Body = Nav + Content â”€â”€ */}
        <div style={styles.body}>

          {/* Left nav */}
          <div style={styles.nav(tk)}>
            {NAV.map(item => {
              const isActive = activeSection === item.id;
              return (
                <Button key={item.id} onClick={() => setActiveSection(item.id)}
                  style={styles.navBtn(isActive, tk)}>
                  <span style={{ fontSize: 13, minWidth: 18 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && (
                    <span style={{ fontSize: 10, marginLeft: "auto" }}>{item.badge}</span>
                  )}
                </Button>
              );
            })}
          </div>

          {/* Right content */}
          <div style={styles.content}>
            {ActiveSection && (
              <ActiveSection
                s={settings[activeSection] || {}}
                set={(key, value) => updateSection(activeSection, key, value)}
                tk={tk}
              />
            )}
          </div>
        </div>

        {/* â”€â”€ Footer â”€â”€ */}
        <div style={styles.footer(tk)}>
          <span style={styles.footerHint(tk)}>
            Changes apply to the live store after saving
          </span>
          <Button onClick={handleSave} style={styles.btnSaveFooter(saved, tk)} disabled={saving}>
            {saving ? "Savingâ€¦" : saved ? "âœ“ Saved!" : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ThemeSettingsPanel;

