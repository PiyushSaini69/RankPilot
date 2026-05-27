    import React, { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
    import { useNavigate } from 'react-router-dom';
    import DashboardLayout from '../components/ui/DashboardLayout';
    import KpiCard from '../components/dashboard/KpiCard';
    import DataTable from '../components/dashboard/DataTable';
    import { useDateRangeStore } from '../store/dateRangeStore';
    import { useAccountsStore } from '../store/accountsStore';
    import api from '../api';
    import { getActiveAccounts } from '../api/accountApi';
    import {
        ChartBarIcon,
        SparklesIcon,
        GlobeAltIcon,
        UserCircleIcon,
        ArrowDownTrayIcon,
        ArrowPathIcon,
        ChevronRightIcon,
        ChevronDownIcon,
        CalendarIcon,
        CursorArrowRaysIcon,
        EyeIcon,
        ArrowTrendingUpIcon,
        HashtagIcon,
        MagnifyingGlassIcon,
        Square3Stack3DIcon,
        TrophyIcon,
        DocumentTextIcon
    } from '@heroicons/react/24/outline';
    import { exportToServerPdf } from '../utils/reportExport';
    import { 
        ResponsiveContainer, 
        AreaChart, Area, 
        LineChart, Line,
        BarChart, Bar,
        XAxis, YAxis, 
        Tooltip, CartesianGrid
    } from 'recharts';
    import { useFilterStore } from '../store/filterStore';
    import { useAiChatStore } from '../store/aiChatStore';

    const formatNumber = (num) => Number(num || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

    const GscLogo = ({ className = "w-5 h-5" }) => (
        <img src="https://www.gstatic.com/images/branding/product/2x/search_console_64dp.png" alt="GSC" className={`${className} object-contain`} />
    );

    const SectionAiSummary = ({ insight, loading, sectionTitle, title = "AI SUMMARY" }) => (
        <div className="mt-4 p-4 bg-brand-50/10 dark:bg-brand-500/5 border border-brand-100/50 dark:border-brand-500/20 rounded-[1.5rem] animate-in fade-in duration-700">
            <div className="flex items-center gap-2 mb-3">
                <h4 className="text-[10px] font-black text-neutral-900 dark:text-white uppercase tracking-[0.15em]">AI SUMMARY</h4>
            </div>
            {loading ? (
                <div className="space-y-2 animate-pulse mb-4">
                    <div className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full w-full" />
                    <div className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full w-[85%]" />
                </div>
            ) : (
                <p className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4">
                    {insight || "Analyzing section data for strategic intelligence..."}
                </p>
            )}
        </div>
    );

    const EmptyState = ({ message='No data for this period', sub='Try selecting a wider date range' }) => (
    <div className="flex flex-col items-center justify-center py-12 text-neutral-400 dark:text-neutral-500">
        <div className="text-4xl mb-3 opacity-50">📭</div>
        <p className="text-sm font-bold text-neutral-600 dark:text-neutral-300">{message}</p>
        <p className="text-xs mt-1 font-medium">{sub}</p>
    </div>
    );

    const GscPage = () => {
        const startDate = useDateRangeStore(s => s.startDate);
        const endDate = useDateRangeStore(s => s.endDate);
        const preset = useDateRangeStore(s => s.preset);
        const setPreset = useDateRangeStore(s => s.setPreset);
        const device = useFilterStore(s => s.device);

        const activeGscSite = useAccountsStore(s => s.gsc?.gscSiteUrl);
        const ga4 = useAccountsStore(s => s.ga4);
        const activeSiteId = useAccountsStore(s => s.activeSiteId);
        const activeSiteName = useAccountsStore(s => s.activeSiteName);
        const gsc = useAccountsStore(s => s.gsc);
        const setAccounts = useAccountsStore(s => s.setAccounts);
        
        const openWithQuestion = useAiChatStore(s => s.openWithQuestion);
        const navigate = useNavigate();
        const [loading, setLoading] = useState(false);
        
        const [data, setData] = useState(null);

        const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
        const [isCustomDateMode, setIsCustomDateMode] = useState(false);
        const [tempDateRange, setTempDateRange] = useState({ start: startDate, end: endDate });
        const [isExportingPdf, setIsExportingPdf] = useState(false);
        const [showAllLowCtr, setShowAllLowCtr] = useState(false);
        const [showAllNearPage1, setShowAllNearPage1] = useState(false);

        const presetLabels = {
            'today': 'Today',
            'yesterday': 'Yesterday',
            '7d': 'Last 7 Days',
            '28d': 'Last 28 Days',
            '90d': 'Last 90 Days',
            '1y': 'Last Year',
            'custom': 'Custom Range'
        };

        const handlePdfExport = async () => {
            setIsExportingPdf(true);
            try {
                await exportToServerPdf(window.location.pathname, `RankPilot-GSC-${activeGscSite?.siteName || 'Report'}`);
            } catch (error) {
                console.error('PDF Export failed:', error);
            } finally {
                setIsExportingPdf(false);
            }
        };

        const loadData = useCallback(async () => {
            if (!activeGscSite) return;
            setLoading(true);
            try {
                const query = new URLSearchParams({
                    startDate,
                    endDate,
                    device: device || 'all',
                    ...(activeSiteId && { siteId: activeSiteId })
                }).toString();
                
                const res = await api.get(`/analytics/gsc-summary?${query}`);
                const payload = res.data;

                setData(payload);

            } catch (err) {
                console.error("GSC fetch err", err);
            } finally {
                setLoading(false);
            }
        }, [activeGscSite, startDate, endDate, device, activeSiteId]);

        const handleDatePresetSelect = (p) => {
            if (p.value === 'custom') {
                setIsCustomDateMode(true);
                return;
            }
            const fmt = (d) => {
                const date = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
                return date.toISOString().split('T')[0];
            };
            let start = new Date();
            let end = new Date();
            if (p.value === 'yesterday') {
                start.setDate(start.getDate() - 1);
                end.setDate(end.getDate() - 1);
            } else if (p.value !== 'today') {
                start.setDate(start.getDate() - p.days);
            }
            setPreset(p.value, fmt(start), fmt(end));
            setIsDateMenuOpen(false);
            setIsCustomDateMode(false);
        };

        const handleApplyCustomDate = () => {
            setPreset('custom', tempDateRange.start, tempDateRange.end);
            setIsDateMenuOpen(false);
            setIsCustomDateMode(false);
        };

        useEffect(() => {
            setTempDateRange({ start: startDate, end: endDate });
        }, [startDate, endDate]);

        const handleManualRefresh = async () => {
            if (!activeSiteId) return;
            setLoading(true);
            setAccounts({ 
                syncStatus: 'syncing',
                gsc: {
                    gscSyncStatus: 'syncing'
                }
            });

            try {
                await api.post('/analytics/sync', { siteId: activeSiteId });
                const res = await getActiveAccounts(activeSiteId);
                const data = res.data || {};
                setAccounts({
                    syncStatus: data.syncStatus || 'idle',
                    gsc: {
                        gscHistoricalComplete: data.gscHistoricalComplete || false,
                        gscLastSyncedAt: data.gscLastSyncedAt || null,
                        gscSyncStatus: data.syncStatus || 'idle'
                    }
                });

                await loadData();
            } catch (err) {
                console.error('Manual sync failed:', err);
                const res = await getActiveAccounts(activeSiteId).catch(() => ({ data: {} }));
                const data = res.data || {};
                setAccounts({
                    syncStatus: data.syncStatus || 'error',
                    gsc: {
                        gscHistoricalComplete: data.gscHistoricalComplete || false,
                        gscLastSyncedAt: data.gscLastSyncedAt || null,
                        gscSyncStatus: data.syncStatus || 'error'
                    }
                });
                await loadData();
            } finally {
                setLoading(false);
            }
        };

        useEffect(() => {
            loadData();
        }, [loadData]);

        useEffect(() => {
            const interval = setInterval(() => {
                console.log('Auto-refreshing GSC data...');
                loadData();
            }, 30 * 60 * 1000);

            return () => clearInterval(interval);
        }, [loadData]);
        
        useEffect(() => {
            if (gsc?.gscSyncStatus !== 'syncing' && activeSiteId) {
                loadData();
            }
        }, [gsc?.gscSyncStatus, activeSiteId, loadData]);

        useEffect(() => {
            let interval;
            if (activeSiteId && gsc?.gscSyncStatus === 'syncing') {
                interval = setInterval(async () => {
                    try {
                        const res = await getActiveAccounts(activeSiteId);
                        const data = res.data || {};
                        setAccounts({
                            syncStatus: data.syncStatus || 'idle',
                            gsc: {
                                gscHistoricalComplete: data.gscHistoricalComplete || false,
                                gscLastSyncedAt: data.gscLastSyncedAt || null,
                                gscSyncStatus: data.gscSyncStatus || 'idle',
                                gscSyncProgress: data.gscSyncProgress || 0,
                                gscHistoricalChunkIndex: data.gscHistoricalChunkIndex || 0,
                                gscTokenEmail: data.gscTokenId?.email || null
                            }
                        });
                    } catch (e) {
                        console.error("Polling GSC sync status error", e);
                    }
                }, 3000);
            }
            return () => clearInterval(interval);
        }, [activeSiteId, gsc?.gscSyncStatus, setAccounts]);

        const isSyncing = gsc?.gscHistoricalComplete === false;
        const syncedDays = gsc?.gscHistoricalChunkIndex || 0;
        const syncProgress = gsc?.gscSyncProgress || 0;
        const totalSyncDays = 90;

        const isConnected = !!ga4?.ga4PropertyId || !!activeGscSite;
        const hasSite = !!activeGscSite;

        if (!isConnected || !hasSite) {
            const isMissingConn = !isConnected;
            return (
                <DashboardLayout>
                    <div className="h-full flex flex-col items-center justify-center p-4 min-h-[60vh] animate-in fade-in zoom-in-95 duration-700">
                        <div className="relative w-full max-w-xl bg-white dark:bg-[#0d0d0d] rounded-[2.5rem] border border-neutral-200/60 dark:border-neutral-800 shadow-2xl shadow-brand-500/5 overflow-hidden group">
                            
                            {/* Animated Gradient Background Glow */}
                            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-500/5 dark:bg-brand-500/10 rounded-full blur-[120px] -mr-32 -mt-32 transition-colors group-hover:bg-brand-500/15 duration-1000"></div>
                            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-[120px] -ml-32 -mb-32 transition-colors group-hover:bg-amber-500/15 duration-1000"></div>

                            <div className="relative z-10 px-6 py-12 flex flex-col items-center text-center">
                                
                                {/* Icon Logic */}
                                <div className="relative mb-8">
                                    <div className="w-24 h-24 bg-white dark:bg-neutral-800/80 rounded-[2rem] flex items-center justify-center shadow-xl border border-neutral-100 dark:border-neutral-700 relative overflow-hidden group-hover:scale-105 transition-transform duration-500">
                                        <GscLogo className="w-14 h-14 grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" />
                                        
                                        {/* Disconnected Pulse */}
                                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full border-4 border-white dark:border-[#0d0d0d] flex items-center justify-center">
                                            <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_8px_white]"></div>
                                        </div>
                                    </div>
                                    <div className="absolute inset-0 bg-brand-500/10 blur-3xl rounded-full scale-150 rotate-45 -z-10 animate-pulse"></div>
                                </div>

                                <div className="space-y-3 max-w-md">
                                    <h1 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tighter leading-tight">
                                        {isMissingConn ? 'Search Console Disconnected' : 'Select GSC Website'}
                                    </h1>
                                    <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400 leading-relaxed italic">
                                        {isMissingConn 
                                            ? "Connect Google Search Console to monitor organic keywords, track rankings, and unlock search performance intelligence."
                                            : "Select your verified Search Console site below to align your organic search data with RankPilot's AI mapping."
                                        }
                                    </p>
                                </div>

                                <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center justify-center">
                                    <button 
                                        onClick={() => navigate('/connect-accounts')} 
                                        className="px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-[.2em] shadow-xl shadow-brand-500/30 active:scale-95 transition-all flex items-center gap-3"
                                    >
                                        {isMissingConn ? 'Connect Search Console' : 'Select Website'}
                                        <ArrowPathIcon className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Decorative Feature List */}
                                <div className="mt-16 grid grid-cols-3 gap-6 w-full opacity-30 group-hover:opacity-60 transition-opacity duration-1000 border-t border-neutral-100 dark:border-neutral-800/50 pt-10">
                                    {[
                                        { label: 'Search Clicks', icon: CursorArrowRaysIcon },
                                        { label: 'Search Impressions', icon: EyeIcon },
                                        { label: 'Average Position', icon: HashtagIcon }
                                    ].map((f, i) => (
                                        <div key={i} className="flex flex-col items-center gap-2">
                                            <f.icon className="w-5 h-5 text-neutral-400" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">{f.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                                    
                    </div>
                </DashboardLayout>
            );
        }

        return (
            <DashboardLayout>
                <div id="gsc-report" className="flex flex-col space-y-4 md:space-y-8 p-0 md:p-2">
                    {isSyncing && (
                        <div className="relative overflow-hidden w-full bg-white dark:bg-[#0d0d0d] border border-amber-500/30 dark:border-amber-500/20 rounded-[2rem] p-6 shadow-xl shadow-amber-500/5 animate-in fade-in slide-in-from-top-4 duration-1000 group">
                            {/* Decorative background glows */}
                            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none transition-transform duration-1000 group-hover:scale-110"></div>
                            <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-500/5 rounded-full blur-[100px] pointer-events-none transition-transform duration-1000 group-hover:scale-110"></div>

                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-5">
                                    {/* Dynamic animated sync icon */}
                                    <div className="relative shrink-0 w-14 h-14 bg-amber-500/10 rounded-[1.25rem] border border-amber-500/20 flex items-center justify-center overflow-hidden">
                                        <ArrowPathIcon className={`w-7 h-7 text-amber-500 ${gsc?.gscSyncStatus === 'syncing' ? 'animate-spin' : 'animate-pulse'}`} />
                                        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/0 via-amber-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 duration-700 transition-opacity"></div>
                                    </div>

                                    <div className="space-y-1.5 text-left">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-[0.15em]">
                                                Syncing Historical Data
                                            </h3>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                                                {gsc?.gscSyncStatus === 'syncing' ? 'Importing Data' : 'In Queue'}
                                            </span>
                                        </div>
                                        <p className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-2xl italic">
                                            We are importing your historical Google Search Console data. Your dashboard metrics, search trends, and AI insights will automatically populate and update as the sync progresses.
                                        </p>
                                    </div>
                                </div>

                                {/* Premium progress interface */}
                                <div className="w-full md:w-72 space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-neutral-400">
                                        <span>Sync Progress</span>
                                        <span className="tabular-nums font-black text-amber-500">
                                            {syncProgress ? `${syncProgress}%` : 'Starting...'}
                                        </span>
                                    </div>
                                    <div className="relative h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden border border-neutral-200/20">
                                        <div 
                                            className="h-full bg-gradient-to-r from-amber-500 to-brand-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(245,158,11,0.5)]" 
                                            style={{ width: `${syncProgress || 5}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between items-center text-[9px] font-bold text-neutral-400">
                                        <span>
                                            Days Synced: <span className="text-amber-500 font-black tabular-nums">{syncedDays}</span> / {totalSyncDays} Days
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                                            Live Sync Active
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Compact Professional Header */}
                    <div className={`bg-white dark:bg-[#0d0d0d] px-4 md:px-6 py-4 rounded-[1.5rem] border border-neutral-100 dark:border-neutral-800 shadow-sm relative transition-all duration-300 ${isDateMenuOpen ? 'z-50' : 'z-10'}`}>
                        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center gap-6 xl:gap-10">
                            {/* 1. Logo & Identity Section */}
                            <div className="flex items-center gap-4 shrink-0">
                                <div className="w-12 h-12 bg-white dark:bg-neutral-800/80 rounded-xl flex items-center justify-center shrink-0 border border-neutral-100 dark:border-neutral-700 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                                    <GscLogo className="w-7 h-7" />
                                </div>
                                <div className="flex flex-col justify-center">
                                    <div className="flex items-center gap-2.5">
                                        <h1 className="text-lg md:text-xl font-black text-neutral-900 dark:text-white tracking-tight leading-none">Google Search Console</h1>
                                        {activeSiteName && (
                                            <div className="px-2 py-0.5 bg-neutral-900 dark:bg-neutral-800 text-white rounded text-[7px] font-black uppercase tracking-widest">
                                                {activeSiteName}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium leading-none mt-1.5 selection:bg-brand-500/20">
                                        Monitor your search performance and optimize keywords with AI-powered SEO intelligence.
                                    </p>
                                    <div className="mt-2.5 flex items-center gap-3">
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/5 rounded-full border border-emerald-500/10 w-fit hide-in-pdf">
                                            <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
                                            <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest whitespace-nowrap">Active</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="flex items-center gap-1.5 text-[9px] text-neutral-400 font-bold uppercase tracking-widest whitespace-nowrap hide-in-pdf">
                                                Synced: <span className={`tabular-nums font-black ${isSyncing ? 'text-amber-500' : 'text-neutral-700 dark:text-neutral-300'}`}>
                                                    {isSyncing ? 'Syncing...' : gsc?.gscLastSyncedAt ? formatDistanceToNow(new Date(gsc.gscLastSyncedAt), { addSuffix: true }) : 'Never'}
                                                </span>
                                                <button onClick={handleManualRefresh} className="hover:text-brand-500 transition-all active:rotate-180 ml-1">
                                                    <ArrowPathIcon className={`w-3 h-3 ${(loading || isSyncing) ? 'animate-spin' : ''}`} />
                                                </button>
                                            </div>
                                            <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block hide-in-pdf"></div>
                                            <div className="relative">
                                                <button
                                                    onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
                                                    className={`flex items-center gap-2 px-2.5 py-1 transition-all active:scale-95 group/date rounded-full border shadow-sm ${isDateMenuOpen
                                                        ? 'bg-brand-600 border-brand-500 text-white'
                                                        : 'bg-white/50 dark:bg-dark-surface/50 border-neutral-200/50 dark:border-neutral-800/60'
                                                        }`}
                                                >
                                                    <CalendarIcon className={`w-3.5 h-3.5 ${isDateMenuOpen ? 'text-white' : 'text-brand-600'}`} />
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isDateMenuOpen ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'}`}>
                                                        {preset === 'custom' ? 'Range' : (presetLabels[preset] || preset)}
                                                    </span>
                                                    <ChevronDownIcon className={`w-3 h-3 transition-transform ${isDateMenuOpen ? 'rotate-180 opacity-100' : 'opacity-40'}`} />
                                                </button>
                                                {isDateMenuOpen && (
                                                    <div className="absolute top-full left-0 mt-2 z-[100] bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-1.5 min-w-[160px] animate-in fade-in zoom-in-95 duration-200 normal-case tracking-normal">
                                                        {!isCustomDateMode ? (
                                                            <>
                                                                {[
                                                                    { label: 'Today', value: 'today', days: 0 },
                                                                    { label: 'Yesterday', value: 'yesterday', days: 1 },
                                                                    { label: 'Last 7 Days', value: '7d', days: 7 },
                                                                    { label: 'Last 28 Days', value: '28d', days: 28 },
                                                                    { label: 'Last 90 Days', value: '90d', days: 90 },
                                                                    { label: 'Last Year', value: '1y', days: 365 },
                                                                    { label: 'Custom Range', value: 'custom', icon: CalendarIcon },
                                                                ].map((p) => (
                                                                    <button
                                                                        key={p.value}
                                                                        onClick={() => handleDatePresetSelect(p)}
                                                                        className={`w-full text-left px-3 py-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-between ${preset === p.value
                                                                            ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                                                                            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                                                            }`}
                                                                    >
                                                                        {p.label}
                                                                        {p.value === 'custom' && <ChevronRightIcon className="w-3 h-3 opacity-50" />}
                                                                    </button>
                                                                ))}
                                                            </>
                                                        ) : (
                                                            <div className="p-2 space-y-3">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] font-black uppercase text-neutral-400">Custom</span>
                                                                    <button onClick={() => setIsCustomDateMode(false)} className="text-[10px] font-bold text-brand-600 hover:underline">Back</button>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <div>
                                                                        <label className="text-[8px] font-black text-neutral-400 uppercase ml-1">Start</label>
                                                                        <input
                                                                            type="date"
                                                                            value={tempDateRange.start}
                                                                            onChange={(e) => setTempDateRange({ ...tempDateRange, start: e.target.value })}
                                                                            className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none text-neutral-900 dark:text-white"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[8px] font-black text-neutral-400 uppercase ml-1">End</label>
                                                                        <input
                                                                            type="date"
                                                                            value={tempDateRange.end}
                                                                            onChange={(e) => setTempDateRange({ ...tempDateRange, end: e.target.value })}
                                                                            className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none text-neutral-900 dark:text-white"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={handleApplyCustomDate}
                                                                    className="w-full py-2 bg-brand-600 text-white text-[10px] font-black rounded-lg shadow-lg shadow-brand-500/20 active:scale-95 transition-all"
                                                                >
                                                                    APPLY RANGE
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Divider (Desktop) */}
                            <div className="hidden xl:block w-[1px] h-8 bg-neutral-100 dark:bg-neutral-800/60"></div>

                            {/* 3. Information Row */}
                            <div className="flex-1 flex flex-wrap items-center gap-x-10 gap-y-3">
                                {[
                                    { label: 'PROPERTY URL', value: gsc?.gscSiteUrl?.replace('https://', '').replace('http://', '') || 'UnKnown', icon: GlobeAltIcon },
                                    { label: 'SYNC ACCOUNT', value: gsc?.gscTokenEmail || 'UnKnown', icon: UserCircleIcon }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2.5 min-w-max">
                                        <div className="w-8 h-8 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 flex items-center justify-center border border-neutral-100 dark:border-neutral-700/30">
                                            <item.icon className="w-4 h-4 text-neutral-400" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[7px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-0.5">{item.label}</span>
                                            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-200 tracking-tight" title={item.value}>{item.value}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* 4. Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
                                <button
                                    onClick={() => {
                                        const fullPrompt = `Act as my elite Organic Search Coach and SEO Growth Strategist. I want you to perform a deep-dive, professional technical SEO audit of my Google Search Console (GSC) dashboard for the period ${startDate} to ${endDate}.
 
                                            Here is the COMPLETE raw analytical SEO dataset of my site's Search Console integration:
 
                                            📊 [CORE PERFORMANCE METRICS]
                                            - Search Clicks: ${formatNumber(data?.searchClicks?.value)} (${data?.searchClicks?.change}% vs prior period)
                                            - Search Impressions: ${formatNumber(data?.impressions?.value)} (${data?.impressions?.change}% vs prior period)
                                            - Average CTR: ${(data?.avgCTR?.value || 0).toFixed(2)}% (${data?.avgCTR?.change}% vs prior period)
                                            - Average Ranking Position: #${(data?.avgPosition?.value || 0).toFixed(1)} (${data?.avgPosition?.change}% vs prior period)
 
                                            📈 [SUMMARY METRICS]
                                            - Total Indexed/Ranking Queries: ${formatNumber(data?.totalQueries)}
                                            - Total Landing Pages: ${formatNumber(data?.totalPages)}
                                            - Best ranking position reached: #${data?.topPosition?.toFixed(1) || '0.0'}
 
                                            📣 [TOP TRAFFIC SEARCH QUERIES]
                                            ${(data?.topQueries || []).slice(0, 30).map((q, idx) => `${idx + 1}. Query: "${q.query}" | Clicks: ${formatNumber(q.clicks)} | Impressions: ${formatNumber(q.impressions)} | CTR: ${q.ctr.toFixed(2)}% | Pos: #${q.position?.toFixed(1)}`).join('\n')}
 
                                            📝 [TOP ORGANIC LANDING PAGES]
                                            ${(data?.topLandingPages || []).slice(0, 30).map((p, idx) => `${idx + 1}. Page: ${p.page} | Clicks: ${formatNumber(p.clicks)} | Impressions: ${formatNumber(p.impressions)} | CTR: ${p.ctr.toFixed(2)}% | Pos: #${p.position?.toFixed(1)}`).join('\n')}
 
                                            💡 [LOW CTR KEYWORD OPPORTUNITIES]
                                            ${(data?.lowCTRKeywords || []).slice(0, 30).map((q, idx) => `${idx + 1}. Query: "${q.query}" | Clicks: ${formatNumber(q.clicks)} | Impressions: ${formatNumber(q.impressions)} | CTR: ${q.ctr.toFixed(1)}% | Pos: #${q.position?.toFixed(1)}`).join('\n')}
 
                                            🚀 [KEYWORDS NEAR PAGE 1 (RANKING #8 - #20)]
                                            ${(data?.keywordsNearPage1 || []).slice(0, 30).map((q, idx) => `${idx + 1}. Query: "${q.query}" | Clicks: ${formatNumber(q.clicks)} | Impressions: ${formatNumber(q.impressions)} | CTR: ${q.ctr.toFixed(1)}% | Pos: #${q.position?.toFixed(1)}`).join('\n')}
 
                                            ---
 
                                            Based on this complete Search Console dataset, please deliver:
                                            1. A **Comprehensive SEO Executive Audit** summarizing the organic trajectory, CTR health, and ranking shifts.
                                            2. A **Query-to-Landing-Page Correlation Audit** identifying low-hanging opportunities where keywords rank well but pages underperform or miss metadata CTR potential.
                                            3. A **3-Part Actionable On-Page & Off-Page Ranking Blueprint** to push Near Page 1 terms into the Top 5 results and optimize meta titles/descriptions to fix Low CTR issues.`;
                                        openWithQuestion(fullPrompt);
                                    }}
                                    className="h-9 md:h-8 px-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm w-full sm:w-auto"
                                >
                                    <SparklesIcon className="w-3.5 h-3.5" />
                                    AI SUMMARY
                                </button>
                                <button
                                    onClick={handlePdfExport}
                                    disabled={isExportingPdf}
                                    className={`h-9 md:h-8 px-3 bg-white dark:bg-neutral-800/20 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-lg text-[9px] font-black tracking-widest flex items-center justify-center gap-2 hover:bg-neutral-50 transition-all w-full sm:w-auto ${isExportingPdf ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isExportingPdf ? (
                                        <div className="w-3.5 h-3.5 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                                    )}
                                    {isExportingPdf ? 'GENERATING' : 'PDF REPORT'}
                                </button>
                            </div>
                        </div>
                    </div>



                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <KpiCard
                            title="Search Clicks"
                            value={formatNumber(data?.searchClicks?.value || 0)}
                            loading={loading || isSyncing}
                            Icon={CursorArrowRaysIcon}
                            change={data?.searchClicks?.change || 0}
                            isPositive={data?.searchClicks?.isPositive}
                            changeText="vs last period"
                            chartData={(data?.searchClicks?.timeseries || []).map(d => d.clicks).slice(-30)}
                            insight={data?.intelligence?.searchClicks}
                            onClick={() => {
                                const clicksTrendStr = (data?.searchClicks?.timeseries || []).map(d => d.clicks).join(', ');
                                openWithQuestion(`Act as my elite SEO Growth Strategist. Let's perform a detailed, professional analysis of my organic search clicks.
Here is the complete dataset for this section:
- Total Clicks this period: ${formatNumber(data?.searchClicks?.value || 0)}
- Click shift: ${data?.searchClicks?.change || 0}% vs last period
- Daily Click Trend values: [${clicksTrendStr}]

Based on this click trend, what is your expert analysis and what strategies should we deploy to accelerate click growth?`);
                            }}
                            contextPrompt={`Analyze my Google Search Console clicks. Current clicks: ${formatNumber(data?.searchClicks?.value || 0)} vs Prior: ${formatNumber(data?.periodComparison?.lastPeriod?.clicks || 0)}. Growth: ${data?.searchClicks?.change || 0}%. What strategies can I use to further accelerate this click growth?`}
                        />
                        <KpiCard
                            title="Impressions"
                            value={formatNumber(data?.impressions?.value || 0)}
                            loading={loading || isSyncing}
                            Icon={EyeIcon}
                            change={data?.impressions?.change || 0}
                            isPositive={data?.impressions?.isPositive}
                            changeText="vs last period"
                            chartData={(data?.impressions?.timeseries || []).map(d => d.impressions).slice(-30)}
                            insight={data?.intelligence?.impressions}
                            onClick={() => {
                                const impressionsTrendStr = (data?.impressions?.timeseries || []).map(d => d.impressions).join(', ');
                                openWithQuestion(`Act as my elite SEO Growth Strategist. Let's perform a detailed, professional analysis of my organic search visibility (Impressions).
Here is the complete dataset for this section:
- Total Impressions this period: ${formatNumber(data?.impressions?.value || 0)}
- Impression shift: ${data?.impressions?.change || 0}% vs last period
- Daily Impression Trend values: [${impressionsTrendStr}]

Based on this visibility trend, what is your expert analysis and what strategies can we deploy to expand our search volume in SERPs?`);
                            }}
                            contextPrompt={`Analyze my GSC search visibility. Current Impressions: ${formatNumber(data?.impressions?.value || 0)} vs Prior: ${formatNumber(data?.periodComparison?.lastPeriod?.impressions || 0)}. Change: ${data?.impressions?.change || 0}%. Am I appearing for the right kind of search queries?`}
                        />
                        <KpiCard
                            title="Avg. CTR"
                            value={`${(data?.avgCTR?.value || 0).toFixed(2)}%`}
                            loading={loading || isSyncing}
                            Icon={ArrowTrendingUpIcon}
                            change={data?.avgCTR?.change || 0}
                            isPositive={data?.avgCTR?.isPositive}
                            changeText="vs last period"
                            chartData={(data?.avgCTR?.timeseries || []).map(d => d.ctr).slice(-30)}
                            insight={data?.intelligence?.avgCtr}
                            onClick={() => {
                                const ctrTrendStr = (data?.avgCTR?.timeseries || []).map(d => `${d.ctr}%`).join(', ');
                                openWithQuestion(`Act as my elite SEO Growth Strategist. Let's perform a detailed, professional analysis of my average organic Click-Through Rate (CTR).
Here is the complete dataset for this section:
- Average CTR this period: ${(data?.avgCTR?.value || 0).toFixed(2)}%
- CTR shift: ${data?.avgCTR?.change || 0}% vs last period
- Daily CTR Trend values: [${ctrTrendStr}]

Based on this CTR trend, how can we optimize our snippets to maximize click-through rates?`);
                            }}
                            contextPrompt={`Analyze my Click-Through Rate (CTR). Current CTR: ${(data?.avgCTR?.value || 0).toFixed(2)}% vs Prior: ${(data?.periodComparison?.lastPeriod?.ctr || 0).toFixed(2)}%. Change: ${data?.avgCTR?.change || 0}%. How can I make my search snippets more attractive to users in the search results?`}
                        />
                        <KpiCard
                            title="Avg. Position"
                            value={(data?.avgPosition?.value || 0).toFixed(1)}
                            loading={loading || isSyncing}
                            Icon={HashtagIcon}
                            change={data?.avgPosition?.change || 0}
                            isPositive={data?.avgPosition?.isPositive}
                            changeText="vs last period"
                            chartData={(data?.avgPosition?.timeseries || []).map(d => d.position).slice(-30)}
                            insight={data?.intelligence?.avgPosition}
                            onClick={() => {
                                const positionTrendStr = (data?.avgPosition?.timeseries || []).map(d => `#${d.position}`).join('\n');
                                openWithQuestion(`Act as my elite SEO Ranking Coach. Let's perform a detailed, professional analysis of my Average Ranking Position.
Here is the complete dataset for this section:
- Average Position this period: #${(data?.avgPosition?.value || 0).toFixed(1)}
- Position shift: ${data?.avgPosition?.change || 0}% vs last period
- Daily Position Trend values: [${positionTrendStr}]

Based on this ranking trajectory, what is your expert analysis and how can we push our average position closer to page 1?`);
                            }}
                            contextPrompt={`Analyze my average search position. Current: #${(data?.avgPosition?.value || 0).toFixed(1)} vs Prior: #${(data?.periodComparison?.lastPeriod?.position || 0).toFixed(1)}. Change: ${data?.avgPosition?.change || 0}%. What is the best way to move my overall rankings closer to position #1?`}
                        />
                    </div>

                    {/* ADD 2 — Summary Strip */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {[
                            { label: 'Total Queries', value: formatNumber(data?.totalQueries || 0), icon: <MagnifyingGlassIcon className="w-5 h-5 text-blue-500" />, insight: data?.intelligence?.totalQueries },
                            { label: 'Total Pages', value: formatNumber(data?.totalPages || 0), icon: <Square3Stack3DIcon className="w-5 h-5 text-emerald-500" />, insight: data?.intelligence?.totalPages },
                            { label: 'Top Position', value: data?.topPosition > 0 ? `#${data.topPosition.toFixed(1)}` : '—', icon: <TrophyIcon className="w-5 h-5 text-amber-500" />, insight: data?.intelligence?.topPosition }
                        ].map((card, idx) => (
                            <div key={idx} className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 shadow-sm group hover:border-brand-500/30 transition-all flex flex-col">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 flex items-center justify-center border border-neutral-100 dark:border-neutral-700/50 group-hover:scale-110 transition-transform">
                                        {card.icon}
                                    </div>
                                    <div>
                                        <div className="text-xl font-black text-neutral-900 dark:text-white tabular-nums">
                                            {(loading || isSyncing) ? <div className="h-6 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /> : card.value}
                                        </div>
                                        <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mt-0.5">{card.label}</div>
                                    </div>
                                </div>
                                {card.insight && !(loading || isSyncing) && (
                                    <p className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 leading-relaxed italic border-t border-neutral-50 dark:border-neutral-800 pt-2 mt-auto">
                                        "{card.insight}"
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Performance Resonance Section */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col min-h-[350px] md:min-h-[380px] group relative">
                        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-blue-500/5">
                            <div>
                                <h3 className="text-lg font-black text-neutral-900 dark:text-white">Search Performance Overview</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mt-1">{presetLabels[preset] || 'Custom Range'}</p>
                            </div>
                            <div className="p-2 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const dailyDataStr = (data?.searchPerformanceOverview || []).map(d => `- Date: ${d.date} | Clicks: ${d.clicks} | Impressions: ${d.impressions}`).join('\n');
                                        openWithQuestion(`Act as my elite SEO Growth Strategist and Analytics Expert. Please perform a detailed analysis of my Search Performance Overview.
Here is the complete daily dataset for the selected period (${startDate} to ${endDate}) used in this chart:
- Current Period Clicks: ${formatNumber(data?.searchClicks?.value || 0)} (${data?.searchClicks?.change || 0}% change vs prior)
- Current Period Impressions: ${formatNumber(data?.impressions?.value || 0)} (${data?.impressions?.change || 0}% change vs prior)
- Prior Period Clicks: ${formatNumber(data?.periodComparison?.lastPeriod?.clicks || 0)}
- Prior Period Impressions: ${formatNumber(data?.periodComparison?.lastPeriod?.impressions || 0)}

Daily Click & Impression Trend:
${dailyDataStr}

What significant trends, organic visibility spikes, seasonal patterns, or performance anomalies do you identify? Provide detailed actionable insights based on this data.`);
                                    }}
                                    className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                >
                                    <SparklesIcon className="w-3.5 h-3.5" />
                                    ASK AI
                                </button>
                                <div className="w-10 h-10 flex items-center justify-center bg-blue-500 rounded-xl">
                                    <ChartBarIcon className="w-5 h-5 text-white" />
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex-1 p-6 min-h-[280px]">
                            {(loading || isSyncing) ? (
                                <div className="w-full h-full animate-pulse bg-gradient-to-r from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-800/50 rounded-xl"></div>
                            ) : (data?.searchPerformanceOverview || []).length === 0 ? (
                                <EmptyState />
                            ) : (
                                <>
                                <ResponsiveContainer width="100%" height={280}>
                                    <AreaChart data={data?.searchPerformanceOverview || []} margin={{ top: 10, right: 30, left: -20, bottom: 20 }}>
                                        <defs>
                                            <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-neutral-800" opacity={0.5} />
                                        <XAxis 
                                            dataKey="date" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }} 
                                            dy={10} 
                                            interval={(data?.searchPerformanceOverview || []).length > 15 ? 4 : 2}
                                            tickFormatter={(val) => {
                                                const d = new Date(val);
                                                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                            }}
                                        />
                                        <YAxis 
                                            yAxisId="left"
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 10, fill: '#3B82F6', fontWeight: 'bold' }} 
                                            tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} 
                                        />
                                        <YAxis 
                                            yAxisId="right"
                                            orientation="right"
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 10, fill: '#10B981', fontWeight: 'bold' }} 
                                            tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} 
                                        />
                                        <Tooltip 
                                        labelFormatter={(label) => {
                                                const d = new Date(label);
                                                return d.toLocaleDateString('en-US', { 
                                                    month: 'short', day: 'numeric', year: 'numeric' 
                                                });
                                            }}
                                            formatter={(value, name) => [value.toLocaleString(), name]}
                                            contentStyle={{ 
                                                borderRadius: '16px', 
                                                border: 'none', 
                                                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                                background: document.documentElement.classList.contains('dark') ? '#111827' : 'rgba(255, 255, 255, 0.95)',
                                                padding: '12px',
                                                color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#111827'
                                            }} 
                                            itemStyle={{ fontWeight: '900', fontSize: '12px' }} 
                                        />
                                        <Area yAxisId="left" type="monotone" dataKey="clicks" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorClicks)" name="Clicks" strokeLinecap="round" />
                                        <Area yAxisId="right" type="monotone" dataKey="impressions" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorImpressions)" name="Impressions" strokeLinecap="round" strokeDasharray="5 3" />
                                    </AreaChart>
                                </ResponsiveContainer>
                                <div className="flex items-center gap-6 mt-3 px-2">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
                                        <div className="w-3 h-3 rounded-full bg-blue-500"/>Clicks
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
                                        <div className="w-3 h-3 rounded-sm bg-green-500 border border-green-200 border-dashed"/>Impressions
                                    </div>
                                </div>
                                </>
                            )}
                        </div>
                        <div className="px-8 pb-8">
                            <SectionAiSummary 
                                insight={data?.intelligence?.searchPerformanceOverview} 
                                loading={loading || isSyncing} 
                                sectionTitle="AI PERFORMANCE INSIGHT"
                            />
                        </div>
                    </div>

                    {/* ADD 3 — CTR Trend + Position Trend charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* CTR Trend */}
                        <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-sm font-black text-neutral-900 dark:text-white">Click-Through Rate Trend</h3>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => {
                                            const dailyCtrStr = (data?.clickThroughRateTrend || []).map(d => `- Date: ${d.date} | CTR: ${d.ctr}%`).join('\n');
                                            openWithQuestion(`Act as my elite SEO Growth Strategist. Analyze my GSC Click-Through Rate (CTR) Trend.
Here is the complete daily CTR dataset for the selected period (${startDate} to ${endDate}) used in this chart:
- Current Average CTR: ${(data?.avgCTR?.value || 0).toFixed(2)}% (${data?.avgCTR?.change || 0}% change vs prior)
- Prior Average CTR: ${(data?.periodComparison?.lastPeriod?.ctr || 0).toFixed(2)}%

Daily CTR Trend:
${dailyCtrStr}

Please evaluate our click engagement profile. Is the clickability of our search snippets improving or declining over this range? What are the key takeaways, and how can we optimize our snippets to maximize search CTR?`);
                                        }}
                                        className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                        ASK AI
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-neutral-400 mb-4">Daily CTR for selected period</p>
                            {(loading || isSyncing) ? (
                                <div className="h-48 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse"/>
                            ) : (data?.clickThroughRateTrend || []).length === 0 ? (
                                <EmptyState />
                            ) : (
                                <ResponsiveContainer width="100%" height={190}>
                                    <AreaChart data={data?.clickThroughRateTrend || []} margin={{top:5, right:10, left:-20, bottom:15}}>
                                        <defs>
                                            <linearGradient id="ctrGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%"  stopColor="#8B5CF6" stopOpacity={0.15}/>
                                                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" className="dark:stroke-neutral-800/20"/>
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize:10, fill:'#9CA3AF'}} dy={10}
                                        interval={(data?.clickThroughRateTrend || []).length > 15 ? 4 : 2}
                                        tickFormatter={(val) => {
                                            const d = new Date(val);
                                            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                        }}/>
                                        <YAxis axisLine={false} tickLine={false} tick={{fontSize:10, fill:'#9CA3AF'}} tickFormatter={v=>`${v}%`}/>
                                        <Tooltip
                                        labelFormatter={(label) => {
                                            const d = new Date(label);
                                            return d.toLocaleDateString('en-US', { 
                                                month: 'short', day: 'numeric', year: 'numeric' 
                                            });
                                        }} 
                                        formatter={v=>[`${v}%`, 'CTR']} 
                                        contentStyle={{
                                                borderRadius:'12px', 
                                                border:'none', 
                                                fontSize:'12px',
                                                background: document.documentElement.classList.contains('dark') ? '#111827' : '#FFFFFF',
                                                color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#111827'
                                            }}
                                        />
                                        <Area type="monotone" dataKey="ctr" stroke="#8B5CF6" strokeWidth={2.5} fill="url(#ctrGrad)" name="CTR %" dot={false}/>
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                            <div className="mt-4">
                                <SectionAiSummary insight={data?.intelligence?.clickThroughRateTrend} loading={loading || isSyncing} sectionTitle="AI CTR INSIGHT" />
                            </div>
                        </div>

                        {/* Position Trend */}
                        <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-sm font-black text-neutral-900 dark:text-white">Average Ranking Position</h3>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => {
                                            const dailyPosStr = (data?.averageRankingPosition || []).map(d => `- Date: ${d.date} | Avg Position: #${d.position}`).join('\n');
                                            openWithQuestion(`Act as my elite SEO Ranking Coach. Analyze my Average Ranking Position trend.
Here is the complete daily average position dataset for the selected period (${startDate} to ${endDate}) used in this chart:
- Current Average Position: #${(data?.avgPosition?.value || 0).toFixed(1)} (${data?.avgPosition?.change || 0}% change vs prior)
- Prior Average Position: #${(data?.periodComparison?.lastPeriod?.position || 0).toFixed(1)}

Daily Position Trend:
${dailyPosStr}

Based on this keyword ranking trajectory, are our search positions climbing, stabilizing, or slipping over time? What is the best SEO playbook to optimize our content structure to lift our overall positions in Google's index?`);
                                        }}
                                        className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                        ASK AI
                                    </button>
                                    <span className="text-xs font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-full border border-amber-100 dark:border-amber-800">Lower rank = Better</span>
                                </div>
                            </div>
                            <p className="text-xs text-neutral-400 mb-4">Daily position for selected period</p>
                            {(loading || isSyncing) ? (
                                <div className="h-48 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse"/>
                            ) : (data?.averageRankingPosition || []).length === 0 ? (
                                <EmptyState />
                            ) : (
                                <ResponsiveContainer width="100%" height={190}>
                                    <LineChart data={data?.averageRankingPosition || []} margin={{top:5, right:10, left:-20, bottom:15}}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" className="dark:stroke-neutral-800/20"/>
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize:10, fill:'#9CA3AF'}} dy={10}
                                        interval={(data?.averageRankingPosition || []).length > 15 ? 4 : 2}
                                        tickFormatter={(val) => {
                                            const d = new Date(val);
                                            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                        }}/>
                                        <YAxis axisLine={false} tickLine={false} tick={{fontSize:10, fill:'#9CA3AF'}} reversed={true} domain={[1, 'auto']}/>
                                        <Tooltip 
                                        labelFormatter={(label) => {
                                            const d = new Date(label);
                                            return d.toLocaleDateString('en-US', { 
                                                month: 'short', day: 'numeric', year: 'numeric' 
                                            });
                                        }}
                                        formatter={v=>[`#${v}`, 'Position']} 
                                        contentStyle={{
                                                borderRadius:'12px', 
                                                border:'none', 
                                                fontSize:'12px',
                                                background: document.documentElement.classList.contains('dark') ? '#111827' : '#FFFFFF',
                                                color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#111827'
                                            }}
                                        />
                                        <Line type="monotone" dataKey="position" stroke="#F59E0B" strokeWidth={2.5} dot={false} name="Avg Position"/>
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                            <div className="mt-4">
                                <SectionAiSummary insight={data?.intelligence?.averageRankingPosition} loading={loading || isSyncing} sectionTitle="AI POSITION INSIGHT" />
                            </div>
                        </div>
                    </div>

                    {/* ADD 4 — Keyword Opportunities Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Low CTR Opportunities */}
                        <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm flex flex-col">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-sm font-black text-neutral-900 dark:text-white">💡 Low CTR Keywords</h3>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => {
                                            const allLowCtrStr = (data?.lowCTRKeywords || []).map((q, idx) => `${idx + 1}. Keyword: "${q.query}" | Impressions: ${formatNumber(q.impressions)} | Clicks: ${formatNumber(q.clicks)} | CTR: ${q.ctr.toFixed(1)}% | Avg Position: #${q.position?.toFixed(1)}`).join('\n');
                                            openWithQuestion(`Act as my elite SEO Growth Strategist. I want you to perform a thorough content and metadata optimization audit of my Low CTR Keywords (keywords with high search visibility/impressions but sub-optimal clicks).
    
Here is the COMPLETE dataset of Low CTR keyword opportunities from this section:
${allLowCtrStr}

Based on this complete list, please analyze:
1. Which keywords are our highest priority based on impression volume?
2. What are the likely causes for their low Click-Through Rates (e.g. alignment with search intent, unappealing meta titles/descriptions, ranking in position clusters where rich snippets are dominant)?
3. A step-by-step metadata optimization blueprint and search intent audit plan to capture our missed click opportunities.`);
                                        }}
                                        className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                        ASK AI
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-neutral-400 mb-4">These keywords get views but few clicks — fix your title & description</p>
                            {(loading || isSyncing) ? (
                                <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse"/>)}</div>
                            ) : (data?.lowCTRKeywords || []).length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
                                    <div className="text-3xl mb-2">🎉</div>
                                    <p className="text-xs font-semibold">No low-CTR keywords found</p>
                                </div>
                            ) : (
                                <div className="space-y-3 flex-1 flex flex-col justify-between">
                                    <div className="space-y-3">
                                        {(data?.lowCTRKeywords || []).slice(0, showAllLowCtr ? 30 : 5).map((q,i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30">
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-bold text-neutral-800 dark:text-white truncate">{q.query}</div>
                                                    <div className="text-[11px] text-neutral-400 mt-0.5">{formatNumber(q.impressions)} impressions • rank #{q.position?.toFixed(1)}</div>
                                                </div>
                                                <div className="text-right ml-3">
                                                    <div className="text-xs font-black text-amber-600 dark:text-amber-400">{q.ctr.toFixed(1)}% CTR</div>
                                                    <div className="text-[11px] text-neutral-400">{q.clicks} clicks</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {(data?.lowCTRKeywords || []).length > 5 && (
                                        <div className="flex justify-center mt-4">
                                            <button
                                                onClick={() => setShowAllLowCtr(!showAllLowCtr)}
                                                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors flex items-center gap-1.5 py-1.5 px-4 bg-amber-500/15 dark:bg-amber-400/5 rounded-xl border border-amber-500/30 dark:border-amber-400/15 shadow-sm active:scale-95 duration-200"
                                            >
                                                {showAllLowCtr ? "Show Less" : `View All (${data.lowCTRKeywords.length})`}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="mt-auto pt-4">
                                <SectionAiSummary insight={data?.intelligence?.lowCTRKeywords} loading={loading || isSyncing} sectionTitle="AI OPPORTUNITY INSIGHT" />
                            </div>
                        </div>

                        {/* Near Page 1 */}
                        <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm flex flex-col">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-sm font-black text-neutral-900 dark:text-white">🚀 Keywords Near Page 1</h3>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => {
                                            const allNearStr = (data?.keywordsNearPage1 || []).map((q, idx) => `${idx + 1}. Keyword: "${q.query}" | Avg Position: #${q.position?.toFixed(1)} | Impressions: ${formatNumber(q.impressions)} | Clicks: ${formatNumber(q.clicks)} | CTR: ${q.ctr.toFixed(1)}%`).join('\n');
                                            openWithQuestion(`Act as my expert SEO Coach and ranking strategist. I have a list of high-opportunity keywords ranking "Near Page 1" (positions #8 to #20) where targeted efforts could yield rapid, first-page organic growth.

Here is the COMPLETE dataset of keywords near Page 1 from this section:
${allNearStr}

Please deliver a customized ranking roadmap for these keywords:
1. Which terms have the highest impressions and should be prioritized first?
2. What step-by-step semantic content expansion, internal link optimization, and topical authority building strategies should we execute to push these terms out of the #8-#20 doldrums and directly onto Page 1?`);
                                        }}
                                        className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                        ASK AI
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-neutral-400 mb-4">Keywords close to page 1 — a little SEO effort can push them up</p>
                            {(loading || isSyncing) ? (
                                <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse"/>)}</div>
                            ) : (data?.keywordsNearPage1 || []).length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
                                    <div className="text-3xl mb-2">🎯</div>
                                    <p className="text-xs font-semibold">No near-page-1 keywords</p>
                                </div>
                            ) : (
                                <div className="space-y-3 flex-1 flex flex-col justify-between">
                                    <div className="space-y-3">
                                        {(data?.keywordsNearPage1 || []).slice(0, showAllNearPage1 ? 30 : 5).map((q,i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-800/30">
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-bold text-neutral-800 dark:text-white truncate">{q.query}</div>
                                                    <div className="text-[11px] text-neutral-400 mt-0.5">{formatNumber(q.impressions)} impressions • {q.clicks} clicks</div>
                                                </div>
                                                <div className="text-right ml-3">
                                                    <div className="text-xs font-black text-green-600 dark:text-green-400">Pos #{q.position?.toFixed(1)}</div>
                                                    <div className="text-[11px] text-neutral-400">{q.ctr.toFixed(1)}% CTR</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {(data?.keywordsNearPage1 || []).length > 5 && (
                                        <div className="flex justify-center mt-4">
                                            <button
                                                onClick={() => setShowAllNearPage1(!showAllNearPage1)}
                                                className="text-xs font-bold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors flex items-center gap-1.5 py-1.5 px-4 bg-green-500/15 dark:bg-green-400/5 rounded-xl border border-green-500/30 dark:border-green-400/15 shadow-sm active:scale-95 duration-200"
                                            >
                                                {showAllNearPage1 ? "Show Less" : `View All (${data.keywordsNearPage1.length})`}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="mt-auto pt-4">
                                <SectionAiSummary insight={data?.intelligence?.keywordsNearPage1} loading={loading || isSyncing} sectionTitle="AI RANKING INSIGHT" />
                            </div>
                        </div>
                    </div>

                    {/* Sub-Reports (Queries & Pages) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                            <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-dark-surface/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <MagnifyingGlassIcon className="w-4 h-4 text-brand-500" />
                                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Top Queries</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => {
                                            const allQueriesStr = (data?.topQueries || []).map((q, idx) => `${idx + 1}. Query: "${q.query}" | Clicks: ${formatNumber(q.clicks)} | Impressions: ${formatNumber(q.impressions)} | CTR: ${q.ctr.toFixed(2)}% | Position: #${q.position?.toFixed(1)}`).join('\n');
                                            openWithQuestion(`Act as my elite SEO Strategist. I want you to perform a thorough analysis of my top-performing search queries driving organic traffic.

Here is the COMPLETE dataset of my top organic search queries from this section:
${allQueriesStr}

Please provide:
1. A tactical evaluation of our keyword performance profile.
2. Recommendations on how to defend and secure these high-ranking terms against competitors.
3. A semantic clustering plan to target high-value related long-tail queries and capture additional organic search volumes.`);
                                        }}
                                        className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                        ASK AI
                                    </button>
                                </div>
                            </div>
                                <DataTable 
                                    columns={[
                                        { header: 'Query', accessor: 'query' },
                                        { header: 'Clicks', cell: (row) => formatNumber(row.clicks) },
                                        { header: 'Impressions', cell: (row) => formatNumber(row.impressions) },
                                        { header: 'CTR', cell: (row) => `${row.ctr.toFixed(2)}%` },
                                        { header: 'Position', cell: (row) => row.position.toFixed(1) },
                                    ]} 
                                    data={data?.topQueries || []} 
                                    loading={loading || isSyncing} 
                                    initialLimit={5} 
                                />
                            <div className="p-5 border-t border-neutral-100 dark:border-neutral-800">
                                <SectionAiSummary insight={data?.intelligence?.topQueries} loading={loading || isSyncing} sectionTitle="AI QUERY INSIGHT" />
                            </div>
                        </div>
                        
                        <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                            <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-dark-surface/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <DocumentTextIcon className="w-4 h-4 text-brand-500" />
                                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Top Landing Pages</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => {
                                            const allPagesStr = (data?.topLandingPages || []).map((p, idx) => `${idx + 1}. Page URL: ${p.page} | Clicks: ${formatNumber(p.clicks)} | Impressions: ${formatNumber(p.impressions)} | CTR: ${p.ctr.toFixed(2)}% | Position: #${p.position?.toFixed(1)}`).join('\n');
                                            openWithQuestion(`Act as my expert Conversion Rate Optimization (CRO) and organic engagement specialist. Let's analyze our top organic landing pages.

Here is the COMPLETE dataset of our top organic landing pages from this section:
${allPagesStr}

Please perform a thorough audit:
1. Identify landing pages with high visibility (Impressions) but relatively low conversion CTR or rankings, indicating high potential for optimization.
2. Outline specific, actionable CRO strategies, layout improvements, and call-to-action designs we should implement on these high-traffic entry points to engage and convert organic visitors.`);
                                        }}
                                        className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                        ASK AI
                                    </button>
                                </div>
                            </div>
                                <DataTable 
                                    columns={[
                                        { header: 'Page', cell: (row) => <div className="max-w-[300px] truncate" title={row.page}>{row.page.replace('https://', '').replace('http://', '')}</div> },
                                        { header: 'Clicks', cell: (row) => formatNumber(row.clicks) },
                                        { header: 'Impressions', cell: (row) => formatNumber(row.impressions) },
                                        { header: 'CTR', cell: (row) => `${row.ctr.toFixed(2)}%` },
                                        { header: 'Position', cell: (row) => row.position.toFixed(1) },
                                    ]} 
                                    data={data?.topLandingPages || []} 
                                    loading={loading || isSyncing} 
                                    initialLimit={6} 
                                />
                            <div className="p-5 border-t border-neutral-100 dark:border-neutral-800">
                                <SectionAiSummary insight={data?.intelligence?.topLandingPages} loading={loading || isSyncing} sectionTitle="AI PAGE INSIGHT" />
                            </div>
                        </div>
                    </div>

                    {/* ADD 7 — Impressions Breakdown Bar Chart */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-8 shadow-sm group">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-black text-neutral-900 dark:text-white">Daily Impression Volume</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">DAILY SEARCH IMPRESSIONS</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => {
                                        const impressionsTrendStr = (data?.dailyImpressionVolume || []).map(d => `- Date: ${d.date} | Impressions: ${d.impressions}`).join('\n');
                                        openWithQuestion(`Act as my expert Search Visibility Strategist. Let's perform a comprehensive audit of our daily organic impression volume and brand exposure.

Here is the complete data used in this section:
- Total Impressions this period: ${formatNumber(data?.impressions?.value || 0)} (${data?.impressions?.change}% vs prior period)
- Daily Impression Trend:
${impressionsTrendStr}

What does this overall impression density and trajectory tell us about our brand's growing visibility, search share of voice, and seasonal performance variations? What steps can we take to keep driving these numbers higher?`);
                                    }}
                                    className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                >
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                        ASK AI
                                </button>
                            </div>
                        </div>
                        <div className="h-[250px]">
                            {(loading || isSyncing) ? (
                                <div className="w-full h-full animate-pulse bg-neutral-100 dark:bg-neutral-800 rounded-3xl"></div>
                            ) : (
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={data?.dailyImpressionVolume || []} margin={{ top: 5, right: 30, left: -20, bottom: 15 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-neutral-800" opacity={0.5} />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize:10, fill:'#9CA3AF', fontWeight:'bold'}} dy={10} 
                                        interval={(data?.dailyImpressionVolume || []).length > 15 ? 4 : 2}
                                        tickFormatter={(val) => {
                                            const d = new Date(val);
                                            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                        }}/>
                                        <YAxis axisLine={false} tickLine={false} tick={{fontSize:10, fill:'#9CA3AF', fontWeight:'bold'}} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v} />
                                        <Tooltip 
                                            labelFormatter={(label) => {
                                                const d = new Date(label);
                                                return d.toLocaleDateString('en-US', { 
                                                    month: 'short', day: 'numeric', year: 'numeric' 
                                                });
                                            }}
                                            formatter={(value) => [value.toLocaleString(), 'Impressions']}
                                            cursor={{fill: 'rgba(59, 130, 246, 0.05)'}} 
                                            contentStyle={{
                                                borderRadius:'15px', 
                                                border:'none', 
                                                boxShadow:'0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                                background: document.documentElement.classList.contains('dark') ? '#111827' : '#FFFFFF',
                                                color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#111827'
                                            }} 
                                        />
                                        <Bar dataKey="impressions" fill="#3B82F6" radius={[6,6,0,0]} name="Impressions" fillOpacity={0.8} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        <div className="mt-4">
                            <SectionAiSummary insight={data?.intelligence?.dailyImpressionVolume} loading={loading || isSyncing} sectionTitle="AI VISIBILITY INSIGHT" />
                        </div>
                    </div>

                    {/* ADD 5 — Period Comparison Table */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                        <h3 className="text-sm font-black text-neutral-900 dark:text-white">Period Comparison</h3>
                        <p className="text-xs text-neutral-400 mt-0.5">This period vs last period — all key metrics</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => {
                                    const comp = data?.periodComparison;
                                    openWithQuestion(`Act as my elite SEO Growth Analyst. Provide a comprehensive Organic Search Executive Audit based on my Period Comparison dataset.

Here is the complete comparison dataset for this section (This Period vs Prior Period):
📊 [PERIOD-OVER-PERIOD COMPARISON]
1. Search Clicks:
   - This Period: ${formatNumber(comp?.thisPeriod?.clicks || 0)}
   - Last Period: ${formatNumber(comp?.lastPeriod?.clicks || 0)}
   - Shift: ${comp?.change?.clicks || 0}% change
2. Search Impressions:
   - This Period: ${formatNumber(comp?.thisPeriod?.impressions || 0)}
   - Last Period: ${formatNumber(comp?.lastPeriod?.impressions || 0)}
   - Shift: ${comp?.change?.impressions || 0}% change
3. Average CTR:
   - This Period: ${(comp?.thisPeriod?.ctr || 0).toFixed(2)}%
   - Last Period: ${(comp?.lastPeriod?.ctr || 0).toFixed(2)}%
   - Shift: ${comp?.change?.ctr || 0}% change
4. Average Ranking Position:
   - This Period: #${(comp?.thisPeriod?.position || 0).toFixed(1)}
   - Last Period: #${(comp?.lastPeriod?.position || 0).toFixed(1)}
   - Shift: ${comp?.change?.position || 0}% change

Please deliver a detailed, professional executive SEO audit analyzing this growth shift, highlighting major positive transitions, potential traffic losses, CTR health, and a prioritized list of high-level organic initiatives for the upcoming period.`);
                                }}
                                className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                            >
                                <SparklesIcon className="w-3.5 h-3.5" />
                                ASK AI
                            </button>
                            <span className="text-xs font-bold bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full border border-purple-100 dark:border-purple-800">
                                vs Last Period
                            </span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-neutral-100 dark:border-neutral-800">
                            <tr>
                                {['Metric', 'This Period', 'Last Period', 'Change'].map(h => (
                                    <th key={h} className="pb-3 text-left text-[11px] font-black uppercase tracking-wider text-neutral-400 whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                               {(loading || isSyncing) ? (
                                Array(4).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={4} className="py-3"><div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg"></div></td>
                                    </tr>
                                ))
                            ) : (
                                (data?.periodComparison ? [
                                    { metric:'Clicks',       current: data.periodComparison.thisPeriod.clicks,                           prior: data.periodComparison.lastPeriod.clicks,             change: data.periodComparison.change.clicks, up: data.periodComparison.thisPeriod.clicks >= data.periodComparison.lastPeriod.clicks, Icon: CursorArrowRaysIcon, colorClass: 'text-blue-500 dark:text-blue-400' },
                                    { metric:'Impressions',  current: data.periodComparison.thisPeriod.impressions,                      prior: data.periodComparison.lastPeriod.impressions,        change: data.periodComparison.change.impressions, up: data.periodComparison.thisPeriod.impressions >= data.periodComparison.lastPeriod.impressions, Icon: EyeIcon, colorClass: 'text-teal-500 dark:text-teal-400' },
                                    { metric:'Click-Through Rate',          current: `${data.periodComparison.thisPeriod.ctr.toFixed(2)}%`,        prior: `${data.periodComparison.lastPeriod.ctr.toFixed(2)}%`,       change: data.periodComparison.change.ctr,  up: data.periodComparison.thisPeriod.ctr >= data.periodComparison.lastPeriod.ctr, Icon: ArrowTrendingUpIcon, colorClass: 'text-purple-500 dark:text-purple-400' },
                                    { metric:'Avg Position',  current: `#${data.periodComparison.thisPeriod.position?.toFixed(1)}`,    prior: `#${data.periodComparison.lastPeriod.position?.toFixed(1)}`,   change: data.periodComparison.change.position, up: data.periodComparison.thisPeriod.position <= data.periodComparison.lastPeriod.position, Icon: HashtagIcon, colorClass: 'text-amber-500 dark:text-amber-400' },
                                ] : []).map((row, i) => (
                                    <tr key={i} className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                                    <td className="py-3 text-xs font-bold text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {row.Icon && <row.Icon className={`w-3.5 h-3.5 ${row.colorClass} flex-shrink-0`} />}
                                            <span>{row.metric}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 text-xs font-black text-neutral-900 dark:text-white tabular-nums">
                                        {typeof row.current === 'number' ? row.current.toLocaleString() : row.current}
                                    </td>
                                    <td className="py-3 text-xs text-neutral-400 tabular-nums">
                                        {typeof row.prior === 'number' ? row.prior.toLocaleString() : row.prior}
                                    </td>
                                    <td className="py-3">
                                        <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full ${
                                        row.up
                                            ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                            : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                                        }`}>
                                        {row.up ? '▲' : '▼'} {Math.abs(row.change)}%
                                        </span>
                                    </td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                    <SectionAiSummary 
                         insight={data?.intelligence?.periodComparison} 
                         loading={loading || isSyncing} 
                         sectionTitle="AI SUMMARY"
                         contextPrompt={`Analyze my GSC master growth trajectory. Comparing this period vs last: Clicks grew/fell by ${data?.searchClicks?.change || 0}%, Impressions by ${data?.impressions?.change || 0}%, and Position shifted from #${data?.periodComparison?.lastPeriod?.position?.toFixed(1) || '0.0'} to #${data?.avgPosition?.value?.toFixed(1) || '0.0'}. What is my overall organic health score?`}
                    />
                    </div>

                </div>
            </DashboardLayout>
        );
    };

    export default GscPage;
