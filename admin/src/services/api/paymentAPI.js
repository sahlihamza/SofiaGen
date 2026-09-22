import requests from "../httpService";

const BASE = "/admin/payment-management";

const paymentAPI = {
  createRefund: async (body) => {
    return requests.post(`${BASE}/refunds`, body);
  },

  getInvoice: async (invoiceId) => {
    return requests.get(`/platform/invoices/${invoiceId}`);
  },

  getInvoicePdf: async (invoiceId) => {
    return requests.getBlob(`/platform/invoices/${invoiceId}/pdf`);
  },
};

export default paymentAPI;
