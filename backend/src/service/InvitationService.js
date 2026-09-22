const crypto = require("crypto");
const Invitation = require("../models/Invitation");
const User = require("../models/User");
const Role = require("../models/Role");
const UserStore = require("../models/UserStore");
const AuditService = require("./AuditService");
const { emitEvent } = require("../lib/eventBus");

const BLOCKED_USER_STATUSES = ["Suspended", "Blocked", "Archived", "Deleted"];

const adminBaseUrl = () => {
  for (const candidate of [process.env.ADMIN_BASE_URL, process.env.ADMIN_URL, process.env.FRONTEND_URL]) {
    if (candidate && /^https?:\/\//i.test(candidate.trim())) {
      return candidate.trim().replace(/\/+$/, "");
    }
  }
  return "";
};

class InvitationService {
  async getAllInvitations(filters = {}, pagination = {}) {
    const {
      status,
      search = "",
      dateFrom,
      dateTo,
      storeId,
      platformOnly = false,
    } = filters;

    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 25;
    const skip = (page - 1) * limit;

    const query = {};

    if (status) {
      query.status = Array.isArray(status) ? { $in: status } : status;
    }

    if (platformOnly) {
      query.storeId = null;
    } else if (storeId) {
      query.storeId = storeId;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
      ];
    }

    const [total, pending, accepted, expired] = await Promise.all([
      Invitation.countDocuments(query),
      Invitation.countDocuments({ ...query, status: "pending" }),
      Invitation.countDocuments({ ...query, status: "accepted" }),
      Invitation.countDocuments({ ...query, status: "expired" }),
    ]);

    const invitations = await Invitation.find(query)
      .populate("invitedBy", "name email")
      .populate("acceptedBy", "name email")
      .populate("roleIds", "name slug")
      .populate("storeId", "name")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      invitations,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
      stats: { total, pending, accepted, expired },
    };
  }

  async getInvitationById(id, platformOnly = false) {
    return await Invitation.findOne({ _id: id, ...(platformOnly ? { storeId: null } : {}) })
      .populate("invitedBy", "name email")
      .populate("acceptedBy", "name email")
      .populate("roleIds", "name slug permissions")
      .populate("storeId", "name")
      .lean();
  }

  async createInvitation(data) {
    const {
      email,
      firstName,
      lastName,
      roleIds = [],
      storeId = null,
      invitedBy = null,
      sendEmail = true,
      ip,
      userAgent,
      platformOnly = false,
      expiresInHours = 168,
    } = data;

    if (platformOnly && storeId) {
      const error = new Error("Une invitation plateforme ne peut pas cibler un store");
      error.name = "InvalidScope";
      throw error;
    }

    // SO-06-style ordered checks for a store invitation  same spirit as
    // addStaffToStore's CAS B, applied here to the pending-invitation path:
    // a deleted/suspended account, an existing active membership, or an
    // already-pending invitation on THIS store must all be rejected before
    // a new invitation is created, not just a global "any pending
    // invitation for this email" check (which would block, e.g., inviting
    // the same person to two different stores).
    if (storeId) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        if (existingUser.deletedAt) {
          const error = new Error("Ce compte a t supprimé et ne peut pas être invité");
          error.name = "EmailExists";
          throw error;
        }
        if (BLOCKED_USER_STATUSES.includes(existingUser.status)) {
          const error = new Error("Ce compte est suspendu et ne peut pas être invité");
          error.name = "EmailExists";
          throw error;
        }
        if (existingUser.isSuperAdmin) {
          const error = new Error("Ce compte ne peut pas être invité dans une store");
          error.name = "InvalidScope";
          throw error;
        }
        const existingMembership = await UserStore.findOne({ userId: existingUser._id, storeId });
        if (existingMembership?.status === "active") {
          const error = new Error("Cet utilisateur est déjà membre actif de cette store");
          error.name = "InvitationExists";
          throw error;
        }
      }

      const existingStoreInvitation = await Invitation.findOne({
        email: email.toLowerCase(),
        storeId,
        status: "pending",
      });
      if (existingStoreInvitation) {
        const error = new Error("Une invitation en attente existe déjà pour cet email sur cette store");
        error.name = "InvitationExists";
        throw error;
      }
    } else {
      const existingUser = await User.findOne({ email, deletedAt: null });
      if (existingUser) {
        const error = new Error("Cet email est déjà utilisé par un utilisateur actif");
        error.name = "EmailExists";
        throw error;
      }

      const existingInvitation = await Invitation.findOne({
        email: email.toLowerCase(),
        storeId: null,
        status: "pending",
      });
      if (existingInvitation) {
        const error = new Error("Une invitation en attente existe déjà pour cet email");
        error.name = "InvitationExists";
        throw error;
      }
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const roleObjectIds = [];
    if ((platformOnly || storeId) && (!Array.isArray(roleIds) || roleIds.length !== 1)) {
      const error = new Error("Un rôle unique est requis pour cette invitation");
      error.name = "InvalidScope";
      throw error;
    }
    if (roleIds && roleIds.length > 0) {
      const validRoles = await Role.find({ _id: { $in: roleIds } });
      if (validRoles.length !== roleIds.length) {
        const error = new Error("Un ou plusieurs rôles sont invalides");
        error.name = "InvalidRoles";
        throw error;
      }
      if (platformOnly && validRoles.some((role) => role.scope !== "platform")) {
        const error = new Error("Les invitations plateforme exigent uniquement des rôles plateforme");
        error.name = "InvalidScope";
        throw error;
      }
      if (platformOnly && validRoles.some((role) => role.name === "Super Admin")) {
        const error = new Error("Les invitations plateforme ne peuvent pas crér de Super Admin");
        error.name = "InvalidScope";
        throw error;
      }
      // A store invitation must reference a store-scope role that actually
      // belongs to THIS store  never a platform role, and never another
      // store's role (Role docs are per-store once seeded, see
      // seedDefaultRolesForStore).
      if (storeId && validRoles.some((role) => role.scope !== "store" || String(role.storeId) !== String(storeId))) {
        const error = new Error("Le rôle choisi n'est pas un rôle valide pour cette store");
        error.name = "InvalidScope";
        throw error;
      }
      roleObjectIds.push(...roleIds.map(String));
    }

    const expirationHours = Math.max(1, Math.min(Number(expiresInHours) || 168, 24 * 30));
    const expiresAt = Date.now() + expirationHours * 60 * 60 * 1000;
    const invitation = await Invitation.create({
      email: email.toLowerCase(),
      firstName,
      lastName,
      tokenHash,
      tokenExpiresAt: expiresAt,
      expiresAt,
      roleIds: roleObjectIds,
      storeId,
      invitedBy,
      ip,
      userAgent,
    });

    await AuditService.logAction({
      actorType: storeId ? "store_owner" : "platform_admin",
      actorId: invitedBy || null,
      storeId: storeId || undefined,
      module: storeId ? "store.invitation" : "platform.invitation",
      action: storeId ? "invitation.created" : "platform.invitation.created",
      entityType: "invitation",
      entityId: invitation._id,
      status: "success",
      severity: "medium",
      newValue: {
        email: invitation.email,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
      },
      metadata: { actorId: invitedBy, targetUserId: null, timestamp: new Date().toISOString() },
    });

    if (sendEmail) {
      const { sendInvitationEmail: sendEmailFn } = require("../utils/mailer");
      const invitationUrl = `${adminBaseUrl()}/invite?token=${rawToken}`;
      try {
        await sendEmailFn(invitation.email, invitation.firstName || invitation.email, invitationUrl);

        invitation.sendCount += 1;
        invitation.lastSentAt = new Date();
        invitation.status = "pending";
        await invitation.save();
        await AuditService.logAction({
          actorType: "platform_admin",
          actorId: invitedBy || null,
          module: "platform.invitation",
          action: "platform.invitation.sent",
          entityType: "invitation",
          entityId: invitation._id,
          status: "success",
          severity: "low",
          metadata: { actorId: invitedBy, targetUserId: null, timestamp: new Date().toISOString() },
        });
      } catch (emailError) {
        // L'invitation existe déjà : un SMTP indisponible ne doit pas
        // faire échouer la requéte (l'UI retomberait sur un faux 409 au
        // retry). Méme traitement non bloquant que resendInvitation().
        console.error("Failed to send invitation email:", emailError.message);
        await AuditService.logAction({
          actorType: "platform_admin",
          actorId: invitedBy || null,
          module: "platform.invitation",
          action: "platform.invitation.send_failed",
          entityType: "invitation",
          entityId: invitation._id,
          status: "failed",
          severity: "medium",
          metadata: { actorId: invitedBy, targetUserId: null, error: emailError.message, timestamp: new Date().toISOString() },
        });
      }
    }

    if (storeId) {
      emitEvent("user.invited", {
        storeId,
        actorId: invitedBy,
        entityId: invitation._id,
        metadata: { userName: `${invitation.firstName || ""} ${invitation.lastName || ""}`.trim() || invitation.email },
        actionUrl: "/our-staff",
      });
    }

    return {
      invitation: await this._sanitizeInvitation(invitation),
      invitationToken: rawToken,
      invitationUrl: `${adminBaseUrl()}/invite?token=${rawToken}`,
    };
  }

  async resendInvitation(id, ip, userAgent, actorId = null, storeId = null) {
    const invitation = await Invitation.findOne({ _id: id, storeId });
    if (!invitation) {
      const error = new Error("Invitation introuvable");
      error.name = "NotFound";
      throw error;
    }

    if (invitation.status !== "pending" && invitation.status !== "expired") {
      const error = new Error("Cette invitation ne peut pas être renvoyé");
      error.name = "InvalidState";
      throw error;
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    invitation.tokenHash = tokenHash;
    invitation.tokenExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    invitation.expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    invitation.status = "pending";
    invitation.sendCount += 1;
    invitation.lastSentAt = new Date();
    invitation.ip = ip;
    invitation.userAgent = userAgent;

    await invitation.save();

    const { sendInvitationEmail: sendEmailFn } = require("../utils/mailer");
    const invitationUrl = `${adminBaseUrl()}/invite?token=${rawToken}`;
    try {
      await sendEmailFn(invitation.email, invitation.firstName || invitation.email, invitationUrl);
      await AuditService.logAction({
        actorType: "platform_admin",
        actorId,
        module: "platform.invitation",
        action: "platform.invitation.sent",
        entityType: "invitation",
        entityId: invitation._id,
        status: "success",
        severity: "low",
        metadata: { actorId, targetUserId: null, timestamp: new Date().toISOString() },
      });
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError.message);
    }

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId,
      module: "platform.invitation",
      action: "platform.invitation.resent",
      entityType: "invitation",
      entityId: invitation._id,
      status: "success",
      severity: "low",
      newValue: { sendCount: invitation.sendCount },
      metadata: { actorId, targetUserId: invitation.acceptedBy || null, timestamp: new Date().toISOString() },
    });

    return {
      invitation: await this._sanitizeInvitation(invitation),
      invitationToken: rawToken,
      invitationUrl,
    };
  }

  async cancelInvitation(id, actorId = null, storeId = null) {
    const invitation = await Invitation.findOne({ _id: id, storeId });
    if (!invitation) {
      const error = new Error("Invitation introuvable");
      error.name = "NotFound";
      throw error;
    }

    invitation.status = "cancelled";
    await invitation.save();

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId,
      module: "platform.invitation",
      action: "platform.invitation.revoked",
      entityType: "invitation",
      entityId: invitation._id,
      status: "success",
      severity: "medium",
      metadata: { actorId, targetUserId: invitation.acceptedBy || null, timestamp: new Date().toISOString() },
    });

    return invitation;
  }

  async revokeInvitation(id, actorId = null, storeId = null) {
    const invitation = await Invitation.findOne({ _id: id, storeId });
    if (!invitation) {
      const error = new Error("Invitation introuvable");
      error.name = "NotFound";
      throw error;
    }

    invitation.status = "revoked";
    await invitation.save();

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId,
      module: "platform.invitation",
      action: "platform.invitation.revoked",
      entityType: "invitation",
      entityId: invitation._id,
      status: "success",
      severity: "high",
      metadata: { actorId, targetUserId: invitation.acceptedBy || null, timestamp: new Date().toISOString() },
    });

    return invitation;
  }

  async expireInvitations() {
    const now = new Date();
    const result = await Invitation.updateMany(
      { tokenExpiresAt: { $lt: now }, status: "pending" },
      { $set: { status: "expired" } }
    );

    if (result.modifiedCount || result.nModified) {
      await AuditService.logAction({
        actorType: "system",
        module: "platform.invitation",
        action: "platform.invitation.expired",
        entityType: "invitation",
        status: "success",
        severity: "low",
        metadata: { actorId: null, targetUserId: null, timestamp: new Date().toISOString(), count: result.modifiedCount || result.nModified },
      });
    }

    return result;
  }

  async acceptInvitation(rawToken, password) {
    const tokenHash = crypto.createHash("sha256").update(String(rawToken || "")).digest("hex");
    // tokenHash is globally unique (schema-enforced)  one lookup serves
    // both platform and store invitations, branched below by storeId.
    const invitation = await Invitation.findOne({ tokenHash }).select("+tokenHash");
    if (!invitation) {
      const error = new Error("Invitation invalide");
      error.name = "InvalidInvitation";
      throw error;
    }
    if (invitation.status !== "pending" || invitation.tokenExpiresAt <= new Date()) {
      if (invitation.status === "pending") {
        invitation.status = "expired";
        await invitation.save();
      }
      const error = new Error("Invitation expiré ou indisponible");
      error.name = "InvalidInvitationState";
      throw error;
    }
    if (!password || String(password).length < 8) {
      const error = new Error("Un mot de passe d'au moins 8 caractères est requis");
      error.name = "InvalidPassword";
      throw error;
    }

    const roleIds = invitation.roleIds || [];
    const expectedScope = invitation.storeId ? "store" : "platform";
    const roles = await Role.find({ _id: { $in: roleIds }, scope: expectedScope });
    if (roles.length !== roleIds.length) {
      const error = new Error("Le rôle de l'invitation est invalide");
      error.name = "InvalidScope";
      throw error;
    }

    const bcrypt = require("bcryptjs");
    let user = await User.findOne({ email: invitation.email, deletedAt: null });

    if (invitation.storeId) {
      // Store invitation: the account is a store staff member, never
      // granted a platform role  its permissions come exclusively from
      // UserStore.roleId (SO-16 golden rule), created/reactivated below.
      if (!user) {
        user = await User.create({
          name: [invitation.firstName, invitation.lastName].filter(Boolean).join(" ") || invitation.email,
          firstName: invitation.firstName,
          lastName: invitation.lastName,
          email: invitation.email,
          password: await bcrypt.hash(String(password), 10),
          userType: "staff",
          status: "Active",
          emailVerified: true,
          provider: "invitation",
        });
      } else {
        if (user.deletedAt) {
          const error = new Error("Ce compte a t supprimé");
          error.name = "InvalidScope";
          throw error;
        }
        if (BLOCKED_USER_STATUSES.includes(user.status)) {
          const error = new Error("Ce compte est suspendu");
          error.name = "InvalidScope";
          throw error;
        }
        user.password = await bcrypt.hash(String(password), 10);
        user.status = "Active";
        user.emailVerified = true;
        await user.save();
      }

      const roleId = roleIds[0];
      const existingMembership = await UserStore.findOne({ userId: user._id, storeId: invitation.storeId });
      if (existingMembership) {
        existingMembership.roleId = roleId;
        existingMembership.status = "active";
        await existingMembership.save();
      } else {
        await UserStore.create({
          userId: user._id,
          storeId: invitation.storeId,
          roleId,
          status: "active",
          invitedBy: invitation.invitedBy,
        });
      }
    } else {
      if (!user) {
        user = await User.create({
          name: [invitation.firstName, invitation.lastName].filter(Boolean).join(" ") || invitation.email,
          firstName: invitation.firstName,
          lastName: invitation.lastName,
          email: invitation.email,
          password: await bcrypt.hash(String(password), 10),
          userType: "platform_admin",
          role: roleIds,
          status: "Active",
          emailVerified: true,
          provider: "invitation",
        });
      } else {
        user.role = [...new Set([...(user.role || []).map(String), ...roleIds.map(String)])];
        user.password = await bcrypt.hash(String(password), 10);
        user.status = "Active";
        user.emailVerified = true;
        await user.save();
      }
    }

    invitation.status = "accepted";
    invitation.acceptedBy = user._id;
    invitation.acceptedAt = new Date();
    await invitation.save();
    await AuditService.logAction({
      actorType: "system",
      actorId: user._id,
      storeId: invitation.storeId || undefined,
      module: invitation.storeId ? "store.invitation" : "platform.invitation",
      action: invitation.storeId ? "invitation.accepted" : "platform.invitation.accepted",
      entityType: "invitation",
      entityId: invitation._id,
      status: "success",
      metadata: { actorId: user._id, targetUserId: user._id, timestamp: new Date().toISOString() },
    });
    return { user: user.toObject({ transform: (doc, ret) => { delete ret.password; return ret; } }) };
  }

  async deleteInvitation(id, actorId = null) {
    const invitation = await Invitation.findByIdAndDelete(id);
    if (!invitation) {
      const error = new Error("Invitation introuvable");
      error.name = "NotFound";
      throw error;
    }

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: actorId || null,
      module: "platform.invitation",
      action: "platform.invitation.deleted",
      entityType: "invitation",
      entityId: invitation._id,
      status: "success",
      severity: "medium",
      metadata: { actorId: actorId || null, targetUserId: invitation.acceptedBy || null, timestamp: new Date().toISOString() },
    });

    return invitation;
  }

  async _sanitizeInvitation(invitation) {
    if (!invitation) return null;
    const obj = typeof invitation.toObject === "function"
      ? invitation.toObject()
      : { ...invitation };
    delete obj.tokenHash;
    return obj;
  }
}

module.exports = new InvitationService();
