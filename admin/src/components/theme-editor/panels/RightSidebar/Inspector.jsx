import React, { useEffect, useMemo, useRef, useState } from "react";
import { useEditor } from "../../hooks/editor/EditorProvider";
import { FiFileText, FiDroplet, FiSettings } from "react-icons/fi";
import { TraitRenderer } from "../../traits";
import { isTraitVisible } from "../../traits/utils/traitVisibility";
import { Button } from "@sofia/ui";

const TABS = [
  { id: "content", label: "Content", icon: <FiFileText size={14} /> },
  { id: "style", label: "Style", icon: <FiDroplet size={14} /> },
  { id: "advanced", label: "Advanced", icon: <FiSettings size={14} /> },
];

const inferCategoryFromTraitName = (name, type) => {
  const traitName = String(name || "").toLowerCase();
  const styleKeywords = [
    "color",
    "opacity",
    "hover",
    "shadow",
    "border",
    "padding",
    "margin",
    "width",
    "height",
    "background",
    "font",
    "textalign",
    "align",
    "display",
    "radius",
    "spacing",
    "transform",
    "transition",
    "overflow",
    "max",
    "min",
    "lineheight",
    "letterspacing",
    "shadow",
    "border",
    "boxshadow",
    "justify",
    "position",
  ];
  const advancedKeywords = [
    "id",
    "class",
    "zindex",
    "position",
    "responsive",
    "scroll",
    "aria",
    "role",
    "custom",
    "data",
    "src",
    "href",
    "url",
  ];
  const contentKeywords = [
    "image",
    "icon",
    "link",
    "text",
    "html",
    "title",
    "description",
    "content",
    "question",
    "answer",
    "label",
    "subtitle",
    "caption",
    "button",
  ];

  if (type === "color") return "style";

  if (advancedKeywords.some((keyword) => traitName.includes(keyword))) return "advanced";
  if (styleKeywords.some((keyword) => traitName.includes(keyword))) return "style";
  if (contentKeywords.some((keyword) => traitName.includes(keyword))) return "content";

  return "content";
};

const EmptyState = ({ message }) => (
  <div style={{ padding: "24px", color: "#9ca3af", fontSize: 13, lineHeight: 1.6, textAlign: "center" }}>
    {message}
  </div>
);

const Inspector = ({ selectedComponent }) => {
  const { tk, editor } = useEditor();
  const safeGetSelected = () => {
    if (!editor || typeof editor.getSelected !== "function") return null;
    try {
      return editor.getSelected();
    } catch (err) {
      // ignore editor.getSelected failures in production
      return null;
    }
  };

  const getComponentType = (component) => {
    if (!component) return null;
    return typeof component.get === "function" ? component.get("type") : component;
  };

  const component = selectedComponent || safeGetSelected();
  const [activeTab, setActiveTab] = useState("content");
  const [expandedSections, setExpandedSections] = useState({});

  const traits = component && typeof component.getTraits === "function" ? component.getTraits() : [];
  const traitsByCategory = useMemo(() => {
    const grouped = { content: [], style: [], advanced: [] };
    traits.forEach((trait) => {
      const rawCategory = trait.category || trait.get("category");
      const normalizedCategory = typeof rawCategory === "string" ? rawCategory.toLowerCase() : "";
      const category = ["content", "style", "advanced"].includes(normalizedCategory)
        ? normalizedCategory
        : inferCategoryFromTraitName(trait.get("name"), trait.get("type"));
      grouped[category].push(trait);
    });
    return grouped;
  }, [traits]);

  useEffect(() => {
    if (!component) return;
    const preferredTabs = ["content", "style", "advanced"];
    const nextTab = preferredTabs.find((tab) => traitsByCategory[tab]?.length > 0);
    if (!nextTab) return;
    if (traitsByCategory[activeTab]?.length > 0) return;
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [component, traitsByCategory, activeTab]);

  const toggleSection = (name) => {
    setExpandedSections((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const groupBySection = (traitsList) => {
    const groups = {};
    traitsList.forEach((trait) => {
      const sectionName = trait.get("section") || "GÃ©nÃ©ral";
      if (!groups[sectionName]) groups[sectionName] = [];
      groups[sectionName].push(trait);
    });
    return groups;
  };

  if (!component) {
    return <EmptyState message="SÃ©lectionnez un Ã©lÃ©ment sur le canvas pour voir ses propriÃ©tÃ©s" />;
  }

  const currentTab = TABS.find((tab) => tab.id === activeTab) || TABS[0];
  const currentTraits = traitsByCategory[activeTab] || [];
  const visibleTraits = currentTraits.filter((trait) => isTraitVisible(trait, component));
  const sections = groupBySection(visibleTraits);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", borderBottom: `1px solid ${tk.sidebarBorder}` }}>
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: "12px 10px",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: activeTab === tab.id ? tk.tabActiveText : tk.tabText,
              background: activeTab === tab.id ? tk.tabActive : "transparent",
              border: "none",
              borderBottom: activeTab === tab.id ? `2px solid ${tk.tabActiveBorder}` : "2px solid transparent",
              cursor: "pointer",
            }}
          >
            <span style={{ verticalAlign: "middle", marginRight: 6 }}>{tab.icon}</span>
            {tab.label}
          </Button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        {visibleTraits.length === 0 ? (
          <EmptyState message={`Aucun rÃ©glage ${currentTab.label} pour ce composant`} />
        ) : (
          Object.entries(sections).map(([sectionName, sectionTraits]) => {
            const isExpanded = expandedSections[sectionName] !== false;
            return (
              <div key={sectionName} style={{ marginBottom: 8, border: `1px solid ${tk.sidebarBorder}`, borderRadius: 8, overflow: "hidden" }}>
                <Button
                  onClick={() => toggleSection(sectionName)}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    background: tk.sidebar,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                    color: tk.headerText,
                  }}
                >
                  <span>{sectionName}</span>
                  <span style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>â–¾</span>
                </Button>
                {isExpanded && (
                  <div style={{ padding: 12 }}>
                    {sectionTraits
                      .filter((trait) => isTraitVisible(trait, component))
                      .map((trait) => (
                        <TraitRenderer key={trait.get("name")} trait={trait} selectedComponent={component} />
                      ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Inspector;
