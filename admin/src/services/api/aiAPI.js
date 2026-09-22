import requests from "../httpService";

/**
 * Malla — AI assistant HTTP client. Thin wrapper over the backend

 * endpoints mounted under `/api/ai/`. Every method accepts a `signal`
 * for cancellation, and the network layer (httpService) already attaches
 * the JWT and the `company` header for store context.
 */

const BASE = "/ai";

async function unwrap(promise) {
  const res = await promise;
  return res?.data?.data ?? res?.data;
}

export const aiAPI = {
  async getCapabilities() {
    return unwrap(requests.get(`${BASE}/capabilities`));
  },

  async getUsage(signal) {
    return unwrap(requests.get(`${BASE}/usage`, { signal }));
  },

  async listConversations(params = {}, signal) {
    return unwrap(requests.get(`${BASE}/conversations`, { params, signal }));
  },

  async getConversation(id, signal) {
    return unwrap(requests.get(`${BASE}/conversations/${id}`, { signal }));
  },

  async deleteConversation(id) {
    return unwrap(requests.delete(`${BASE}/conversations/${id}`));
  },

  /**
   * Send a user message. The backend may create a new conversation when
   * `conversationId` is omitted.
   * @param {Object} payload { conversationId?, message, pageContext? }
   * @param {AbortSignal} [signal]
   */
   async sendMessage(payload, signal) {
     const convId = payload.conversationId || "";
     return unwrap(requests.post(`${BASE}/conversations/${convId}/messages`, {
       conversationId: payload.conversationId,
       message: payload.message,
       pageContext: payload.pageContext || null,
     }, { signal }));
   },

  async listProviders() {
    return unwrap(requests.get(`${BASE}/providers`));
  },

  async upsertProvider(payload) {
    return unwrap(requests.post(`${BASE}/providers`, payload));
  },
};

export default aiAPI;