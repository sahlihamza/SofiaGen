import requests from "./httpService";

const InvoiceServices = {
  // Get invoices for current store
  getMyInvoices: async (params = {}) => {
    return requests.get("/platform/invoices/me", params);
  },

  // Get all invoices (admin)
  getInvoices: async (params = {}) => {
    return requests.get("/platform/invoices", params);
  },

  getInvoiceById: async (id) => {
    return requests.get(`/platform/invoices/${id}`);
  },

  getInvoicesByStore: async (storeId, params = {}) => {
    return requests.get(`/platform/invoices/store/${storeId}`, params);
  },

  updateInvoice: async (id, body) => {
    return requests.put(`/platform/invoices/${id}`, body);
  },

  linkPaymentToInvoice: async (invoiceId, paymentId) => {
    return requests.post(`/platform/invoices/${invoiceId}/link-payment`, {
      paymentId,
    });
  },

  generateInvoicePDF: async (invoiceId) => {
    return requests.get(`/platform/invoices/${invoiceId}/pdf`);
  },
};

export default InvoiceServices;