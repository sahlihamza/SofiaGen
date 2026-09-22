// Seed data for the `attributes` collection. Matches the current Attribute
// schema (models/Attribute.js): a flat `name` string, a `type`/`displayType`
// enum, and no embedded values. The individual values (Red, Small, ...) live
// in the `attributevalues` collection and are seeded from ./attributeValues.
const attributes = [
  {
    _id: "63f078f54b86ed26b05281b2",
    name: "Color",
    slug: "color",
    type: "color",
    displayType: "swatch",
    isVariation: true,
    isGlobal: true,
    status: "active",
    sortOrder: 1,
  },
  {
    _id: "63f078f54b86ed26b05281b6",
    name: "Size",
    slug: "size",
    type: "select",
    displayType: "select",
    isVariation: true,
    isGlobal: true,
    status: "active",
    sortOrder: 2,
  },
  {
    _id: "63f34946d3639309840ca336",
    name: "Gift Wrap",
    slug: "gift-wrap",
    type: "select",
    displayType: "select",
    isVariation: false,
    isGlobal: true,
    status: "active",
    sortOrder: 3,
  },
  {
    _id: "63f34983d3639309840ca64a",
    name: "Package",
    slug: "package",
    type: "select",
    displayType: "select",
    isVariation: false,
    isGlobal: true,
    status: "active",
    sortOrder: 4,
  },
];

module.exports = attributes;
