import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import Navbar from '../../components/ui/Navbar';
import Footer from '../../components/ui/Footer';

const PrivacyPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const sections = [
    { id: "intro", label: "1. Introduction" },
    { id: "oauth", label: "2. Google & Meta OAuth API Access" },
    { id: "ai-data", label: "3. AI Chat Insights & Processing" },
    { id: "retention", label: "4. Data Retention & Encryption" }
  ];

  const handleScroll = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -120;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-950 font-sans selection:bg-brand-500/30 transition-colors duration-500 relative">
      <Navbar />

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[5%] right-[-10%] w-[500px] h-[350px] bg-brand-500/5 rounded-full blur-[100px]" />
      </div>

      <header className="relative pt-10 pb-12 overflow-hidden bg-white dark:bg-slate-950 border-b border-neutral-250/60 dark:border-white/5 z-10">
        {/* Glowing visual assets */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-12 -left-12 w-96 h-96 bg-brand-500/10 dark:bg-brand-500/5 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute top-1/2 right-0 -translate-y-1/2 w-96 h-64 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[80px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.01)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.005)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.005)_1px,transparent_1px)] bg-[size:48px_48px]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 sm:px-8 relative z-10">
          <NavLink 
            to="/" 
            className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/5 dark:bg-white/5 border border-brand-500/10 hover:border-brand-500/30 text-[10px] font-black text-brand-700 dark:text-brand-400 hover:text-brand-600 uppercase tracking-widest mb-6 transition-all active:scale-95"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform duration-200">←</span> Back to Home
          </NavLink>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-neutral-900 dark:text-white tracking-tighter leading-none">
            Privacy Policy
          </h1>
        </div>
      </header>

      <main className="py-12 sm:py-16 max-w-7xl mx-auto px-6 sm:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          <aside className="lg:col-span-4 sticky top-28 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-white/5 rounded-[2rem] p-6 shadow-md hidden lg:block">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500 mb-6 font-mono">
              Document Outline
            </h3>
            <nav className="space-y-1 font-semibold text-sm text-neutral-500 dark:text-slate-400">
              {sections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => handleScroll(sec.id)}
                  className="w-full text-left py-2.5 px-3.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-brand-600 dark:hover:text-white transition-all cursor-pointer font-bold block"
                >
                  {sec.label}
                </button>
              ))}
            </nav>
          </aside>

          <article className="lg:col-span-8 w-full bg-white dark:bg-slate-900 border border-neutral-200 dark:border-white/5 rounded-[2.5rem] p-8 sm:p-12 shadow-xl prose prose-neutral dark:prose-invert max-w-none prose-headings:font-black prose-headings:tracking-tight prose-headings:text-neutral-900 dark:prose-headings:text-white prose-p:leading-relaxed prose-p:text-neutral-600 dark:prose-p:text-slate-400 prose-p:font-semibold prose-p:text-sm sm:prose-p:text-base prose-li:text-neutral-600 dark:prose-li:text-slate-400 prose-li:font-semibold prose-li:text-sm sm:prose-li:text-base">
            <h2 id="intro">1. Introduction</h2>
            <p>Welcome to RankPilot. We respect the absolute confidentiality of your marketing data. This privacy policy details how RankPilot accesses, queries, and secures your Google Search Console, Google Analytics 4, and Meta Ad accounts when you connect them to our AI-powered dashboard.</p>
            
            <h2 id="oauth">2. Google & Meta OAuth API Access</h2>
            <p>RankPilot connects to your advertising and search properties using official OAuth 2.0 secure protocols. We only request narrow read-only permissions needed to compile your dashboard metrics:</p>
            <ul>
              <li><strong>Google Search Console (GSC) API:</strong> Accessed strictly to retrieve keyword click, impression, CTR, and site-indexing performance metrics.</li>
              <li><strong>Google Analytics 4 (GA4) API:</strong> Queried to pull conversion rates, traffic channels, session statistics, and real-time demographic summaries.</li>
              <li><strong>Google & Facebook Ads APIs:</strong> Accessed to aggregate cost-per-click (CPC), return-on-ad-spend (ROAS), and campaign impressions.</li>
            </ul>
            <p><strong>Crucial Security Standard:</strong> RankPilot queries these APIs on-demand. We do not copy, store, or sell your campaign performance data. All traffic metrics are pulled live and processed in active browser memory.</p>

            <h2 id="ai-data">3. AI Chat Insights & Processing</h2>
            <p>When you ask our AI Co-Pilot questions in the plain-English chat bar, we parse your query and feed only the relevant, aggregated traffic metrics (e.g. "top GSC impressions") to secure large language models (LLMs) via enterprise-level APIs:</p>
            <ul>
              <li>No raw credentials or access tokens are ever sent to AI model providers.</li>
              <li>Queries are processed under strict Zero Data Retention policies — your analytical datasets are never used to train future public LLMs.</li>
            </ul>

            <h2 id="retention">4. Data Retention & Encryption</h2>
            <p>Your OAuth refresh tokens are encrypted at rest using AES-256 standard protocols. We only hold active authentication tokens required to securely fetch live dashboards on your command. You can disconnect your accounts and instantly revoke all access tokens at any time via your RankPilot settings dashboard.</p>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPage;



