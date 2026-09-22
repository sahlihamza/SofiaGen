const mongoose = require("mongoose");
const PlatformTeam = require("../models/PlatformTeam");
const PlatformTeamMember = require("../models/PlatformTeamMember");
const User = require("../models/User");
const AuditService = require("./AuditService");

class PlatformTeamService {
  async getAllTeams(filters = {}, pagination = {}) {
    const { search = "", status, code } = filters;

    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 25;
    const skip = (page - 1) * limit;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (code) {
      query.code = code;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const [total, active, inactive, archived] = await Promise.all([
      PlatformTeam.countDocuments(query),
      PlatformTeam.countDocuments({ ...query, status: "active" }),
      PlatformTeam.countDocuments({ ...query, status: "inactive" }),
      PlatformTeam.countDocuments({ ...query, status: "archived" }),
    ]);

    const teams = await PlatformTeam.find(query)
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      teams,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
      stats: { total, active, inactive, archived },
    };
  }

  async getTeamById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Identifiant invalide");
      error.name = "InvalidId";
      throw error;
    }

    const team = await PlatformTeam.findById(id).lean();
    if (!team) {
      const error = new Error("équipe introuvable");
      error.name = "NotFound";
      throw error;
    }

    const members = await this.getTeamMembers(id);
    return { ...team, members };
  }

  async createTeam(data, actorId = null) {
    const { name, code, description, status } = data;

    const team = await PlatformTeam.create({
      name,
      code: code?.toUpperCase(),
      description,
      status: status || "active",
      createdBy: actorId,
      updatedBy: actorId,
    });

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: actorId || null,
      module: "platform.team",
      action: "platform.team.created",
      entityType: "team",
      entityId: team._id,
      status: "success",
      severity: "medium",
      newValue: { name: team.name, code: team.code },
      metadata: { actorId, targetUserId: null, timestamp: new Date().toISOString() },
    });

    return team;
  }

  async updateTeam(id, data, actorId = null) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Identifiant invalide");
      error.name = "InvalidId";
      throw error;
    }

    const team = await PlatformTeam.findById(id);
    if (!team) {
      const error = new Error("équipe introuvable");
      error.name = "NotFound";
      throw error;
    }

    const updates = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.code !== undefined) updates.code = data.code;
    if (data.description !== undefined) updates.description = data.description;
    if (data.status !== undefined) updates.status = data.status;
    if (data.updatedBy !== undefined) updates.updatedBy = data.updatedBy;
    updates.updatedBy = actorId;

    await PlatformTeam.updateOne({ _id: id }, { $set: updates });

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: actorId || null,
      module: "platform.team",
      action: "platform.team.updated",
      entityType: "team",
      entityId: id,
      status: "success",
      severity: "low",
      changes: updates,
      metadata: { actorId, targetUserId: null, timestamp: new Date().toISOString() },
    });

    return await this.getTeamById(id);
  }

  async archiveTeam(id, actorId = null) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Identifiant invalide");
      error.name = "InvalidId";
      throw error;
    }

    const team = await PlatformTeam.findById(id);
    if (!team) {
      const error = new Error("équipe introuvable");
      error.name = "NotFound";
      throw error;
    }

    team.status = "archived";
    team.updatedBy = actorId;
    await team.save();

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: actorId || null,
      module: "platform.team",
      action: "platform.team.archived",
      entityType: "team",
      entityId: id,
      status: "success",
      severity: "medium",
      oldValue: { name: team.name, code: team.code, status: "active" },
      newValue: { status: "archived" },
      metadata: { actorId, targetUserId: null, timestamp: new Date().toISOString() },
    });

    return team;
  }

  async deleteTeam(id, actorId = null) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Identifiant invalide");
      error.name = "InvalidId";
      throw error;
    }

    const team = await PlatformTeam.findById(id);
    if (!team) {
      const error = new Error("équipe introuvable");
      error.name = "NotFound";
      throw error;
    }

    // Protection contre la suppression d'une équipe encore utilisé
    const membersCount = await PlatformTeamMember.countDocuments({ teamId: id });
    if (membersCount > 0) {
      const error = new Error("Impossible de supprimer une équipe qui contient encore des membres. Veuillez d'abord retirer tous les membres.");
      error.name = "TeamInUse";
      throw error;
    }

    await PlatformTeam.deleteOne({ _id: id });

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: actorId || null,
      module: "platform.team",
      action: "platform.team.deleted",
      entityType: "team",
      entityId: id,
      status: "success",
      severity: "high",
      oldValue: { name: team.name, code: team.code },
      metadata: { actorId, targetUserId: null, timestamp: new Date().toISOString() },
    });

    return { success: true };
  }

  async addMember(teamId, userId, actorId = null) {
    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      const error = new Error("Identifiant d'équipe invalide");
      error.name = "InvalidId";
      throw error;
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      const error = new Error("Identifiant utilisateur invalide");
      error.name = "InvalidId";
      throw error;
    }

    const team = await PlatformTeam.findById(teamId);
    if (!team) {
      const error = new Error("équipe introuvable");
      error.name = "NotFound";
      throw error;
    }

    const existing = await PlatformTeamMember.findOne({ teamId, userId });
    if (existing) {
      const error = new Error("L'utilisateur est déjà membre de cette équipe");
      error.name = "AlreadyMember";
      throw error;
    }

    await PlatformTeamMember.create({
      teamId,
      userId,
      addedBy: actorId,
    });

    await PlatformTeam.updateOne({ _id: teamId }, { $inc: { membersCount: 1 } });

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: actorId || null,
      module: "platform.team",
      action: "platform.team.member_added",
      entityType: "team_member",
      entityId: teamId,
      status: "success",
      severity: "low",
      newValue: { teamId, teamName: team.name, userId },
      metadata: { actorId, targetUserId: userId, timestamp: new Date().toISOString() },
    });

    return { success: true };
  }

  async removeMember(teamId, userId, actorId = null) {
    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      const error = new Error("Identifiant d'équipe invalide");
      error.name = "InvalidId";
      throw error;
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      const error = new Error("Identifiant utilisateur invalide");
      error.name = "InvalidId";
      throw error;
    }

    const membership = await PlatformTeamMember.findOneAndDelete({ teamId, userId });
    if (!membership) {
      const error = new Error("Membre introuvable dans cette équipe");
      error.name = "NotFound";
      throw error;
    }

    await PlatformTeam.updateOne(
      { _id: teamId },
      { $inc: { membersCount: -1 } }
    );

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: actorId || null,
      module: "platform.team",
      action: "platform.team.member_removed",
      entityType: "team_member",
      entityId: teamId,
      status: "success",
      severity: "low",
      oldValue: { userId },
      metadata: { actorId, targetUserId: userId, timestamp: new Date().toISOString() },
    });

    return { success: true };
  }

  async getTeamMembers(teamId) {
    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      const error = new Error("Identifiant invalide");
      error.name = "InvalidId";
      throw error;
    }

    const members = await PlatformTeamMember.find({ teamId, status: "active" })
      .populate("userId", "name email userType status")
      .sort("-joinedAt")
      .lean();

    return members.map((m) => ({
      _id: m._id,
      userId: m.userId,
      status: m.status,
      joinedAt: m.joinedAt,
      addedBy: m.addedBy,
    }));
  }
}

module.exports = new PlatformTeamService();
