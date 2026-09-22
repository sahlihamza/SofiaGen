// Seed data for the `posttags` collection (models/PostTag.js). Fixed _ids let
// ./posts.js reference these tags  same cross-referencing convention as
// ./attributes.js + ./attributeValues.js.
// NOTE: `storeId` is required by the schema but is injected at seed time in
// src/script/seed.js (mapped to the actual active store), not hardcoded here.
const postTags = [
  {
    _id: "64d100000000000000000001",
    name: "Nouveauté",
    slug: "nouveaute",
    color: "#10B981",
    postCount: 2,
  },
  {
    _id: "64d100000000000000000002",
    name: "Promotion",
    slug: "promotion",
    color: "#F59E0B",
    postCount: 1,
  },
  {
    _id: "64d100000000000000000003",
    name: "Tutoriel",
    slug: "tutoriel",
    color: "#3B82F6",
    postCount: 3,
  },
  {
    _id: "64d100000000000000000004",
    name: "Astuce",
    slug: "astuce",
    color: "#8B5CF6",
    postCount: 2,
  },
  {
    _id: "64d100000000000000000005",
    name: "Presse",
    slug: "presse",
    color: "#6B7280",
    postCount: 0,
  },
];

module.exports = postTags;
