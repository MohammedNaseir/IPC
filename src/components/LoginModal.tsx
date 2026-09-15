import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  X,
  AlertCircle,
  Building2,
  Sparkles,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { User, Hospital } from '../types/ipc';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginWithPassword: (email: string, password: string) => { success: boolean; user?: User; message?: string };
  hospitals: Hospital[];
  currentUser?: User;
  canClose?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginWithPassword,
  hospitals,
  currentUser,
  canClose = true,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('يرجى إدخال البريد الإلكتروني.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('يرجى إدخال كلمة المرور.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const result = onLoginWithPassword(email.trim(), password.trim());
      setIsSubmitting(false);

      if (result.success && result.user) {
        setSuccessMessage(
          result.user.isDevAdmin
            ? 'تم تسجيل الدخول بنجاح بحساب المشرف المطور (dev admin)!'
            : `أهلاً بك: ${result.user.name}`
        );
        setTimeout(() => {
          onClose();
          setSuccessMessage(null);
          setEmail('');
          setPassword('');
        }, 1000);
      } else {
        setErrorMessage(result.message || 'بيانات الدخول غير صحيحة.');
      }
    }, 300);
  };

  const handleFillQuick = (testEmail: string, testPass: string) => {
    setEmail(testEmail);
    setPassword(testPass);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden transition-all scale-in">
        {/* Header with gradient badge */}
        <div className="relative bg-gradient-to-r from-slate-900 via-[#1b2533] to-slate-900 p-6 text-white text-center">
          {canClose && (
            <button
              onClick={onClose}
              className="absolute top-4 left-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/30 ring-4 ring-white/10">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-lg font-bold text-white tracking-tight">
            تسجيل الدخول للمنصة الموحدة
          </h2>
          <p className="text-xs text-teal-300/90 mt-1">
            منظومة حوكمة مكافحة العدوى والتعقيم بالتجمع الصحي
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error / Success feedback */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Email field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              البريد الإلكتروني الرسمي
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="coordinator@hospital.med.sa"
                className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-sans"
                dir="ltr"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                كلمة المرور
              </label>
              <span className="text-[11px] text-slate-400">
                كلمة المرور الافتراضية للحسابات: <span className="font-mono font-bold text-slate-600">123456</span>
              </span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور..."
                className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
                dir="ltr"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-3 text-slate-400 hover:text-slate-700 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 hover:shadow-teal-600/30 transition-all disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            <span>{isSubmitting ? 'جاري التحقق...' : 'تسجيل الدخول إلى المنصة'}</span>
          </button>
        </form>

        {/* Quick Demo Accounts for Easy Testing */}
        <div className="bg-slate-50/90 border-t border-slate-200 p-4">
          <p className="text-[11px] font-bold text-slate-600 mb-2 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-teal-600" />
            <span>حسابات تجريبية سريعة للفحص والاختبار (انقر للتعبئة الفورية):</span>
          </p>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {/* Central Admin */}
            <button
              type="button"
              onClick={() => handleFillQuick('admin@ipc-cluster.gov.sa', 'admin123')}
              className="p-2 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-right transition-colors"
            >
              <div className="font-bold text-slate-800 text-xs flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                الإدارة المركزية
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                admin@ipc-cluster.gov.sa
              </div>
              <div className="text-[9px] text-indigo-600 font-mono">
                كود: admin123
              </div>
            </button>

            {/* Hospital 1 Coordinator */}
            <button
              type="button"
              onClick={() => handleFillQuick('k.subaie@kfsh.med.sa', '123456')}
              className="p-2 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg text-right transition-colors"
            >
              <div className="font-bold text-slate-800 text-xs flex items-center gap-1">
                <Building2 className="w-3 h-3 text-emerald-600" />
                منسق مستشفى الملك فهد
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                k.subaie@kfsh.med.sa
              </div>
              <div className="text-[9px] text-emerald-600 font-mono">
                كود: 123456
              </div>
            </button>

            {/* Hospital 2 Coordinator */}
            <button
              type="button"
              onClick={() => handleFillQuick('h.qurashi@alnoor.med.sa', '123456')}
              className="p-2 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg text-right transition-colors"
            >
              <div className="font-bold text-slate-800 text-xs flex items-center gap-1">
                <Building2 className="w-3 h-3 text-emerald-600" />
                منسق مستشفى النور
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                h.qurashi@alnoor.med.sa
              </div>
              <div className="text-[9px] text-emerald-600 font-mono">
                كود: 123456
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
