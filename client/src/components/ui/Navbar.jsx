import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    return (
        <nav className="sticky top-0 z-50 w-full transition-all duration-500 border-b border-neutral-200/50 dark:border-white/5 bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl shadow-sm dark:shadow-none">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 sm:h-20">

                {/* Left Section — Branding & Logo */}
                <div className="flex items-center">
                    <Link to="/" className="flex items-center gap-2.5 group/logo">
                        <Logo className="w-7 h-7 sm:w-8 sm:h-8" />
                    </Link>
                </div>

                {/* Center — Ultra-Premium Announcement Pill */}
                <div className="hidden md:flex items-center justify-center flex-1 mx-8">
                    <div className="group relative overflow-hidden inline-flex items-center gap-2.5 bg-neutral-50 dark:bg-white/[0.03] hover:bg-brand-50/50 dark:hover:bg-brand-500/[0.08] border border-neutral-200/80 dark:border-white/10 hover:border-brand-500/30 dark:hover:border-brand-400/30 px-5 py-2 rounded-full transition-all duration-300 shadow-sm hover:shadow hover:-translate-y-0.5 cursor-pointer">
                        {/* Shimmer light slide effect on hover */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:animate-[shimmer-slide_1.5s_infinite]" />

                        {/* Pulsing dot indicator */}
                        <span className="relative flex h-2 w-2 flex-shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-60" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-600 dark:bg-brand-400" />
                        </span>

                        {/* Text Content */}
                        <span className="text-xs sm:text-sm font-bold text-neutral-600 dark:text-slate-300 group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors duration-300 tracking-tight">
                            AI-Powered Analytics Platform
                        </span>
                    </div>
                </div>

                {/* Right Section — CTAs & Theme Toggle */}
                <div className="flex items-center gap-2 sm:gap-3">
                    <ThemeToggle />

                    <div className="hidden sm:flex items-center gap-3 ml-2">
                        {/* Login Button with Custom Expanding Bottom Line */}
                        <NavLink
                            to="/login"
                            className="text-sm font-bold text-neutral-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-white transition-all px-4 py-2.5 relative group"
                        >
                            Log in
                            <span className="absolute bottom-1.5 left-4 right-4 h-0.5 bg-brand-600 dark:bg-brand-400 origin-bottom-right scale-x-0 group-hover:scale-x-100 group-hover:origin-bottom-left transition-transform duration-300" />
                        </NavLink>

                        {/* Get Started Gradient Button with Shimmer & Shadow acccents */}
                        <NavLink
                            to="/register"
                            className="text-sm font-bold text-white bg-gradient-to-r from-brand-600 via-brand-500 to-accent-600 hover:from-brand-500 hover:to-accent-500 px-6 py-2.5 rounded-xl transition-all shadow-md shadow-brand-500/15 hover:shadow-lg hover:shadow-brand-500/30 hover:-translate-y-0.5 active:scale-95 relative overflow-hidden group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer-slide_1.5s_infinite]" />
                            <span className="relative z-10 flex items-center gap-1.5">
                                Get Started
                                <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                </svg>
                            </span>
                        </NavLink>
                    </div>

                    {/* Mobile Menu Toggle Button with Morphing Hamburger Icon */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden p-2.5 rounded-xl bg-neutral-50 dark:bg-white/5 border border-neutral-200/50 dark:border-white/10 text-neutral-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-white transition-all active:scale-90"
                        aria-label="Toggle menu"
                    >
                        <div className="relative w-5 h-5 flex items-center justify-center">
                            <span className={`absolute h-0.5 w-5 bg-current transform transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45' : '-translate-y-1.5'}`} />
                            <span className={`absolute h-0.5 w-5 bg-current transform transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : 'opacity-100'}`} />
                            <span className={`absolute h-0.5 w-5 bg-current transform transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45' : 'translate-y-1.5'}`} />
                        </div>
                    </button>
                </div>
            </div>

            {/* Mobile Menu Drawer Overlay */}
            {isMobileMenuOpen && (
                <div className="md:hidden absolute top-full left-0 right-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border-b border-neutral-200/60 dark:border-white/5 shadow-xl animate-in fade-in slide-in-from-top duration-300 overflow-hidden">
                    <div className="flex flex-col p-6 gap-5">

                        {/* Mobile Pill Accent */}
                        <div
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="group relative overflow-hidden inline-flex items-center gap-2.5 bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200/80 dark:border-white/10 px-4 py-3 rounded-2xl w-full justify-center active:scale-[0.98] transition-all"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer-slide_1.5s_infinite]" />
                            <span className="relative flex h-2 w-2 flex-shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-60" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-600 dark:bg-brand-400" />
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-neutral-600 dark:text-slate-300 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                AI-Powered Analytics Platform
                            </span>
                        </div>

                        {/* Mobile CTA Buttons */}
                        <div className="flex flex-col gap-3 pt-1">
                            <NavLink
                                to="/login"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center justify-center w-full py-3 text-neutral-800 dark:text-white font-bold border border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/5 rounded-2xl transition-all active:scale-[0.98]"
                            >
                                Log in
                            </NavLink>
                            <NavLink
                                to="/register"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center justify-center w-full py-3.5 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 text-white font-bold rounded-2xl shadow-lg shadow-brand-500/15 active:scale-[0.98] transition-all"
                            >
                                Get Started
                            </NavLink>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
