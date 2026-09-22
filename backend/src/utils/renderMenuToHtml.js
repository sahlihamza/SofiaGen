/**
 * Transforme un tableau d'items de Menu en HTML de navigation.
 * Gère la récursion sur `children` pour les sous-menus (dropdown / mega menu simple).
 */
function resolveItemUrl(item) {
  if (item.linkType === "url") return item.url || "#";
  if (item.linkType === "page" && item.pageId) {
    // pageId peut être populé (objet avec .urlSlug) ou juste un ObjectId brut
    const slug = item.pageId.urlSlug || item.pageId.slug;
    return slug ? (slug === "/" ? "/" : `/${slug}`) : "#";
  }
  if (item.linkType === "category" && item.categoryId) {
    const slug = item.categoryId.slug || item.categoryId._id;
    return `/category/${slug}`;
  }
  if (item.linkType === "product" && item.productId) {
    const slug = item.productId.slug || item.productId._id;
    return `/product/${slug}`;
  }
  return "#";
}

function renderMenuItems(items = [], depth = 0) {
  if (!items.length) return "";
  return items
    .slice()
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
    .map((item) => {
      const href = resolveItemUrl(item);
      const target = item.openInNewTab ? ' target="_blank" rel="noopener"' : "";
      const hasChildren = Array.isArray(item.children) && item.children.length > 0;
      let childrenHtml = "";
      if (hasChildren) {
        if (item.displayMode === "mega") {
          childrenHtml = `<div class="nav-mega-menu" style="--mega-columns:${item.megaColumns || 1}">${renderMenuItems(item.children, depth + 1)}</div>`;
        } else {
          childrenHtml = `<ul class="nav-submenu" data-depth="${depth + 1}">${renderMenuItems(item.children, depth + 1)}</ul>`;
        }
      }
      const itemClass = hasChildren ? "nav-item has-children" : "nav-item";
      const iconHtml = item.icon ? `<span class="nav-icon" aria-hidden="true">${item.icon}</span>` : "";
      return `<li class="${itemClass}"><a class="nav-link" href="${href}"${target}>${iconHtml}<span class="nav-label">${item.label}</span></a>${childrenHtml}</li>`;
    })
    .join("");
}

function renderMenuToNavHtml(menu) {
  if (!menu || !menu.items || !menu.items.length) return "";
  return `<ul class="header-nav-list">${renderMenuItems(menu.items)}</ul>`;
}

module.exports = { renderMenuToNavHtml, resolveItemUrl, renderMenuItems };
