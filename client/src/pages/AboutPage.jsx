import React from 'react';
import { 
    ShieldCheckIcon, 
    GlobeAltIcon,
    BeakerIcon
} from '@heroicons/react/24/outline';
import Navbar from '../components/ui/Navbar';
import Footer from '../components/ui/Footer';

const AboutPage = () => {
    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-slate-950 font-sans selection:bg-brand-500/30 transition-colors duration-500 overflow-x-hidden relative">
            <Navbar />

            {/* Glowing background meshes */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[5%] left-[10%] w-[500px] h-[500px] bg-brand-500/10 dark:bg-brand-500/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute top-[35%] right-[5%] w-[400px] h-[400px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute bottom-[20%] left-[-5%] w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[130px] animate-pulse" style={{ animationDelay: '4s' }} />
            </div>

            {/* 1. HERO SECTION */}
            <section className="relative pt-24 pb-16 flex items-center justify-center overflow-hidden px-6">
                <div className="relative z-10 max-w-4xl mx-auto text-center">
                    {/* Headline */}
                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-neutral-900 dark:text-white tracking-tighter leading-none mb-6">
                        Making complex data <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-blue-500 to-indigo-600 dark:from-brand-400 dark:via-blue-400 dark:to-indigo-400">
                            beautifully simple.
                        </span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-lg md:text-xl text-neutral-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-semibold">
                        RankPilot by SLTechSoft was built on a simple belief: you shouldn't need a degree in data science to understand your marketing performance. We build AI-first intelligence that unifies your stack and answers your queries instantly.
                    </p>
                </div>
            </section>

            {/* 2. CORE VALUES */}
            <section className="py-20 relative z-10">
                <div className="max-w-7xl mx-auto px-6 sm:px-8">
                    {/* Section header */}
                    <div className="text-center mb-16">
                        <p className="text-brand-600 dark:text-brand-400 font-black text-[12px] tracking-[0.3em] uppercase mb-4">Values We Live By</p>
                        <h2 className="text-3xl md:text-4xl font-black text-neutral-900 dark:text-white tracking-tight">
                            Driven by design and precision.
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12">
                        {[
                            {
                                icon: BeakerIcon,
                                color: 'text-blue-600 dark:text-blue-400',
                                bg: 'bg-blue-500/10 dark:bg-blue-500/15 border-blue-500/20',
                                title: 'Intelligence First',
                                desc: "We don't just export analytics tables. Our artificial intelligence correlates GSC ranks, GA4 traffic, and paid ads cost to suggest real business strategies in plain English.",
                                badge: '🧠 Context Aware'
                            },
                            {
                                icon: ShieldCheckIcon,
                                color: 'text-emerald-600 dark:text-emerald-400',
                                bg: 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/20',
                                title: 'Enterprise Privacy',
                                desc: "Your data is your ultimate competitive edge. RankPilot operates under military-grade AES-256 encryption parameters, and we query Google and Meta APIs on demand.",
                                badge: '🔐 Fully Encrypted'
                            },
                            {
                                icon: GlobeAltIcon,
                                color: 'text-indigo-600 dark:text-indigo-400',
                                bg: 'bg-indigo-500/10 dark:bg-indigo-500/15 border-indigo-500/20',
                                title: 'Unified Data Model',
                                desc: "Data silos breed inefficiency. We map diverse metrics into a single queryable vector database, allowing cross-source analytics that was previously impossible.",
                                badge: '🔗 Seamless Blending'
                            },
                        ].map((v, i) => (
                            <div key={i}
                                className="group bg-white dark:bg-slate-900 border border-neutral-200 dark:border-white/5 rounded-3xl p-8 hover:border-brand-500/30 dark:hover:border-white/10 hover:-translate-y-1 transition-all duration-300 hover:shadow-2xl">
                                {/* Icon */}
                                <div className={`w-12 h-12 rounded-2xl ${v.bg} border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                    <v.icon className={`w-6 h-6 ${v.color}`} strokeWidth={2}/>
                                </div>
                                {/* Badge */}
                                <div className="mb-4">
                                    <span className="text-[11px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-mono">{v.badge}</span>
                                </div>
                                <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-3 tracking-tight">{v.title}</h3>
                                <p className="text-sm text-neutral-500 dark:text-slate-400 leading-relaxed font-semibold">{v.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default AboutPage;
