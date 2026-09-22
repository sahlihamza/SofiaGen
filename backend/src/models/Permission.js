const mongoose = require("mongoose");
const { validatePermissionCode, PERMISSION_CODE_REGEX } = require("../utils/validatePermissionCode");

const permissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Le nom de la permission est obligatoire"],
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Le code de la permission est obligatoire"],
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: validatePermissionCode,
        message: `Le code doit suivre le format module.action (ex: platform.plan.view). Regex: ${PERMISSION_CODE_REGEX}`,
      },
    },
    module: {
      type: String,
      required: [true, "Le module est obligatoire"],
      trim: true,
    },
    action: {
      type: String,
      required: [true, "L'action est obligatoire"],
      trim: true,
      lowercase: true,
    },
    scope: {
      type: String,
      required: true,
      default: "platform",
      enum: ["platform", "store"],
    },
    category: {
      type: String,
      required: false,
      trim: true,
      default: "General",
    },
    riskLevel: {
      type: String,
      required: true,
      default: "low",
      enum: ["low", "medium", "high", "critical"],
    },
    description: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

permissionSchema.index({ code: 1 });
permissionSchema.index({ module: 1, action: 1 }, { unique: true });

const Permission = mongoose.model("Permission", permissionSchema);

module.exports = Permission;