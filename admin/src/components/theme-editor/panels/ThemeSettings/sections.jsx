import React from "react";
import { Field, Input, ColorInput, Select, Toggle, SectionTitle, Textarea } from "./SettingsUi";
import { FONT_OPTIONS } from "../../core/fonts";
import { Button } from "@sofia/ui";

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * 1. BRANDING
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export const BrandingSection = ({ s, set }) => (
  <div>
    <SectionTitle>Logo</SectionTitle>
    <Field label="Logo (Desktop) URL">
      <Input value={s.logo} onChange={v => set("logo", v)} placeholder="https://cdn.example.com/logo.svg" />
    </Field>
    {s.logo && (
      <div style={{ marginBottom: 16 }}>
        <img src={s.logo} alt="Logo preview" style={{ maxHeight: 60, maxWidth: "100%", objectFit: "contain", border: "1px solid #333", borderRadius: 6, padding: 4 }} />
      </div>
    )}

    <Field label="Logo (Mobile) URL">
      <Input value={s.logoMobile} onChange={v => set("logoMobile", v)} placeholder="https://cdn.example.com/logo-mobile.svg" />
    </Field>

    <SectionTitle>Favicon</SectionTitle>
    <Field label="Favicon URL">
      <Input value={s.favicon} onChange={v => set("favicon", v)} placeholder="https://cdn.example.com/favicon.ico" />
    </Field>
    {s.favicon && (
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <img src={s.favicon} alt="Favicon preview" style={{ width: 32, height: 32, objectFit: "contain", border: "1px solid #333", borderRadius: 4 }} />
        <span style={{ fontSize: 11, color: "#777" }}>Favicon preview (32Ã—32)</span>

      </div>
    )}
  </div>
);

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * 2. COLORS
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const COLOR_FIELDS = [
  { key: "primary",       label: "Primary",         desc: "Main brand color â€” buttons, links, accents" },

  { key: "secondary",     label: "Secondary",        desc: "Complementary brand color" },
  { key: "accent",        label: "Accent",           desc: "Highlights and badges" },
  { key: "success",       label: "Success",          desc: "Positive feedback states" },
  { key: "warning",       label: "Warning",          desc: "Caution and alerts" },
  { key: "danger",        label: "Danger / Error",   desc: "Destructive actions and errors" },
  { key: "background",    label: "Background",       desc: "Page background" },
  { key: "surface",       label: "Surface",          desc: "Cards and elevated elements" },
  { key: "border",        label: "Border",           desc: "Dividers and outlines" },
  { key: "textPrimary",   label: "Text Primary",     desc: "Body and heading text" },
  { key: "textSecondary", label: "Text Secondary",   desc: "Captions and subtitles" },
  { key: "link",          label: "Link",             desc: "Anchor / hyperlink text" },
];

export const ColorsSection = ({ s, set }) => (
  <div>
    <SectionTitle>Color Palette</SectionTitle>
    <p style={{ fontSize: 11, color: "#888", marginBottom: 20, lineHeight: 1.5 }}>
      These colors are injected as CSS custom properties (<code>--ts-color-*</code>) into the canvas.
      All blocks use them â€” changes apply immediately after saving.

    </p>
    {COLOR_FIELDS.map(({ key, label, desc }) => (
      <Field key={key} label={label} hint={desc}>
        <ColorInput value={s[key]} onChange={v => set(key, v)} />
      </Field>
    ))}
    {/* Live mini palette preview */}
    <SectionTitle>Preview</SectionTitle>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
      {COLOR_FIELDS.slice(0, 8).map(({ key, label }) => (
        <div key={key} title={label} style={{
          width: 32, height: 32, borderRadius: 6,
          background: s[key] || "#ccc",
          border: "2px solid rgba(255,255,255,0.12)",
          flexShrink: 0,
        }} />
      ))}
    </div>
  </div>
);

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * 2b. DARK MODE
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
export const DarkModeSection = ({ s, set }) => (
  <div>
    <SectionTitle>Activer le mode sombre</SectionTitle>
    <Field label="Activer sur la boutique" hint="GÃ©nÃ¨re les variables CSS pour le mode sombre">

      <Toggle checked={s.enabled} onChange={v => set("enabled", v)} />
    </Field>

    {s.enabled && (
      <>
        <Field label="Mode par dÃ©faut" hint="Comment les visiteurs voient le site par dÃ©faut">
          <Select 
            value={s.defaultMode || "system"} 
            onChange={v => set("defaultMode", v)} 
            options={[
              { value: "light", label: "Toujours clair (sauf si basculÃ© manuellement)" },
              { value: "dark", label: "Toujours sombre (sauf si basculÃ© manuellement)" },
              { value: "system", label: "Selon l'appareil du visiteur (recommandÃ©)" },
            ]}
          />
        </Field>

        <SectionTitle>Palette Sombre (Dark Colors)</SectionTitle>
        <p style={{ fontSize: 11, color: "#888", marginBottom: 20, lineHeight: 1.5 }}>
          Ces couleurs remplacent vos couleurs claires quand le mode sombre est actif.
        </p>
        {COLOR_FIELDS.map(({ key, label, desc }) => (
          <Field key={key} label={label} hint={desc}>
            {/* Note: In a real app we'd fetch DEFAULT_DARK_COLORS from a shared constant,
                but for simplicity we let the user define it or it falls back on backend defaults. */}
            <ColorInput value={(s.colors && s.colors[key]) || ""} onChange={v => set("colors", { ...s.colors, [key]: v })} />
          </Field>
        ))}
        {/* Live mini palette preview */}
        <SectionTitle>Preview</SectionTitle>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          {COLOR_FIELDS.slice(0, 8).map(({ key, label }) => (
            <div key={key} title={label} style={{
              width: 32, height: 32, borderRadius: 6,
              background: (s.colors && s.colors[key]) || "#333",
              border: "2px solid rgba(255,255,255,0.12)",
              flexShrink: 0,
            }} />
          ))}
        </div>
      </>
    )}
  </div>
);

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * 3. TYPOGRAPHY
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */


export const TypographySection = ({ s, set }) => (
  <div>
    <SectionTitle>Font Families</SectionTitle>
    <Field label="Heading Font">
      <Select value={s.headingFont} onChange={v => set("headingFont", v)} options={FONT_OPTIONS} />
    </Field>
    <Field label="Body Font">
      <Select value={s.bodyFont} onChange={v => set("bodyFont", v)} options={FONT_OPTIONS} />
    </Field>
    <Field label="Button Font">
      <Select value={s.buttonFont} onChange={v => set("buttonFont", v)} options={FONT_OPTIONS} />
    </Field>

    <SectionTitle>Sizing & Spacing</SectionTitle>
    <Field label="Font Size Scale" hint="Multiplier applied to all font sizes (default: 1)">
      <Input value={s.fontSizeScale} onChange={v => set("fontSizeScale", v)} placeholder="1" />
    </Field>
    <Field label="Line Height" hint="Body text line-height (default: 1.6)">
      <Input value={s.lineHeight} onChange={v => set("lineHeight", v)} placeholder="1.6" />
    </Field>
    <Field label="Letter Spacing" hint="In em units (default: 0)">
      <Input value={s.letterSpacing} onChange={v => set("letterSpacing", v)} placeholder="0" />
    </Field>

    {/* Live font preview */}
    <SectionTitle>Preview</SectionTitle>
    <div style={{ padding: "14px 16px", border: "1px solid #333", borderRadius: 8, marginBottom: 8 }}>
      <div style={{ fontFamily: `'${s.headingFont}', sans-serif`, fontSize: 22, fontWeight: 700, marginBottom: 6, color: "#e0e0e0" }}>
        Heading â€” {s.headingFont}
      </div>
      <div style={{ fontFamily: `'${s.bodyFont}', sans-serif`, fontSize: 14, lineHeight: s.lineHeight || 1.6, color: "#aaa" }}>
        Body text â€” {s.bodyFont}. The quick brown fox jumps over the lazy dog.

      </div>
    </div>
  </div>
);

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * 4. LAYOUT
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export const LayoutSection = ({ s, set }) => (
  <div>
    <SectionTitle>Container &amp; Spacing</SectionTitle>
    <Field label="Max Container Width" hint="e.g. 1280px or 90%">
      <Input value={s.containerWidth} onChange={v => set("containerWidth", v)} placeholder="1280px" />
    </Field>
    <Field label="Section Spacing" hint="Vertical padding between page sections">
      <Input value={s.sectionSpacing} onChange={v => set("sectionSpacing", v)} placeholder="80px" />
    </Field>

    <SectionTitle>Borders &amp; Shadows</SectionTitle>
    <Field label="Global Border Radius" hint="Applied to buttons, cards, inputs by default">
      <Input value={s.borderRadius} onChange={v => set("borderRadius", v)} placeholder="8px" />
    </Field>
    <Field label="Global Shadow" hint="CSS box-shadow shorthand used for cards and modals">
      <Input value={s.shadow} onChange={v => set("shadow", v)} placeholder="0 2px 12px rgba(0,0,0,0.08)" />
    </Field>
  </div>
);

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * 5. BUTTONS
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export const ButtonsSection = ({ s, set }) => (
  <div>
    <SectionTitle>Primary Button</SectionTitle>
    <Field label="Background"><ColorInput value={s.primaryBg} onChange={v => set("primaryBg", v)} /></Field>
    <Field label="Text Color"><ColorInput value={s.primaryText} onChange={v => set("primaryText", v)} /></Field>

    <SectionTitle>Secondary Button</SectionTitle>
    <Field label="Background"><ColorInput value={s.secondaryBg} onChange={v => set("secondaryBg", v)} /></Field>
    <Field label="Text Color"><ColorInput value={s.secondaryText} onChange={v => set("secondaryText", v)} /></Field>

    <SectionTitle>Style</SectionTitle>
    <Field label="Border Radius"><Input value={s.borderRadius} onChange={v => set("borderRadius", v)} placeholder="8px" /></Field>
    <Field label="Padding (top/bottom left/right)"><Input value={s.padding} onChange={v => set("padding", v)} placeholder="12px 24px" /></Field>
    <Field label="Transition"><Input value={s.transition} onChange={v => set("transition", v)} placeholder="0.2s ease" /></Field>

    {/* Live button previews */}
    <SectionTitle>Preview</SectionTitle>
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <Button style={{
        background: s.primaryBg || "#667eea", color: s.primaryText || "#fff",
        padding: s.padding || "12px 24px", borderRadius: s.borderRadius || "8px",
        border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13,
        transition: s.transition || "0.2s ease",
      }}>Primary Button</Button>
      <Button style={{
        background: s.secondaryBg || "transparent", color: s.secondaryText || "#667eea",
        padding: s.padding || "12px 24px", borderRadius: s.borderRadius || "8px",
        border: `2px solid ${s.secondaryText || "#667eea"}`, cursor: "pointer",
        fontWeight: 600, fontSize: 13,
      }}>Secondary Button</Button>
    </div>
  </div>
);

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * 6. CARDS
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export const CardsSection = ({ s, set }) => (
  <div>
    <Field label="Background"><ColorInput value={s.background} onChange={v => set("background", v)} /></Field>
    <Field label="Border" hint="CSS border shorthand e.g. 1px solid #e5e7eb">
      <Input value={s.border} onChange={v => set("border", v)} placeholder="1px solid #e5e7eb" />
    </Field>
    <Field label="Border Radius"><Input value={s.radius} onChange={v => set("radius", v)} placeholder="12px" /></Field>
    <Field label="Shadow"><Input value={s.shadow} onChange={v => set("shadow", v)} placeholder="0 2px 12px rgba(0,0,0,0.08)" /></Field>
    <Field label="Padding"><Input value={s.padding} onChange={v => set("padding", v)} placeholder="20px" /></Field>

    {/* Live card preview */}
    <SectionTitle>Preview</SectionTitle>
    <div style={{
      background: s.background || "#fff",
      border: s.border || "1px solid #e5e7eb",
      borderRadius: s.radius || "12px",
      boxShadow: s.shadow || "0 2px 12px rgba(0,0,0,0.08)",
      padding: s.padding || "20px",
      maxWidth: 260,
      color: "#333",
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Card Title</div>
      <div style={{ fontSize: 12, color: "#777" }}>This is how your cards will look across the store.</div>
    </div>
  </div>
);

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * 7. FORMS
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export const FormsSection = ({ s, set }) => (
  <div>
    <SectionTitle>Input Style</SectionTitle>
    <Field label="Input Border Radius"><Input value={s.inputRadius} onChange={v => set("inputRadius", v)} placeholder="6px" /></Field>
    <Field label="Border" hint="e.g. 1px solid #e5e7eb">
      <Input value={s.border} onChange={v => set("border", v)} placeholder="1px solid #e5e7eb" />
    </Field>

    <SectionTitle>State Colors</SectionTitle>
    <Field label="Focus Ring Color"><ColorInput value={s.focusColor} onChange={v => set("focusColor", v)} /></Field>
    <Field label="Placeholder Color"><ColorInput value={s.placeholderColor} onChange={v => set("placeholderColor", v)} /></Field>
    <Field label="Error Color"><ColorInput value={s.errorColor} onChange={v => set("errorColor", v)} /></Field>

    {/* Live input preview */}
    <SectionTitle>Preview</SectionTitle>
    <input
      type="text"
      placeholder="Your email addressâ€¦"

      readOnly
      style={{
        width: "100%", padding: "9px 12px", boxSizing: "border-box",
        border: s.border || "1px solid #e5e7eb",
        borderRadius: s.inputRadius || "6px",
        fontSize: 13, outline: "none",
        color: "#333", background: "#fff",
      }}
    />
  </div>
);

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * 8. ANIMATIONS
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const EASING_OPTIONS = [
  { value: "ease",        label: "Ease (default)" },
  { value: "ease-in",     label: "Ease In" },
  { value: "ease-out",    label: "Ease Out" },
  { value: "ease-in-out", label: "Ease In-Out" },
  { value: "linear",      label: "Linear" },
];

const ANIM_TYPE_OPTIONS = [
  { value: "fade",  label: "Fade" },
  { value: "slide", label: "Slide" },
  { value: "none",  label: "None" },
];

export const AnimationsSection = ({ s, set }) => (
  <div>
    <SectionTitle>Transition &amp; Motion</SectionTitle>
    <Field label="Global Speed" hint="Applied via --ts-anim-speed to hovers, dropdowns, etc.">
      <Input value={s.speed} onChange={v => set("speed", v)} placeholder="200ms" />
    </Field>
    <Field label="Easing Function">
      <Select value={s.easing} onChange={v => set("easing", v)} options={EASING_OPTIONS} />
    </Field>

    <SectionTitle>Scroll Animations</SectionTitle>
    <Field label="Animation Type" hint="Controls how sections reveal on scroll (fade/slide/none)">
      <Select value={s.type} onChange={v => set("type", v)} options={ANIM_TYPE_OPTIONS} />
    </Field>
  </div>
);

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * 9. CUSTOM CSS
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export const CustomCssSection = ({ s, set }) => (
  <div>
    <div style={{
      background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
      borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: "#ef9999",
    }}>
      âš ï¸ Custom CSS is injected directly into the canvas and the storefront. Invalid CSS may break the layout.
    </div>
    <Field label="Custom CSS" hint="Appended after all theme variables â€” use :root or specific class selectors">

      <Textarea
        value={s.css}
        onChange={v => set("css", v)}
        placeholder={`/* Custom overrides */\n.hero-component {\n  background: var(--ts-color-primary);\n}`}
        rows={16}
      />
    </Field>
  </div>
);

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * 10. SPACING
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
export const SpacingSection = ({ s, set }) => (
  <div>
    <SectionTitle>Spacing Scale</SectionTitle>
    <p style={{ fontSize: 11, color: "#888", marginBottom: 12 }}>Define the spacing scale used across components (xs â†’ 2xl).</p>

    {['xs','sm','md','lg','xl','2xl'].map((k) => (
      <Field key={k} label={k.toUpperCase()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Input value={s[k]} onChange={v => set(k, v)} placeholder="16px" />
          <div style={{ flex: 1, height: 10, background: '#eee', borderRadius: 4, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '40%', background: '#ddd' }} />
          </div>
        </div>
      </Field>
    ))}
  </div>
);

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * 11. RADIUS
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export const RadiusSection = ({ s, set }) => (
  <div>
    <SectionTitle>Border Radius</SectionTitle>
    {['none','sm','md','lg','full'].map(k => (
      <Field key={k} label={k}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Input value={s[k]} onChange={v => set(k, v)} placeholder="8px" />
          <div style={{ width: 64, height: 32, background: '#fff', border: '1px solid #ddd', borderRadius: s[k] || '0px' }} />
        </div>
      </Field>
    ))}
  </div>
);

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * 12. SHADOWS
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export const ShadowsSection = ({ s, set }) => (
  <div>
    <SectionTitle>Shadows</SectionTitle>
    {['sm','md','lg'].map(k => (
      <Field key={k} label={k}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Input value={s[k]} onChange={v => set(k, v)} placeholder="0 4px 8px rgba(0,0,0,0.1)" />
          <div style={{ width: 80, height: 40, background: '#fff', borderRadius: 6, boxShadow: s[k] || 'none', border: '1px solid #eee' }} />
        </div>
      </Field>
    ))}
  </div>
);

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * 13. TYPESCALE
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export const TypographyScaleSection = ({ s, set }) => (
  <div>
    <SectionTitle>Typography Scale</SectionTitle>
    <p style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>Define the font-size scale used across components.</p>
    {['xs','sm','base','lg','xl','2xl'].map(k => (
      <Field key={k} label={k.toUpperCase()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Input value={s[k]} onChange={v => set(k, v)} placeholder="16px" />
          <div style={{ fontSize: s[k] || '14px' }}>{/* preview text */}Aa â€” {s[k] || ''}</div>

        </div>
      </Field>
    ))}
  </div>
);

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * 14. BREAKPOINTS
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export const BreakpointsSection = ({ s, set }) => (
  <div>
    <SectionTitle>Breakpoints</SectionTitle>
    <p style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>Define responsive breakpoints (px). Values must be increasing.</p>
    {['mobile','tablet','laptop','desktop'].map(k => (
      <Field key={k} label={k}>
        <Input value={s[k]} onChange={v => set(k, Number(v))} placeholder="768" />
      </Field>
    ))}
  </div>
);
