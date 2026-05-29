import React from 'react';
import { NavLink } from 'react-router-dom';
import Logo from './Logo';

const Footer = () => {
  return (
    <footer className="w-full bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-200 border-t border-neutral-200 dark:border-white/5 py-8 px-6 sm:px-8 font-sans transition-colors duration-500">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        
        {/* Top Row: Logo + Top Links */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-4">
          {/* Logo Section */}
          <NavLink to="/" className="flex items-center gap-2.5">
            <Logo className="w-7 h-7 sm:w-8 sm:h-8" />
          </NavLink>

          {/* Navigation Links */}
          <div className="flex items-center gap-6 md:gap-8 flex-wrap">
            <NavLink 
              to="/features" 
              className={({ isActive }) => `text-sm font-semibold transition-colors duration-200 ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'}`}
            >
              Features
            </NavLink>
            <NavLink 
              to="/about" 
              className={({ isActive }) => `text-sm font-semibold transition-colors duration-200 ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'}`}
            >
              About us
            </NavLink>
            <NavLink 
              to="/contact" 
              className={({ isActive }) => `text-sm font-semibold transition-colors duration-200 ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'}`}
            >
              Contact us
            </NavLink>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-neutral-200 dark:border-neutral-800/80 my-2" />

        {/* Bottom Row: Copyright + Legal Links */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-neutral-500 dark:text-neutral-400">
          <p>© 2026 RankPilot. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <NavLink 
              to="/privacy" 
              className={({ isActive }) => `hover:text-neutral-900 dark:hover:text-white transition-colors ${isActive ? 'text-brand-600 dark:text-brand-400 font-semibold' : ''}`}
            >
              Privacy policy
            </NavLink>
            <NavLink 
              to="/terms" 
              className={({ isActive }) => `hover:text-neutral-900 dark:hover:text-white transition-colors ${isActive ? 'text-brand-600 dark:text-brand-400 font-semibold' : ''}`}
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



