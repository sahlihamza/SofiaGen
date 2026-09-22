/**
 * errorMessage(err) — extract a user-friendly message from any thrown

 * value. Centralises the 100+ `err?.response?.data?.message ||
 * err?.message` patterns scattered across hooks and components.
 *
 * Handles:
 *   - Axios errors: looks at response.data.message, response.data.error,
 *     response.data.errors (joins with semicolons).
 *   - Network errors: returns the underlying message.
 *   - Plain strings / Error instances.
 *   - React-hook-form field errors (objects with a `message` property).
 *   - undefined / null → returns the supplied fallback.

 *
 * @param {*} err
 * @param {string} [fallback="Une erreur est survenue"]
 * @returns {string}
 */
export function errorMessage(err, fallback = "Une erreur est survenue") {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (typeof err !== "object") return String(err);

  // Axios HTTP error
  const data = err.response?.data;
  if (data) {
    if (typeof data.message === "string" && data.message.trim()) return data.message;
    if (Array.isArray(data.message) && data.message.length) return data.message.join("; ");
    if (typeof data.error === "string" && data.error.trim()) return data.error;
    if (Array.isArray(data.errors) && data.errors.length) {
      return data.errors
        .map((e) => (typeof e === "string" ? e : e?.message || ""))
        .filter(Boolean)
        .join("; ") || fallback;
    }
    if (data.errors && typeof data.errors === "object") {
      const flat = Object.values(data.errors)
        .map((v) => (typeof v === "string" ? v : v?.message || ""))
        .filter(Boolean);
      if (flat.length) return flat.join("; ");
    }
  }

  // Standard Error
  if (typeof err.message === "string" && err.message.trim()) return err.message;

  // React-hook-form / yup field error shape: { message, type, ref }
  if (typeof err.message === "string" && err.ref?.name) return err.message;

  return fallback;
}

export default errorMessage;
