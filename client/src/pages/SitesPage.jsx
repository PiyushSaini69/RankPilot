import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/ui/DashboardLayout';
import { 
    PlusIcon, 
    TrashIcon, 
    PencilSquareIcon,
    GlobeAltIcon,
    CheckCircleIcon,
    ChartBarIcon,
    ExclamationTriangleIcon,
    ArrowRightIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { useAccountsStore } from '../store/accountsStore';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { deleteSite, listSites } from '../api/accountApi';
import { getMe } from '../api/authApi';
import toast from 'react-hot-toast';

/* ─── Highly Readable Integration Badge ─── */
const ToolBadge = ({ connected, label }) => (
  <div className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1.5 rounded-lg border transition-all ${
    connected
      ? 'bg-green-600 text-white border-green-600 shadow-sm'
      : 'bg-white dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 border-neutral-200 dark:border-neutral-700'
  }`}>
    <span className="text-[12px]">{connected ? '✓' : '✗'}</span>
    {label}
  </div>
);

const SitesPage = () => {
    const navigate = useNavigate();
    const { userSites, activeSiteId, setAccounts } = useAccountsStore();
    const { token, setAuth } = useAuthStore();
    const [loading, setLoading] = useState(false);

    const fetchSites = async () => {
        setLoading(true);
        try {
            const res = await listSites();
            setAccounts({ userSites: res.data });
        } catch (err) {
            console.error('Failed to fetch sites', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete "${name}"? All associated data will be lost.`)) return;

        try {
            await deleteSite(id);
            toast.success(`Site "${name}" deleted`);
            
            // Refresh user auth state with updated connectedSources
            try {
                const meRes = await getMe();
                if (meRes.data && meRes.data.user) {
                    setAuth(token, meRes.data.user);
                }
            } catch (err) {
                console.error('Failed to sync auth user state:', err);
            }
            
            const { addNotification } = useNotificationStore.getState();
            addNotification({
                type: 'info',
                title: 'Site Deleted',
                message: `Website "${name}" and its associated data were removed from your dashboard.`,
            });
            
            if (activeSiteId === id) {
                const remaining = userSites.filter(s => s._id !== id);
                setAccounts({ 
                    activeSiteId: remaining.length > 0 ? remaining[0]._id : null 
                });
            }
            
            fetchSites();
        } catch {
            toast.error('Failed to delete site');
        }
    };

    const handleEdit = (id) => {
        setAccounts({ activeSiteId: id });
        navigate('/connect-accounts?view=true');
    };

    const handleSelect = (id) => {
        setAccounts({ activeSiteId: id });
        navigate('/dashboard');
    };

    return (
        <DashboardLayout title="My Sites" noScroll={userSites.length === 0}>
            <div className={userSites.length === 0 ? "h-full flex flex-col justify-center px-6 py-2" : "space-y-6 pb-20 px-6 pt-2"}>
                
                {/* ─── PAGE HEADER ─── */}
                {userSites.length > 0 && (
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-0.5">
                            <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">My Sites</h1>
                            <p className="text-neutral-500 dark:text-neutral-400 font-bold text-sm max-w-2xl leading-relaxed">
                                Manage analytics and ad performance for your properties.
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/connect-accounts?new=true')}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-black rounded-xl transition-all shadow-lg shadow-brand-600/20 active:scale-95 whitespace-nowrap"
                        >
                            <PlusIcon className="w-5 h-5" strokeWidth={3} />
                            Add Website
                        </button>
                    </div>
                )}

                {/* ─── LOADING STATE ─── */}
                {loading && userSites.length === 0 && (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 animate-pulse">
                                <div className="w-14 h-14 bg-neutral-100 dark:bg-neutral-800 rounded-2xl shrink-0" />
                                <div className="flex-1 space-y-3 w-full">
                                    <div className="h-4 w-48 bg-neutral-100 dark:bg-neutral-800 rounded-full" />
                                    <div className="h-3 w-32 bg-neutral-50 dark:bg-neutral-900/50 rounded-full" />
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    {[1, 2, 3, 4].map(j => <div key={j} className="h-8 w-16 bg-neutral-100 dark:bg-neutral-800 rounded-lg" />)}
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <div className="h-10 w-24 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
                                    <div className="h-10 w-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ─── EMPTY STATE ─── */}
                {userSites.length === 0 && !loading && (
                    <div className="bg-white dark:bg-dark-surface border border-neutral-200 dark:border-neutral-800 rounded-[3rem] p-8 sm:p-12 md:p-16 flex-1 flex flex-col items-center justify-center text-center shadow-sm w-full relative overflow-hidden max-h-[620px] my-auto">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500/5 rounded-full blur-[100px] -ml-32 -mb-32"></div>
                        
                        <div className="relative z-10 flex flex-col items-center justify-center h-full">
                            <div className="w-20 h-20 rounded-[2.5rem] bg-neutral-50 dark:bg-neutral-800/80 flex items-center justify-center mb-6 border border-neutral-100 dark:border-neutral-700 shadow-inner transition-transform duration-300">
                                <GlobeAltIcon className="w-10 h-10 text-brand-600 dark:text-brand-400" />
                            </div>
                            
                            <h2 className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-white mb-3 tracking-tight leading-tight">
                                Welcome to RankPilot! <br className="hidden sm:block" /> Let's connect your first website
                            </h2>
                            
                            <p className="text-neutral-500 dark:text-neutral-400 font-medium text-base max-w-xl mb-6 leading-relaxed">
                                Link your domain to track search keyword rankings, web traffic analytics, and advertising campaigns across Google & Meta in one clean, unified dashboard.
                            </p>

                            {/* Connected Tools Badge pills with soft pastel borders and dynamic pulsing indicators */}
                            <div className="flex flex-wrap items-center justify-center gap-2 mb-8 max-w-lg">
                                <span className="px-3 py-1.5 text-[11px] font-extrabold bg-neutral-50 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-300 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 flex items-center gap-2 shadow-sm transition-all hover:scale-105 duration-200">
                                    <span className="w-2 h-2 bg-[#4285F4] rounded-full shadow-[0_0_8px_#4285F4]"></span>
                                    Google Analytics
                                </span>
                                <span className="px-3 py-1.5 text-[11px] font-extrabold bg-neutral-50 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-300 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 flex items-center gap-2 shadow-sm transition-all hover:scale-105 duration-200">
                                    <span className="w-2 h-2 bg-[#EA4335] rounded-full shadow-[0_0_8px_#EA4335]"></span>
                                    Search Console
                                </span>
                                <span className="px-3 py-1.5 text-[11px] font-extrabold bg-neutral-50 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-300 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 flex items-center gap-2 shadow-sm transition-all hover:scale-105 duration-200">
                                    <span className="w-2 h-2 bg-[#FBBC05] rounded-full shadow-[0_0_8px_#FBBC05]"></span>
                                    Google Ads
                                </span>
                                <span className="px-3 py-1.5 text-[11px] font-extrabold bg-neutral-50 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-300 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 flex items-center gap-2 shadow-sm transition-all hover:scale-105 duration-200">
                                    <span className="w-2 h-2 bg-[#1877F2] rounded-full shadow-[0_0_8px_#1877F2]"></span>
                                    Meta Ads
                                </span>
                            </div>

                            <div className="space-y-4">
                                <button
                                    onClick={() => navigate('/connect-accounts?new=true')}
                                    className="inline-flex items-center gap-3 px-10 py-4 bg-brand-600 hover:bg-brand-700 text-white text-base font-black rounded-2xl transition-all shadow-xl shadow-brand-600/30 hover:shadow-2xl hover:shadow-brand-600/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 duration-200"
                                >
                                    <PlusIcon className="w-5 h-5" strokeWidth={3} />
                                    Connect Your First Website
                                </button>
                                <div className="flex items-center justify-center gap-2 text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase">
                                    <CheckCircleIcon className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                                    Takes less than 2 minutes to set up
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── SITES LIST ─── */}
                {userSites.length > 0 && (
                    <div className="space-y-3">
                        {userSites.map((site) => {
                            const isActive = activeSiteId === site._id;
                            const disconnectedCount = [site.ga4PropertyId, site.gscSiteUrl, site.googleAdsCustomerId, site.facebookAdAccountId].filter(val => !val).length;
                            
                            return (
                                <div
                                    key={site._id}
                                    onClick={() => !isActive && handleSelect(site._id)}
                                    className={`relative flex flex-col md:grid md:grid-cols-[1.5fr_1.5fr_auto] gap-4 p-4 rounded-2xl border transition-all group ${
                                        isActive 
                                            ? 'bg-brand-50/50 dark:bg-brand-500/10 border-brand-200 dark:border-brand-500/30 border-l-4 border-l-brand-600 shadow-sm' 
                                            : 'bg-white dark:bg-dark-surface border-neutral-200 dark:border-neutral-800 hover:border-brand-300 dark:hover:border-brand-500/50 hover:shadow-md cursor-pointer'
                                    }`}
                                >
                                    {/* COLUMN 1: Identity */}
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                                            isActive 
                                                ? 'bg-white dark:bg-neutral-800 border-brand-200 dark:border-brand-500/30 text-brand-600 dark:text-brand-400 shadow-sm' 
                                                : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-100 dark:border-neutral-700 text-neutral-400 dark:text-neutral-500 group-hover:bg-brand-50 dark:group-hover:bg-brand-500/10 group-hover:text-brand-500 dark:group-hover:text-brand-400'
                                        }`}>
                                            <GlobeAltIcon className="w-5 h-5" />
                                        </div>
                                        <div className="overflow-hidden space-y-0.5">
                                            <h3 className="text-base font-black text-neutral-900 dark:text-white truncate tracking-tight">{site.siteName}</h3>
                                            {site.siteUrl && (
                                                <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate font-semibold">
                                                    {site.siteUrl}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 pt-0.5">
                                                {isActive ? (
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Active Now</span>
                                                ) : (
                                                    <span className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors">
                                                        Switch to site
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* COLUMN 2: Connected Platforms */}
                                    <div className="flex flex-col justify-center space-y-2">
                                        <div className="flex flex-wrap gap-1.5">
                                            <ToolBadge connected={!!site.ga4PropertyId} label="GA4" />
                                            <ToolBadge connected={!!site.gscSiteUrl} label="GSC" />
                                            <ToolBadge connected={!!site.googleAdsCustomerId} label="Ads" />
                                            <ToolBadge connected={!!site.facebookAdAccountId} label="Meta" />
                                        </div>
                                        {disconnectedCount > 0 && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleEdit(site._id); }}
                                                className="flex items-center gap-1 text-[10px] font-bold text-amber-600 hover:text-amber-700 transition-colors tracking-wide"
                                            >
                                                <ExclamationTriangleIcon className="w-3 h-3" />
                                                Connect {disconnectedCount} more platforms →
                                            </button>
                                        )}
                                    </div>

                                    {/* COLUMN 3: Actions */}
                                    <div className="flex items-center md:justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => handleSelect(site._id)}
                                            className="p-2 text-neutral-400 dark:text-neutral-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-white dark:hover:bg-neutral-800 rounded-lg transition-all border border-transparent hover:border-brand-100 dark:hover:border-brand-500/20"
                                            title="View Analytics"
                                        >
                                            <ChartBarIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleEdit(site._id)}
                                            className="p-2 text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-white dark:hover:bg-neutral-800 rounded-lg transition-all border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
                                            title="Edit Connections"
                                        >
                                            <PencilSquareIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(site._id, site.siteName)}
                                            className="p-2 text-neutral-400 dark:text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all border border-transparent hover:border-red-100 dark:hover:border-red-800/30"
                                            title="Delete Site"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {/* ─── FOOTER ─── */}
                        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 px-2 border-t border-neutral-100 dark:border-neutral-800 gap-4">
                            <p className="text-[11px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.2em]">
                                Showing {userSites.length} of {userSites.length} website{userSites.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default SitesPage;
