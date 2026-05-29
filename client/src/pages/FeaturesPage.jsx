import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ChartBarIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  ArrowRightIcon,
  XMarkIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  GlobeAltIcon,
  CircleStackIcon
} from '@heroicons/react/24/outline';
import Navbar from '../components/ui/Navbar';
import Footer from '../components/ui/Footer';

const FeaturesPage = () => {
  const [activeModal, setActiveModal] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const features = [
    {
      id: "ga4",
      title: "Google Analytics 4",
      tagline: "Live Traffic & Conversion Insights",
      desc: "Connect your GA4 properties to instantly analyze traffic acquisition, customer conversion funnels, and real-time user demographics without standard dashboard clutter.",
      icon: ChartBarIcon,
      color: "blue",
      accentBg: "bg-blue-500/10 dark:bg-blue-500/15",
      accentText: "text-blue-600 dark:text-blue-400",
      accentBorder: "group-hover:border-blue-500/30",
      mockup: (
        <div className="mt-6 p-4 rounded-2xl bg-neutral-50 dark:bg-slate-900 border border-neutral-200 dark:border-white/5 font-mono text-[10px]">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-neutral-800 dark:text-neutral-200">Traffic Sessions</span>
            <span className="text-emerald-500 font-bold flex items-center gap-0.5">
              <ArrowTrendingUpIcon className="w-3 h-3" /> +18.4%
            </span>
          </div>
          <div className="flex items-end gap-1.5 h-16 pt-2">
            {[40, 65, 50, 85, 95, 70, 110, 80, 125, 90, 115, 140].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-blue-600 to-indigo-400 rounded-t-sm transition-all duration-500 hover:opacity-80"
                style={{ height: `${(h / 140) * 100}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[8px] text-neutral-400 mt-2 font-sans font-bold">
            <span>May 20</span>
            <span>May 29 (Today)</span>
          </div>
        </div>
      ),
      details: {
        headline: "Unleash standard-setting traffic metrics",
        bullets: [
          "Auto-calculate active engagement rates and session duration metrics.",
          "Track organic vs paid user acquisition funnels side-by-side.",
          "Identify and highlight top-performing landing pages automatically.",
          "Advanced custom event and conversion goal tracking."
        ],
        metricTitle: "Avg. Session Duration",
        metricVal: "3m 42s",
        metricChange: "+24.8%"
      }
    },
    {
      id: "gsc",
      title: "Search Console",
      tagline: "Keyword Rankings & Organic Growth",
      desc: "Monitor your exact search footprint. Track average ranking positions, identify winning queries, map site impressions, and identify indexing updates before they hurt rankings.",
      icon: MagnifyingGlassIcon,
      color: "emerald",
      accentBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
      accentText: "text-emerald-600 dark:text-emerald-400",
      accentBorder: "group-hover:border-emerald-500/30",
      mockup: (
        <div className="mt-6 p-4 rounded-2xl bg-neutral-50 dark:bg-slate-900 border border-neutral-200 dark:border-white/5 text-[10px]">
          <div className="flex items-center justify-between mb-3 font-mono">
            <span className="font-bold text-neutral-800 dark:text-neutral-200">Top Keywords</span>
            <span className="text-neutral-400 font-medium">Rank</span>
          </div>
          <div className="space-y-2">
            {[
              { query: "ai analytics platform", rank: "1.2", change: "▲ 0.4" },
              { query: "marketing insights api", rank: "3.4", change: "▲ 1.1" },
              { query: "seo reporting tool for agencies", rank: "2.1", change: "▲ 0.8" }
            ].map((kw, i) => (
              <div key={i} className="flex justify-between items-center bg-white dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-neutral-200/50 dark:border-white/5 font-sans">
                <span className="font-bold text-neutral-700 dark:text-slate-300 truncate max-w-[120px]">{kw.query}</span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-emerald-500">{kw.rank}</span>
                  <span className="text-[8px] text-emerald-600 font-bold">{kw.change}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
      details: {
        headline: "State of the art organic visibility tracking",
        bullets: [
          "Unified key search terms tracking and rank drift notifications.",
          "Identify low-hanging keywords ranking on pages 2-3 of Google.",
          "Deep index coverage tracking to spot crawl issues immediately.",
          "Full mobile usability and Core Web Vitals correlation engine."
        ],
        metricTitle: "Organic Impressions",
        metricVal: "842.1K",
        metricChange: "+41.3%"
      }
    },
    {
      id: "ads",
      title: "Ad Intelligence",
      tagline: "Google & Meta Paid Campaigns Unification",
      desc: "Merge paid ad performance across platforms. Visualize spend distributions, track aggregate Click-Through Rates, and map global Return On Ad Spend in a single pane.",
      icon: CurrencyDollarIcon,
      color: "indigo",
      accentBg: "bg-indigo-500/10 dark:bg-indigo-500/15",
      accentText: "text-indigo-600 dark:text-indigo-400",
      accentBorder: "group-hover:border-indigo-500/30",
      mockup: (
        <div className="mt-6 p-4 rounded-2xl bg-neutral-50 dark:bg-slate-900 border border-neutral-200 dark:border-white/5 text-[10px]">
          <div className="flex items-center justify-between mb-3 font-mono">
            <span className="font-bold text-neutral-800 dark:text-neutral-200">CPC Spend Split</span>
            <span className="text-indigo-400 font-bold">ROAS 3.8x</span>
          </div>
          <div className="space-y-2 font-sans font-bold">
            <div className="space-y-1">
              <div className="flex justify-between text-neutral-600 dark:text-slate-300">
                <span>Google Ads</span>
                <span>$4,250.00</span>
              </div>
              <div className="w-full bg-neutral-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full" style={{ width: "65%" }} />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-neutral-600 dark:text-slate-300">
                <span>Facebook Ads</span>
                <span>$2,100.00</span>
              </div>
              <div className="w-full bg-neutral-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                <div className="bg-pink-500 h-full rounded-full" style={{ width: "35%" }} />
              </div>
            </div>
          </div>
        </div>
      ),
      details: {
        headline: "Take control of your multi-channel digital spend",
        bullets: [
          "Instant blending of click, cost, and conversion KPIs.",
          "Compare custom conversion attribution models dynamically.",
          "Detect high CPC trends early and suggest bid modifications.",
          "Weekly automated digest detailing cost per acquisition adjustments."
        ],
        metricTitle: "Total Paid ROAS",
        metricVal: "4.12x",
        metricChange: "+15.2%"
      }
    },
    {
      id: "ai",
      title: "AI Analyst",
      tagline: "Natural Language Data Insights",
      desc: "Stop wrestling with nested spreadsheets and formulas. Ask RankPilot's intelligence module questions in plain English and receive fully compiled summaries instantly.",
      icon: SparklesIcon,
      color: "brand",
      accentBg: "bg-brand-500/10 dark:bg-brand-500/15",
      accentText: "text-brand-600 dark:text-brand-400",
      accentBorder: "group-hover:border-brand-500/30",
      mockup: (
        <div className="mt-6 p-4 rounded-2xl bg-neutral-50 dark:bg-slate-900 border border-neutral-200 dark:border-white/5 text-[9px] font-sans">
          <div className="flex gap-2 items-start mb-3">
            <span className="px-2 py-0.5 rounded-md bg-neutral-200 dark:bg-white/10 text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider text-[7px] mt-0.5">User</span>
            <p className="text-neutral-700 dark:text-slate-300 font-medium">Why did organic traffic surge on May 24?</p>
          </div>
          <div className="flex gap-2 items-start bg-brand-500/5 dark:bg-brand-500/10 p-2.5 rounded-xl border border-brand-500/10">
            <SparklesIcon className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-brand-600 dark:text-brand-400">RankPilot AI</span>
              <p className="text-neutral-600 dark:text-slate-400 leading-relaxed font-semibold">Your post <strong className="text-neutral-800 dark:text-white">"AI marketing"</strong> ranked #1 on Google for keyword <strong className="text-neutral-800 dark:text-white">"analytics platform"</strong>, driving +450 impressions.</p>
            </div>
          </div>
        </div>
      ),
      details: {
        headline: "An analyst in your chat bar, 24/7",
        bullets: [
          "Connects the dots between GSC search trends and GA4 page traffic.",
          "Synthesizes cross-platform traffic details into actionable plain-text steps.",
          "Translates technical SEO anomalies into straightforward business opportunities.",
          "Maintains custom security parameters, keeping your datasets fully encrypted."
        ],
        metricTitle: "AI Queries Answered",
        metricVal: "2,481",
        metricChange: "100% Accuracy"
      }
    }
  ];

  const activeFeature = features.find(f => f.id === activeModal);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-950 font-sans selection:bg-brand-500/30 transition-colors duration-500 overflow-x-hidden relative">
      <Navbar />

      {/* Decorative gradient meshes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand-600/10 dark:bg-brand-500/5 blur-[120px]" />
        <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/10 dark:bg-blue-500/5 blur-[150px]" />
        <div className="absolute bottom-[20%] left-[20%] w-[400px] h-[400px] rounded-full bg-indigo-500/10 dark:bg-indigo-500/5 blur-[100px]" />
      </div>

      <header className="pt-24 pb-20 relative z-10 text-center px-6">
        <div className="max-w-4xl mx-auto">

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-neutral-900 dark:text-white tracking-tighter leading-none mb-6">
            Powering your entire <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-blue-500 to-indigo-500 dark:from-brand-400 dark:via-blue-400 dark:to-indigo-400">
              marketing dashboard.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-neutral-500 dark:text-slate-400 font-semibold max-w-2xl mx-auto leading-relaxed">
            Stop switching tools. RankPilot unifies your analytics, search positioning, paid marketing channels, and AI intelligence into one ultra-premium dashboard.
          </p>
        </div>
      </header>

      {/* Main Grid Section */}
      <main className="pb-28 px-6 sm:px-8 relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
          {features.map((feature) => (
            <div
              key={feature.id}
              onClick={() => setActiveModal(feature.id)}
              className="group p-8 sm:p-10 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-neutral-200 dark:border-white/5 hover:border-brand-500/30 dark:hover:border-white/10 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between cursor-pointer relative overflow-hidden active:scale-[0.99]"
            >
              {/* Decorative faint glow */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-500/5 rounded-full blur-2xl group-hover:bg-brand-500/10 transition-colors" />

              <div>
                <div className="flex items-center justify-between">
                  <div className={`w-14 h-14 rounded-2xl ${feature.accentBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className={`w-7 h-7 ${feature.accentText}`} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-mono">
                    Click to Open Demo
                  </span>
                </div>

                <div className="mt-8 space-y-3">
                  <span className={`text-[11px] font-black uppercase tracking-widest ${feature.accentText}`}>
                    {feature.tagline}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">{feature.title}</h3>
                  <p className="text-sm text-neutral-500 dark:text-slate-400 font-semibold leading-relaxed">{feature.desc}</p>
                </div>
              </div>

              {feature.mockup}

              <div className="mt-8 flex items-center gap-2 font-black text-sm text-brand-600 dark:text-brand-400 group-hover:gap-4 transition-all">
                Explore Dashboard Insights <ArrowRightIcon className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </main>


      {/* Interactive Feature Modal */}
      {activeModal && activeFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Overlay backdrop */}
          <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setActiveModal(null)} />

          {/* Modal Container */}
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-neutral-200 dark:border-white/10 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl overflow-y-auto max-h-[90vh] z-10 animate-in fade-in zoom-in-95 duration-300">
            {/* Close button */}
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-6 right-6 p-2 rounded-xl bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white transition-all active:scale-95"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>

            {/* Header info */}
            <div className="flex gap-4 items-center">
              <div className={`w-14 h-14 rounded-2xl ${activeFeature.accentBg} flex items-center justify-center shrink-0`}>
                <activeFeature.icon className={`w-7 h-7 ${activeFeature.accentText}`} />
              </div>
              <div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${activeFeature.accentText}`}>
                  Live Integration Demo
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">{activeFeature.title}</h2>
              </div>
            </div>

            {/* Visual highlight metrics */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="p-4 bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-white/5 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Live Indicator KPI</span>
                <p className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white mt-1">{activeFeature.details.metricVal}</p>
              </div>
              <div className="p-4 bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-white/5 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{activeFeature.details.metricTitle}</span>
                <p className="text-xl sm:text-2xl font-black text-emerald-500 mt-1">{activeFeature.details.metricChange}</p>
              </div>
            </div>

            {/* In-depth details */}
            <div className="mt-8 space-y-6">
              <h4 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white tracking-tight">{activeFeature.details.headline}</h4>
              <ul className="space-y-3.5">
                {activeFeature.details.bullets.map((bullet, i) => (
                  <li key={i} className="flex gap-3 items-start text-sm text-neutral-600 dark:text-slate-400 font-semibold leading-relaxed">
                    <CheckCircleIcon className={`w-5 h-5 shrink-0 ${activeFeature.accentText} mt-0.5`} />
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>

            {/* Modal Actions */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <NavLink to="/register" onClick={() => setActiveModal(null)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-brand-600 hover:bg-brand-500 text-white font-black rounded-xl transition-all shadow-xl shadow-brand-500/20 active:scale-95 text-sm">
                Connect Source Live
                <ArrowRightIcon className="w-4 h-4" />
              </NavLink>
              <button onClick={() => setActiveModal(null)}
                className="px-6 py-4 bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-700 dark:text-slate-300 font-black rounded-xl transition-all text-sm active:scale-95">
                Close Preview
              </button>
            </div>

          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default FeaturesPage;
