'use client';

import { useActionState, useState } from 'react';
import Image from 'next/image';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, HelpCircle, Shield, Building } from 'lucide-react';
import { login, type LoginState } from '@/server/actions/auth';

const initialState: LoginState = { error: null };

export function LoginView() {
  const [state, formAction, isPending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);
  // React resets uncontrolled fields once a form action settles, even when it resolves with an
  // error rather than throwing -- so the email has to be held in controlled state to survive a
  // failed attempt (FR-027), independent of anything `login()` itself returns.
  const [email, setEmail] = useState('');

  return (
    <div id="login-page-container" className="min-h-screen w-full flex flex-col lg:flex-row bg-surface" dir="rtl">
      {/*
        Item 4, direction L2 (research.md R-003): a two-half layout at wide viewports, form first in
        document order so it lands on the right in this RTL flex row -- the "start" side, matching
        where the shell's own sidebar lives. Below `lg` the presentational half is dropped entirely
        (FR-026): a half that only ever repeats the logo and a tagline is not worth the scroll it would
        cost the form on a phone.
      */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-md">
          <div id="login-card" className="bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
            <div className="px-6 pt-6 pb-2 lg:hidden text-center">
              <h1 className="text-lg font-bold text-ink">بوابة الدخول الموحدة</h1>
              <p className="text-xs text-muted mt-1">إدارة مكافحة العدوى</p>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="hidden lg:block">
                <h2 className="text-lg font-bold text-ink">تسجيل الدخول</h2>
                <p className="text-xs text-muted mt-1">أدخل بيانات حسابك المعتمد للمتابعة</p>
              </div>

              {state.error && (
                <div
                  id="login-error-alert"
                  role="alert"
                  className="p-3.5 bg-danger-50 border border-danger-200 rounded-xl text-xs text-danger-800 flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 text-danger-700 shrink-0 mt-0.5" />
                  <div className="font-medium leading-relaxed">{state.error}</div>
                </div>
              )}

              <form action={formAction} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="login-email-input" className="block text-xs font-bold text-slate-700">
                    البريد الإلكتروني الرسمي
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-muted">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="login-email-input"
                      name="email"
                      type="email"
                      autoComplete="username"
                      placeholder="البريد الإلكتروني الرسمي"
                      dir="ltr"
                      autoFocus
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-navy-800 rounded-xl text-xs font-mono text-slate-800 transition-all outline-hidden focus:ring-2 focus:ring-navy-600/20 text-right"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="login-password-input" className="block text-xs font-bold text-slate-700">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-muted">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="login-password-input"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      dir="ltr"
                      required
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-navy-800 rounded-xl text-xs font-mono text-slate-800 transition-all outline-hidden focus:ring-2 focus:ring-navy-600/20 text-right"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted hover:text-slate-600 transition-colors"
                      title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  id="login-submit-button"
                  type="submit"
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-navy-800 hover:bg-navy-900 active:bg-navy-950 text-white rounded-xl text-sm font-bold shadow-md shadow-navy-900/10 hover:shadow-lg transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {isPending ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>تسجيل الدخول إلى النظام</span>
                    </>
                  )}
                </button>
              </form>

              <div
                id="login-instructions-box"
                className="p-4 bg-slate-50/90 border border-slate-200 rounded-xl space-y-2.5 text-xs text-slate-600"
              >
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                  <HelpCircle className="w-3.5 h-3.5 text-navy-700" />
                  <span>إرشادات الوصول لحسابات المنظومة:</span>
                </div>

                <div className="space-y-2 text-[11px] leading-relaxed">
                  <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-100">
                    <Shield className="w-3.5 h-3.5 text-navy-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800">حساب الإدارة المركزية:</span>
                      <p className="text-slate-500 text-[10px] mt-0.5">
                        يُستخدم البريد الرسمي وكلمة المرور المعتمدة الصادرة لمنسوبي الإدارة المركزية.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-100">
                    <Building className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800">حسابات منسقي المستشفيات:</span>
                      <p className="text-slate-500 text-[10px] mt-0.5">
                        تُصدر بيانات الدخول من الإدارة المركزية لكل منسق معتمد. لاستعادة كلمة المرور يرجى التواصل مع الإدارة المركزية.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-muted text-center pt-1 border-t border-slate-200/60">
                  يخضع الدخول لسجلات التدقيق الرقمي وسياسات حوكمة البيانات
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-muted">
          إدارة مكافحة العدوى © {new Date().getFullYear()}
        </div>
      </div>

      {/*
        Presentational half (FR-029a): the logo at its natural size as the centrepiece, on a white
        plate since it is opaque with no alpha (FR-028a) -- the same device item 8 uses in the chrome,
        just larger, because here the logo is above the fold and the whole point of the panel (hence
        `priority`, per T100, unlike the chrome usage). A quiet geometric field, not a fabricated data
        visual: two soft blurred circles, the same device already used on this screen before the
        redesign, now on the panel instead of a banner strip.
      */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-navy-950 items-center justify-center p-10">
        <div className="absolute -top-16 -left-16 w-72 h-72 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-72 h-72 bg-navy-400/10 rounded-full blur-3xl pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 1px, transparent 32px)' }}
        />

        <div className="relative z-10 flex flex-col items-center text-center max-w-xs">
          <div className="w-40 h-40 rounded-3xl bg-white shadow-xl flex items-center justify-center p-5 mb-6">
            <Image
              src="/ipc-hail-logo.jpg"
              alt="شعار إدارة مكافحة العدوى"
              width={160}
              height={160}
              priority
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">بوابة الدخول الموحدة</h1>
          <p className="text-sm text-navy-100/80 mt-2 leading-relaxed">
            منصة مكافحة العدوى الموحدة للتجمع الصحي
          </p>
        </div>
      </div>
    </div>
  );
}
