import { registerLibrary, unregisterLibrary } from "../../utils/iconRegistry";

export function loadCustomLibrary(customIcons, libraryId = "custom", libraryName = "Mes Icônes Custom") {
  unregisterLibrary(libraryId);

  if (!customIcons || customIcons.length === 0) {
    registerLibrary({
      id: libraryId,
      name: libraryName,
      category: "custom",
      tags: ["custom", "uploaded"],
      iconCount: 0,
      isCustom: true,
      getIcons: async () => [],
    });
    return;
  }

  registerLibrary({
    id: libraryId,
    name: libraryName,
    category: "custom",
    tags: ["custom", "uploaded"],
    iconCount: customIcons.length,
    isCustom: true,
    getIcons: async () =>
      customIcons.map((ic) => ({
        ...ic,
        libraryId,
        libraryName,
        category: "custom",
      })),
  });
}

export function unloadCustomLibrary(libraryId = "custom") {
  unregisterLibrary(libraryId);
}
