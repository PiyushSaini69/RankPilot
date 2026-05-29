import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import Navbar from '../../components/ui/Navbar';
import Footer from '../../components/ui/Footer';

const TermsPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const sections = [
    { id: "terms", label: "1. Authorized API Integration" },
    { id: "license", label: "2. Query Delegation & License" },
    { id: "disclaimer", label: "3. AI Insights Disclaimer" },
    { id: "limitations", label: "4. Third-Party Platform Rules" }
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
            Terms of Service
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
            <h2 id="terms">1. Authorized API Integration</h2>
            <p>By connecting a Google Search Console, Google Analytics 4, or Meta Ads property to RankPilot, you warrant that you are the lawful owner of the connected accounts or possess direct, explicit authorization to query and view their performance datasets.</p>
            
            <h2 id="license">2. Query Delegation & License</h2>
            <p>By registering on RankPilot and completing the OAuth workflow, you grant RankPilot the secure, read-only privilege to query third-party platform endpoints on your behalf. This authorization is strictly limited to extracting traffic figures, ranking histories, and digital ad costs to render your dashboard metrics and supply context to your private AI Analyst sessions.</p>

            <h2 id="disclaimer">3. AI Insights Disclaimer</h2>
            <p>RankPilot's AI Analyst Co-Pilot provides diagnostic analyses and recommendations based on available Search Console and Analytics data. These insights are mathematical suggestions. RankPilot does not warrant conversion increases, search rank spikes, or ad cost-efficiency levels. You are solely responsible for all ad budgets and technical site implementations.</p>

            <h2 id="limitations">4. Third-Party Platform Rules</h2>
            <p>Your usage of RankPilot requires strict compliance with Google's API Services User Data Policy, Meta's Developer Policies, and the respective terms of service of each connected platform. Violation of third-party rules will result in immediate termination of your RankPilot authentication credentials.</p>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TermsPage;


