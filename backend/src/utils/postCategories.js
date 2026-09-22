// Seed data for the `postcategories` collection (models/PostCategory.js).
// Fixed _ids let ./posts.js reference these categories, and let `parentId`
// build a small parent/child hierarchy  same cross-referencing convention as
// ./attributes.js + ./attributeValues.js.
// NOTE: `storeId` is required by the schema but is injected at seed time in
// src/script/seed.js (mapped to the actual active store), not hardcoded here.
const postCategories = [
  {
    _id: "64c100000000000000000001",
    name: "Actualités",
    slug: "actualites",
    description: "Les dernières nouvelles de la boutique.",
    parentId: null,
    image: "https://picsum.photos/seed/post-category-actualites/400/300",
    postCount: 2,
  },
  {
    _id: "64c100000000000000000002",
    name: "Tech",
    slug: "tech",
    description: "Nouveautés et tendances autour de la maison connecté.",
    parentId: "64c100000000000000000001",
    image: "https://picsum.photos/seed/post-category-tech/400/300",
    postCount: 1,
  },
  {
    _id: "64c100000000000000000003",
    name: "Guides d'achat",
    slug: "guides-dachat",
    description: "Nos guides pour bien choisir vos produits.",
    parentId: null,
    image: "https://picsum.photos/seed/post-category-guides/400/300",
    postCount: 2,
  },
  {
    _id: "64c100000000000000000004",
    name: "Conseils",
    slug: "conseils",
    description: "Astuces d'entretien et conseils pratiques.",
    parentId: null,
    image: "https://picsum.photos/seed/post-category-conseils/400/300",
    postCount: 2,
  },
];

module.exports = postCategories;
