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
        ExclamationTriangleIcon,
        SparklesIcon,
        GlobeAltIcon,
        UserCircleIcon,
        ArrowDownTrayIcon,
        ArrowPathIcon,
        ChevronRightIcon,
        ChevronDownIcon,
        CalendarIcon,
        FunnelIcon,
        XMarkIcon,
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
        
        const searchQuery = useFilterStore(s => s.searchQuery);
        const setSearchQuery = useFilterStore(s => s.setSearchQuery);
        const device = useFilterStore(s => s.device);
        const setFilters = useFilterStore(s => s.setFilters);

        const activeGscSite = useAccountsStore(s => s.gsc?.gscSiteUrl);
        const ga4 = useAccountsStore(s => s.ga4);
        const activeSiteId = useAccountsStore(s => s.activeSiteId);
        const gsc = useAccountsStore(s => s.gsc);
        const setAccounts = useAccountsStore(s => s.setAccounts);
        const userSites = useAccountsStore(s => s.userSites);
        
        const openWithQuestion = useAiChatStore(s => s.openWithQuestion);
        const navigate = useNavigate();
        const [loading, setLoading] = useState(false);
        
        const [overview, setOverview] = useState(null);
        const [priorOverview, setPriorOverview] = useState(null);
        const [timeseries, setTimeseries] = useState([]);
        const [queries, setQueries] = useState([]);
        const [pages, setPages] = useState([]);
        const [intelligence, setIntelligence] = useState(null);
        const [totalPages, setTotalPages] = useState(0);
        const [totalQueries, setTotalQueries] = useState(0);
        const [topPosition, setTopPosition] = useState(0);
        const [growth, setGrowth] = useState(null);

        const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
        const [isCustomDateMode, setIsCustomDateMode] = useState(false);
        const [tempDateRange, setTempDateRange] = useState({ start: startDate, end: endDate });
        const [isExportingPdf, setIsExportingPdf] = useState(false);

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
                const data = res.data;

                setOverview(data.overview);
                setPriorOverview(data.priorOverview);
                setTimeseries(data.timeseries || []);
                setQueries(data.queries || []);
                setPages(data.pages || []);
                setIntelligence(data.intelligence || null);
                setTotalPages(data.totalPages || 0);
                setTotalQueries(data.totalQueries || 0);
                setTopPosition(data.topPosition || 0);
                setGrowth(data.growth || null);

                if (data.syncMetadata) {
                    setAccounts({
                        syncStatus: data.syncMetadata.syncStatus,
                        gsc: {
                            gscLastSyncedAt: data.syncMetadata.lastSyncedAt,
                            gscHistoricalComplete: data.syncMetadata.gscHistoricalComplete,
                            gscSyncStatus: data.syncMetadata.syncStatus
                        }
                    });
                }
                
                console.log('GSC timeseries:', data.timeseries);
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
            // 1. Set status to syncing in store
            setAccounts({ 
                syncStatus: 'syncing',
                gsc: {
                    gscSyncStatus: 'syncing'
                }
            });

            try {
                // 2. Perform sync
                await api.post('/analytics/sync', { siteId: activeSiteId });

                // 3. Update store with latest metadata (time, status)
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

                // 4. Load the dashboard data
                await loadData();
            } catch (err) {
                console.error('Manual sync failed:', err);
                // Even on error, update metadata to clear syncing status
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
        
        // Refresh data when sync completes
        useEffect(() => {
            if (gsc?.gscSyncStatus !== 'syncing' && activeSiteId) {
                console.log('GSC Sync completed or idle, refreshing data...');
                loadData();
            }
        }, [gsc?.gscSyncStatus, activeSiteId, loadData]);


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



        const filteredQueries = queries.filter(q => 
            (q.query?.toLowerCase() || '').includes(searchQuery.toLowerCase())
        );

        const filteredPages = pages.filter(p => 
            (p.page?.toLowerCase() || '').includes(searchQuery.toLowerCase())
        );

        const queryColumns = [
            { header: 'Query', accessor: 'query' },
            { header: 'Clicks', cell: (row) => formatNumber(row.clicks) },
            { header: 'Impressions', cell: (row) => formatNumber(row.impressions) },
            { header: 'CTR', cell: (row) => `${(row.ctr * 100).toFixed(2)}%` },
            { header: 'Position', cell: (row) => row.position.toFixed(1) },
        ];

        const pageColumns = [
            { header: 'Page', cell: (row) => <div className="max-w-[300px] truncate" title={row.page}>{row.page.replace('https://', '').replace('http://', '')}</div> },
            { header: 'Clicks', cell: (row) => formatNumber(row.clicks) },
            { header: 'Impressions', cell: (row) => formatNumber(row.impressions) },
        ];

        // Derived Data
        const avgCTR = overview ? (overview.ctr * 100).toFixed(2) : '0';
        const topPositionLabel = topPosition > 0 ? `#${topPosition.toFixed(1)}` : '—';

        const ctrTrend = timeseries.map(d => ({
            date: d.date,
            ctr: d.ctr ? parseFloat((d.ctr * 100).toFixed(2)) : 0
        }));

        const positionTrend = timeseries.map((d) => ({
            date: d.date,
            position: d.position ? parseFloat(d.position.toFixed(1)) : 0
        }));

        const opportunities = queries
        ? queries
            .filter(q => q.impressions > 50 && q.ctr < 0.05)
            .sort((a,b) => b.impressions - a.impressions)
            .slice(0, 5)
        : [];

        const nearPageOne = queries
        ? queries
            .filter(q => (q.position || 0) >= 8 && (q.position || 0) <= 20)
            .sort((a,b) => a.position - b.position)
            .slice(0, 5)
        : [];

        const comparison = (overview && priorOverview && growth) ? [
            { metric:'Clicks',       current: overview.clicks,                           prior: priorOverview.clicks,             change: growth.clicks, up: overview.clicks >= priorOverview.clicks },
            { metric:'Impressions',  current: overview.impressions,                      prior: priorOverview.impressions,        change: growth.impressions, up: overview.impressions >= priorOverview.impressions },
            { metric:'Click-Through Rate',          current: `${(overview.ctr*100).toFixed(2)}%`,        prior: `${(priorOverview.ctr*100).toFixed(2)}%`,       change: growth.ctr,  up: overview.ctr >= priorOverview.ctr },
            { metric:'Avg Position',  current: `#${overview.position?.toFixed(1)}`,    prior: `#${priorOverview.position?.toFixed(1)}`,   change: growth.position, up: overview.position <= priorOverview.position },
        ] : [];

        return (
            <DashboardLayout>
                <div id="gsc-report" className="flex flex-col space-y-4 md:space-y-8 p-0 md:p-2">
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
                                        {activeSiteId && (
                                            <div className="px-2 py-0.5 bg-neutral-900 dark:bg-neutral-800 text-white rounded text-[7px] font-black uppercase tracking-widest">
                                                {userSites?.find(s => s._id === activeSiteId)?.siteName || 'ACTIVE SITE'}
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
                                                Synced: <span className="text-neutral-700 dark:text-neutral-300 tabular-nums font-black">{gsc?.gscLastSyncedAt ? formatDistanceToNow(new Date(gsc.gscLastSyncedAt), { addSuffix: true }) : 'Never'}</span>
                                                <button onClick={handleManualRefresh} className="hover:text-brand-500 transition-all active:rotate-180 ml-1">
                                                    <ArrowPathIcon className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
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
                                    { label: 'PROPERTY URL', value: activeGscSite?.replace('https://', '').replace('http://', '') || 'website.com', icon: GlobeAltIcon },
                                    { label: 'SYNC ACCOUNT', value: userSites?.find(s => s._id === activeSiteId)?.gscTokenId?.email || 'seo@slt.work', icon: UserCircleIcon }
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
                                    onClick={() => openWithQuestion(`Analyze my GSC performance for ${startDate} to ${endDate}. Clicks: ${formatNumber(overview?.clicks || 0)}, Impressions: ${formatNumber(overview?.impressions || 0)}`)}
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

                    {/* Refined Search Bar */}
                    <div className="flex justify-start px-1 md:px-0 hide-in-pdf">
                        <div className="group bg-white/70 dark:bg-dark-card/70 backdrop-blur-lg border border-neutral-200/60 dark:border-neutral-700/50 rounded-full px-4 py-2 shadow-sm flex items-center gap-3 w-full md:max-w-md transition-all hover:shadow-md hover:border-brand-500/30">
                            <FunnelIcon className="w-4 h-4 text-neutral-400 group-focus-within:text-brand-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search queries or pages..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none outline-none text-xs font-bold text-neutral-900 dark:text-white placeholder:text-neutral-400 flex-1"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="text-neutral-400 hover:text-red-500 transition-colors"
                                >
                                    <XMarkIcon className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <KpiCard
                            title="Search Clicks"
                            value={overview ? formatNumber(overview.clicks || 0) : '0'}
                            loading={loading}
                            Icon={CursorArrowRaysIcon}
                            change={growth?.clicks}
                            isPositive={overview?.clicks >= priorOverview?.clicks}
                            changeText="vs last period"
                            chartData={timeseries.map(d => d.clicks).slice(-10)}
                            insight={intelligence?.searchClicks}
                            contextPrompt={`Analyze my Google Search Console clicks. Current clicks: ${formatNumber(overview?.clicks || 0)} vs Prior: ${formatNumber(priorOverview?.clicks || 0)}. Growth: ${growth?.clicks}%. What strategies can I use to further accelerate this click growth?`}
                        />
                        <KpiCard
                            title="Impressions"
                            value={overview ? formatNumber(overview.impressions || 0) : '0'}
                            loading={loading}
                            Icon={EyeIcon}
                            change={growth?.impressions}
                            isPositive={overview?.impressions >= priorOverview?.impressions}
                            changeText="vs last period"
                            chartData={timeseries.map(d => d.impressions).slice(-10)}
                            insight={intelligence?.impressions}
                            contextPrompt={`Analyze my GSC search visibility. Current Impressions: ${formatNumber(overview?.impressions || 0)} vs Prior: ${formatNumber(priorOverview?.impressions || 0)}. Change: ${growth?.impressions}%. Am I appearing for the right kind of search queries?`}
                        />
                        <KpiCard
                            title="Avg. CTR"
                            value={overview ? `${((overview.ctr || 0) * 100).toFixed(2)}%` : '0%'}
                            loading={loading}
                            Icon={ArrowTrendingUpIcon}
                            change={growth?.ctr}
                            isPositive={overview?.ctr >= priorOverview?.ctr}
                            changeText="vs last period"
                            insight={intelligence?.avgCtr}
                            contextPrompt={`Analyze my Click-Through Rate (CTR). Current CTR: ${((overview?.ctr || 0) * 100).toFixed(2)}% vs Prior: ${((priorOverview?.ctr || 0) * 100).toFixed(2)}%. Change: ${growth?.ctr}%. How can I make my search snippets more attractive to users in the search results?`}
                        />
                        <KpiCard
                            title="Avg. Position"
                            value={overview ? (overview.position || 0).toFixed(1) : '0.0'}
                            loading={loading}
                            Icon={HashtagIcon}
                            change={growth?.position}
                            isPositive={overview?.position <= priorOverview?.position}
                            changeText="vs last period"
                            insight={intelligence?.avgPosition}
                            contextPrompt={`Analyze my average search position. Current: #${(overview?.position || 0).toFixed(1)} vs Prior: #${(priorOverview?.position || 0).toFixed(1)}. Change: ${growth?.position}%. What is the best way to move my overall rankings closer to position #1?`}
                        />
                    </div>

                    {/* ADD 2 — Summary Strip */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {[
                            { label: 'Total Queries', value: formatNumber(totalQueries), icon: <MagnifyingGlassIcon className="w-5 h-5 text-blue-500" />, insight: intelligence?.totalQueries },
                            { label: 'Total Pages', value: formatNumber(totalPages), icon: <Square3Stack3DIcon className="w-5 h-5 text-emerald-500" />, insight: intelligence?.totalPages },
                            { label: 'Top Position', value: topPositionLabel, icon: <TrophyIcon className="w-5 h-5 text-amber-500" />, insight: intelligence?.topPosition }
                        ].map((card, idx) => (
                            <div key={idx} className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 shadow-sm group hover:border-brand-500/30 transition-all flex flex-col">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 flex items-center justify-center border border-neutral-100 dark:border-neutral-700/50 group-hover:scale-110 transition-transform">
                                        {card.icon}
                                    </div>
                                    <div>
                                        <div className="text-xl font-black text-neutral-900 dark:text-white tabular-nums">
                                            {loading ? <div className="h-6 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /> : card.value}
                                        </div>
                                        <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mt-0.5">{card.label}</div>
                                    </div>
                                </div>
                                {card.insight && !loading && (
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
                                    onClick={() => openWithQuestion(`Analyze my GSC search performance overview. Current Period: ${overview?.clicks || 0} clicks, ${overview?.impressions || 0} impressions. Prior Period: ${priorOverview?.clicks || 0} clicks, ${priorOverview?.impressions || 0} impressions. 7-day trend data: ${JSON.stringify(timeseries.slice(-7).map(d => ({date: d.date, clicks: d.clicks, impressions: d.impressions})))}. What significant patterns or anomalies do you see?`)}
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
                            {loading ? (
                                <div className="w-full h-full animate-pulse bg-gradient-to-r from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-800/50 rounded-xl"></div>
                            ) : timeseries.length === 0 ? (
                                <EmptyState />
                            ) : (
                                <>
                                <ResponsiveContainer width="100%" height={280}>
                                    <AreaChart data={timeseries} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
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
                                            interval={timeseries.length > 15 ? 4 : 2}
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
                                insight={intelligence?.searchPerformanceOverview} 
                                loading={loading} 
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
                                        onClick={() => openWithQuestion(`Analyze my GSC Click-Through Rate (CTR) trend. Current Avg CTR: ${((overview?.ctr || 0) * 100).toFixed(2)}%. Recent 7-day data: ${JSON.stringify(ctrTrend.slice(-7).map(d => ({date: d.date, ctr: d.ctr + '%'})))}. Is the quality and engagement of my organic search traffic improving?`)}
                                        className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                        ASK AI
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-neutral-400 mb-4">Daily CTR for selected period</p>
                            {loading ? (
                                <div className="h-48 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse"/>
                            ) : ctrTrend.length === 0 ? (
                                <EmptyState />
                            ) : (
                                <ResponsiveContainer width="100%" height={190}>
                                    <AreaChart data={ctrTrend} margin={{top:5, right:10, left:-20, bottom:0}}>
                                        <defs>
                                            <linearGradient id="ctrGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%"  stopColor="#8B5CF6" stopOpacity={0.15}/>
                                                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" className="dark:stroke-neutral-800/20"/>
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize:10, fill:'#9CA3AF'}}
                                        interval={ctrTrend.length > 15 ? 4 : 2}
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
                                <SectionAiSummary insight={intelligence?.clickThroughRateTrend} loading={loading} sectionTitle="AI CTR INSIGHT" />
                            </div>
                        </div>

                        {/* Position Trend */}
                        <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-sm font-black text-neutral-900 dark:text-white">Average Ranking Position</h3>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => openWithQuestion(`Analyze my GSC average ranking position trend. Current Avg Position: #${(overview?.position || 0).toFixed(1)}. Recent 7-day trend: ${JSON.stringify(positionTrend.slice(-7).map(d => ({date: d.date, pos: d.position})))}. Based on this trajectory, are my SEO rankings climbing or slipping?`)}
                                        className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                        ASK AI
                                    </button>
                                    <span className="text-xs font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-full border border-amber-100 dark:border-amber-800">Lower rank = Better</span>
                                </div>
                            </div>
                            <p className="text-xs text-neutral-400 mb-4">Daily position for selected period</p>
                            {loading ? (
                                <div className="h-48 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse"/>
                            ) : positionTrend.length === 0 ? (
                                <EmptyState />
                            ) : (
                                <ResponsiveContainer width="100%" height={190}>
                                    <LineChart data={positionTrend} margin={{top:5, right:10, left:-20, bottom:0}}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" className="dark:stroke-neutral-800/20"/>
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize:10, fill:'#9CA3AF'}}
                                        interval={positionTrend.length > 15 ? 4 : 2}
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
                                <SectionAiSummary insight={intelligence?.averageRankingPosition} loading={loading} sectionTitle="AI POSITION INSIGHT" />
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
                                        onClick={() => openWithQuestion(`Analyze my Low CTR Keywords (High Impressions, Low Clicks). I have ${opportunities.length} such keywords. Top 3 examples: ${opportunities.slice(0,3).map(q => `"${q.query}" (${q.impressions} impr, ${(q.ctr*100).toFixed(1)}% CTR)`).join(', ')}. What specific meta-tag or content changes would boost the CTR for these terms?`)}
                                        className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                        ASK AI
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-neutral-400 mb-4">These keywords get views but few clicks — fix your title & description</p>
                            {loading ? (
                                <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse"/>)}</div>
                            ) : opportunities.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
                                    <div className="text-3xl mb-2">🎉</div>
                                    <p className="text-xs font-semibold">No low-CTR keywords found</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {opportunities.map((q,i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-bold text-neutral-800 dark:text-white truncate">{q.query}</div>
                                                <div className="text-[11px] text-neutral-400 mt-0.5">{formatNumber(q.impressions)} impressions • rank #{q.position?.toFixed(1)}</div>
                                            </div>
                                            <div className="text-right ml-3">
                                                <div className="text-xs font-black text-amber-600 dark:text-amber-400">{(q.ctr * 100).toFixed(1)}% CTR</div>
                                                <div className="text-[11px] text-neutral-400">{q.clicks} clicks</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="mt-auto pt-4">
                                <SectionAiSummary insight={intelligence?.lowCTRKeywords} loading={loading} sectionTitle="AI OPPORTUNITY INSIGHT" />
                            </div>
                        </div>

                        {/* Near Page 1 */}
                        <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm flex flex-col">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-sm font-black text-neutral-900 dark:text-white">🚀 Keywords Near Page 1</h3>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => openWithQuestion(`Analyze my GSC keywords that are "Near Page 1" (ranking 8-20). I have ${nearPageOne.length} keywords in this range. Top examples: ${nearPageOne.slice(0,3).map(q => `"${q.query}" at rank #${q.position?.toFixed(1)}`).join(', ')}. What SEO tactics (on-page or off-page) will push these keywords into the top 10 search results?`)}
                                        className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                        ASK AI
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-neutral-400 mb-4">Keywords close to page 1 — a little SEO effort can push them up</p>
                            {loading ? (
                                <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse"/>)}</div>
                            ) : nearPageOne.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
                                    <div className="text-3xl mb-2">🎯</div>
                                    <p className="text-xs font-semibold">No near-page-1 keywords</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {nearPageOne.map((q,i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-800/30">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-bold text-neutral-800 dark:text-white truncate">{q.query}</div>
                                                <div className="text-[11px] text-neutral-400 mt-0.5">{formatNumber(q.impressions)} impressions • {q.clicks} clicks</div>
                                            </div>
                                            <div className="text-right ml-3">
                                                <div className="text-xs font-black text-green-600 dark:text-green-400">Pos #{q.position?.toFixed(1)}</div>
                                                <div className="text-[11px] text-neutral-400">{(q.ctr * 100).toFixed(1)}% CTR</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="mt-auto pt-4">
                                <SectionAiSummary insight={intelligence?.keywordsNearPage1} loading={loading} sectionTitle="AI RANKING INSIGHT" />
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
                                        onClick={() => openWithQuestion(`Analyze my top search queries driving organic traffic. My top 5 queries by clicks are: ${queries.slice(0,5).map(q => `"${q.query}" (${q.clicks} clicks, rank #${q.position?.toFixed(1)})`).join(', ')}. How can I maintain these rankings while expanding into related long-tail keywords?`)}
                                        className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                        ASK AI
                                    </button>
                                </div>
                            </div>
                            <div className="p-0">
                                <DataTable columns={queryColumns} data={filteredQueries} loading={loading} initialLimit={5} />
                            </div>
                            <div className="p-5 border-t border-neutral-100 dark:border-neutral-800">
                                <SectionAiSummary insight={intelligence?.topQueries} loading={loading} sectionTitle="AI QUERY INSIGHT" />
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
                                        onClick={() => openWithQuestion(`Analyze my top-performing landing pages. My top 5 pages are: ${pages.slice(0,5).map(p => `"${p.page}" (${p.clicks} clicks)`).join(', ')}. Which of these pages have the highest potential for conversion optimization or further content expansion?`)}
                                        className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                        ASK AI
                                    </button>
                                </div>
                            </div>
                            <div className="p-0">
                                <DataTable columns={pageColumns} data={filteredPages} loading={loading} initialLimit={6} />
                            </div>
                            <div className="p-5 border-t border-neutral-100 dark:border-neutral-800">
                                <SectionAiSummary insight={intelligence?.topLandingPages} loading={loading} sectionTitle="AI PAGE INSIGHT" />
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
                                    onClick={() => openWithQuestion(`Analyze my daily GSC search impression volume. Total Period Impressions: ${formatNumber(overview?.impressions || 0)}. Recent 7-day trend: ${JSON.stringify(timeseries.slice(-7).map(d => ({date: d.date, impressions: d.impressions})))}. What does this impression density indicate about my overall brand search visibility?`)}
                                    className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                >
                                    <SparklesIcon className="w-3.5 h-3.5" />
                                    ASK AI
                                </button>
                            </div>
                        </div>
                        <div className="h-[250px]">
                            {loading ? (
                                <div className="w-full h-full animate-pulse bg-neutral-100 dark:bg-neutral-800 rounded-3xl"></div>
                            ) : (
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={timeseries}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-neutral-800" opacity={0.5} />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize:10, fill:'#9CA3AF', fontWeight:'bold'}} 
                                        interval={timeseries.length > 15 ? 4 : 2}
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
                            <SectionAiSummary insight={intelligence?.dailyImpressionVolume} loading={loading} sectionTitle="AI VISIBILITY INSIGHT" />
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
                                onClick={() => openWithQuestion(`Analyze my GSC master period comparison. Clicks: ${overview?.clicks} vs ${priorOverview?.clicks} (${calculateChange(overview?.clicks, priorOverview?.clicks)}%), Impressions: ${overview?.impressions} vs ${priorOverview?.impressions} (${calculateChange(overview?.impressions, priorOverview?.impressions)}%), Avg Position: #${overview?.position?.toFixed(1)} vs #${priorOverview?.position?.toFixed(1)}. Provide a comprehensive executive summary of my SEO performance shift.`)}
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
                            {loading ? (
                                Array(4).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={4} className="py-3"><div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg"></div></td>
                                    </tr>
                                ))
                            ) : (
                                comparison.map((row, i) => (
                                    <tr key={i} className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                                    <td className="py-3 text-xs font-bold text-neutral-700 dark:text-neutral-300 whitespace-nowrap">{row.metric}</td>
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
                        insight={intelligence?.periodComparison} 
                        loading={loading} 
                        sectionTitle="AI SUMMARY"
                        contextPrompt={`Analyze my GSC master growth trajectory. Comparing this period vs last: Clicks grew/fell by ${growth?.clicks}%, Impressions by ${growth?.impressions}%, and Position shifted from #${priorOverview?.position?.toFixed(1)} to #${overview?.position?.toFixed(1)}. What is my overall organic health score?`}
                    />
                    </div>

                </div>
            </DashboardLayout>
        );
    };

    export default GscPage;
