import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { GoogleLogin } from "@react-oauth/google";
import { useTranslation } from "react-i18next";

//internal import
import Error from "@/components/form/others/Error";
import LabelArea from "@/components/form/selectOption/LabelArea";
import InputArea from "@/components/form/input/InputArea";
import useLoginSubmit from "@/hooks/useLoginSubmit";
import CMButton from "@/components/form/button/CMButton";
import { Button } from "@sofia/ui";

const Login = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("login");
  const [messageIndex, setMessageIndex] = useState(0);
  const messages = [
    [
      "Access your personalized dashboard.",
      "Monitor sales across stores.",
      "Stay ahead with live insights.",
    ],
    [
      "Manage your multi-tenant storefronts.",
      "Organize stock and pricing.",
      "Launch promotions in seconds.",
    ],
    [
      "Analyze real-time performance data.",
      "Track user journeys instantly.",
      "Make faster decisions with clarity.",
    ],
    [
      "Control sales, inventory and team operations.",
      "Streamline workflows across stores.",
      "Keep every department aligned.",
    ],
  ];
  const {
    onSubmit,
    onGoogleLoginSuccess,
    onGoogleLoginError,
    register,
    handleSubmit,
    reset,
    errors,
    loading,
  } = useLoginSubmit();

  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 3000);

    return () => clearInterval(timer);
  }, [messages.length]);

  const handleFormSubmit = async (data) => {
    const res = await onSubmit(data, activeTab);
    if (res?.success && activeTab === "register") {
      reset();
      setActiveTab("login");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="flex items-stretch min-h-screen">
        <section className="hidden lg:flex lg:w-1/2 relative bg-emerald-700 overflow-hidden items-center justify-center p-24">
          <div className="relative z-10 text-white max-w-lg">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-emerald-700 text-3xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  dataset
                </span>
              </div>
              <span className="text-3xl font-semibold tracking-tighter">SofiaGen</span>
            </div>
            <h1 className="text-4xl font-bold mb-6 leading-tight text-white">
              Powering the next generation of enterprise commerce.
            </h1>
            <div className="text-base whitespace-pre-line text-white/80 mb-12 min-h-[4.5rem] space-y-1">
              {messages[messageIndex].map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 bg-white/10 rounded-3xl border border-white/10 backdrop-blur-sm">
                <span className="material-symbols-outlined text-white mb-2 block">monitoring</span>
                <p className="text-sm text-white">Real-time Analytics</p>
              </div>
              <div className="p-6 bg-white/10 rounded-3xl border border-white/10 backdrop-blur-sm">
                <span className="material-symbols-outlined text-white mb-2 block">security</span>
                <p className="text-sm text-white">Enterprise Security</p>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black/20 to-transparent" />
        </section>

        <section className="w-full lg:w-1/2 flex items-center justify-center p-4 md:p-10 lg:p-15 bg-white">
          <div className="w-full max-w-md">
            <div className="flex lg:hidden items-center gap-2 mb-8">
              <span
                className="material-symbols-outlined text-emerald-700 text-2xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                dataset
              </span>
              <span className="text-2xl font-semibold tracking-tighter">SofiaGen</span>
            </div>

            <div className="mb-6">
              <div className="inline-flex overflow-hidden rounded-full bg-slate-100 p-1">
                <Button
                  type="button"
                  onClick={() => setActiveTab("login")}
                  className={`px-5 py-2 text-sm font-semibold rounded-full transition ${
                    activeTab === "login"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Login
                </Button>
                <Button
                  type="button"
                  onClick={() => setActiveTab("register")}
                  className={`px-5 py-2 text-sm font-semibold rounded-full transition ${
                    activeTab === "register"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Register
                </Button>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                {activeTab === "login" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="text-sm text-slate-500">
                {activeTab === "login"
                  ? "Enter your credentials to access your account."
                  : "Use your email to create a new administrative account."}
              </p>
            </div>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
              {activeTab === "register" && (
                <div>
                  <LabelArea label="Name" />
                  <InputArea
                    required={true}
                    register={register}
                    label="Name"
                    name="name"
                    type="text"
                    placeholder="Admin name"
                    className="bg-slate-50 border-slate-200"
                  />
                  <Error errorName={errors.name} />
                </div>
              )}

              <div>
                <LabelArea label="Email" />
                <InputArea
                  required={true}
                  register={register}
                  defaultValue={activeTab === "login" ? "admin@gmail.com" : undefined}
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="john@doe.com"
                  className="bg-slate-50 border-slate-200"
                />
                <Error errorName={errors.email} />
              </div>

              <div>
                <LabelArea label="Password" />
                <InputArea
                  required={true}
                  register={register}
                  defaultValue={activeTab === "login" ? "12345678" : undefined}
                  label="Password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="***************"
                  className="bg-slate-50 border-slate-200"
                />
                <Error errorName={errors.password} />
                {activeTab === "login" && (
                  <div className="mt-2 text-right">
                  <Link className="text-sm font-medium text-emerald-600 hover:underline" to="/forgot-password">
                      {t("ForgotPassword")}
                    </Link>
                  </div>
                )}
              </div>

              {loading ? (
                <CMButton
                  disabled={loading}
                  type="submit"
                  className="bg-emerald-700 rounded-2xl mt-4 h-12 w-full"
                  to="/dashboard"
                />
              ) : (
                <Button
                  disabled={loading}
                  type="submit"
                  className="mt-4 h-12 w-full bg-emerald-700 text-white rounded-2xl hover:bg-emerald-600"
                  to="/dashboard"
                >
                  {activeTab === "login" ? t("LoginTitle") : t("CreateAccountTitle")}
                </Button>
              )}

              {activeTab === "login" && (
                <>
                  <div className="relative flex items-center justify-center my-10">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <span className="relative px-4 bg-white text-slate-500 text-sm">Or continue with</span>
                  </div>

                  <div className="my-2 w-full flex justify-center">
                    <GoogleLogin
                      onSuccess={onGoogleLoginSuccess}
                      onError={onGoogleLoginError}
                      text="signin_with"
                      shape="rectangular"
                    />
                  </div>
                </>
              )}
            </form>

            <div className="mt-4 text-sm text-slate-500">
              {activeTab === "login" ? (
                <>
                  <p className="mb-3">
                    <Link className="font-medium text-emerald-600 hover:underline" to="/forgot-password">
                      {t("ForgotPassword")}
                    </Link>
                  </p>
                  <p>
                    Don’t have an account?{' '}
                    <Button

                      type="button"
                      onClick={() => setActiveTab("register")}
                      className="font-medium text-emerald-600 hover:underline"
                    >
                      {t("CreateAccountTitle")}
                    </Button>
                  </p>
                </>
              ) : (
                <p>
                  Already have an account?{' '}
                  <Button
                    type="button"
                    onClick={() => setActiveTab("login")}
                    className="font-medium text-emerald-600 hover:underline"
                  >
                    {t("LoginTitle")}
                  </Button>
                </p>
              )}
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm text-slate-500">
                Need help accessing your account?{' '}
                <a className="text-emerald-600 hover:underline" href="/contact-support">
                  Contact Support
                </a>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Login;
