const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { USER_TYPES, USER_TYPE_VALUES } = require("../utils/userTypes");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Le nom est obligatoire"],
    },
    image: {
      type: String,
      required: false,
    },
    address: {
      type: String,
      required: false,
    },
    country: {
      type: String,
      required: false,
    },
    city: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: [true, "L'email est obligatoire"],
      validate: {
        validator: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: "Format d'email invalide",
      },
      unique: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      required: false,
      default: "Active",
      enum: [
        "Draft",
        "Invited",
        "PendingActivation",
        "Active",
        "Blocked",
        "Suspended",
        "Archived",
        "Deleted",
        "Inactive",
      ],
    },

    userType: {
      type: String,
      required: true,
      default: USER_TYPES.STORE_ADMIN,
      enum: USER_TYPE_VALUES,
    },

    isSuperAdmin: {
      type: Boolean,
      default: false,
      index: true,
    },

    storeIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Store",
      default: [],
    },

    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },

    twoFactorSecret: {
      type: String,
      select: false,
    },

    twoFactorBackupCodes: {
      type: [String],
      select: false,
      default: [],
    },

    suspendedAt: {
      type: Date,
      required: false,
    },

    suspendedUntil: {
      type: Date,
      required: false,
    },

    suspendedReason: {
      type: String,
      required: false,
    },

     failedLoginAttempts: {
      type: Number,
      default: 0,
    },

    lockedUntil: {
      type: Date,
      required: false,
      default: null,
    },

    invitationToken: {
      type: String,
      required: false,
      select: false,
    },

    invitationTokenExpires: {
      type: Date,
      required: false,
      default: null,
    },

    lastFailedLoginAt: {
      type: Date,
      required: false,
    },
     deletedAt: {
       type: Date,
       required: false,
       default: null,
       index: true,
     },

     deletedBy: {
       type: mongoose.Schema.Types.ObjectId,
       ref: "User",
       required: false,
       default: null,
     },

     createdBy: {
       type: mongoose.Schema.Types.ObjectId,
       ref: "User",
       required: false,
       default: null,
     },

     updatedBy: {
       type: mongoose.Schema.Types.ObjectId,
       ref: "User",
       required: false,
       default: null,
     },

      // Denormalized permission codes for direct access.
      // Source of truth is user.role[].permissions (ObjectId refs to Permission).
      // Keep in sync via role change events.
      permissions: {
        type: [String],
        default: [],
      },

     // Block specific fields
     blockedAt: {
       type: Date,
       required: false,
       default: null,
     },

     blockedReason: {
       type: String,
       required: false,
     },

     blockedBy: {
       type: mongoose.Schema.Types.ObjectId,
       ref: "User",
       required: false,
       default: null,
     },

     // Archive fields
     archivedAt: {
       type: Date,
       required: false,
       default: null,
     },

      archivedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false,
        default: null,
      },

      archivedReason: {
        type: String,
        required: false,
        default: null,
      },

     // Department for admin user grouping
     department: {
       type: String,
       required: false,
       default: null,
     },

     // Team reference for admin grouping
     team: {
       type: mongoose.Schema.Types.ObjectId,
       ref: "Team",
       required: false,
       default: null,
       index: true,
     },

     // Invitation lifecycle
     invitationStatus: {
       type: String,
       required: false,
       default: "not_invited",
       enum: ["not_invited", "invited", "accepted", "expired", "cancelled"],
     },

     invitationSentAt: {
       type: Date,
       required: false,
       default: null,
     },

     invitationAcceptedAt: {
       type: Date,
       required: false,
       default: null,
     },

     invitationExpiresAt: {
       type: Date,
       required: false,
       default: null,
     },

     // Force password change on next login
     forcePasswordChange: {
       type: Boolean,
       default: false,
     },

     // Two-factor authentication enhancements
     twoFactorMethod: {
       type: String,
       default: null,
       validate: {
         validator: function (v) {
           return v === null || ["totp", "sms", "email"].includes(v);
         },
         message: "Invalid two-factor method",
       },
     },

     twoFactorVerified: {
       type: Boolean,
       default: false,
     },

     twoFactorPhone: {
       type: String,
       required: false,
       default: null,
     },

     // Last password change tracking
     lastPasswordChange: {
       type: Date,
       required: false,
       default: null,
     },

     // Last activity tracking
     lastActivity: {
       type: Date,
       required: false,
       default: null,
     },

     lastActivityIp: {
       type: String,
       required: false,
       default: null,
     },

     // MFA backup codes (re-generated after 2FA reset)
      password: {
   type: String,
   required: [
     function () {
       return this.provider === "local" || !this.provider;
     },
     "Le mot de passe est obligatoire",
   ],
   minlength: [8, "Le mot de passe doit contenir au moins 8 caractères"],
   select: false, // is never automatically returned in find() requests
},
    refreshToken: {
      type: String,
      select: false, 
      default: null,
    },
    access_list: {
      type: [String],
      required: false,
      default: [],
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },

     provider: {
      type: String,
      enum: ["local", "google", "facebook", "invitation"],
      default: "local",
    },

    providerId: {
      type: String,
      required: false,
    },

    lastLogin: {
      type: Date,
      required: false,
    },

    lastLoginIp: {
      type: String,
      required: false,
      default: null,
    },

    lastLoginUserAgent: {
      type: String,
      required: false,
      default: null,
    },

    gender: {
      type: String,
      required: false,
      enum: ["Male", "Female"],
    },

    firstName: {
      type: String,
      required: false,
      trim: true,
    },

    lastName: {
      type: String,
      required: false,
      trim: true,
    },

    displayName: {
      type: String,
      required: false,
      trim: true,
    },

    // DEPRECATED: Use currentStoreId instead.
    // primaryStoreId is kept for backward compatibility only.
    primaryStoreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
      default: null,
    },

     emailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: {
      type: String,
      select: false,
    },

    activeSessions: {
      type: [
        {
          sessionId: { type: String, required: true },
          ipAddress: { type: String, required: false },
          userAgent: { type: String, required: false },
          deviceName: { type: String, required: false },
          createdAt: { type: Date, default: Date.now },
          expiresAt: { type: Date, required: false },
          lastActivity: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    preferences: {
      language: { type: String, default: "en" },
      timezone: { type: String, default: "UTC" },
      emailNotifications: { type: Boolean, default: true },
      theme: { type: String, default: "none" },
    },

    // role: {
    //   type: String,
    //   required: true,
    //   default: "Admin",
    //   enum: [
    //     "Admin",
    //     "Super Admin",
    //     "Cashier",
    //     "Manager",
    //     "CEO",
    //     "Driver",
    //     "Security Guard",
    //     "Accountant",
    //   ],
    // },

    role: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Role",
      required: true,
      default: [],
    },

    roles: {
      type: [
        {
          roleId: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },
          storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", default: null },
          assignedAt: { type: Date, default: Date.now },
          assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
          expiresAt: { type: Date, default: null },
        },
      ],
      default: [],
    },

    // DEPRECATED: Use currentStoreId as the single source of truth for the
    // user's active store. selectedStore is kept for backward compatibility only.
    selectedStore: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
      default: null,
    },
    
    joiningData: {
      type: Date,
      required: false,
    },

    currentStoreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
      default: null,
    },
  },
  //this field for CreateAt and UpdateAt
  {
    timestamps: true,
  },
);

// Sync legacy `name` field from firstName + lastName and keep displayName in sync.
// Only runs when `name` is not explicitly provided.
userSchema.pre("save", function (next) {
  if (this.isModified("firstName") || this.isModified("lastName")) {
    if (!this.name) {
      const parts = [this.firstName, this.lastName].filter(Boolean);
      this.name = parts.join(" ") || this.displayName || "";
    }
  }
  if (this.isModified("firstName") || this.isModified("lastName") || this.isModified("displayName")) {
    const parts = [
      this.firstName,
      this.lastName,
    ]
      .filter(Boolean)
      .join(" ");
    if (parts && !this.displayName) {
      this.displayName = parts;
    }
    if (!this.name && parts) {
      this.name = parts;
    }
  }
  next();
});

// Indices for user management queries
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ userType: 1 });
userSchema.index({ storeIds: 1 });
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ isSuperAdmin: 1 });
userSchema.index({ "activeSessions.sessionId": 1 });
userSchema.index({ twoFactorEnabled: 1 });
userSchema.index({ userType: 1, status: 1 });
userSchema.index({ team: 1 });
userSchema.index({ department: 1 });
userSchema.index({ invitationStatus: 1 });
userSchema.index({ blockedAt: 1 });
userSchema.index({ archivedAt: 1 });
userSchema.index({ lastActivity: -1 });
userSchema.index({ forcePasswordChange: 1 });
userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.refreshToken;
    delete ret.twoFactorSecret;
    delete ret.twoFactorBackupCodes;
    delete ret.passwordResetToken;
    delete ret.invitationToken;
    delete ret.emailVerificationToken;
    return ret;
  },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
