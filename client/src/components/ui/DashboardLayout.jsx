import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    Cog6ToothIcon,
    WrenchIcon,
    ArrowRightOnRectangleIcon,
    MoonIcon,
    SunIcon,
    ChartPieIcon,
    ChatBubbleLeftRightIcon,
    MagnifyingGlassIcon,
    ChevronDownIcon,
    BellIcon,
    ChartBarIcon,
    GlobeAltIcon,
    SparklesIcon,
    ArrowRightIcon,
    ChevronRightIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import GlobalAiChat from '../ai/GlobalAiChat';
import { useAuthStore } from '../../store/authStore';
import { useAccountsStore } from '../../store/accountsStore';
import { useFilterStore } from '../../store/filterStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useThemeStore } from '../../store/themeStore';
import { listSites, getActiveAccounts } from '../../api/accountApi';
import Logo from './Logo';
import SearchableSelect from './SearchableSelect';


const DashboardLayout = ({ children, noScroll = false, title }) => {
    const { user, clearAuth } = useAuthStore();
    const {
        userSites = [],
        activeSiteId,
        setAccounts,
        syncMetadata,
        connectedSources = []
    } = useAccountsStore();
    const {
        notifications,
        unreadCount,
        markAsRead,
        markAllRead,
        deleteNotification,
        clearAll,
        clearRead,
        fetchNotifications
    } = useNotificationStore();
    const navigate = useNavigate();
    const isAdmin = user?.email === import.meta.env.VITE_SUPER_ADMIN_EMAIL;

    // Fetch notifications on mount and periodically
    useEffect(() => {
        if (user) {
            fetchNotifications();
            const interval = setInterval(() => {
                fetchNotifications();
            }, 120000); // Poll every 2 minutes
            return () => clearInterval(interval);
        }
    }, [user, fetchNotifications]);

    // Polling for syncStatus
    useEffect(() => {
        let interval;
        if (user && activeSiteId && syncMetadata?.syncStatus === 'syncing') {
            interval = setInterval(() => {
                getActiveAccounts(activeSiteId)
                    .then(res => {
                        const data = res.data || {};
                        if (data.syncStatus !== 'syncing') {
                            setAccounts({
                                syncMetadata: {
                                    ga4HistoricalComplete: data.ga4HistoricalComplete || false,
                                    gscHistoricalComplete: data.gscHistoricalComplete || false,
                                    googleAdsHistoricalComplete: data.googleAdsHistoricalComplete || false,
                                    facebookAdsHistoricalComplete: data.facebookAdsHistoricalComplete || false,
                                    ga4LastSyncedAt: data.ga4LastSyncedAt || null,
                                    gscLastSyncedAt: data.gscLastSyncedAt || null,
                                    googleAdsLastSyncedAt: data.googleAdsLastSyncedAt || null,
                                    facebookAdsLastSyncedAt: data.facebookAdsLastSyncedAt || null,
                                    syncStatus: data.syncStatus || 'idle'
                                }
                            });
                        }
                    })
                    .catch(() => { });
            }, 60000);
        }
        return () => clearInterval(interval);
    }, [user, activeSiteId, syncMetadata?.syncStatus, setAccounts]);

    useEffect(() => {
        if (user) {
            listSites()
                .then(res => {
                    const sites = res.data || [];
                    setAccounts({ userSites: sites });
                    if (!activeSiteId && sites.length > 0) {
                        setAccounts({ activeSiteId: sites[0]._id });
                    } else if (activeSiteId && !sites.find(s => s._id === activeSiteId)) {
                        // If activeSiteId is set but not found in the sites list, reset it
                        setAccounts({ activeSiteId: sites.length > 0 ? sites[0]._id : null });
                    }
                })
                .catch(() => { });

            getActiveAccounts(activeSiteId)
                .then(res => {
                    const data = res.data || {};

                    // If we requested a specific site but got an empty object back, it means site was not found
                    if (activeSiteId && !data._id) {
                        setAccounts({ activeSiteId: null });
                    }

                    const connected = [];
                    if (data.gscSiteUrl) connected.push('gsc');
                    if (data.ga4PropertyId) connected.push('ga4');
                    if (data.googleAdsCustomerId) connected.push('google-ads');
                    if (data.facebookAdAccountId) connected.push('facebook-ads');

                    // Broad categories for Settings page
                    if (data.ga4TokenId || data.gscTokenId || data.googleAdsTokenId) connected.push('google');
                    if (data.facebookTokenId) connected.push('facebook');

                    setAccounts({
                        activeGscSite: data.gscSiteUrl || '',
                        activeGa4PropertyId: data.ga4PropertyId || '',
                        activeGoogleAdsCustomerId: data.googleAdsCustomerId || '',
                        activeFacebookAdAccountId: data.facebookAdAccountId || '',
                        connectedSources: connected,
                        syncMetadata: {
                            ga4HistoricalComplete: data.ga4HistoricalComplete || false,
                            gscHistoricalComplete: data.gscHistoricalComplete || false,
                            googleAdsHistoricalComplete: data.googleAdsHistoricalComplete || false,
                            facebookAdsHistoricalComplete: data.facebookAdsHistoricalComplete || false,
                            ga4LastSyncedAt: data.ga4LastSyncedAt || null,
                            gscLastSyncedAt: data.gscLastSyncedAt || null,
                            googleAdsLastSyncedAt: data.googleAdsLastSyncedAt || null,
                            facebookAdsLastSyncedAt: data.facebookAdsLastSyncedAt || null,
                            syncStatus: data.syncStatus || 'idle'
                        }
                    });
                })
                .catch(() => { });
        }
    }, [user, activeSiteId, setAccounts]);

    const handleSiteChange = (e) => {
        const id = e.target.value;
        if (id === 'new') {
            navigate('/connect-accounts?new=true');
        } else {
            setAccounts({ activeSiteId: id });
        }
    };

    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { theme, toggleTheme } = useThemeStore();
    const isDark = theme === 'dark';

    const toggleDark = () => {
        toggleTheme();
    };

    const getNotifIcon = (type) => {
        const icons = {
            success: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: "https://img.icons8.com/fluency/96/checked.png" },
            info: { bg: 'bg-blue-50 dark:bg-blue-950/30', icon: "https://img.icons8.com/fluency/96/info.png" },
            warning: { bg: 'bg-amber-50 dark:bg-amber-950/30', icon: "https://img.icons8.com/fluency/96/warning-shield.png" },
            error: { bg: 'bg-red-50 dark:bg-red-950/30', icon: "https://img.icons8.com/fluency/96/cancel.png" },
        };
        return icons[type] || icons.info;
    };

    const getTimeAgo = (timestamp) => {
        const diff = Date.now() - new Date(timestamp).getTime();
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    const getSourceLabel = (source) => {
        const sources = {
            'ga4': { label: 'GA4', icon: 'https://www.gstatic.com/images/branding/product/2x/google_analytics_64dp.png' },
            'gsc': { label: 'GSC', icon: 'https://www.gstatic.com/images/branding/product/2x/search_console_64dp.png' },
            'google-ads': { label: 'Google Ads', icon: 'https://www.vectorlogo.zone/logos/google_ads/google_ads-icon.svg' },
            'facebook-ads': { label: 'Facebook Ads', icon: 'https://www.vectorlogo.zone/logos/facebook/facebook-icon.svg' },
            'ai': { label: 'AI Assistant', icon: 'https://img.icons8.com/fluency/96/sparkling.png' },
            'system': { label: 'System', icon: 'https://img.icons8.com/fluency/96/services.png' },
        };
        return sources[source] || null;
    };

    const handleLogout = () => {
        // Specifically clear only necessary authenticated state
        clearAuth();

        // Reset accounts state using the store's built-in clear method
        const { clearAccounts } = useAccountsStore.getState();
        clearAccounts();

        // DO NOT use localStorage.clear() as it wipes out theme preferences 
        // and other non-authenticated persisted data like notification read status.
        // If notifications are truly user-specific, we can call clearNotifications()
        // below, but according to user preference, they want read status to persist.

        // localStorage.removeItem('auth-storage');
        // localStorage.removeItem('accounts-storage');

        sessionStorage.clear();
        navigate('/');
    };

    const navItems = [
        { 
            label: 'Dashboard', 
            path: '/dashboard', 
            icon: () => <ChartPieIcon className="w-5 h-5 text-blue-500" strokeWidth={2.5} /> 
        },
        { 
            label: 'My Sites', 
            path: '/dashboard/sites', 
            icon: () => <GlobeAltIcon className="w-5 h-5 text-emerald-500" strokeWidth={2.5} /> 
        },
        { 
            label: 'AI Assistant', 
            path: '/dashboard/ai-chat', 
            icon: () => <SparklesIcon className="w-5 h-5 text-amber-500" strokeWidth={2.5} /> 
        },
        {
            label: 'Google Search Console',
            path: '/dashboard/gsc',
            icon: () => <img src="https://www.gstatic.com/images/branding/product/2x/search_console_64dp.png" className="w-4 h-4 object-contain" alt="GSC" />,
            isSubItem: true,
            sourceKey: 'gsc'
        },
        {
            label: 'Google Analytics 4',
            path: '/dashboard/ga4',
            icon: () => <img src="https://www.gstatic.com/images/branding/product/2x/google_analytics_64dp.png" className="w-4 h-4 object-contain" alt="GA4" />,
            isSubItem: true,
            sourceKey: 'ga4'
        },
        {
            label: 'Google Ads',
            path: '/dashboard/google-ads',
            icon: () => <img src="https://www.vectorlogo.zone/logos/google_ads/google_ads-icon.svg" className="w-4 h-4 object-contain" alt="Ads" />,
            isSubItem: true,
            sourceKey: 'google-ads'
        },
        {
            label: 'Facebook Ads',
            path: '/dashboard/facebook-ads',
            icon: () => <img src="https://www.vectorlogo.zone/logos/facebook/facebook-icon.svg" className="w-4 h-4 object-contain" alt="FB" />,
            isSubItem: true,
            sourceKey: 'facebook-ads'
        },
    ];

    const adminNavItems = [
        { label: 'System Config', path: '/dashboard/admin', icon: WrenchIcon },
    ];

    const { searchQuery, setSearchQuery } = useFilterStore();
    const searchInputRef = React.useRef(null);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.key === '/' || (e.key === 'k' && (e.ctrlKey || e.metaKey))) &&
                document.activeElement.tagName !== 'INPUT' &&
                document.activeElement.tagName !== 'TEXTAREA') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="flex h-screen bg-neutral-50 dark:bg-dark-bg font-sans overflow-hidden transition-colors selection:bg-brand-500 selection:text-white">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* Sidebar Container */}
            <aside className={`
                w-60 bg-white dark:bg-dark-surface border-r border-neutral-200 dark:border-neutral-800
                fixed md:relative inset-y-0 left-0 z-50 transform
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0 md:flex flex-col flex-shrink-0
                transition-transform duration-300 ease-in-out shadow-xl md:shadow-none
            `}>

                {/* Sidebar Logo */}
                <div className="px-5 py-5 border-b border-neutral-100 dark:border-neutral-800">
                    <NavLink to="/dashboard" className="flex items-center gap-2.5">
                        <Logo className="w-8 h-8" />
                    </NavLink>
                </div>

                {/* Site Switcher */}
                <div className="px-3 py-3 border-b border-neutral-100 dark:border-neutral-800">
                    <SearchableSelect
                        value={activeSiteId || ''}
                        onChange={(e) => {
                            const id = e.target.value;
                            setAccounts({ activeSiteId: id });
                        }}
                        options={userSites.map(site => ({ label: site.siteName, value: site._id }))}
                        placeholder="Select Website"
                        searchPlaceholder="Search websites..."
                        footerAction={{
                            label: "+ Add Website",
                            onClick: () => navigate('/connect-accounts?new=true')
                        }}
                    />
                </div>

                <nav className="flex-1 px-3 space-y-1 overflow-y-auto relative z-10 scrollbar-hide py-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500 px-3 py-2 mt-2">
                        Menu
                    </p>
                    {navItems.filter(i => !i.isSubItem).map((item, i) => (
                        <NavLink
                            key={`nav-${i}`}
                            to={item.path}
                            onClick={() => setIsSidebarOpen(false)}
                            end={item.path === '/dashboard'}
                            className={({ isActive }) => `
                                flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all group
                                ${isActive
                                    ? 'bg-neutral-100 dark:bg-neutral-800 text-brand-600 dark:text-brand-400'
                                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/50'
                                }
                            `}
                        >
                            {typeof item.icon === 'function' ? <item.icon /> : <item.icon className="w-4 h-4" strokeWidth={2.5} />}
                            <span className="flex-1">{item.label}</span>
                        </NavLink>
                    ))}

                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500 px-3 py-2 mt-4">
                        DATA SOURCES
                    </p>
                    {navItems.filter(i => i.isSubItem).map((item, i) => (
                        <NavLink
                            key={`sub-${i}`}
                            to={item.path}
                            onClick={() => setIsSidebarOpen(false)}
                            className={({ isActive }) => `
                                flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all group
                                ${isActive
                                    ? 'bg-neutral-100 dark:bg-neutral-800 text-brand-600 dark:text-brand-400'
                                    : connectedSources.includes(item.sourceKey)
                                        ? 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/30'
                                        : 'text-neutral-400/70 dark:text-neutral-500/60 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/30'
                                }
                            `}
                        >
                            {typeof item.icon === 'function' ? <item.icon /> : <item.icon className="w-3.5 h-3.5" strokeWidth={2.5} />}
                            <span className="flex-1">{item.label}</span>

                            {/* Status Indicator */}
                            {item.sourceKey && (
                                <div className={`w-1.5 h-1.5 rounded-full ${connectedSources.includes(item.sourceKey) ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-neutral-300'}`} />
                            )}
                        </NavLink>
                    ))}

                    {isAdmin && (
                        <>
                            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500 px-3 py-2 mt-4">
                                Super Admin
                            </p>
                            {adminNavItems.map((item, i) => (
                                <NavLink
                                    key={`admin-${i}`}
                                    to={item.path}
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={({ isActive }) => `
                                        flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all
                                        ${isActive
                                            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800/50'
                                            : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/30'
                                        }
                                    `}
                                >
                                    <item.icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                                    <span>{item.label}</span>
                                </NavLink>
                            ))}
                        </>
                    )}
                </nav>

                {/* Sidebar Bottom Actions */}
                <div className="mt-auto p-4 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="space-y-1">
                        <NavLink
                            to="/settings"
                            onClick={() => setIsSidebarOpen(false)}
                            className={({ isActive }) => `
                                flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all group
                                ${isActive
                                    ? 'bg-neutral-100 dark:bg-neutral-800 text-brand-600 dark:text-brand-400'
                                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/50'
                                }
                            `}
                        >
                            <img src="https://img.icons8.com/fluency/48/settings.png" className="w-4 h-4 object-contain group-hover:scale-110 transition-transform" alt="Settings" />
                            <span>Settings</span>
                        </NavLink>

                        <NavLink
                            to="/dashboard/support"
                            onClick={() => setIsSidebarOpen(false)}
                            className={({ isActive }) => `
                                flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all group
                                ${isActive
                                    ? 'bg-neutral-100 dark:bg-neutral-800 text-brand-600 dark:text-brand-400'
                                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-all'
                                }
                            `}
                        >
                            <img src="https://img.icons8.com/fluency/48/help.png" className="w-4 h-4 object-contain group-hover:scale-110 transition-transform" alt="Help" />
                            <span>Help & Support</span>
                        </NavLink>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full bg-neutral-50 dark:bg-dark-bg overflow-hidden">
                {/* Header */}
                <header className="flex-shrink-0 flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 bg-white dark:bg-dark-surface border-b border-neutral-200 dark:border-neutral-800 z-20">
                    <div className="flex items-center gap-2 sm:gap-4 md:gap-8 flex-1">
                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-1.5 sm:p-2 -ml-1 sm:-ml-2 text-neutral-500 hover:text-brand-500 md:hidden"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
                            </svg>
                        </button>

                        {/* Breadcrumbs - Hidden on small mobile */}
                        <div className="hidden sm:flex flex-col">
                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">
                                <span>Home</span>
                                <span className="text-neutral-300">/</span>
                                <span className="text-brand-500">Dashboard</span>
                            </div>
                            <h2 className="text-xs sm:text-sm md:text-base font-black text-neutral-900 dark:text-white leading-tight truncate max-w-[120px] sm:max-w-none">{title || 'Dashboard'}</h2>
                        </div>

                        {/* Search - Condensed on small screens */}
                        <div className="flex flex-col flex-1 max-w-[140px] sm:max-w-xs md:max-w-md relative group">
                            <div className="flex items-center bg-neutral-100 dark:bg-dark-surface border border-neutral-200 dark:border-neutral-700 rounded-xl sm:rounded-2xl px-2.5 sm:px-4 py-1.5 sm:py-2.5 w-full group focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10 transition-all shadow-inner relative z-30">
                                <MagnifyingGlassIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400 group-focus-within:text-brand-500" strokeWidth={3} />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => setIsSearchFocused(true)}
                                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                    placeholder={window.innerWidth < 640 ? "Search..." : "Search pages, keywords..."}
                                    className="bg-transparent border-none focus:ring-0 text-[11px] sm:text-sm font-bold w-full ml-1.5 sm:ml-3 text-neutral-900 dark:text-white placeholder:text-neutral-400"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition-colors mr-1 sm:mr-2"
                                    >
                                        <span className="text-[10px] sm:text-xs font-black">×</span>
                                    </button>
                                )}
                                <div className="hidden lg:flex items-center gap-1.5 ml-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300">
                                    <kbd className="px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-dark-card text-[10px] font-black text-neutral-400 shadow-sm group-focus-within:border-brand-500/30 group-focus-within:text-brand-500 uppercase whitespace-nowrap">{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} K</kbd>
                                </div>
                            </div>

                            {/* Global Search Results Dropdown */}
                            {searchQuery && isSearchFocused && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-3xl shadow-2xl p-4 z-20 animate-slide-up origin-top overflow-hidden">
                                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-4">
                                        <div className="px-4 py-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4">Quick Results for "{searchQuery}"</p>

                                            <div className="space-y-1">
                                                {/* Dashboard Sections */}
                                                {['Growth Matrix', 'Active Insights', 'Top Performing Pages'].filter(s => s.toLowerCase().includes(searchQuery.toLowerCase())).map((section, idx) => (
                                                    <button
                                                        key={`section-res-${idx}`}
                                                        onClick={() => {
                                                            const id = section.toLowerCase().includes('matrix') ? 'growth-matrix' :
                                                                section.toLowerCase().includes('insights') ? 'insights-panel' : 'top-pages-table';
                                                            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                                                            setSearchQuery('');
                                                        }}
                                                        className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-neutral-50 dark:hover:bg-dark-bg transition-all text-left group/sec"
                                                    >
                                                        <div className="w-10 h-10 rounded-xl bg-accent-500/10 text-accent-600 flex items-center justify-center group-hover/sec:bg-accent-500 group-hover/sec:text-white transition-all">
                                                            <ChartBarIcon className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-neutral-900 dark:text-white">{section}</p>
                                                            <p className="text-[10px] font-bold text-neutral-500">Dashboard Section</p>
                                                        </div>
                                                        <ArrowRightIcon className="w-4 h-4 ml-auto text-neutral-300 group-hover/sec:text-accent-500 transition-colors" />
                                                    </button>
                                                ))}

                                                {/* Nav Items */}
                                                {navItems.filter(i => i.label.toLowerCase().includes(searchQuery.toLowerCase())).map((item, idx) => (
                                                    <button
                                                        key={`search-res-${idx}`}
                                                        onClick={() => { navigate(item.path); setSearchQuery(''); }}
                                                        className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all text-left group/res"
                                                    >
                                                        <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-dark-bg flex items-center justify-center group-hover/res:bg-brand-500 group-hover/res:text-white transition-all">
                                                            <item.icon className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-neutral-900 dark:text-white">{item.label}</p>
                                                            <p className="text-[10px] font-bold text-neutral-500">Navigation Item</p>
                                                        </div>
                                                        <ChevronRightIcon className="w-4 h-4 ml-auto text-neutral-300 group-hover/res:text-brand-500 transition-colors" />
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => { setSearchQuery(''); navigate('/dashboard/ai-chat'); }}
                                                    className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-brand-50 group/ai transition-all text-left"
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-white">
                                                        <SparklesIcon className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-brand-600">Ask AI about "{searchQuery}"</p>
                                                        <p className="text-[10px] font-bold text-brand-400">Natural Language Query</p>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-neutral-50 dark:bg-dark-surface/50 border-t border-neutral-100 dark:border-neutral-800 mt-2 flex justify-between items-center px-6">
                                        <span className="text-[10px] font-bold text-neutral-400">Tip: Results filter the dashboard table automatically</span>
                                        <span className="text-[10px] font-black text-brand-500">ESC to close</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="relative">
                            <button
                                onClick={() => setIsNotifOpen(!isNotifOpen)}
                                className="relative p-2 text-neutral-500 hover:text-brand-500 dark:text-neutral-400 dark:hover:text-brand-400 transition-colors rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            >
                                <BellIcon className="w-5 h-5" strokeWidth={2} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none border border-white dark:border-dark-surface">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {isNotifOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
                                    <div className="fixed inset-x-4 top-[64px] sm:absolute sm:top-full sm:right-0 sm:left-auto sm:mt-2 sm:w-[380px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                        <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-neutral-900">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-neutral-900 dark:text-white">Notifications</h4>
                                            {notifications.length > 0 && (
                                                <button onClick={clearAll} className="text-[10px] font-bold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors">Clear all</button>
                                            )}
                                        </div>

                                        <div className="max-h-[60vh] sm:max-h-[480px] overflow-y-auto scrollbar-hide">
                                            {notifications.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                                                    <div className="w-14 h-14 rounded-2xl bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center mb-4 border border-neutral-100 dark:border-neutral-700">
                                                        <BellIcon className="w-7 h-7 text-neutral-300" />
                                                    </div>
                                                    <p className="text-sm font-black text-neutral-900 dark:text-white">All caught up!</p>
                                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">No new notifications at the moment.</p>
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-neutral-50 dark:divide-neutral-800/50">
                                                    {notifications.map((notif) => {
                                                        const icon = getNotifIcon(notif.type);
                                                        return (
                                                            <div 
                                                                key={notif.id} 
                                                                className={`group relative px-4 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-all cursor-pointer ${!notif.isRead ? 'bg-blue-50/20 dark:bg-brand-500/5' : ''}`}
                                                                onClick={() => { markAsRead(notif.id); if (notif.actionPath) { navigate(notif.actionPath); setIsNotifOpen(false); } }}
                                                            >
                                                                <div className="flex items-start gap-3.5">
                                                                    <div className={`w-9 h-9 rounded-full ${icon.bg} flex items-center justify-center flex-shrink-0 shadow-sm border border-white dark:border-neutral-800 p-1.5`}>
                                                                        <img src={icon.icon} className="w-full h-full object-contain" alt="Notif" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-start justify-between gap-3">
                                                                            <p className={`text-[12px] font-black leading-tight ${!notif.isRead ? 'text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>{notif.title}</p>
                                                                            <button onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }} className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-neutral-300 hover:text-red-500 transition-all flex-shrink-0"><XMarkIcon className="w-3 h-3" /></button>
                                                                        </div>
                                                                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed font-medium line-clamp-2">{notif.message}</p>
                                                                        
                                                                        <div className="flex items-center justify-between mt-2.5 gap-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500">{getTimeAgo(notif.timestamp)}</span>
                                                                                {getSourceLabel(notif.source) && (
                                                                                    <>
                                                                                        <span className="text-neutral-300 dark:text-neutral-700">·</span>
                                                                                        <span className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
                                                                                            <img src={getSourceLabel(notif.source).icon} className="w-3 h-3 object-contain" alt="src" />
                                                                                            {getSourceLabel(notif.source).label}
                                                                                        </span>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                            {notif.actionLabel && (
                                                                                <span className="text-[10px] font-black text-brand-600 dark:text-brand-400 hover:text-brand-700">
                                                                                    {notif.actionLabel} →
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                        {notifications.length > 0 && (
                                            <div className="px-4 py-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/30 dark:bg-neutral-800/20 flex items-center justify-between">
                                                <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">{notifications.length} total · {unreadCount} unread</p>
                                                <div className="flex items-center gap-3">
                                                    {unreadCount > 0 && (
                                                        <button 
                                                            onClick={markAllRead} 
                                                            className="text-[10px] font-black uppercase tracking-wider text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                                                        >
                                                            Mark all read
                                                        </button>
                                                     )}
                                                     {unreadCount > 0 && (notifications.length - unreadCount > 0) && (
                                                         <span className="text-neutral-300 dark:text-neutral-700 text-[10px]">·</span>
                                                     )}
                                                     {notifications.length - unreadCount > 0 && (
                                                         <button 
                                                             onClick={clearRead} 
                                                             className="text-[10px] font-black uppercase tracking-wider text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                                                         >
                                                             Clear read
                                                         </button>
                                                     )}
                                                 </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="h-6 w-[1px] bg-neutral-200 dark:bg-neutral-800 mx-2"></div>

                        <div className="relative">
                            <button
                                className="flex items-center gap-3 p-1 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all group"
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            >
                                <div className="relative">
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt="Avatar" className="w-9 h-9 rounded-xl object-cover ring-2 ring-transparent group-hover:ring-brand-500/20 transition-all" />
                                    ) : (
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white flex items-center justify-center text-xs font-black shadow-md">
                                            {user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'U'}
                                        </div>
                                    )}
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-semantic-success rounded-full border-2 border-white dark:border-dark-bg"></div>
                                </div>
                                <div className="hidden sm:flex flex-col items-start min-w-0 max-w-[120px]">
                                    <span className="text-sm font-black text-neutral-900 dark:text-white leading-none truncate w-full">
                                        {user?.name || 'User'}
                                    </span>
                                </div>
                                <ChevronDownIcon className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-600 transition-colors" strokeWidth={3} />
                            </button>

                            {isUserMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>
                                    <div className="fixed inset-x-4 top-[64px] sm:absolute sm:top-full sm:right-0 sm:left-auto sm:mt-2 sm:w-64 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                        {/* User Header */}
                                        <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
                                            <p className="text-sm font-black text-neutral-900 dark:text-white truncate">{user?.name || 'User'}</p>
                                            <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 truncate mt-0.5">{user?.email}</p>
                                        </div>

                                        {/* Menu Items */}
                                        <div className="p-1.5">
                                            <button
                                                onClick={() => { setIsUserMenuOpen(false); navigate('/connect-accounts'); }}
                                                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-all group"
                                            >
                                                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center border border-blue-100 dark:border-blue-800 group-hover:border-blue-500 transition-all">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 text-blue-600" strokeWidth={2.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                                                    </svg>
                                                </div>
                                                Connect Platforms
                                            </button>

                                            <button
                                                onClick={() => { setIsUserMenuOpen(false); navigate('/settings'); }}
                                                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-all group"
                                            >
                                                <div className="w-7 h-7 rounded-lg bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center border border-neutral-200 dark:border-neutral-700 group-hover:border-neutral-400 transition-all">
                                                    <Cog6ToothIcon className="w-4 h-4 text-neutral-500 group-hover:text-neutral-700 dark:group-hover:text-neutral-300" strokeWidth={2.5} />
                                                </div>
                                                Account Settings
                                            </button>

                                            <div className="px-3.5 py-2.5 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${isDark ? 'bg-indigo-950/40 border-indigo-900/50' : 'bg-amber-50 border-amber-100'}`}>
                                                        {isDark ? (
                                                            <MoonIcon className="w-4 h-4 text-indigo-400" strokeWidth={2.5} />
                                                        ) : (
                                                            <SunIcon className="w-4 h-4 text-amber-500" strokeWidth={2.5} />
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-bold text-neutral-600 dark:text-neutral-300">
                                                        {isDark ? 'Dark Mode' : 'Light Mode'}
                                                    </span>
                                                </div>
                                                <button 
                                                    onClick={() => toggleDark()}
                                                    className={`
                                                        relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none
                                                        ${isDark ? 'bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.4)]' : 'bg-neutral-200'}
                                                    `}
                                                >
                                                    <span
                                                        className={`
                                                            inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300
                                                            ${isDark ? 'translate-x-6' : 'translate-x-1'}
                                                        `}
                                                    />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Logout Section */}
                                        <div className="p-1.5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
                                            <button
                                                onClick={() => {
                                                    setIsUserMenuOpen(false);
                                                    if (window.confirm("Are you sure you want to log out?")) {
                                                        handleLogout();
                                                    }
                                                }}
                                                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-black text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all group"
                                            >
                                                <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-900/40 flex items-center justify-center border border-red-100 dark:border-red-800 group-hover:bg-red-500 group-hover:border-red-500 transition-all">
                                                    <ArrowRightOnRectangleIcon className="w-4 h-4 text-red-500 group-hover:text-white" strokeWidth={2.5} />
                                                </div>
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className={`flex-1 ${noScroll ? 'overflow-hidden h-full' : 'overflow-y-auto'} p-4 sm:p-5 md:p-7`}>
                    <div className={`${noScroll ? 'h-full w-full' : ''} relative z-10`}>
                        {children}
                    </div>
                </div>

                <GlobalAiChat />
            </main>
        </div>
    );
};

export default DashboardLayout;
