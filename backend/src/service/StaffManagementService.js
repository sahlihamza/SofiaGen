const UserManagementService = require("./UserManagementService");
const PlatformTeamService = require("./PlatformTeamService");
const AuditService = require("./AuditService");

// Platform Staff Management is a SPECIALIZED VIEW of the existing Platform User
// Management system. There is NO parallel Staff model or service  every
// operation reuses UserManagementService (and PlatformTeamService for team ops).
//
// Platform Staff = any User that has platform access:
//   - isSuperAdmin === true
//   - OR has at least one platform-scoped Role
//
// This is NOT store-level staff. Store staff is managed through UserStore
// assignments within each store context.
class StaffManagementService {
  async getStaffList(filters = {}, pagination = {}, sort = "-createdAt") {
    const staffFilters = {
      ...filters,
      isSuperAdmin: undefined,
      platformOnly: true,
    };
    delete staffFilters.userType;

    const result = await UserManagementService.getAllUsers(staffFilters, { ...pagination, limit: 100 }, sort);

    const staffUsers = result.users.filter(
      (user) =>
        user.isSuperAdmin ||
        user.userType === "platform_admin" ||
        user.userType === "superadmin" ||
        (user.platformRoles && user.platformRoles.length > 0)
    );

    let filteredUsers = staffUsers;
    if (filters.userType) {
      const types = Array.isArray(filters.userType) ? filters.userType : [filters.userType];
      filteredUsers = staffUsers.filter((user) => types.includes(user.userType));
    }
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      filteredUsers = filteredUsers.filter((user) => statuses.includes(user.status));
    }

    const page = Math.max(1, Number(pagination.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(pagination.limit) || 25));
    const start = (page - 1) * limit;
    const paginatedUsers = filteredUsers.slice(start, start + limit);

    const active = filteredUsers.filter((u) => u.status === "Active").length;
    const suspended = filteredUsers.filter((u) => u.status === "Suspended").length;
    const superAdmins = filteredUsers.filter((u) => u.isSuperAdmin).length;

    return {
      users: paginatedUsers,
      pagination: {
        total: filteredUsers.length,
        page,
        limit,
        pages: Math.ceil(filteredUsers.length / limit) || 1,
      },
      stats: { total: filteredUsers.length, active, suspended, superAdmins },
    };
  }

  async getStaffMember(userId) {
    // getUserById already enriches with platformRoles and platformPermissions
    // (Role -> Permission resolution).
    const user = await UserManagementService.getUserById(userId);

    const effectivePermissions = await this.getEffectivePermissions(userId);

    return {
      ...user,
      effectivePermissions,
    };
  }

  async assignRole(userId, roleId, assignedBy) {
    // Reuses UserManagementService.assignRole which already guards for
    // platform-scoped roles and writes its own audit entry.
    return await UserManagementService.assignRole(userId, roleId, null, null, assignedBy);
  }

  async removeRole(userId, roleId) {
    return await UserManagementService.removeRole(userId, roleId);
  }

  async addToTeam(userId, teamId, actorId) {
    const result = await PlatformTeamService.addMember(teamId, userId, actorId);

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: actorId || null,
      module: "platform.staff",
      action: "platform.staff.team_added",
      entityType: "user",
      entityId: userId,
      status: "success",
      severity: "low",
      newValue: { teamId },
      metadata: { actorId: actorId || null, targetUserId: userId, teamId, timestamp: new Date().toISOString() },
    });

    return result;
  }

  async removeFromTeam(userId, teamId, actorId) {
    const result = await PlatformTeamService.removeMember(teamId, userId, actorId);

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: actorId || null,
      module: "platform.staff",
      action: "platform.staff.team_removed",
      entityType: "user",
      entityId: userId,
      status: "success",
      severity: "low",
      oldValue: { teamId },
      metadata: { actorId: actorId || null, targetUserId: userId, teamId, timestamp: new Date().toISOString() },
    });

    return result;
  }

  async suspendStaff(userId, reason, suspendedBy) {
    return await UserManagementService.suspendUser(userId, reason, suspendedBy);
  }

  async activateStaff(userId, activatedBy) {
    return await UserManagementService.reactivateUser(userId, activatedBy);
  }

  async revokeSessions(userId, revokedBy) {
    return await UserManagementService.logoutAllDevices(userId, revokedBy);
  }

  async getEffectivePermissions(userId) {
    return await UserManagementService.getEffectivePermissions(userId);
  }
}

module.exports = new StaffManagementService();
