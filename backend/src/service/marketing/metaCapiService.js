const axios = require("axios");

const META_CAPI_URL = "https://graph.facebook.com/v18.0";
const DEFAULT_TIMEOUT_MS = 5000;

const buildPurchasePayload = ({ eventId, eventTime, pixelId, eventSourceUrl, user, customData }) => ({
  data: [
    {
      event_name: "Purchase",
      event_time: eventTime || Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: eventSourceUrl,
      action_source: "website",
      user_data: user || {},
      custom_data: customData || {},
    },
  ],
});

/**
 * Fire-and-forget CAPI call. Never throws to the caller  order/checkout flows
 * must not be blocked by a tracking outage. Returns a promise that resolves
 * with `{ ok, status, message }` so callers can choose to log or surface
 * the result, but should NOT await it in the request hot path.
 */
const sendCapiEvent = async ({ pixelId, accessToken, payload, testEventCode, timeoutMs }) => {
  if (!pixelId || !accessToken || !payload) {
    return { ok: false, status: 0, message: "Paramètres Meta incomplets" };
  }
  const url = `${META_CAPI_URL}/${encodeURIComponent(pixelId)}/events`;
  try {
    const res = await axios.post(url, payload, {
      params: {
        access_token: accessToken,
        ...(testEventCode ? { test_event_code: testEventCode } : {}),
      },
      timeout: timeoutMs || DEFAULT_TIMEOUT_MS,
    });
    return { ok: true, status: res.status, message: "ok", data: res.data };
  } catch (err) {
    const status = err?.response?.status || 0;
    const fbMessage =
      err?.response?.data?.error?.message || err?.response?.data?.message || err?.message;
    return { ok: false, status, message: fbMessage || "Meta CAPI error" };
  }
};

module.exports = {
  META_CAPI_URL,
  sendCapiEvent,
  buildPurchasePayload,
};