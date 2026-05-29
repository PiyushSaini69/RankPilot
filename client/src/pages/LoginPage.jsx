import React, { useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { getMe, resendVerification, loginUser } from '../api/authApi';
import { getApiUrl } from '../api/index';
import { useThemeStore } from '../store/themeStore';

import Navbar from '../components/ui/Navbar';
import Logo from '../components/ui/Logo';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [showResend, setShowResend] = useState(false);
    const { setAuth } = useAuthStore();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!email || !password) return toast.error('Please enter email and password');
        setLoading(true);
        setShowResend(false);
        try {
            const res = await loginUser({ email, password });
            setAuth(res.data.token, res.data.user);
            toast.success(`Welcome back, ${res.data.user.name.split(' ')[0]}!`);
        } catch (err) {
            const msg = err.response?.data?.message || 'Login failed';
            toast.error(msg);
            // Show resend button if login failed because email is unverified
            if (err.response?.status === 403) {
                setShowResend(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResendLoading(true);
        try {
            const res = await resendVerification({ email });
            toast.success(res.data.message);
            setShowResend(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to resend verification email');
        } finally {
            setResendLoading(false);
        }
    };

    const loginGoogle = () => {
        window.location.href = getApiUrl('/auth/google');
    };

    const { theme } = useThemeStore();

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-slate-950 flex flex-col transition-colors duration-500">
            <Navbar />
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Left Panel — branding side (hidden on mobile) */}
                <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12 transition-colors duration-500">
                    {/* Background mesh & blobs — Theme Aware */}
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-neutral-100 to-neutral-200 dark:from-brand-900 dark:via-slate-900 dark:to-slate-950 transition-colors duration-500" />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] transition-colors duration-500" />
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-brand-500/10 dark:bg-brand-600/20 rounded-full blur-[100px] animate-pulse" />

                    {/* Logo */}
                    <div className="relative z-10">
                        <Logo className="w-9 h-9" />
                    </div>

                    {/* Center content */}
                    <div className="relative z-10">
                        <div className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight leading-tight mb-4 transition-colors duration-500">
                            Your analytics.<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-blue-600 dark:from-brand-400 dark:to-blue-400">
                                Finally unified.
                            </span>
                        </div>
                        <p className="text-neutral-500 dark:text-slate-400 font-medium text-sm leading-relaxed max-w-xs transition-colors duration-500">
                            Connect GA4, Search Console, Google Ads, and Facebook Ads in one place. Ask your AI analyst anything.
                        </p>
                    </div>

                    {/* Bottom stats */}
                    <div className="relative z-10 grid grid-cols-3 gap-4">
                        {[
                            { value: '4+', label: 'Integrations' },
                            { value: '100%', label: 'Encrypted' },
                            { value: 'AI', label: 'Powered' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-white/40 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-2xl p-4 text-center backdrop-blur-sm transition-all duration-500">
                                <p className="text-2xl font-black text-neutral-900 dark:text-white transition-colors duration-500">{stat.value}</p>
                                <p className="text-xs font-semibold text-neutral-500 dark:text-slate-500 mt-1 transition-colors duration-500">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

            {/* Right Panel — form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white dark:bg-slate-950">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="flex items-center gap-2 mb-10 lg:hidden">
                        <Logo className="w-8 h-8" />
                    </div>

                    {/* Heading */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight mb-2">Welcome back</h1>
                        <p className="text-sm text-neutral-500 dark:text-slate-400 font-medium">Sign in to your analytics dashboard</p>
                    </div>

                    {/* Google button */}
                    <button
                        onClick={loginGoogle}
                        className="w-full flex items-center justify-center gap-3 py-3 px-5 bg-white dark:bg-white/10 border border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/20 text-neutral-800 dark:text-white font-black text-sm rounded-xl transition-all shadow-sm hover:-translate-y-0.5 active:scale-95 mb-6"
                    >
                        <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continue with Google
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex-1 h-px bg-neutral-200 dark:bg-white/10" />
                        <span className="text-xs font-bold text-neutral-400 dark:text-slate-600 uppercase tracking-widest">or</span>
                        <div className="flex-1 h-px bg-neutral-200 dark:bg-white/10" />
                    </div>

                    {/* Email/password form */}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-neutral-500 dark:text-slate-400 uppercase tracking-wider">Email Address</label>
                            <Input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@company.com"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-black text-neutral-500 dark:text-slate-400 uppercase tracking-wider">Password</label>
                                <Link to="/forgot-password" className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-500 dark:hover:text-brand-300 font-bold transition-colors">
                                    Forgot password?
                                </Link>
                            </div>
                            <Input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            loading={loading}
                            className="w-full py-3 text-sm font-black shadow-lg shadow-brand-500/25 mt-2"
                        >
                            Sign In →
                        </Button>
                    </form>

                    {/* Resend verification banner */}
                    {showResend && (
                        <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                            <p className="text-xs text-amber-400 font-semibold mb-3 flex items-start gap-2">
                                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                                Email not verified. Check your inbox or resend the link.
                            </p>
                            <button
                                onClick={handleResend}
                                disabled={resendLoading}
                                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {resendLoading ? (
                                    <>
                                        <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Sending...
                                    </>
                                ) : 'Resend Verification Email'}
                            </button>
                        </div>
                    )}

                    {/* Sign up link */}
                    <p className="text-center text-xs text-neutral-500 dark:text-slate-500 mt-8">
                        Don't have an account?{' '}
                        <NavLink to="/register" className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-black transition-colors">
                            Create one free →
                        </NavLink>
                    </p>

                    {/* Trust badges */}
                    <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-neutral-100 dark:border-white/5">
                        {['🔒 Encrypted', '⚡ Instant Setup', '🤖 AI Powered'].map((badge, i) => (
                            <span key={i} className="text-[12px] font-bold text-neutral-400 dark:text-slate-600">{badge}</span>
                        ))}
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
};

export default LoginPage;

