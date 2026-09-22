import React from "react";
import ListFieldEditor from "./components/ListFieldEditor";
import ColorPickerWithLabel from "./components/ColorPickerWithLabel";
import ColorsControl from "./components/ColorsControl";
import SpacingControl from "./components/SpacingControl";
import TypographyControl from "./components/TypographyControl";
import BorderControl from "./components/BorderControl";
import ShadowControl from "./components/ShadowControl";
import AnimationControl from "./components/AnimationControl";
import AlignmentControl from "./components/AlignmentControl";
import GradientPicker from "./components/GradientPicker";
import HoverControl from "./components/HoverControl";
import VisibilityControl from "./components/VisibilityControl";
import TransformControl from "./components/TransformControl";
import BackgroundControl from "./components/BackgroundControl";

export default function TraitRenderer({ trait, selectedComponent }) {
  const type = trait.get("type");
  const name = trait.get("name");
  const label = trait.get("label") || name;

  const getValue = () => {
    const compVal = selectedComponent?.get(name);
    if (compVal !== undefined) return compVal;
    const traitVal = trait.get("value");
    if (traitVal !== undefined) return traitVal;
    const propertyMap = trait.get("propertyMap");
    if (selectedComponent && propertyMap && typeof propertyMap === "object") {
      const next = {};
      let found = false;
      Object.entries(propertyMap).forEach(([field, propName]) => {
        const propVal = selectedComponent.get(propName);
        if (propVal !== undefined) {
          next[field] = propVal;
          found = true;
        }
      });
      if (found) return next;
    }
    return traitVal;
  };

  const [value, setValue] = React.useState(getValue());

  React.useEffect(() => {
    setValue(getValue());
  }, [selectedComponent, trait]);

  const update = (val) => {
    setValue(val);
    try {
      trait.set("value", val);
    } catch (e) {
      // ignore
    }
    try {
      selectedComponent?.set(name, val);
    } catch (e) {
      // ignore
    }
    try {
      const propertyMap = trait.get("propertyMap");
      if (selectedComponent && propertyMap && typeof propertyMap === "object") {
        Object.entries(propertyMap).forEach(([field, propName]) => {
          if (Object.prototype.hasOwnProperty.call(val || {}, field)) {
            selectedComponent.set(propName, val[field]);
          }
        });
      }
    } catch (e) {
      // ignore
    }
  };

  const renderDefault = () => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "#e5e7eb" }}>{label}</label>
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => update(e.target.value)}
        style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #374151", background: "#111827", color: "#f9fafb" }}
      />
    </div>
  );

  if (type === "checkbox") {
    return (
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#e5e7eb" }}>
          <input type="checkbox" checked={!!value} onChange={(e) => update(e.target.checked)} />
          {label}
        </label>
      </div>
    );
  }

  if (type === "number") {
    return (
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "#e5e7eb" }}>{label}</label>
        <input
          type="number"
          value={value ?? ""}
          onChange={(e) => update(Number(e.target.value))}
          style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #374151", background: "#111827", color: "#f9fafb" }}
        />
      </div>
    );
  }

  if (type === "color") {
    return <ColorPickerWithLabel label={label} value={value} onChange={update} />;
  }

  if (type === "spacing") {
    return <SpacingControl label={label} value={value} onChange={update} />;
  }

  if (type === "colors") {
    const fields = trait.get("fields") || [];
    return <ColorsControl label={label} value={value} fields={fields} onChange={update} />;
  }

  if (type === "typography") {
    return <TypographyControl label={label} value={value} onChange={update} />;
  }

  if (type === "border") {
    return <BorderControl label={label} value={value} onChange={update} />;
  }

  if (type === "shadow") {
    return <ShadowControl label={label} value={value} onChange={update} />;
  }

  if (type === "alignment") {
    return <AlignmentControl label={label} value={value} onChange={update} />;
  }

  if (type === "gradient") {
    return <GradientPicker label={label} value={value} onChange={update} />;
  }

  if (type === "background") {
    return <BackgroundControl label={label} value={value} onChange={update} />;
  }

  if (type === "transform") {
    return <TransformControl label={label} value={value} onChange={update} />;
  }

  if (type === "hover") {
    return <HoverControl label={label} value={value} onChange={update} />;
  }

  if (type === "visibility") {
    return <VisibilityControl label={label} value={value} onChange={update} />;
  }

  if (type === "animation") {
    return <AnimationControl label={label} value={value} onChange={update} />;
  }

  if (type === "list" || type === "listField" || type === "item-list") {
    let items = selectedComponent?.get(name) ?? trait.get("default") ?? [];
    try {
      if (typeof items === "string") items = JSON.parse(items);
    } catch (e) {
      items = [];
    }
    // "listField" stocke un tableau JSON stringifié ; "item-list" stocke un
    // tableau natif. On normalise vers un tableau pour le ListFieldEditor.
    if (!Array.isArray(items)) items = [];
    return (
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "#e5e7eb" }}>{label}</label>
        <ListFieldEditor
          items={items}
          itemSchema={trait.get("itemSchema") || []}
          onChange={(next) => {
            // On conserve le format de stockage attendu par chaque type :
            //  - listField : JSON string (cohérent avec l'existant)
            //  - item-list / list : tableau natif
            const stored = type === "listField" ? JSON.stringify(next) : next;
            selectedComponent?.set(name, stored);
            setValue(stored);
          }}
          addLabel={trait.get("addLabel") || "+ Ajouter"}
          emptyLabel={trait.get("emptyLabel") || "Aucun Élément"}
        />
      </div>
    );
  }

  return renderDefault();
}
