import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/ui/DashboardLayout';
import { useAuthStore } from '../store/authStore';
import { sendSupportMessage } from '../api/supportApi';
import toast from 'react-hot-toast';
import { 
    QuestionMarkCircleIcon, 
    BookOpenIcon, 
    ChatBubbleLeftEllipsisIcon, 
    EnvelopeIcon,
    ChevronDownIcon,
    MagnifyingGlassIcon,
    SparklesIcon,
    LifebuoyIcon,
    ShieldCheckIcon,
    ArrowTopRightOnSquareIcon,
    VideoCameraIcon,
    ChatBubbleBottomCenterTextIcon,
    TicketIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    ClockIcon,
    CheckIcon,
    ArrowRightIcon
} from '@heroicons/react/24/outline';

const SupportPage = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState('');
    const [activeFaq, setActiveFaq] = useState(null);
    const [activeCategory, setActiveCategory] = useState('all');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Parse the user's name to prefill the support message fields
    const [initialFirst, ...initialLast] = (user?.name || '').split(' ');
    
    const [formData, setFormData] = useState({
        firstName: initialFirst || '',
        lastName: initialLast.join(' ') || '',
        email: user?.email || '',
        subject: '',
        message: '',
        category: 'General Questions',
        priority: 'Standard (Normal)'
    });

    useEffect(() => {
        if (user) {
            const [first, ...last] = (user.name || '').split(' ');
            setFormData(prev => ({
                ...prev,
                firstName: prev.firstName || first || '',
                lastName: prev.lastName || last.join(' ') || '',
                email: prev.email || user.email || ''
            }));
        }
    }, [user]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const categories = [
        { 
            id: 'all', 
            label: 'All Topics', 
            icon: LifebuoyIcon, 
            desc: 'Browse all help guides',
            accent: 'brand',
            color: 'hover:border-brand-500/50 dark:hover:border-brand-400/50'
        },
        { 
            id: 'general', 
            label: 'General Info', 
            icon: QuestionMarkCircleIcon, 
            desc: 'Basic guides & platform tips',
            accent: 'emerald',
            color: 'hover:border-emerald-500/50 dark:hover:border-emerald-400/50'
        },
        { 
            id: 'account', 
            label: 'Accounts & OAuth', 
            icon: ShieldCheckIcon, 
            desc: 'GSC, GA4, & Ads connections',
            accent: 'amber',
            color: 'hover:border-amber-500/50 dark:hover:border-amber-400/50'
        },
        { 
            id: 'integrations', 
            label: 'Data Ingestion', 
            icon: SparklesIcon, 
            desc: 'Syncing schedules & failures',
            accent: 'purple',
            color: 'hover:border-purple-500/50 dark:hover:border-purple-400/50'
        }
    ];

    const faqs = [
        {
            category: 'account',
            question: "How do I link Google Analytics 4 (GA4) or Search Console (GSC) to a website?",
            answer: "First, connect your Google profile in Settings (or click '+ Add Website' in the sidebar's site switcher). Then, in Connect Accounts, select your linked Google account in Step 1. In Step 2, choose the specific GA4 Property and GSC Site that match your website. Click 'Save' at the bottom to register the connections and trigger our automated ingestion engine."
        },
        {
            category: 'general',
            question: "How do I query my marketing metrics using the AI Assistant?",
            answer: "Go to the AI Assistant tab in the sidebar. You can ask queries in natural English like 'Why did my organic clicks drop last week?' or 'List my high-performing landing pages'. Our AI directly read your connected GSC, GA4, or Google/Meta Ads tables to explain traffic changes or suggest SEO ideas instantly."
        },
        {
            category: 'integrations',
            question: "How often does RankPilot synchronize my analytics data?",
            answer: "RankPilot automatically runs sync jobs once every 24 hours in the background to fetch updated indexes from Google and Meta APIs. To quickly check if a platform is connected and successfully synced, look for the pulsing green data source indicator dots next to Google Search Console, GA4, or Google/Meta Ads in your sidebar menu."
        },
        {
            category: 'general',
            question: "Can I export my growth reports to share with clients?",
            answer: "Absolutely! Click the 'Export PDF' button at the top right of any dashboard page (such as the GSC or GA4 subpages). This instantly downloads a professionally formatted, print-ready PDF containing your current charts, graphs, and keyword performance tables, ready to share with stakeholders or clients."
        },
        {
            category: 'integrations',
            question: "What should I do if a sync cycle fails or gets stuck?",
            answer: "Connection issues are usually caused by expired Google or Meta OAuth security tokens. Go to Settings, locate the problematic profile, click 'Remove', and then reconnect it. If a sync is pending or paused due to platform rate limits, go to Connect Accounts and click the 'Resume Sync' button next to the affected data source."
        },
        {
            category: 'account',
            question: "Is my business and campaign data kept secure?",
            answer: "Yes, data privacy is our top priority. RankPilot uses direct, read-only OAuth connections with Google Cloud and Meta Developer platforms. All gathered metrics are encrypted at rest and in transit. We strictly read only what is needed to power your analytics dashboards."
        }
    ];

    const filteredFaqs = faqs.filter(faq => {
        const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    const handleSubmitRequest = async (e) => {
        e.preventDefault();
        
        if (!formData.firstName || !formData.email || !formData.message) {
            toast.error("Please fill in all required fields.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await sendSupportMessage({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                message: formData.message,
                category: formData.category,
                priority: formData.priority
            });

            if (res.data?.success || res.status === 200) {
                toast.success("Support request submitted successfully!");
                setShowSuccess(true);
                setFormData(prev => ({
                    ...prev,
                    subject: '',
                    message: ''
                }));
                // Auto hide success overlay after 6 seconds
                setTimeout(() => setShowSuccess(false), 6000);
            } else {
                toast.error("Failed to send message. Please try again.");
            }
        } catch (err) {
            console.error('Error submitting support request:', err);
            toast.error(err.response?.data?.error || "Error connecting to support services. Please try again later.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <DashboardLayout title="Help & Support">
            <div className="max-w-6xl mx-auto px-4 py-8 space-y-10 animate-fade-in pb-16">
                
                {/* 1. Page Header & Welcome Text */}
                <div className="text-center space-y-4">
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-neutral-900 dark:text-white">
                        How can we <span className="text-gradient font-black">help you pilot</span> today?
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 text-base max-w-xl mx-auto font-medium leading-relaxed">
                        Have questions about your SEO dashboards, connected ad accounts, or AI insights? Search our guides below, chat with the AI assistant, or send our friendly team a support message.
                    </p>
                </div>

                {/* 2. Interactive Category Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {categories.map((cat) => {
                        const Icon = cat.icon;
                        const isActive = activeCategory === cat.id;
                        
                        // Active color styling
                        let activeStyles = "bg-white dark:bg-dark-card border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 shadow-sm";
                        if (isActive) {
                            if (cat.accent === 'brand') activeStyles = "bg-brand-500/10 dark:bg-brand-500/15 border-brand-500 dark:border-brand-400 text-brand-600 dark:text-brand-400 ring-2 ring-brand-500/10 shadow-md";
                            else if (cat.accent === 'emerald') activeStyles = "bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/10 shadow-md";
                            else if (cat.accent === 'amber') activeStyles = "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500 dark:border-amber-400 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/10 shadow-md";
                            else if (cat.accent === 'purple') activeStyles = "bg-purple-500/10 dark:bg-purple-500/15 border-purple-500 dark:border-purple-400 text-purple-600 dark:text-purple-400 ring-2 ring-purple-500/10 shadow-md";
                        }

                        return (
                            <button
                                key={cat.id}
                                onClick={() => {
                                    setActiveCategory(cat.id);
                                    setActiveFaq(null);
                                }}
                                className={`
                                    flex flex-col items-center text-center p-4 rounded-2xl border transition-all duration-300
                                    hover:-translate-y-1 hover:scale-[1.02] active:scale-95 cursor-pointer group
                                    ${activeStyles} ${cat.color}
                                `}
                            >
                                <div className={`
                                    w-12 h-12 rounded-xl flex items-center justify-center mb-3 shadow-inner transition-colors duration-300
                                    ${isActive 
                                        ? 'bg-white dark:bg-neutral-900' 
                                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 group-hover:bg-neutral-50 dark:group-hover:bg-neutral-700/50'}
                                `}>
                                    <Icon className="w-6 h-6 transition-transform group-hover:scale-110" />
                                </div>
                                <span className="text-sm font-bold tracking-tight mb-1">{cat.label}</span>
                                <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium leading-normal line-clamp-1">{cat.desc}</span>
                            </button>
                        );
                    })}
                </div>

                {/* 3. Main Split Grid - FAQ & Helpdesk */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Left Column: Quick Solutions Hub */}
                    <div className="lg:col-span-7 space-y-6">
                        
                        {/* Interactive Search Card */}
                        <div className="glass-card rounded-2xl p-6 space-y-4">
                            <div className="space-y-1">
                                <h2 className="text-base font-black text-neutral-800 dark:text-white uppercase tracking-wider">Solutions Knowledge Base</h2>
                                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-medium">Quickly parse our documented resources for instant answers</p>
                            </div>
                            
                            <div className="relative group">
                                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 group-focus-within:text-brand-500 transition-colors" />
                                <input 
                                    type="text"
                                    placeholder="Type keywords (e.g., GSC, GA4, Ads, Gemini, PDF, sync)..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setActiveFaq(null);
                                    }}
                                    className="w-full pl-12 pr-12 py-3.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm font-bold dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
                                />
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-xs font-black transition-colors"
                                    >
                                        CLEAR
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* FAQs Accordion Panel */}
                        <div className="space-y-3">
                            {filteredFaqs.length > 0 ? (
                                filteredFaqs.map((faq, idx) => {
                                    const isOpen = activeFaq === idx;
                                    return (
                                        <div 
                                            key={idx} 
                                            className={`
                                                glass-card rounded-2xl overflow-hidden transition-all duration-300 border
                                                ${isOpen ? 'border-brand-500/30 dark:border-brand-400/20 shadow-md shadow-brand-500/[0.02]' : 'border-white/40 dark:border-neutral-700/10'}
                                            `}
                                        >
                                            <button 
                                                onClick={() => setActiveFaq(isOpen ? null : idx)}
                                                className="w-full flex items-center justify-between p-5 text-left hover:bg-neutral-100/50 dark:hover:bg-neutral-800/25 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className={`
                                                        px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest
                                                        ${faq.category === 'integrations' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400' :
                                                          faq.category === 'account' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' :
                                                          'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'}
                                                    `}>
                                                        {faq.category}
                                                    </span>
                                                    <span className="text-base font-bold text-neutral-800 dark:text-white">
                                                        {faq.question}
                                                    </span>
                                                </div>
                                                <ChevronDownIcon className={`w-5 h-5 text-neutral-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-500' : ''}`} />
                                            </button>
                                            
                                            {/* Expandable answer text */}
                                            <div className={`
                                                transition-all duration-300 ease-in-out overflow-hidden
                                                ${isOpen ? 'max-h-60 border-t border-neutral-100/50 dark:border-neutral-800/30' : 'max-h-0'}
                                            `}>
                                                <p className="p-5 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium">
                                                    {faq.answer}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="glass-card rounded-2xl p-12 text-center text-neutral-400 dark:text-neutral-600">
                                    <ExclamationCircleIcon className="w-8 h-8 mx-auto mb-2 text-neutral-300 dark:text-neutral-700 animate-bounce" />
                                    <p className="text-sm font-bold">No documented questions found matching "{searchQuery}"</p>
                                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Try selecting another topic category above or use the support desk to send a message.</p>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Right Column: Support Message Desk */}
                    <div className="lg:col-span-5">
                        <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6 relative border border-white/40 dark:border-neutral-800/30">
                            
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-brand-500/10 dark:bg-brand-500/5 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                                    <EnvelopeIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-neutral-900 dark:text-white uppercase tracking-wider">Send a Support Message</h2>
                                    <p className="text-xs text-neutral-400 dark:text-neutral-500 font-bold">Direct message to our technical team</p>
                                </div>
                            </div>

                            {showSuccess ? (
                                <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-center space-y-4 animate-fade-in">
                                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                                        <CheckCircleIcon className="w-6 h-6" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-base font-black text-neutral-900 dark:text-white">Message Sent Successfully!</h3>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium max-w-xs mx-auto leading-relaxed">
                                            We've securely registered your request in our database. Our team will follow up at your verified profile inbox: <strong className="font-bold">{formData.email}</strong>.
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => setShowSuccess(false)}
                                        className="text-xs font-black text-brand-500 hover:text-brand-600 underline uppercase tracking-widest cursor-pointer"
                                    >
                                        Send Another Message
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmitRequest} className="space-y-4">
                                    
                                    {/* Prefilled Fields (Account Lock Alert) */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">First Name</label>
                                            <input 
                                                disabled
                                                type="text" 
                                                value={formData.firstName}
                                                className="w-full px-3.5 py-2.5 bg-neutral-100/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-bold text-neutral-500 dark:text-neutral-500 cursor-not-allowed"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Last Name</label>
                                            <input 
                                                disabled
                                                type="text" 
                                                value={formData.lastName}
                                                className="w-full px-3.5 py-2.5 bg-neutral-100/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-bold text-neutral-500 dark:text-neutral-500 cursor-not-allowed"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Verified Email</label>
                                            <span className="text-xs font-bold text-neutral-400 dark:text-neutral-600 flex items-center gap-1">🔒 Locked to profile</span>
                                        </div>
                                        <input 
                                            disabled
                                            type="email" 
                                            value={formData.email}
                                            className="w-full px-3.5 py-2.5 bg-neutral-100/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-bold text-neutral-500 dark:text-neutral-500 cursor-not-allowed"
                                        />
                                    </div>

                                    {/* Selectors: Category & Priority */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Category</label>
                                            <div className="relative">
                                                <select 
                                                    name="category"
                                                    value={formData.category}
                                                    onChange={handleInputChange}
                                                    className="w-full pl-3 pr-8 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-bold dark:text-white appearance-none outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                                >
                                                    <option value="General Questions">General Questions</option>
                                                    <option value="Connecting GSC, GA4, or Ads">Connecting GSC, GA4, or Ads</option>
                                                    <option value="AI Assistant / Chat Issues">AI Assistant / Chat Issues</option>
                                                    <option value="Reports & PDF Exports">Reports & PDF Exports</option>
                                                    <option value="Account & Profile Settings">Account & Profile Settings</option>
                                                </select>
                                                <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Priority Level</label>
                                            <div className="relative">
                                                <select 
                                                    name="priority"
                                                    value={formData.priority}
                                                    onChange={handleInputChange}
                                                    className="w-full pl-3 pr-8 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-bold dark:text-white appearance-none outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                                >
                                                    <option value="Low (Standard)">Standard (Normal)</option>
                                                    <option value="Medium">High (Need help soon)</option>
                                                    <option value="High">Urgent (System or data issue)</option>
                                                </select>
                                                <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Subject */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Subject</label>
                                        <input 
                                            required
                                            type="text" 
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleInputChange}
                                            placeholder="e.g., Google Search Console historical sync failed"
                                            className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
                                        />
                                    </div>

                                    {/* Message */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Description Message</label>
                                        <textarea 
                                            required
                                            rows="5"
                                            name="message"
                                            value={formData.message}
                                            onChange={handleInputChange}
                                            placeholder="Please describe what is happening in detail. If you are experiencing a sync error, please mention the site property name and platform (GSC, GA4, Google Ads, or Meta Ads)..."
                                            className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 resize-none"
                                        ></textarea>
                                    </div>

                                    {/* Submit Action */}
                                    <button 
                                        disabled={isSubmitting}
                                        type="submit"
                                        className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 active:scale-95 text-white rounded-xl text-sm font-black tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Sending Message...
                                            </>
                                        ) : 'Submit Support Request'}
                                    </button>
                                </form>
                            )}

                        </div>
                    </div>

                </div>

            </div>
        </DashboardLayout>
    );
};

export default SupportPage;
