import requests from "./httpService";

const OrderServices = {
  getAllOrders: async ({
    body,
    headers,
    customerName,
    status,
    page = 1,
    limit = 8,
    day,
    // source,
    method,
    startDate,
    endDate,
    sortBy,
    sortOrder,
    // download = "",
  }) => {
    const searchName = customerName !== null ? customerName : "";
    const searchStatus = status !== null ? status : "";
    const searchDay = day !== null ? day : "";
    // const searchSource = source !== null ? source : "";
    const searchMethod = method !== null ? method : "";
    const startD = startDate !== null ? startDate : "";
    const endD = endDate !== null ? endDate : "";
    // Empty values leave the backend on its default sort (updatedAt, newest).
    const sortField = sortBy || "";
    const sortDirection = sortOrder || "";

    return requests.get(
      `/orders?customerName=${searchName}&status=${searchStatus}&day=${searchDay}&page=${page}&limit=${limit}&startDate=${startD}&endDate=${endD}&method=${searchMethod}&sortBy=${sortField}&sortOrder=${sortDirection}`,
      body,
      headers
    );
  },

  getAllOrdersTwo: async ({ invoice, body, headers }) => {
    const searchInvoice = invoice !== null ? invoice : "";
    return requests.get(`/orders/all?invoice=${searchInvoice}`, body, headers);
  },

  getRecentOrders: async ({
    page = 1,
    limit = 8,
    startDate = "1:00",
    endDate = "23:59",
  }) => {
    return requests.get(
      `/orders/recent?page=${page}&limit=${limit}&startDate=${startDate}&endDate=${endDate}`
    );
  },

  getOrderCustomer: async (id, body) => {
    return requests.get(`/orders/customer/${id}`, body);
  },

  getOrderById: async (id, body) => {
    return requests.get(`/orders/${id}`, body);
  },

  updateOrder: async (id, body, headers) => {
    return requests.put(`/orders/${id}`, body, headers);
  },

  // Same route as a status change, but sending `items` is what asks the API to
  // rewrite the lines and recompute every amount. The response carries the
  // whole order back, totals included  they are the server's to decide.
  updateOrderDetails: async (id, body) => {
    return requests.put(`/orders/${id}`, body);
  },

  addOrderNote: async (id, body) => {
    return requests.post(`/orders/${id}/notes`, body);
  },

  deleteOrder: async (id) => {
    return requests.delete(`/orders/${id}`);
  },

  getDashboardOrdersData: async ({
    page = 1,
    limit = 8,
    endDate = "23:59",
  }) => {
    return requests.get(
      `/orders/dashboard?page=${page}&limit=${limit}&endDate=${endDate}`
    );
  },

  getDashboardAmount: async () => {
    return requests.get("/orders/dashboard-amount");
  },

  getDashboardCount: async () => {
    return requests.get("/orders/dashboard-count");
  },

  getDashboardRecentOrder: async ({ page = 1, limit = 8 }) => {
    return requests.get(
      `/orders/dashboard-recent-order?page=${page}&limit=${limit}`
    );
  },

  getBestSellerProductChart: async () => {
    return requests.get("/orders/best-seller/chart");
  },

  //for sending email invoice to customer
  sendEmailInvoiceToCustomer: async (body) => {
    return requests.post("/order/customer/invoice", body);
  },

  // SFG-155  Print Labels. The three PDF calls answer with a binary body, so
  // they ask axios for a blob; an error on those comes back as a blob too and
  // is unwrapped in usePrintLabels.
  printPackingLabels: async ({ orderIds, format }) => {
    return requests.post(
      "/orders/labels",
      { orderIds, format },
      { responseType: "blob" }
    );
  },

  printPackingManifest: async ({ orderIds }) => {
    return requests.post(
      "/orders/labels/manifest",
      { orderIds },
      { responseType: "blob" }
    );
  },

  printOrderLabel: async (id, format) => {
    return requests.get(`/orders/${id}/label`, { format }, { responseType: "blob" });
  },

  // Closes the label lifecycle (label_generated  printed). Deliberately
  // separate from the order's own status: printing a label is not shipping.
  markLabelsPrinted: async (orderIds) => {
    return requests.post("/orders/labels/printed", { orderIds });
  },

  getLabelStatuses: async (orderIds) => {
    return requests.get("/orders/labels/status", { orderIds: orderIds.join(",") });
  },
};

export default OrderServices;
