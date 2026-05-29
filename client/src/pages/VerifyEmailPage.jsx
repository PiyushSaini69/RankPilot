import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '../api/authApi';
import Navbar from '../components/ui/Navbar';
import Logo from '../components/ui/Logo';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState(!token ? 'error' : 'loading');
  const [errorReason, setErrorReason] = useState(!token ? 'no-token' : 'invalid');

  useEffect(() => {
    if (!token || status !== 'loading') return;

    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => {
        setErrorReason('invalid');
        setStatus('error');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-950 flex flex-col transition-colors duration-500">
      <Navbar />
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel — branding side */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12 transition-colors duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-neutral-100 to-neutral-200 dark:from-brand-900 dark:via-slate-900 dark:to-slate-950 transition-colors duration-500" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] transition-colors duration-500" />
            <div className="absolute top-1/4 left-1/3 w-[350px] h-[350px] bg-brand-500/10 dark:bg-brand-600/20 rounded-full blur-[90px] animate-pulse" />

            {/* Logo */}
            <div className="relative z-10">
                <Logo className="w-9 h-9" />
            </div>

            {/* Center content */}
            <div className="relative z-10">
                <div className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight leading-tight mb-4 transition-colors duration-500">
                    Welcome to the<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-blue-600 dark:from-brand-400 dark:to-blue-400">
                        inner circle.
                    </span>
                </div>
                <p className="text-neutral-500 dark:text-slate-400 font-medium text-sm leading-relaxed max-w-xs transition-colors duration-500">
                    Verifying your email is the final step to unlocking AI-powered marketing intelligence. We take your security seriously.
                </p>
            </div>

            {/* Bottom info */}
            <div className="relative z-10 p-6 rounded-3xl bg-white/40 dark:bg-white/5 border border-neutral-200 dark:border-white/10 backdrop-blur-sm transition-all duration-500">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center">
                        <svg className="w-6 h-6 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-black text-neutral-900 dark:text-white">Account Verified</p>
                        <p className="text-xs font-semibold text-neutral-500 dark:text-slate-500">Your data is now AES-256 encrypted.</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Right Panel — status */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white dark:bg-slate-950 transition-colors duration-500">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="flex items-center gap-2 mb-10 lg:hidden text-center justify-center">
                <Logo className="w-8 h-8" />
            </div>

            {/* Loading State */}
            {status === 'loading' && (
              <div className="text-center animate-in fade-in zoom-in-95 duration-500">
                <div className="relative inline-block mb-8">
                  <div className="w-20 h-20 bg-brand-50 dark:bg-brand-900/20 rounded-3xl flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-brand-200 dark:border-brand-800 border-t-brand-600 rounded-full animate-spin" />
                  </div>
                </div>
                <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight mb-2">Verifying email</h2>
                <p className="text-sm text-neutral-500 dark:text-slate-400 font-medium">Just a moment while we secure your account...</p>
              </div>
            )}

            {/* Success State */}
            {status === 'success' && (
              <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="relative inline-block mb-8">
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-3xl flex items-center justify-center">
                    <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="absolute inset-0 rounded-3xl border-2 border-green-400 dark:border-green-600 animate-ping opacity-20" />
                </div>

                <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight mb-3">Email Verified!</h2>
                <p className="text-sm text-neutral-500 dark:text-slate-400 font-medium mb-8 leading-relaxed max-w-xs mx-auto">
                  Your account is now active. You're ready to start finding hidden opportunities in your marketing data.
                </p>

                <Link
                  to="/login"
                  className="w-full inline-flex justify-center items-center gap-2 py-4 px-6 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-black transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-black/10 dark:shadow-none"
                >
                  Go to Login
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            )}

            {/* Error State */}
            {status === 'error' && (
              <div className="text-center animate-in fade-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-3xl flex items-center justify-center mx-auto mb-8">
                  <svg className="w-10 h-10 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>

                <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight mb-3">
                  {errorReason === 'no-token' ? 'No Link Found' : 'Invalid Link'}
                </h2>
                <p className="text-sm text-neutral-500 dark:text-slate-400 font-medium mb-8 leading-relaxed max-w-xs mx-auto">
                  {errorReason === 'no-token'
                    ? 'This page requires a verification link. Please check your email for the link sent by RankPilot.'
                    : 'This verification link has already been used or has expired. Please try logging in or creating a new account.'
                  }
                </p>

                <div className="space-y-4">
                  <Link
                    to="/login"
                    className="w-full inline-flex justify-center items-center gap-2 py-4 px-6 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-black transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-black/10 dark:shadow-none"
                  >
                    Go to Login
                  </Link>
                  <Link
                    to="/register"
                    className="w-full inline-flex justify-center items-center py-4 px-6 rounded-2xl border-2 border-neutral-100 dark:border-white/5 text-neutral-600 dark:text-slate-400 text-sm font-black transition-all hover:bg-neutral-50 dark:hover:bg-white/5"
                  >
                    Create New Account
                  </Link>
                </div>
              </div>
            )}

            {/* Footer badges */}
            <div className="mt-12 pt-8 border-t border-neutral-100 dark:border-white/5 flex items-center justify-center gap-6">
                {['🔒 Secure', '⚡ Fast', '🛠️ Reliable'].map((item, i) => (
                    <span key={i} className="text-[12px] font-bold text-neutral-500 dark:text-slate-400 uppercase tracking-widest">{item}</span>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
