require("dotenv").config();
const path = require("path");
const { connectDB } = require("../config/db");
const Theme = require("../models/Theme");

const storeId = process.argv[2];
if (!storeId) {
  console.error("Usage: node src/script/createBlankTheme.js <storeId>");
  process.exit(1);
}

const createBlankTheme = async () => {
  try {
    await connectDB();
    const existing = await Theme.findOne({ storeId });
    if (existing) {
      console.log("A theme already exists for this storeId. Existing theme:", existing._id.toString());
      process.exit(0);
    }

    const theme = new Theme({
      name: "Blank Theme",
      description: "A clean blank theme for builder entry.",
      storeId,
      isActive: true,
      isDraft: true,
      colors: {
        primary: "#ffffff",
        secondary: "#f8fafc",
        accent: "#1f2937",
        text: "#111827",
        background: "#ffffff",
      },
      fonts: {
        heading: "Inter",
        body: "Inter",
      },
      settings: {},
    });

    await theme.save();
    console.log("Blank theme created successfully:", theme._id.toString());
    process.exit(0);
  } catch (err) {
    console.error("Failed to create blank theme:", err.message);
    process.exit(1);
  }
};

createBlankTheme();