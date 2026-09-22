import React from "react";
import { Link } from "react-router-dom";

import { useTranslation } from "react-i18next";

//internal import
import Error from "@/components/form/others/Error";
import LabelArea from "@/components/form/selectOption/LabelArea";
import InputArea from "@/components/form/input/InputArea";
import useLoginSubmit from "@/hooks/useLoginSubmit";
import { Button } from "@sofia/ui";

const ForgotPassword = () => {
  const { t } = useTranslation();
  const { onSubmit, register, handleSubmit, errors, loading } = useLoginSubmit();

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
              Reset your access securely.
            </h1>
            <p className="text-base text-white/80 mb-12">
              Enter your account email and well send you a password recovery link to regain access safely.
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 bg-white/10 rounded-3xl border border-white/10 backdrop-blur-sm">
                <span className="material-symbols-outlined text-white mb-2 block">lock_open</span>
                <p className="text-sm text-white">Secure recovery</p>
              </div>
              <div className="p-6 bg-white/10 rounded-3xl border border-white/10 backdrop-blur-sm">
                <span className="material-symbols-outlined text-white mb-2 block">support_agent</span>
                <p className="text-sm text-white">Fast support</p>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black/20 to-transparent" />
        </section>

        <section className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 lg:p-24 bg-white">
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

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Forgot password</h2>
              <p className="text-sm text-slate-500">Enter the email associated with your account and well send you a reset link.</p>
            </div>

            <form
              onSubmit={handleSubmit((data) => onSubmit(data, "forgot-password"))}
              className="space-y-4"
            >
              <div>
                <LabelArea label="Email" />
                <InputArea
                  required={true}
                  register={register}
                  label="Email"
                  name="verifyEmail"
                  type="email"
                  autoComplete="email"
                  placeholder="john@doe.com"
                  className="bg-slate-50 border-slate-200"
                />
                <Error errorName={errors.verifyEmail} />
              </div>

              <Button disabled={loading} type="submit" className="mt-4 h-12 w-full bg-emerald-700 text-white rounded-2xl hover:bg-emerald-600">
                Recover password
              </Button>
            </form>

            <p className="mt-4 text-sm text-slate-500">
              Remembered your password?{' '}
              <Link className="font-medium text-emerald-600 hover:underline" to="/login">
                Return to login
              </Link>
            </p>

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

export default ForgotPassword;
