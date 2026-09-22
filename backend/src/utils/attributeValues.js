// Seed data for the `attributevalues` collection. Each value belongs to one
// attribute via `attributeId` (see ./attributes for the parent ids) and matches
// the current AttributeValue schema (models/AttributeValue.js).
const attributeValues = [
  // Color
  {
    _id: "63f078f54b86ed26b05281b3",
    attributeId: "63f078f54b86ed26b05281b2",
    label: "Red",
    slug: "red",
    color: "#ff0000",
    sortOrder: 1,
  },
  {
    _id: "63f078f54b86ed26b05281b4",
    attributeId: "63f078f54b86ed26b05281b2",
    label: "Green",
    slug: "green",
    color: "#008000",
    sortOrder: 2,
  },
  {
    _id: "63f078f54b86ed26b05281b5",
    attributeId: "63f078f54b86ed26b05281b2",
    label: "Blue",
    slug: "blue",
    color: "#0000ff",
    sortOrder: 3,
  },

  // Size
  {
    _id: "63f078f54b86ed26b05281b7",
    attributeId: "63f078f54b86ed26b05281b6",
    label: "Small",
    slug: "small",
    value: "S",
    sortOrder: 1,
  },
  {
    _id: "63f078f54b86ed26b05281b8",
    attributeId: "63f078f54b86ed26b05281b6",
    label: "Medium",
    slug: "medium",
    value: "M",
    sortOrder: 2,
  },
  {
    _id: "63f078f54b86ed26b05281b9",
    attributeId: "63f078f54b86ed26b05281b6",
    label: "Large",
    slug: "large",
    value: "L",
    sortOrder: 3,
  },

  // Gift Wrap
  {
    _id: "63f34946d3639309840ca337",
    attributeId: "63f34946d3639309840ca336",
    label: "Yes",
    slug: "yes",
    sortOrder: 1,
  },
  {
    _id: "63f34946d3639309840ca338",
    attributeId: "63f34946d3639309840ca336",
    label: "No",
    slug: "no",
    sortOrder: 2,
  },

  // Package
  {
    _id: "63f34983d3639309840ca64b",
    attributeId: "63f34983d3639309840ca64a",
    label: "Plastic",
    slug: "plastic",
    sortOrder: 1,
  },
  {
    _id: "63f34983d3639309840ca64c",
    attributeId: "63f34983d3639309840ca64a",
    label: "Jar",
    slug: "jar",
    sortOrder: 2,
  },
  {
    _id: "63f34983d3639309840ca64d",
    attributeId: "63f34983d3639309840ca64a",
    label: "Eco Friendly",
    slug: "eco-friendly",
    sortOrder: 3,
  },
];

module.exports = attributeValues;
