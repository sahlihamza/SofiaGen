const mongoose = require("mongoose");
const Team = require("../models/Team");
const User = require("../models/User");
const AuditService = require("./AuditService");

class TeamService {
  async getAllTeams(filters = {}, pagination = {}) {
    const { search = "", department, storeId } = filters;

    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 25;
    const skip = (page - 1) * limit;

    const query = {};

    if (storeId) {
      query.storeId = storeId;
    }

    if (department) {
      query.department = department;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Team.countDocuments(query);

    const teams = await Team.find(query)
      .populate("leader", "name email")
      .populate("members", "name email status")
      .populate("storeId", "name slug status")
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
    };
  }

  async getTeamById(id) {
    return await Team.findById(id)
      .populate("leader", "name email")
      .populate("members", "name email status userType role")
      .populate("storeId", "name slug status")
      .lean();
  }

  async createTeam(data, actorId = null) {
    const {
      name,
      slug,
      description,
      department,
      leader,
      memberIds = [],
      storeId = null,
    } = data;

    const teamSlug = slug || String(name).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    if (storeId) {
      const exists = await Team.findOne({ slug: teamSlug, storeId });
      if (exists) {
        const error = new Error("Une équipe avec ce slug existe déjà pour ce store");
        error.name = "TeamExists";
        throw error;
      }
    }

    const team = await Team.create({
      name,
      slug: teamSlug,
      code: data.code || teamSlug,
      description,
      department,
      leader,
      members: memberIds,
      storeId,
      createdBy: actorId,
      updatedBy: actorId,
      memberCount: memberIds.length,
    });

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: actorId || null,
      module: "team",
      action: "team.created",
      entityType: "team",
      entityId: team._id,
      status: "success",
      severity: "medium",
      newValue: { name: team.name, slug: team.slug },
      metadata: { actorId, targetUserId: null, timestamp: new Date().toISOString() },
    });

    return team;
  }

  async updateTeam(id, data, actorId = null) {
    const team = await Team.findById(id);
    if (!team) {
      const error = new Error("équipe introuvable");
      error.name = "NotFound";
      throw error;
    }

    const updates = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.slug !== undefined) updates.slug = data.slug;
    if (data.description !== undefined) updates.description = data.description;
    if (data.department !== undefined) updates.department = data.department;
    if (data.leader !== undefined) updates.leader = data.leader;
    if (data.updatedBy !== undefined) updates.updatedBy = data.updatedBy;
    if (data.memberIds !== undefined) {
      updates.members = data.memberIds;
      updates.memberCount = data.memberIds.length;
    }

    await Team.updateOne({ _id: id }, { $set: updates });

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: actorId || null,
      module: "team",
      action: "team.updated",
      entityType: "team",
      entityId: id,
      status: "success",
      severity: "low",
      changes: updates,
      metadata: { actorId, targetUserId: null, timestamp: new Date().toISOString() },
    });

    return await this.getTeamById(id);
  }

  async deleteTeam(id, actorId = null) {
    const team = await Team.findById(id);
    if (!team) {
      const error = new Error("équipe introuvable");
      error.name = "NotFound";
      throw error;
    }

    await Team.findByIdAndDelete(id);

    await User.updateMany({ team: id }, { $unset: { team: "" } });

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: actorId || null,
      module: "team",
      action: "team.deleted",
      entityType: "team",
      entityId: id,
      status: "success",
      severity: "medium",
      oldValue: { name: team.name, slug: team.slug },
      metadata: { actorId, targetUserId: null, timestamp: new Date().toISOString() },
    });

    return { success: true };
  }

  async assignUserToTeam(userId, teamId, actorId = null) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const user = await User.findById(userId).session(session);
      if (!user) {
        throw new Error("Utilisateur introuvable");
      }

      const team = await Team.findById(teamId).session(session);
      if (!team) {
        throw new Error("équipe introuvable");
      }

      if (!team.members.includes(user._id)) {
        team.members.push(user._id);
        team.memberCount = team.members.length;
        await team.save({ session });
      }

      user.team = team._id;
      await user.save({ session, validateBeforeSave: false });

      await session.commitTransaction();
      session.endSession();

        await AuditService.logAction({
          actorType: "platform_admin",
          actorId: actorId || null,
          module: "team",
          action: "team.member_added",
          entityType: "user",
          entityId: userId,
          status: "success",
          severity: "low",
          newValue: { teamId: team._id, teamName: team.name },
          metadata: { actorId, targetUserId: userId, timestamp: new Date().toISOString() },
        });

      return user;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  async removeFromTeam(userId, actorId = null) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error("Utilisateur introuvable");
      error.name = "NotFound";
      throw error;
    }

    const oldTeam = user.team;
    user.team = null;
    await user.save({ validateBeforeSave: false });

    if (oldTeam) {
      await Team.updateOne(
        { _id: oldTeam, members: userId },
        { $pull: { members: userId } },
        { new: true }
      ).then((team) => {
        if (team) {
          Team.updateOne(
            { _id: oldTeam },
            { $set: { memberCount: Math.max(0, (team.members?.length || 1) - 1) } }
          ).exec();
        }
      });
    }

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: actorId || null,
      module: "team",
      action: "team.member_removed",
      entityType: "user",
      entityId: userId,
      status: "success",
      severity: "low",
      oldValue: { teamId: oldTeam },
      metadata: { actorId, targetUserId: userId, timestamp: new Date().toISOString() },
    });

    return user;
  }

  async getDepartments(storeId = null) {
    const query = {};
    if (storeId) query.storeId = storeId;

    const teams = await Team.find(query).select("department").lean();
    const departments = [...new Set(teams.map((t) => t.department).filter(Boolean))];
    return departments;
  }
}

module.exports = new TeamService();
