import React from 'react';
import { NavLink } from 'react-router-dom';
import Logo from './Logo';

const Footer = () => {
  return (
    <footer className="relative w-full bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-200 border-t border-neutral-200 dark:border-white/5 py-5 px-6 sm:px-8 font-sans transition-colors duration-500 overflow-hidden">
      {/* Subtle Ambient Radial Glow */}
      <div className="absolute pointer-events-none -top-1/2 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-brand-500/5 dark:bg-brand-500/10 blur-[80px] rounded-full"></div>

      <div className="relative z-10 max-w-7xl mx-auto flex flex-col gap-4">
        {/* Top Row: Logo + Links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo Section */}
          <NavLink to="/" className="flex items-center gap-2 hover:scale-102 transition-transform duration-300">
            <Logo className="w-7 h-7 sm:w-8 sm:h-8" textClassName="text-xl" />
          </NavLink>

          {/* Navigation Links */}
          <div className="flex items-center gap-6 sm:gap-8 flex-wrap justify-center">
            <NavLink 
              to="/features" 
              className={({ isActive }) => `text-sm font-semibold transition-all duration-300 hover:scale-105 ${
                isActive 
                  ? 'text-brand-600 dark:text-brand-400 font-bold' 
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Features
            </NavLink>
            <NavLink 
              to="/about" 
              className={({ isActive }) => `text-sm font-semibold transition-all duration-300 hover:scale-105 ${
                isActive 
                  ? 'text-brand-600 dark:text-brand-400 font-bold' 
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              About us
            </NavLink>
            <NavLink 
              to="/contact" 
              className={({ isActive }) => `text-sm font-semibold transition-all duration-300 hover:scale-105 ${
                isActive 
                  ? 'text-brand-600 dark:text-brand-400 font-bold' 
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Contact us
            </NavLink>
          </div>
        </div>

        {/* Premium Gradient Divider */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-neutral-200 dark:via-neutral-800/80 to-transparent"></div>

        {/* Bottom Row: Copyright + Legal Links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
          <p>© {new Date().getFullYear()} RankPilot. All rights reserved.</p>

          <div className="flex items-center gap-6">
            <NavLink 
              to="/privacy" 
              className={({ isActive }) => `hover:text-neutral-900 dark:hover:text-white transition-colors duration-200 ${
                isActive ? 'text-brand-600 dark:text-brand-400 font-bold' : ''
              }`}
            >
              Privacy policy
            </NavLink>
            <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-800 hidden xs:inline"></span>
            <NavLink 
              to="/terms" 
              className={({ isActive }) => `hover:text-neutral-900 dark:hover:text-white transition-colors duration-200 ${
                isActive ? 'text-brand-600 dark:text-brand-400 font-bold' : ''
              }`}
            >
              Terms of service
            </NavLink>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
