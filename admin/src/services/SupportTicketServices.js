import requests from "./httpService";

// Support ticket creation/listing. Backend mounted at /api/support-tickets/
// (staff/back-office auth chain). The storefront/customer-facing mount
// (/api/public/support-tickets/) is not consumed here yet  this admin app
// only creates tickets on the staff side for now.
const SupportTicketServices = {
  getAllTickets: async ({
    page = "",
    limit = "",
    status = "",
    priority = "",
    categoryId = "",
    assigneeId = "",
    dateFrom = "",
    dateTo = "",
    sortBy = "",
    search = "",
  } = {}) => {
    const params = new URLSearchParams();
    Object.entries({
      page,
      limit,
      status,
      priority,
      categoryId,
      assigneeId,
      dateFrom,
      dateTo,
      sortBy,
      search,
    }).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        params.set(key, value);
      }
    });
    return requests.get(`/support-tickets?${params.toString()}`);
  },

  getTicketById: async (id) => {
    return requests.get(`/support-tickets/${id}`);
  },

  // Same endpoint as getTicketById  kept as a separate, explicitly-named
  // method because the response shape is { ticket, messages } (SUPPORT-3),
  // not just a ticket, and the detail page's intent reads clearer this way.
  getTicketDetail: async (id) => {
    return requests.get(`/support-tickets/${id}`);
  },

  createTicket: async (data) => {
    return requests.post("/support-tickets", data);
  },

  // No agentId means self-assign  the backend defaults to the requesting
  // agent (req.user._id) when the body is empty.
  assignTicket: async (id, agentId) => {
    return requests.patch(`/support-tickets/${id}/assign`, agentId ? { agentId } : {});
  },

  changeStatus: async (id, status) => {
    return requests.patch(`/support-tickets/${id}/status`, { status });
  },

  bulkAction: async ({ ticketIds, action, value }) => {
    return requests.post("/support-tickets/bulk-actions", { ticketIds, action, value });
  },

  // data: { content, isInternalNote, isSolution }
  addMessage: async (id, data) => {
    return requests.post(`/support-tickets/${id}/messages`, data);
  },

  rateMessage: async (id, messageId, rating) => {
    return requests.patch(`/support-tickets/${id}/messages/${messageId}/rating`, { rating });
  },

  // SUPPORT-9 analytics. params: { startDate, endDate, comparePeriod, storeId }
  //  storeId is only meaningful for a super admin (see supportAnalyticsController.js's
  // resolveAnalyticsStoreId); a store-level user's storeId is always resolved
  // server-side from their active store, sending one here has no effect for them.
  getSupportSummary: async (params = {}) => {
    return requests.get("/support-tickets/analytics/summary", params);
  },

  getSupportCsat: async (params = {}) => {
    return requests.get("/support-tickets/analytics/csat", params);
  },

  getAgentPerformance: async (params = {}) => {
    return requests.get("/support-tickets/analytics/agents", params);
  },
};

export default SupportTicketServices;
