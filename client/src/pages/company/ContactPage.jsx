import React, { useState, useEffect } from 'react';
import {
    EnvelopeIcon,
    ChatBubbleLeftRightIcon,
    MapPinIcon,
    CheckCircleIcon,
    ArrowRightIcon,
    SparklesIcon,
    ClockIcon,
    ShieldCheckIcon,
    GlobeAltIcon,
    CpuChipIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Navbar from '../../components/ui/Navbar';
import Footer from '../../components/ui/Footer';
import { sendSupportMessage } from '../../api/supportApi';

const ContactPage = () => {
    const [formSubmitted, setFormSubmitted] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [formData, setFormData] = useState({ 
        firstName: '', 
        lastName: '', 
        email: '', 
        message: '',
        category: 'General Inquiry',
        priority: 'Standard'
    });

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const categories = [
        { name: 'General Inquiry', icon: ChatBubbleLeftRightIcon },
        { name: 'Technical Support', icon: CpuChipIcon },
        { name: 'Sales & Enterprise', icon: GlobeAltIcon },
        { name: 'Partnerships', icon: SparklesIcon }
    ];

    const priorities = [
        { name: 'Standard', desc: 'Reply within 24h', label: 'Standard' },
        { name: 'Express', desc: 'Reply within 4h', label: 'Express' },
        { name: 'Urgent', desc: 'Immediate notification', label: 'Urgent' }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.firstName || !formData.email || !formData.message) {
            toast.error("Please fill in all required fields.");
            return;
        }

        setIsSending(true);
        try {
            await sendSupportMessage(formData);
            setFormSubmitted(true);
            setFormData({ 
                firstName: '', 
                lastName: '', 
                email: '', 
                message: '',
                category: 'General Inquiry',
                priority: 'Standard'
            });
        } catch (err) {
            console.error("Support message error:", err);
            toast.error(err.response?.data?.error || "Failed to deliver message. Please try again.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-slate-950 font-sans selection:bg-brand-500/30 transition-colors duration-500">
            <Navbar />

            {/* Premium Direct Page Header */}
            <header className="pt-8 pb-12 bg-white dark:bg-slate-900 border-b border-neutral-200 dark:border-white/5 overflow-hidden relative">
                <div className="absolute inset-0 pointer-events-none opacity-50">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-brand-600/10 rounded-full blur-[100px]"/>
                </div>
                <div className="max-w-6xl mx-auto px-4 relative z-10 text-center">
                    <h1 className="text-4xl md:text-6xl font-black text-neutral-900 dark:text-white tracking-tight mb-6">
                        Get in touch
                    </h1>
                    <p className="text-lg md:text-xl text-neutral-500 dark:text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
                        Have questions about our AI analyst, data encryption layers, or custom integrations? Our team of growth specialists is here to help.
                    </p>
                </div>
            </header>

            {/* Direct Page Content Wrapper */}
            <main className="py-8 md:py-16">
                <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-16">
                    
                    {/* Main Two-Column Structure */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 sm:gap-16 items-start">
                        
                        {/* Contact Form Section */}
                        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-white/5 rounded-[2.5rem] p-8 sm:p-10 hover:border-brand-500/20 transition-colors shadow-2xl relative overflow-hidden">
                            {/* Gradient corner glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
                            
                            <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white mb-8 tracking-tight flex items-center gap-2.5">
                                Send us a message <SparklesIcon className="w-6 h-6 text-brand-600 dark:text-brand-400 animate-pulse" />
                            </h2>

                            {formSubmitted ? (
                                <div className="py-16 text-center space-y-5 animate-in fade-in zoom-in-95 duration-300">
                                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                                        <CheckCircleIcon className="w-10 h-10 text-emerald-500" />
                                    </div>
                                    <h3 className="text-2xl font-black text-neutral-900 dark:text-white">Message Sent!</h3>
                                    <p className="text-sm text-neutral-500 dark:text-slate-400 font-semibold max-w-sm mx-auto leading-relaxed">
                                        Thank you for contacting RankPilot. One of our data specialists will review your inquiry and reach out within 4 hours.
                                    </p>
                                    <button 
                                        onClick={() => setFormSubmitted(false)}
                                        className="mt-4 px-6 py-2.5 rounded-xl border border-neutral-200 dark:border-white/5 hover:bg-neutral-50 dark:hover:bg-white/5 text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 transition-all"
                                    >
                                        Submit another inquiry
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-8">
                                    
                                    {/* 1. Category Selection Pills */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-slate-400">1. Reason for Contact</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {categories.map((cat, idx) => {
                                                const isSelected = formData.category === cat.name;
                                                return (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        disabled={isSending}
                                                        onClick={() => setFormData({ ...formData, category: cat.name })}
                                                        className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
                                                            isSelected 
                                                                ? 'bg-brand-500/10 border-brand-500 text-brand-600 dark:text-brand-400 shadow-md shadow-brand-500/5 ring-1 ring-brand-500' 
                                                                : 'bg-neutral-50 dark:bg-slate-950 border-neutral-200 dark:border-white/5 text-neutral-600 dark:text-slate-400 hover:border-neutral-300 dark:hover:border-white/10'
                                                        }`}
                                                    >
                                                        <cat.icon className={`w-5 h-5 ${isSelected ? 'text-brand-600 dark:text-brand-400' : 'text-neutral-400'}`} />
                                                        <span className="text-xs sm:text-sm font-black">{cat.name}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 2. Grid Inputs for Name */}
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-slate-400">First Name</label>
                                                <input 
                                                    type="text" 
                                                    required
                                                    disabled={isSending}
                                                    placeholder="John" 
                                                    value={formData.firstName}
                                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                                    className="w-full bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-white/5 rounded-2xl px-4 py-3.5 focus:ring-2 focus:ring-brand-500/50 outline-none transition-all text-sm font-semibold dark:text-white disabled:opacity-50" 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-slate-400">Last Name</label>
                                                <input 
                                                    type="text" 
                                                    disabled={isSending}
                                                    placeholder="Doe" 
                                                    value={formData.lastName}
                                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                                    className="w-full bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-white/5 rounded-2xl px-4 py-3.5 focus:ring-2 focus:ring-brand-500/50 outline-none transition-all text-sm font-semibold dark:text-white disabled:opacity-50" 
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-slate-400">Work Email</label>
                                            <input 
                                                type="email" 
                                                required
                                                disabled={isSending}
                                                placeholder="john@company.com" 
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-white/5 rounded-2xl px-4 py-3.5 focus:ring-2 focus:ring-brand-500/50 outline-none transition-all text-sm font-semibold dark:text-white disabled:opacity-50" 
                                            />
                                        </div>
                                    </div>

                                    {/* 3. Priority Selection */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-slate-400">2. Select Urgency Level</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {priorities.map((prio, idx) => {
                                                const isSelected = formData.priority === prio.name;
                                                let activeStyle = '';
                                                if (isSelected) {
                                                    if (prio.name === 'Urgent') activeStyle = 'bg-red-500/10 border-red-500 text-red-600 dark:text-red-400 shadow-md shadow-red-500/5 ring-1 ring-red-500';
                                                    else if (prio.name === 'Express') activeStyle = 'bg-brand-500/10 border-brand-500 text-brand-600 dark:text-brand-400 shadow-md shadow-brand-500/5 ring-1 ring-brand-500';
                                                    else activeStyle = 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-md shadow-indigo-500/5 ring-1 ring-indigo-500';
                                                } else {
                                                    activeStyle = 'bg-neutral-50 dark:bg-slate-950 border-neutral-200 dark:border-white/5 text-neutral-600 dark:text-slate-400 hover:border-neutral-300 dark:hover:border-white/10';
                                                }
                                                return (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        disabled={isSending}
                                                        onClick={() => setFormData({ ...formData, priority: prio.name })}
                                                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${activeStyle}`}
                                                    >
                                                        <span className="text-xs font-black">{prio.label}</span>
                                                        <span className="text-[11px] font-bold text-neutral-400 mt-1">{prio.desc}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 4. Message Area */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-slate-400">3. Your Message</label>
                                        <textarea 
                                            rows="4" 
                                            required
                                            disabled={isSending}
                                            placeholder="How can we help your team unify and analyze your marketing insights?" 
                                            value={formData.message}
                                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                            className="w-full bg-neutral-50 dark:bg-slate-950 border border-neutral-200 dark:border-white/5 rounded-2xl px-4 py-3.5 focus:ring-2 focus:ring-brand-500/50 outline-none transition-all text-sm font-semibold dark:text-white resize-none disabled:opacity-50" 
                                        ></textarea>
                                    </div>

                                    {/* Submit Button */}
                                    <button 
                                        type="submit" 
                                        disabled={isSending}
                                        className="w-full bg-brand-600 hover:bg-brand-500 disabled:bg-neutral-200 dark:disabled:bg-white/10 disabled:text-neutral-500 dark:disabled:text-neutral-400 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-brand-500/20 hover:-translate-y-0.5 active:scale-95 text-sm flex items-center justify-center gap-2"
                                    >
                                        {isSending ? (
                                            <>
                                                Sending Message...
                                                <svg className="animate-spin h-5 w-5 text-neutral-500 dark:text-neutral-400" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                            </>
                                        ) : (
                                            <>
                                                Send Message
                                                <ArrowRightIcon className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>

                        {/* Information Grid Section */}
                        <div className="lg:col-span-5 space-y-6">
                            
                            <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
                                Contact Information <MapPinIcon className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                            </h2>

                            {/* Traditional Location Items */}
                            <div className="space-y-4">
                                {[
                                    {
                                        icon: MapPinIcon,
                                        title: "Head Quarters (India)",
                                        lines: ["48, Moti Dungri, Alwar, Rajasthan 301001"],
                                        badge: "📍 HQ"
                                    },
                                    {
                                        icon: EnvelopeIcon,
                                        title: "Email Support",
                                        lines: ["support@sltechsoft.com"],
                                        badge: "⚡ FAST REPLY"
                                    }
                                ].map((office, idx) => (
                                    <div key={idx} className="flex gap-4 p-5 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-white/5 rounded-[1.8rem] hover:border-brand-500/20 transition-colors shadow-lg">
                                        <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0 border border-brand-500/10">
                                            <office.icon className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2.5">
                                                <h3 className="text-base font-black text-neutral-900 dark:text-white">{office.title}</h3>
                                                <span className="text-[8px] font-black uppercase tracking-wider text-neutral-400 bg-neutral-100 dark:bg-white/5 px-2 py-0.5 rounded-full font-mono">{office.badge}</span>
                                            </div>
                                            {office.lines.map((ln, i) => (
                                                <p key={i} className="text-xs sm:text-sm text-neutral-500 dark:text-slate-400 font-semibold leading-relaxed">{ln}</p>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                        </div>

                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
};

export default ContactPage;
