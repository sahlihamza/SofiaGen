import requests from "./httpService";

// CRUD for Customer entities. Backend mounted at /api/customer/.
const CustomerServices = {
  // GET /api/customer/ -> { customers, totalDoc, limits, pages }
  getAllCustomers: async ({
    search = "",
    status = "",
    groupId = "",
    page = "",
    limit = "",
  } = {}) => {
    // Values can arrive as `null` (e.g. SidebarContext's searchText default),
    // which the `= ""` defaults don't catch since they only trigger on
    // `undefined`. Coerce here so we never send the literal string "null".
    return requests.get("/customer", {
      search: search ?? "",
      status: status ?? "",
      groupId: groupId ?? "",
      page: page ?? "",
      limit: limit ?? "",
    });
  },

  // WARNING: the backend still wipes the whole collection before inserting.
  addAllCustomers: async (body) => {
    return requests.post("/customer/add/all", body);
  },

  createCustomer: async (body) => {
    return requests.post(`/customer/add`, body);
  },

  getCustomerById: async (id) => {
    return requests.get(`/customer/${id}`);
  },

  updateCustomer: async (id, body) => {
    return requests.put(`/customer/${id}`, body);
  },

  // Soft delete: the row keeps its data with deletedAt set, and drops out of
  // the list until it is restored.
  deleteCustomer: async (id) => {
    return requests.delete(`/customer/${id}`);
  },
};

export default CustomerServices;
