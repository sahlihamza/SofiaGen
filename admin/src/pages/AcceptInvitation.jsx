import React, { useState } from "react";
import { useHistory, useLocation, Link } from "react-router-dom";

import { useTranslation } from "react-i18next";

import LabelArea from "@/components/form/selectOption/LabelArea";
import InputArea from "@/components/form/input/InputArea";
import Error from "@/components/form/others/Error";
import UserServices from "@/services/UserServices";
import { notifySuccess } from "@/utils/toast";
import { Button } from "@sofia/ui";

// Public page for /invite?token=... â€” the link sent by both platform and

// store invitations (InvitationService.createInvitation). No auth exists
// yet at this point; the token itself is the only credential. Same visual
// language as Login.jsx.
const AcceptInvitation = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const token = new URLSearchParams(location.search).get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError(t("InvalidInvitationLink", "This invitation link is invalid."));
      return;
    }
    if (password.length < 8) {
      setError(t("PasswordMinLength8", "Password must be at least 8 characters."));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("PasswordsDontMatch", "Passwords do not match."));
      return;
    }

    setLoading(true);
    try {
      await UserServices.acceptInvitation({ token, password });
      setDone(true);
      notifySuccess(t("InvitationAcceptedSuccess", "Invitation accepted â€” you can now log in."));

      setTimeout(() => history.push("/login"), 1500);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          t("SomethingWentWrong", "Something went wrong. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-8 md:p-10">
        <div className="flex items-center gap-2 mb-8">
          <span
            className="material-symbols-outlined text-emerald-700 text-2xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            dataset
          </span>
          <span className="text-2xl font-semibold tracking-tighter">SofiaGen</span>
        </div>

        {!token ? (
          <>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {t("InvalidInvitationLink", "This invitation link is invalid.")}
            </h2>
            <p className="text-sm text-slate-500">
              <Link className="text-emerald-600 hover:underline" to="/login">
                {t("LoginTitle", "Login")}
              </Link>
            </p>
          </>
        ) : done ? (
          <>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {t("InvitationAcceptedSuccess", "Invitation accepted â€” you can now log in.")}

            </h2>
            <p className="text-sm text-slate-500">{t("Loading", "Redirecting...")}</p>
          </>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {t("SetYourPassword", "Set your password")}
              </h2>
              <p className="text-sm text-slate-500">
                {t("SetYourPasswordDesc", "Choose a password to activate your account.")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <LabelArea label={t("Password", "Password")} />
                <InputArea
                  required={true}
                  label="Password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  className="bg-slate-50 border-slate-200"
                />
              </div>

              <div>
                <LabelArea label={t("ConfirmPassword", "Confirm password")} />
                <InputArea
                  required={true}
                  label="Confirm password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="********"
                  className="bg-slate-50 border-slate-200"
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <Button
                disabled={loading}
                type="submit"
                className="mt-4 h-12 w-full bg-emerald-700 text-white rounded-2xl hover:bg-emerald-600"
              >
                {loading ? t("Loading", "Please wait...") : t("AcceptInvitationBtn", "Accept invitation")}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default AcceptInvitation;
