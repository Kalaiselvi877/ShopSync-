import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  ShoppingBag,
  User,
  UserPlus,
} from 'lucide-react';
import type { AuthUser, AuthView } from '../types';
import { recordAnalyticsEventLocal } from '../utils/localAnalyticsStore';
import {
  completeAdminPasswordResetLocal,
  completePasswordResetLocal,
  getAdminConfigStatusLocal,
  loginAdminLocal,
  loginUserLocal,
  registerUserLocal,
  requestAdminPasswordResetLocal,
  requestPasswordResetLocal,
  setupInitialAdminLocal,
} from '../utils/localAuthStore';

interface AuthPagesProps {
  view: AuthView;
  bannerMessage: string | null;
  adminResetParams?: { email: string; resetToken: string } | null;
  onClearAdminResetParams?: () => void;
  onChangeView: (nextView: AuthView, nextBanner?: string | null) => void;
  onAuthSuccess: (user: AuthUser, sessionToken: string) => void;
  onAdminAuthSuccess?: (user: AuthUser, sessionToken: string) => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validatePasswordClient(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include at least one letter and one number.';
  }
  return null;
}

function ShopSyncLogoMark() {
  return (
    <div className="inline-flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-700 flex items-center justify-center text-white shadow-sm">
        <ShoppingBag className="w-5 h-5" />
      </div>
      <div className="text-left">
        <div className="font-display text-xl font-bold tracking-tight text-slate-900 leading-none">
          ShopSync
        </div>
        <div className="text-[11px] font-medium text-slate-500 mt-1">
          Smart Shopping Comparison
        </div>
      </div>
    </div>
  );
}

export function AuthPages({
  view,
  bannerMessage,
  adminResetParams,
  onClearAdminResetParams,
  onChangeView,
  onAuthSuccess,
  onAdminAuthSuccess,
}: AuthPagesProps) {
  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register state
  const [fullName, setFullName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot / Reset password state (Standard User)
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCodeInput, setResetCodeInput] = useState('');
  const [issuedResetCode, setIssuedResetCode] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Admin Login, First-Run Setup & Admin Password Recovery state
  const [adminMode, setAdminMode] = useState<
    'login' | 'setup' | 'forgot_request' | 'forgot_complete'
  >(() => (adminResetParams ? 'forgot_complete' : 'login'));
  const [adminStatusChecked, setAdminStatusChecked] = useState(false);
  const [adminHasAccount, setAdminHasAccount] = useState(true);
  const [adminSetupRequired, setAdminSetupRequired] = useState(false);

  const [adminFullName, setAdminFullName] = useState('ShopSync Administrator');
  const [adminEmail, setAdminEmail] = useState(() => adminResetParams?.email ?? '');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const [adminForgotEmail, setAdminForgotEmail] = useState('');
  const [adminIssuedResetLink, setAdminIssuedResetLink] = useState<string | null>(null);
  const [adminResetTokenInput, setAdminResetTokenInput] = useState(
    () => adminResetParams?.resetToken ?? '',
  );
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmNewPassword, setAdminConfirmNewPassword] = useState('');
  const [showAdminNewPassword, setShowAdminNewPassword] = useState(false);

  // Shared feedback state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);

  useEffect(() => {
    if (adminResetParams?.resetToken) {
      setAdminMode('forgot_complete');
      setAdminForgotEmail(adminResetParams.email);
      setAdminEmail(adminResetParams.email);
      setAdminResetTokenInput(adminResetParams.resetToken);
      setErrorText(null);
      setSuccessText(
        'Reset link verified. Enter a new password for your administrator account below.',
      );
    }
  }, [adminResetParams]);

  useEffect(() => {
    if (view !== 'admin_login') return;
    const status = getAdminConfigStatusLocal();
    setAdminHasAccount(status.hasAdminAccount);
    setAdminSetupRequired(status.setupRequired);
    setAdminStatusChecked(true);
    if (status.setupRequired && !adminResetParams?.resetToken) {
      setAdminMode((prev) => (prev === 'forgot_complete' ? prev : 'setup'));
    }
  }, [view, adminResetParams]);

  const switchView = (nextView: AuthView, nextBanner?: string | null) => {
    setErrorText(null);
    setSuccessText(null);
    if (nextView !== 'forgot') {
      setIssuedResetCode(null);
      setResetCodeInput('');
      setNewPassword('');
      setConfirmNewPassword('');
    }
    if (nextView !== 'admin_login') {
      setAdminIssuedResetLink(null);
      setAdminPassword('');
      setAdminConfirmPassword('');
      onClearAdminResetParams?.();
    } else if (!adminResetParams?.resetToken) {
      setAdminMode(adminSetupRequired ? 'setup' : 'login');
    }
    onChangeView(nextView, nextBanner ?? null);
  };

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    setSuccessText(null);

    const cleanName = fullName.trim();
    const cleanEmail = registerEmail.trim().toLowerCase();

    if (cleanName.length < 2) {
      setErrorText('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setErrorText('Please enter a valid email address.');
      return;
    }
    const passwordErr = validatePasswordClient(registerPassword);
    if (passwordErr) {
      setErrorText(passwordErr);
      return;
    }
    if (registerPassword !== confirmPassword) {
      setErrorText('Password and Confirm Password do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await registerUserLocal({
        fullName: cleanName,
        email: cleanEmail,
        password: registerPassword,
        confirmPassword,
      });

      if (!result.ok) {
        setErrorText(result.error);
        return;
      }

      recordAnalyticsEventLocal({
        type: 'register',
        user: result.user,
      });

      setSuccessText('Account created successfully! Welcome to ShopSync.');
      onAuthSuccess(result.user, result.sessionToken);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    setSuccessText(null);

    const cleanEmail = loginEmail.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setErrorText('Please enter a valid email address.');
      return;
    }
    if (!loginPassword) {
      setErrorText('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await loginUserLocal({
        email: cleanEmail,
        password: loginPassword,
      });

      if (!result.ok) {
        setErrorText(result.error);
        return;
      }

      recordAnalyticsEventLocal({
        type: 'login',
        user: result.user,
      });

      setSuccessText('Signed in successfully!');
      onAuthSuccess(result.user, result.sessionToken);
    } finally {
      setIsSubmitting(false);
    }
  };

  const completeAdminLoginSuccess = (user: AuthUser, sessionToken: string) => {
    if (onAdminAuthSuccess) {
      onAdminAuthSuccess(user, sessionToken);
    } else {
      onAuthSuccess(user, sessionToken);
    }
  };

  const handleAdminSetupSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    setSuccessText(null);

    const cleanName = adminFullName.trim();
    const cleanEmail = adminEmail.trim().toLowerCase();
    if (cleanName.length < 2) {
      setErrorText('Please enter administrator full name (at least 2 characters).');
      return;
    }
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setErrorText('Please enter a valid administrator email address.');
      return;
    }
    const passwordErr = validatePasswordClient(adminPassword);
    if (passwordErr) {
      setErrorText(passwordErr);
      return;
    }
    if (adminPassword !== adminConfirmPassword) {
      setErrorText('Password and Confirm Password do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await setupInitialAdminLocal({
        fullName: cleanName,
        email: cleanEmail,
        password: adminPassword,
        confirmPassword: adminConfirmPassword,
      });

      if (!result.ok) {
        setErrorText(result.error);
        return;
      }

      setAdminSetupRequired(false);
      setAdminHasAccount(true);
      setSuccessText('Authorized administrator account configured and signed in.');
      completeAdminLoginSuccess(result.user, result.sessionToken);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    setSuccessText(null);

    const cleanEmail = adminEmail.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setErrorText('Please enter a valid administrator email address.');
      return;
    }
    if (!adminPassword) {
      setErrorText('Please enter your administrator password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await loginAdminLocal({
        email: cleanEmail,
        password: adminPassword,
      });

      if (!result.ok) {
        if (result.status === 503) {
          setAdminSetupRequired(true);
          setAdminMode('setup');
        }
        setErrorText(result.error);
        return;
      }

      if (result.user.role !== 'admin') {
        setErrorText(
          'Access denied. Only authorized administrator accounts can access the Admin Portal.',
        );
        return;
      }

      setSuccessText('Administrator verified. Opening Admin Dashboard...');
      completeAdminLoginSuccess(result.user, result.sessionToken);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminForgotRequestSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    setSuccessText(null);

    const cleanEmail = adminForgotEmail.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setErrorText('Please enter a valid administrator email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await requestAdminPasswordResetLocal(cleanEmail);
      if (!result.ok) {
        setErrorText(result.error);
        return;
      }

      setAdminIssuedResetLink(result.resetLink);
      setSuccessText(
        `A one-time administrator password reset link has been generated for ${result.email} (valid for 15 minutes).`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenIssuedAdminResetLink = () => {
    if (!adminIssuedResetLink) return;
    try {
      const parsed = new URL(adminIssuedResetLink, window.location.origin);
      const token = parsed.searchParams.get('resetToken') || '';
      const email = parsed.searchParams.get('email') || adminForgotEmail.trim().toLowerCase();
      setAdminForgotEmail(email);
      setAdminEmail(email);
      setAdminResetTokenInput(token);
      setAdminIssuedResetLink(null);
      setErrorText(null);
      setSuccessText('Reset link opened. Choose a new password for your administrator account.');
      setAdminMode('forgot_complete');
    } catch {
      setErrorText('Reset link format is invalid. Please request a new link.');
    }
  };

  const handleAdminResetCompleteSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    setSuccessText(null);

    const cleanEmail = (adminForgotEmail || adminEmail).trim().toLowerCase();
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setErrorText('Please enter a valid administrator email address.');
      return;
    }
    if (!adminResetTokenInput.trim()) {
      setErrorText('Missing administrator reset token. Please request a new reset link.');
      return;
    }
    const passwordErr = validatePasswordClient(adminNewPassword);
    if (passwordErr) {
      setErrorText(passwordErr);
      return;
    }
    if (adminNewPassword !== adminConfirmNewPassword) {
      setErrorText('New Password and Confirm Password do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await completeAdminPasswordResetLocal({
        email: cleanEmail,
        resetToken: adminResetTokenInput.trim(),
        newPassword: adminNewPassword,
        confirmPassword: adminConfirmNewPassword,
      });

      if (!result.ok) {
        setErrorText(result.error);
        return;
      }

      setAdminEmail(cleanEmail);
      setAdminPassword('');
      setAdminResetTokenInput('');
      setAdminNewPassword('');
      setAdminConfirmNewPassword('');
      setAdminIssuedResetLink(null);
      onClearAdminResetParams?.();
      setAdminMode('login');
      setSuccessText(
        'Administrator password updated successfully. Sign in with your new password.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestReset = async (e: FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    setSuccessText(null);

    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setErrorText('Please enter a valid registered email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await requestPasswordResetLocal(cleanEmail);
      if (!result.ok) {
        setErrorText(result.error);
        return;
      }

      setIssuedResetCode(result.resetCode);
      setSuccessText(
        `Verification code generated for ${cleanEmail}. Enter the code below to set a new password.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteReset = async (e: FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    setSuccessText(null);

    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!resetCodeInput.trim()) {
      setErrorText('Please enter the verification reset code.');
      return;
    }
    const passwordErr = validatePasswordClient(newPassword);
    if (passwordErr) {
      setErrorText(passwordErr);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorText('New Password and Confirm Password do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await completePasswordResetLocal({
        email: cleanEmail,
        resetCode: resetCodeInput.trim().toUpperCase(),
        newPassword,
        confirmPassword: confirmNewPassword,
      });

      if (!result.ok) {
        setErrorText(result.error);
        return;
      }

      setLoginEmail(cleanEmail);
      setLoginPassword('');
      setIssuedResetCode(null);
      setResetCodeInput('');
      setNewPassword('');
      setConfirmNewPassword('');
      switchView(
        'login',
        'Password updated successfully. You can now log in with your new password.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Branding Bar */}
      <header className="bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => switchView('welcome')}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700 rounded-lg cursor-pointer"
          >
            <ShopSyncLogoMark />
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => switchView('admin_login')}
              className={`px-2.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                view === 'admin_login'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:underline underline-offset-4'
              }`}
            >
              Admin Portal
            </button>
            <button
              type="button"
              onClick={() => switchView('login')}
              className={`px-3.5 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                view === 'login'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => switchView('register')}
              className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-700 hover:from-blue-700 hover:to-violet-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Register
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {view === 'welcome' && (
          <div className="w-full max-w-[1040px] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700">
                <Globe className="w-3.5 h-3.5" />
                <span>Amazon India · Flipkart · Meesho · Myntra</span>
              </div>

              <h1 className="font-display text-[clamp(2rem,3.6vw,3.1rem)] font-bold tracking-tight text-slate-900 leading-[1.1] text-balance">
                Compare prices across India&apos;s top marketplaces in one place.
              </h1>

              <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                Welcome to <strong className="text-slate-900">ShopSync</strong>. Sign in or create
                an account to access direct live marketplace search links, log prices side-by-side,
                track price alerts, and manage your shopping wishlist.
              </p>

              {bannerMessage && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{bannerMessage}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => switchView('login')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-700 hover:from-blue-700 hover:to-violet-800 rounded-xl shadow-sm transition-colors min-h-[44px] cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => switchView('register')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:border-violet-400 hover:bg-violet-50/50 rounded-xl transition-colors min-h-[44px] cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-violet-700" />
                  <span>Register</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-semibold text-blue-700">Direct Store Search</div>
                  <div className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Open verified search tabs across 4 major stores in one click.
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-semibold text-violet-700">Lowest Price Matrix</div>
                  <div className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Record observed prices & highlight the lowest landed deal.
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-semibold text-emerald-700">Alerts & Wishlist</div>
                  <div className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Save target prices, history, and personalized comparison lists.
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <ShopSyncLogoMark />
                  <ShieldCheck className="w-6 h-6 text-violet-700" />
                </div>

                <div className="space-y-3">
                  <h2 className="font-display text-lg font-bold text-slate-900">
                    Get started with ShopSync
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Your account stays signed in securely across page refreshes. Never store fake
                    prices or unverified estimates.
                  </p>
                </div>

                <div className="space-y-2.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Salted cryptographic password protection</span>
                  </div>
                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Persistent session across browser refreshes</span>
                  </div>
                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Full Dashboard, Catalog, Compare & Price Helper</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => switchView('login')}
                    className="px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-700 hover:from-blue-700 hover:to-violet-800 rounded-xl transition-colors cursor-pointer"
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => switchView('register')}
                    className="px-4 py-3 text-sm font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Register
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'login' && (
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => switchView('welcome')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-700 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Welcome</span>
              </button>
              <h1 className="font-display text-2xl font-bold text-slate-900">
                Login to ShopSync
              </h1>
              <p className="text-sm text-slate-600">
                Enter your email and password to access your shopping comparison dashboard.
              </p>
            </div>

            {(bannerMessage || successText) && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successText || bannerMessage}</span>
              </div>
            )}

            {errorText && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorText}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-700"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(loginEmail);
                      switchView('forgot');
                    }}
                    className="text-xs font-semibold text-violet-700 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((v) => !v)}
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-700 hover:from-blue-700 hover:to-violet-800 rounded-xl transition-colors disabled:opacity-60 min-h-[44px] cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{isSubmitting ? 'Signing in...' : 'Login'}</span>
              </button>
            </form>

            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
              By signing in, you acknowledge that product search and comparison activity is
              collected for platform analytics.
            </p>

            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <div>
                No account yet?{' '}
                <button
                  type="button"
                  onClick={() => switchView('register')}
                  className="font-semibold text-blue-700 hover:underline cursor-pointer"
                >
                  Register here
                </button>
              </div>
              <button
                type="button"
                onClick={() => switchView('admin_login')}
                className="font-semibold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
              >
                Admin Login →
              </button>
            </div>
          </div>
        )}

        {view === 'register' && (
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => switchView('welcome')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-700 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Welcome</span>
              </button>
              <h1 className="font-display text-2xl font-bold text-slate-900">
                Create your ShopSync account
              </h1>
              <p className="text-sm text-slate-600">
                Register to track marketplace prices, build comparisons, and save alerts.
              </p>
            </div>

            {successText && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successText}</span>
              </div>
            )}

            {errorText && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorText}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="register-name"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="register-name"
                    type="text"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-700"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="register-email"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="register-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-700"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="register-password"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="register-password"
                    type={showRegisterPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="Min. 8 chars with letters & numbers"
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword((v) => !v)}
                    aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showRegisterPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Must be at least 8 characters and include a letter and a number.
                </p>
              </div>

              <div>
                <label
                  htmlFor="register-confirm-password"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="register-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={
                      showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-700 hover:from-blue-700 hover:to-violet-800 rounded-xl transition-colors disabled:opacity-60 min-h-[44px] cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmitting ? 'Creating Account...' : 'Register'}</span>
              </button>
            </form>

            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
              Product search, comparison, and wishlist activity is collected for ShopSync
              analytics. No payment or sensitive personal information is collected.
            </p>

            <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchView('login')}
                className="font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                Login here
              </button>
            </div>
          </div>
        )}

        {view === 'forgot' && (
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => switchView('login')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-700 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Login</span>
              </button>
              <h1 className="font-display text-2xl font-bold text-slate-900">
                Reset your password
              </h1>
              <p className="text-sm text-slate-600">
                Request a one-time verification code for your registered email address, then choose
                a new password.
              </p>
            </div>

            {successText && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successText}</span>
              </div>
            )}

            {issuedResetCode && (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
                  One-Time Verification Code (Expires in 15 min)
                </div>
                <div className="font-mono text-lg font-bold tracking-widest text-slate-900">
                  {issuedResetCode}
                </div>
              </div>
            )}

            {errorText && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorText}</span>
              </div>
            )}

            {!issuedResetCode ? (
              <form onSubmit={handleRequestReset} className="space-y-4" noValidate>
                <div>
                  <label
                    htmlFor="forgot-email"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-700"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-700 hover:from-blue-700 hover:to-violet-800 rounded-xl transition-colors disabled:opacity-60 min-h-[44px] cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isSubmitting ? 'Generating Code...' : 'Send Reset Code'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleCompleteReset} className="space-y-4" noValidate>
                <div>
                  <label
                    htmlFor="reset-code"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Verification Reset Code
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reset-code"
                      type="text"
                      required
                      value={resetCodeInput}
                      onChange={(e) => setResetCodeInput(e.target.value.toUpperCase())}
                      placeholder="Enter 8-character code"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm font-mono uppercase bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-700"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reset-new-password"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reset-new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 8 chars with letters & numbers"
                      className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-700"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reset-confirm-password"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reset-confirm-password"
                      type={showNewPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-700"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-700 hover:from-blue-700 hover:to-violet-800 rounded-xl transition-colors disabled:opacity-60 min-h-[44px] cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSubmitting ? 'Updating Password...' : 'Reset Password'}</span>
                </button>
              </form>
            )}

            <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
              Remembered your password?{' '}
              <button
                type="button"
                onClick={() => switchView('login')}
                className="font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                Login here
              </button>
            </div>
          </div>
        )}

        {view === 'admin_login' && (
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => switchView('welcome')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-700 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to User Welcome</span>
              </button>
              <div className="flex items-center gap-2.5 pt-1">
                <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold text-slate-900 leading-tight">
                    {adminMode === 'setup'
                      ? 'Admin Portal Setup'
                      : adminMode === 'forgot_request' || adminMode === 'forgot_complete'
                        ? 'Admin Password Recovery'
                        : 'Admin Portal Login'}
                  </h1>
                  <p className="text-xs text-slate-500">
                    Authorized ShopSync Administrators Only
                  </p>
                </div>
              </div>
            </div>

            {(successText || (bannerMessage && adminMode === 'login')) && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successText || bannerMessage}</span>
              </div>
            )}

            {errorText && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorText}</span>
              </div>
            )}

            {adminMode === 'setup' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed space-y-1.5">
                  <div className="font-semibold text-slate-900">
                    First-Time Administrator Configuration
                  </div>
                  <p>
                    Create the single authorized administrator account below to unlock the Admin
                    Dashboard. This one-time setup locks immediately after creation.
                  </p>
                </div>

                <form onSubmit={handleAdminSetupSubmit} className="space-y-4" noValidate>
                  <div>
                    <label
                      htmlFor="admin-setup-name"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Administrator Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="admin-setup-name"
                        type="text"
                        required
                        value={adminFullName}
                        onChange={(e) => setAdminFullName(e.target.value)}
                        placeholder="ShopSync Administrator"
                        className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="admin-setup-email"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Administrator Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="admin-setup-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@company.com"
                        className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="admin-setup-password"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Administrator Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="admin-setup-password"
                        type={showAdminPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Min. 8 chars with letters & numbers"
                        className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword((v) => !v)}
                        aria-label={showAdminPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {showAdminPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="admin-setup-confirm"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Confirm Administrator Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="admin-setup-confirm"
                        type={showAdminPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={adminConfirmPassword}
                        onChange={(e) => setAdminConfirmPassword(e.target.value)}
                        placeholder="Re-enter administrator password"
                        className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-60 min-h-[44px] cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {isSubmitting
                        ? 'Configuring Admin Account...'
                        : 'Configure Admin & Sign In'}
                    </span>
                  </button>
                </form>

                {adminHasAccount && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorText(null);
                        setSuccessText(null);
                        setAdminMode('login');
                      }}
                      className="text-xs font-semibold text-slate-700 hover:underline cursor-pointer"
                    >
                      Already have an admin account? Sign in →
                    </button>
                  </div>
                )}
              </div>
            )}

            {adminMode === 'login' && (
              <>
                {adminStatusChecked && adminSetupRequired && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
                    <span>No authorized administrator is configured yet.</span>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorText(null);
                        setSuccessText(null);
                        setAdminMode('setup');
                      }}
                      className="font-semibold underline shrink-0 cursor-pointer"
                    >
                      Setup Admin
                    </button>
                  </div>
                )}

                <form onSubmit={handleAdminLoginSubmit} className="space-y-4" noValidate>
                  <div>
                    <label
                      htmlFor="admin-email"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Administrator Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="admin-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@company.com"
                        className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="admin-password"
                        className="block text-xs font-semibold text-slate-700"
                      >
                        Administrator Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setErrorText(null);
                          setSuccessText(null);
                          setAdminForgotEmail(adminEmail);
                          setAdminIssuedResetLink(null);
                          setAdminMode('forgot_request');
                        }}
                        className="text-xs font-semibold text-slate-700 hover:text-slate-900 hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="admin-password"
                        type={showAdminPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Enter administrator password"
                        className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword((v) => !v)}
                        aria-label={showAdminPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {showAdminPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-60 min-h-[44px] cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isSubmitting ? 'Verifying Access...' : 'Sign In to Admin Portal'}</span>
                  </button>
                </form>
              </>
            )}

            {adminMode === 'forgot_request' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter your authorized administrator email to generate a secure, single-use
                  password reset email link (isolated from standard shopper password recovery).
                </p>

                {adminIssuedResetLink && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 space-y-2.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                      Administrator Reset Email Link (Expires in 15 min)
                    </div>
                    <div className="text-[11px] font-mono break-all text-slate-600 bg-white border border-slate-200 rounded-lg p-2">
                      {adminIssuedResetLink}
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenIssuedAdminResetLink}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Admin Password Reset Link</span>
                    </button>
                  </div>
                )}

                <form onSubmit={handleAdminForgotRequestSubmit} className="space-y-4" noValidate>
                  <div>
                    <label
                      htmlFor="admin-forgot-email"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Authorized Administrator Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="admin-forgot-email"
                        type="email"
                        required
                        value={adminForgotEmail}
                        onChange={(e) => setAdminForgotEmail(e.target.value)}
                        placeholder="admin@company.com"
                        className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-60 min-h-[44px] cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>
                      {isSubmitting ? 'Generating Reset Link...' : 'Send Admin Reset Link'}
                    </span>
                  </button>
                </form>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorText(null);
                      setSuccessText(null);
                      setAdminIssuedResetLink(null);
                      setAdminMode('login');
                    }}
                    className="text-xs font-semibold text-slate-700 hover:underline cursor-pointer"
                  >
                    ← Back to Admin Login
                  </button>
                </div>
              </div>
            )}

            {adminMode === 'forgot_complete' && (
              <div className="space-y-4">
                <form onSubmit={handleAdminResetCompleteSubmit} className="space-y-4" noValidate>
                  <div>
                    <label
                      htmlFor="admin-reset-email"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Administrator Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="admin-reset-email"
                        type="email"
                        required
                        value={adminForgotEmail || adminEmail}
                        onChange={(e) => setAdminForgotEmail(e.target.value)}
                        placeholder="admin@company.com"
                        className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="admin-reset-new-password"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      New Administrator Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="admin-reset-new-password"
                        type={showAdminNewPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={adminNewPassword}
                        onChange={(e) => setAdminNewPassword(e.target.value)}
                        placeholder="Min. 8 chars with letters & numbers"
                        className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminNewPassword((v) => !v)}
                        aria-label={showAdminNewPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {showAdminNewPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="admin-reset-confirm-password"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Confirm New Administrator Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="admin-reset-confirm-password"
                        type={showAdminNewPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={adminConfirmNewPassword}
                        onChange={(e) => setAdminConfirmNewPassword(e.target.value)}
                        placeholder="Re-enter new administrator password"
                        className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-60 min-h-[44px] cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {isSubmitting
                        ? 'Updating Admin Password...'
                        : 'Update Administrator Password'}
                    </span>
                  </button>
                </form>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorText(null);
                      setSuccessText(null);
                      onClearAdminResetParams?.();
                      setAdminMode('login');
                    }}
                    className="text-xs font-semibold text-slate-700 hover:underline cursor-pointer"
                  >
                    ← Back to Admin Login
                  </button>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>Standard shopper account?</span>
              <button
                type="button"
                onClick={() => switchView('login')}
                className="font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                User Login →
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <strong className="text-slate-900 font-display">ShopSync</strong> · Smart Shopping
            Comparison across Amazon India, Flipkart, Meesho &amp; Myntra
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => switchView('welcome')}
              className="hover:text-blue-700 cursor-pointer"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => switchView('login')}
              className="hover:text-blue-700 cursor-pointer"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => switchView('register')}
              className="hover:text-blue-700 cursor-pointer"
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => switchView('admin_login')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Admin Portal
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

