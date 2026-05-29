import React, { useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { registerUser } from '../api/authApi';
import { useThemeStore } from '../store/themeStore';
import toast from 'react-hot-toast';

import Navbar from '../components/ui/Navbar';
import Logo from '../components/ui/Logo';

const RegisterPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await registerUser({ name, email, password });
            toast.success('Account created! Please check your email to verify your account and start using RankPilot.');
            navigate('/login');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
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
                            Start in<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-blue-600 dark:from-brand-400 dark:to-blue-400">
                                under 2 minutes.
                            </span>
                        </div>
                        <p className="text-neutral-500 dark:text-slate-400 font-medium text-sm leading-relaxed max-w-xs transition-colors duration-500">
                            Connect your marketing tools and let your AI analyst start finding opportunities instantly.
                        </p>

                        {/* Feature checklist */}
                        <div className="mt-8 space-y-3">
                            {[
                                'Connect GA4, GSC, Google Ads, Facebook Ads',
                                'AI-powered insights in plain English',
                                'AES-256 encrypted — your data stays private',
                                'No credit card required',
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-3 h-3 text-brand-500 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-xs font-semibold text-neutral-600 dark:text-slate-400 transition-colors duration-500">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom */}
                    <div className="relative z-10">
                        <p className="text-xs text-neutral-500 dark:text-slate-600 font-medium transition-colors duration-500">Already have an account?{' '}
                            <NavLink to="/login" className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-black transition-colors">Sign in →</NavLink>
                        </p>
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
                        <h1 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight mb-2">Create your account</h1>
                        <p className="text-sm text-neutral-500 dark:text-slate-400 font-medium">Free forever. No credit card required.</p>
                    </div>

                    {/* Register form */}
                    <form onSubmit={handleRegister} className="space-y-4">

                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-neutral-500 dark:text-slate-400 uppercase tracking-wider">Full Name</label>
                            <Input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="John Doe"
                                required
                            />
                        </div>

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
                            <label className="text-xs font-black text-neutral-500 dark:text-slate-400 uppercase tracking-wider">Password</label>
                            <Input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Min 8 characters"
                                required
                                minLength={8}
                            />
                        </div>

                        {/* Terms note */}
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                            By creating an account you agree to our{' '}
                            <Link to="/terms" className="text-slate-400 dark:text-slate-500 hover:text-neutral-900 dark:hover:text-white transition-colors underline underline-offset-2">Terms of Service</Link>
                            {' '}and{' '}
                            <Link to="/privacy" className="text-slate-400 dark:text-slate-500 hover:text-neutral-900 dark:hover:text-white transition-colors underline underline-offset-2">Privacy Policy</Link>.
                        </p>

                        <Button
                            type="submit"
                            loading={loading}
                            className="w-full py-3 text-sm font-black shadow-lg shadow-brand-500/25"
                        >
                            Create Account →
                        </Button>
                    </form>

                    {/* Already have account */}
                    <p className="text-center text-xs text-neutral-500 dark:text-slate-500 mt-8">
                        Already have an account?{' '}
                        <NavLink to="/login" className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-black transition-colors">
                            Sign in →
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

export default RegisterPage;

