import { useEffect, useState } from "react";
import { Card, CardBody } from "@windmill/react-ui";
import { FiRefreshCw } from "react-icons/fi";
import requests from "@/services/httpService";
import { notifyError, notifySuccess } from "@/utils/toast";
import { Button } from "@sofia/ui";

const LOCALES = [];
const CHANNEL_KEYS = [];

const emptyForm = () => ({
  enabled: false,
  host: "",
  port: 587,
  secure: false,
  user: "",
  password: "",
});

const PlatformSmtpSection = () => {
  const [form, setForm] = useState(emptyForm());
  const [hasPassword, setHasPassword] = useState(false);
  const [source, setSource] = useState("environment");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await requests.get("/v1/platform/settings/smtp");
        const smtp = data?.data || {};
        setForm((f) => ({
          ...f,
          enabled: Boolean(smtp.enabled),
          host: smtp.host || "",
          port: smtp.port ?? 587,
          secure: Boolean(smtp.secure),
          user: smtp.user || "",
        }));
        setHasPassword(Boolean(smtp.hasPassword));
        setSource(smtp.source || "environment");
        setUpdatedAt(smtp.updatedAt || null);
      } catch (e) {
        notifyError(e?.response?.data?.message || "Unable to load the platform SMTP settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const validate = () => {
    if (!String(form.host).trim()) return "SMTP host is required";
    const p = Number(form.port);
    if (!Number.isInteger(p) || p < 1 || p > 65535) return "Port must be an integer between 1 and 65535";
    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      notifyError(error);
      return;
    }
    setSaving(true);
    try {
      const data = await requests.put("/v1/platform/settings/smtp", {
        enabled: form.enabled,
        host: form.host,
        port: Number(form.port),
        secure: Boolean(form.secure),
        user: form.user,
        // Empty password â†’ backend keeps the stored one (rotation rule).
        password: form.password,
      });
      notifySuccess(data.message || "SMTP configuration saved");
      setHasPassword(true);
      setSource(data.data.source);
      setUpdatedAt(new Date().toISOString());
      setForm((f) => ({ ...f, password: "" }));
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to save the SMTP configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    const error = validate();
    if (error) {
      notifyError(error);
      return;
    }
    if (!testTo.trim()) {
      notifyError("Recipient e-mail is required for the test");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      await requests.post("/v1/platform/settings/smtp/test", {
        host: form.host,
        port: Number(form.port),
        secure: Boolean(form.secure),
        user: form.user,
        password: form.password,
        to: testTo.trim(),
        fromEmail: form.user,
      });
      setTestResult({ ok: true, message: `Test e-mail sent to ${testTo}` });
      notifySuccess("Test e-mail sent successfully");
    } catch (e) {
      const message = e?.response?.data?.message || "Test failed";
      setTestResult({ ok: false, message });
      notifyError(message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-4">
      <CardBody className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Email / SMTP</h3>
          {loading ? null : (
            <span className={`text-xs font-medium ${form.enabled ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500"}`}>
              â— {form.enabled ? "Active" : "Disabled"} â€” Source: {source === "database" ? "Database configuration" : "Environment variables"}
            </span>
          )}
        </div>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          Used for password resets, invitations, security alerts and platform billing. Falls back to environment variables while disabled.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
            <span className="text-sm text-gray-600 dark:text-gray-300">Use this configuration (otherwise env vars)</span>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              Enabled
            </label>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Host *</label>
            <input type="text" value={form.host} onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))} placeholder="smtp.example.com" className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Port *</label>
            <input type="number" min={1} max={65535} value={form.port} onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
          </div>
          <div className="sm:col-span-2 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
            <span className="text-sm text-gray-600 dark:text-gray-300">Secure connection (implicit TLS â€” port 465)</span>
            <input type="checkbox" checked={Boolean(form.secure)} onChange={(e) => setForm((f) => ({ ...f, secure: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">User</label>
            <input type="text" value={form.user} onChange={(e) => setForm((f) => ({ ...f, user: e.target.value }))} placeholder="admin@example.com" className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Password {hasPassword ? "(stored â€” leave empty to keep)" : ""}
            </label>
            <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder={hasPassword ? "â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" : ""} autoComplete="new-password" className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Send test to</label>
            <div className="flex gap-2">
              <input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
              <Button size="small" layout="outline" onClick={handleTest} disabled={testing || loading} className="flex w-auto items-center gap-2 rounded-xl">
                <FiRefreshCw size={14} className={testing ? "animate-spin" : ""} /> Test connection
              </Button>
            </div>
            {testResult && (
              <p className={`mt-1.5 text-xs ${testResult.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {testResult.ok ? "âœ“ " : "âœ• "}
                {testResult.message}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            Last updated {updatedAt ? new Date(updatedAt).toLocaleString() : "â€”"} Â· changes are audited (critical)
          </span>
          <Button size="small" onClick={handleSave} disabled={saving || loading} className="flex w-auto items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700">
            <FiRefreshCw size={14} className={saving ? "animate-spin" : ""} /> {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};

export default PlatformSmtpSection;
