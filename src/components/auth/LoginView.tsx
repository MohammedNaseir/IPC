'use client';

import { useActionState, useState } from 'react';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, HelpCircle, Shield, Building } from 'lucide-react';
import { login, type LoginState } from '@/server/actions/auth';

const initialState: LoginState = { error: null };

export function LoginView() {
  const [state, formAction, isPending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div
      id="login-page-container"
      className="min-h-screen w-full bg-linear-to-b from-slate-100 via-slate-50 to-slate-100 flex flex-col justify-center items-center p-4 sm:p-6"
      dir="rtl"
    >
      <div className="w-full max-w-md">
        <div id="login-card" className="bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
          <div className="bg-linear-to-r from-teal-700 via-teal-800 to-slate-900 p-6 text-white text-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-400/10 rounded-full blur-xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center shadow-inner mb-3">
                <ShieldCheck className="w-8 h-8 text-teal-300" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">بوابة الدخول الموحدة</h1>
              <p className="text-xs text-teal-100/90 mt-1 font-medium max-w-xs">إدارة مكافحة العدوى</p>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {state.error && (
              <div
                id="login-error-alert"
                role="alert"
                className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="font-medium leading-relaxed">{state.error}</div>
              </div>
            )}

            <form action={formAction} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="login-email-input" className="block text-xs font-bold text-slate-700">
                  البريد الإلكتروني الرسمي
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
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
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-teal-600 rounded-xl text-xs font-mono text-slate-800 transition-all outline-hidden focus:ring-2 focus:ring-teal-500/20 text-right"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-password-input" className="block text-xs font-bold text-slate-700">
                  كلمة المرور
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
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
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-teal-600 rounded-xl text-xs font-mono text-slate-800 transition-all outline-hidden focus:ring-2 focus:ring-teal-500/20 text-right"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
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
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl text-sm font-bold shadow-md shadow-teal-700/10 hover:shadow-lg transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
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
                <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
                <span>إرشادات الوصول لحسابات المنظومة:</span>
              </div>

              <div className="space-y-2 text-[11px] leading-relaxed">
                <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-100">
                  <Shield className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
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

              <p className="text-[10px] text-slate-400 text-center pt-1 border-t border-slate-200/60">
                يخضع الدخول لسجلات التدقيق الرقمي وسياسات حوكمة البيانات
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          إدارة مكافحة العدوى © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
