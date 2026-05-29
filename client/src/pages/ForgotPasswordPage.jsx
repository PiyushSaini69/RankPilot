import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Navbar from '../components/ui/Navbar';
import Logo from '../components/ui/Logo';
import { forgotPassword } from '../api/authApi';
import toast from 'react-hot-toast';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await forgotPassword({ email });
            toast.success(res.data.message || 'Reset link sent to your email.');
            setIsSent(true);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send reset link.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-slate-950 flex flex-col transition-colors duration-500">
            <Navbar />
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Left Panel — branding side (hidden on mobile) */}
                <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12 transition-colors duration-500">
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
                            Secure your<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-blue-600 dark:from-brand-400 dark:to-blue-400">
                                access back.
                            </span>
                        </div>
                        <p className="text-neutral-500 dark:text-slate-400 font-medium text-sm leading-relaxed max-w-xs transition-colors duration-500">
                            Don't worry, it happens to the best of us. We'll send you a link to reset your password and get you back into your dashboard.
                        </p>
                    </div>

                    {/* Bottom illustration/hint */}
                    <div className="relative z-10 p-6 rounded-3xl bg-white/40 dark:bg-white/5 border border-neutral-200 dark:border-white/10 backdrop-blur-sm transition-all duration-500">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center">
                                <svg className="w-6 h-6 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-black text-neutral-900 dark:text-white">Enhanced Security</p>
                                <p className="text-xs font-semibold text-neutral-500 dark:text-slate-500">All reset links are encrypted and single-use.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel — form */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white dark:bg-slate-950 transition-colors duration-500">
                    <div className="w-full max-w-md">
                        {/* Mobile logo */}
                        <div className="flex items-center gap-2 mb-10 lg:hidden">
                            <Logo className="w-8 h-8" />
                        </div>

                        {!isSent ? (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="mb-8">
                                    <h1 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight mb-2">Reset password</h1>
                                    <p className="text-sm text-neutral-500 dark:text-slate-400 font-medium">Enter your email and we'll send you a link</p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
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

                                    <Button
                                        type="submit"
                                        loading={loading}
                                        className="w-full py-4 text-sm font-black shadow-lg shadow-brand-500/25"
                                    >
                                        Send Reset Link →
                                    </Button>

                                    <div className="text-center">
                                        <Link to="/login" className="text-sm font-black text-neutral-500 dark:text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex items-center justify-center gap-2">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                            </svg>
                                            Back to sign in
                                        </Link>
                                    </div>
                                </form>
                            </div>
                        ) : (
                            /* Success State */
                            <div className="text-center animate-in fade-in zoom-in-95 duration-500">
                                <div className="relative inline-block mb-8">
                                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-3xl flex items-center justify-center">
                                        <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div className="absolute inset-0 rounded-3xl border-2 border-green-400 dark:border-green-600 animate-ping opacity-20" />
                                </div>

                                <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight mb-3">Check your inbox</h2>
                                <p className="text-sm text-neutral-500 dark:text-slate-400 font-medium mb-8 leading-relaxed">
                                    We've sent a password reset link to <br />
                                    <span className="text-neutral-900 dark:text-white font-black">{email}</span>
                                </p>

                                <div className="bg-neutral-50 dark:bg-white/5 border border-neutral-100 dark:border-white/10 rounded-2xl p-6 text-left mb-8">
                                    <p className="text-xs font-black text-neutral-400 dark:text-slate-500 uppercase tracking-widest mb-4">What's next?</p>
                                    <ul className="space-y-3">
                                        {[
                                            'Click the link in the email',
                                            'Create a new strong password',
                                            'Sign in to your account'
                                        ].map((step, i) => (
                                            <li key={i} className="flex items-center gap-3">
                                                <div className="w-5 h-5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center text-[10px] font-black">
                                                    {i + 1}
                                                </div>
                                                <span className="text-xs font-bold text-neutral-600 dark:text-slate-400">{step}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="space-y-4">
                                    <Link
                                        to="/login"
                                        className="w-full inline-flex justify-center items-center gap-2 py-4 px-6 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-black transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-black/10 dark:shadow-none"
                                    >
                                        Go to Login
                                    </Link>
                                    <button
                                        onClick={() => setIsSent(false)}
                                        className="text-sm font-black text-neutral-500 dark:text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                                    >
                                        Didn't receive the email? Resend link
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Footer info */}
                        <div className="mt-12 pt-8 border-t border-neutral-100 dark:border-white/5 flex items-center justify-center gap-6">
                            {['🔒 Secure', '⚡ Fast', '🛠️ Reliable'].map((item, i) => (
                                <span key={i} className="text-[11px] font-bold text-neutral-500 dark:text-slate-400 uppercase tracking-widest">{item}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;

