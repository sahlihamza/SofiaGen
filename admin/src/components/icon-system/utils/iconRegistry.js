const DEFAULT_LIBRARIES = [
  {
    id: "font-awesome-solid",
    name: "Font Awesome 6 Solid",
    category: "font-awesome",
    iconCount: 0,
    tags: ["brand", "outline", "solid"],
    getIcons: () => [],
  },
  {
    id: "font-awesome-regular",
    name: "Font Awesome 6 Regular",
    category: "font-awesome",
    iconCount: 0,
    tags: ["outline", "regular"],
    getIcons: () => [],
  },
  {
    id: "font-awesome-brands",
    name: "Font Awesome 6 Brands",
    category: "font-awesome",
    iconCount: 0,
    tags: ["brand", "social"],
    getIcons: () => [],
  },
  {
    id: "material-filled",
    name: "Material Icons (Filled)",
    category: "material",
    iconCount: 0,
    tags: ["filled", "material"],
    getIcons: () => [],
  },
  {
    id: "material-outlined",
    name: "Material Icons (Outlined)",
    category: "material",
    iconCount: 0,
    tags: ["outline", "material"],
    getIcons: () => [],
  },
  {
    id: "lucide",
    name: "Lucide",
    category: "lucide",
    iconCount: 0,
    tags: ["outline", "modern"],
    getIcons: () => [],
  },
  {
    id: "remix-outline",
    name: "Remix Icon (Outline)",
    category: "remix",
    iconCount: 0,
    tags: ["outline", "remix"],
    getIcons: () => [],
  },
  {
    id: "remix-filled",
    name: "Remix Icon (Filled)",
    category: "remix",
    iconCount: 0,
    tags: ["filled", "remix"],
    getIcons: () => [],
  },
  {
    id: "custom",
    name: "Mes Icônes Custom",
    category: "custom",
    iconCount: 0,
    tags: ["custom", "uploaded"],
    getIcons: async () => [],
    isCustom: true,
  },
];

const STYLE_FILTERS = [
  { id: "all", label: "Tous", tags: [] },
  { id: "outline", label: "Outline", tags: ["outline"] },
  { id: "filled", label: "Filled", tags: ["filled", "solid"] },
  { id: "brand", label: "Brands", tags: ["brand", "social"] },
];

let registry = [...DEFAULT_LIBRARIES];
const libraryCallbacks = new Map();

export function registerLibrary(libraryDef) {
  const idx = registry.findIndex((l) => l.id === libraryDef.id);
  if (idx >= 0) {
    registry[idx] = { ...registry[idx], ...libraryDef };
  } else {
    registry.push(libraryDef);
  }
  if (libraryDef.onRegister) {
    libraryCallbacks.set(libraryDef.id, libraryDef.onRegister);
  }
}

export function unregisterLibrary(id) {
  registry = registry.filter((l) => l.id !== id);
  libraryCallbacks.delete(id);
}

export function getLibrary(id) {
  return registry.find((l) => l.id === id);
}

export function getAllLibraries() {
  return registry;
}

export function getCustomLibraries() {
  return registry.filter((l) => l.isCustom);
}

export function getBuiltinLibraries() {
  return registry.filter((l) => !l.isCustom);
}

export function getStyleFilters() {
  return STYLE_FILTERS;
}

export async function getAllIcons(options = {}) {
  const { libraries = registry, search = "", styleFilter = "all", limit = 500 } = options;
  let icons = [];

  for (const lib of libraries) {
    let libIcons = [];
    if (lib.getIcons) {
      libIcons = await lib.getIcons();
    }
    if (lib.isCustom && libIcons.length === 0) {
      libIcons = await loadCustomIconsFromStorage();
    }
    libIcons = libIcons.map((icon) => ({
      ...icon,
      libraryId: lib.id,
      libraryName: lib.name,
      category: lib.category,
    }));
    icons = icons.concat(libIcons);
  }

  if (search) {
    const q = search.toLowerCase();
    icons = icons.filter(
      (icon) =>
        icon.name.toLowerCase().includes(q) ||
        (icon.tags && icon.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }

  if (styleFilter !== "all") {
    const filter = STYLE_FILTERS.find((f) => f.id === styleFilter);
    if (filter && filter.tags.length > 0) {
      icons = icons.filter((icon) =>
        filter.tags.some((tag) => icon.tags && icon.tags.includes(tag))
      );
    }
  }

  return icons.slice(0, limit);
}

export async function getIconById(libraryId, iconId) {
  const lib = getLibrary(libraryId);
  if (!lib) return null;
  const icons = await lib.getIcons();
  return icons.find((i) => i.id === iconId) || null;
}

function loadCustomIconsFromStorage() {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("custom-icons");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function clearRegistry() {
  registry = [...DEFAULT_LIBRARIES];
  libraryCallbacks.clear();
}

export { STYLE_FILTERS };
