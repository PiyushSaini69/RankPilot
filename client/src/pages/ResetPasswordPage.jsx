import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Navbar from '../components/ui/Navbar';
import Logo from '../components/ui/Logo';
import { resetPassword } from '../api/authApi';
import toast from 'react-hot-toast';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword({ token, newPassword });
      toast.success(res.data.message || 'Password reset successful!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password. Link may be expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-slate-950 flex flex-col transition-colors duration-500">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-neutral-900 border border-red-200 dark:border-red-800/50 rounded-3xl p-10 text-center max-w-sm shadow-2xl shadow-red-500/10 transition-colors duration-500">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-black text-neutral-900 dark:text-white mb-3 tracking-tight">Invalid Link</h2>
            <p className="text-sm text-neutral-500 dark:text-slate-400 font-medium mb-8">This password reset link is invalid or has expired. Please request a new one.</p>
            <Link to="/forgot-password" size="sm" className="w-full inline-flex justify-center items-center py-3 px-6 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-black transition-all">
                Request New Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-950 flex flex-col transition-colors duration-500">
      <Navbar />
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel — branding side */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12 transition-colors duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-neutral-100 to-neutral-200 dark:from-brand-900 dark:via-slate-900 dark:to-slate-950 transition-colors duration-500" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] transition-colors duration-500" />
            <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-brand-500/10 dark:bg-brand-600/20 rounded-full blur-[80px] animate-pulse" />

            {/* Logo */}
            <div className="relative z-10">
                <Logo className="w-9 h-9" />
            </div>

            {/* Center content */}
            <div className="relative z-10">
                <div className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight leading-tight mb-4 transition-colors duration-500">
                    Secure your<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-blue-600 dark:from-brand-400 dark:to-blue-400">
                        new identity.
                    </span>
                </div>
                <p className="text-neutral-500 dark:text-slate-400 font-medium text-sm leading-relaxed max-w-xs transition-colors duration-500">
                    Create a strong, unique password to keep your marketing data safe. We recommend using a mix of characters.
                </p>
            </div>

        </div>

        {/* Right Panel — form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white dark:bg-slate-950 transition-colors duration-500">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="flex items-center gap-2 mb-10 lg:hidden">
                <Logo className="w-8 h-8" />
            </div>

            <div className="mb-8">
                <h1 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight mb-2">New password</h1>
                <p className="text-sm text-neutral-500 dark:text-slate-400 font-medium">Reset your access by choosing a new one</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-slate-400">New Password</label>
                <Input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-slate-400">Confirm Password</label>
                <Input
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {confirmPassword && (
                  <p className={`text-[11px] font-bold flex items-center gap-1.5 mt-2 transition-colors duration-300 ${
                    newPassword === confirmPassword
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-500 dark:text-red-400'
                  }`}>
                    {newPassword === confirmPassword ? (
                      <>
                        <div className="w-4 h-4 rounded-full bg-green-500/10 flex items-center justify-center">
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                            </svg>
                        </div>
                        Passwords match
                      </>
                    ) : (
                      <>
                        <div className="w-4 h-4 rounded-full bg-red-500/10 flex items-center justify-center">
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </div>
                        Passwords do not match
                      </>
                    )}
                  </p>
                )}
              </div>

              <Button
                loading={loading}
                type="submit"
                className="w-full py-4 text-sm font-black shadow-lg shadow-brand-500/25 mt-4"
              >
                Update Password →
              </Button>

              <div className="text-center mt-6">
                <Link to="/login" className="text-sm font-black text-neutral-500 dark:text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  Cancel and return to sign in
                </Link>
              </div>
            </form>

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

export default ResetPasswordPage;
