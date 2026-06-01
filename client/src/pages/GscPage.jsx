    import React, { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
    import { useNavigate } from 'react-router-dom';
    import DashboardLayout from '../components/ui/DashboardLayout';
    import KpiCard from '../components/dashboard/KpiCard';
    import DataTable from '../components/dashboard/DataTable';
    import SectionAiSummary from '../components/dashboard/SectionAiSummary';
    import SummaryStripCard from '../components/dashboard/SummaryStripCard';
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
        DocumentTextIcon,
        EnvelopeIcon,
        ComputerDesktopIcon,
        FunnelIcon,
        DevicePhoneMobileIcon,
        DeviceTabletIcon
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
        const tempStartDate = useDateRangeStore(s => s.tempStartDate);
        const tempEndDate = useDateRangeStore(s => s.tempEndDate);
        const setTempStartDate = useDateRangeStore(s => s.setTempStartDate);
        const setTempEndDate = useDateRangeStore(s => s.setTempEndDate);
        const applyCustomRange = useDateRangeStore(s => s.applyCustomRange);
        const device = useFilterStore(s => s.device);
        const setFilters = useFilterStore(s => s.setFilters);

        // Adjust for GSC 48h delay: shift preset dates 1 day back (except custom)
        const getGscDates = () => {
            if (preset === 'custom' || !startDate || !endDate) {
                return { gscStart: startDate, gscEnd: endDate };
            }
            const adjustDate = (dStr, offset) => {
                const parts = dStr.split('-');
                const d = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
                d.setUTCDate(d.getUTCDate() + offset);
                return d.toISOString().split('T')[0];
            };
            return {
                gscStart: adjustDate(startDate, -1),
                gscEnd: adjustDate(endDate, -1)
            };
        };

        const { gscStart, gscEnd } = getGscDates();

        const activeGscSite = useAccountsStore(s => s.gsc?.gscSiteUrl);
        const ga4 = useAccountsStore(s => s.ga4);
        const activeSiteId = useAccountsStore(s => s.activeSiteId);
        const activeSiteName = useAccountsStore(s => s.activeSiteName);
        const activeSiteUrl = useAccountsStore(s => s.activeSiteUrl);
        const gsc = useAccountsStore(s => s.gsc);
        const setAccounts = useAccountsStore(s => s.setAccounts);
        
        const openWithQuestion = useAiChatStore(s => s.openWithQuestion);
        const navigate = useNavigate();
        const [loading, setLoading] = useState(false);
        
        const [data, setData] = useState(null);

        const handleInsightGenerated = (sectionKey, newInsight) => {
            setData(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    intelligence: {
                        ...prev.intelligence,
                        [sectionKey]: newInsight
                    }
                };
            });
        };

        const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
        const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false);
        const [isCustomDateMode, setIsCustomDateMode] = useState(false);
        const [isExportingPdf, setIsExportingPdf] = useState(false);
        const [showAllLowCtr, setShowAllLowCtr] = useState(false);
        const [showAllNearPage1, setShowAllNearPage1] = useState(false);

        const presetLabels = {
            'today': 'Today',
            'yesterday': 'Yesterday',
            '7d': 'Last 7 Days',
            '28d': 'Last 28 Days',
            'this_week': 'This Week',
            'last_week': 'Last Week',
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
                    startDate: gscStart,
                    endDate: gscEnd,
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
        }, [activeGscSite, gscStart, gscEnd, device, activeSiteId]);

        const handleDatePresetSelect = (p) => {
            if (p.value === 'custom') {
                setIsCustomDateMode(true);
                setTempStartDate(gscStart);
                setTempEndDate(gscEnd);
                return;
            }
            setPreset(p.value);
            setIsDateMenuOpen(false);
            setIsCustomDateMode(false);
        };

        const handleApplyCustomDate = () => {
            applyCustomRange();
            setIsDateMenuOpen(false);
            setIsCustomDateMode(false);
        };

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

        useEffect(() => {
            const handleFocus = () => {
                loadData();
            };

            const handleOnline = () => {
                loadData();
            };

            window.addEventListener('focus', handleFocus);
            window.addEventListener('online', handleOnline);

            return () => {
                window.removeEventListener('focus', handleFocus);
                window.removeEventListener('online', handleOnline);
            };
        }, [loadData]);

        const isSyncing = gsc?.gscHistoricalComplete === false;
        const syncedDays = gsc?.gscHistoricalChunkIndex || 0;
        const syncProgress = gsc?.gscSyncProgress || 0;
        const totalSyncDays = 28;

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
                <div id="gsc-report" className="flex flex-col space-y-4 md:space-y-8 p-0 md:pb-16">
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
                    <div className={`bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-slate-100/70 dark:from-[#0a0f1d] dark:via-[#070a12] dark:to-[#0f1424] px-6 py-5 rounded-[2rem] border border-blue-100/80 dark:border-blue-950/80 shadow-lg shadow-blue-500/5 relative transition-all duration-300 ${(isDateMenuOpen || isDeviceMenuOpen) ? 'z-50' : 'z-10'}`}>

                        <div className="relative z-10 flex flex-col gap-5">

                            {/* Top Block: Identity & Main Actions */}
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                                {/* Logo & Identity */}
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-white dark:bg-neutral-800/80 rounded-xl flex items-center justify-center shrink-0 border border-neutral-100 dark:border-neutral-700 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] mt-0.5">
                                        <GscLogo className="w-7 h-7" />
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2.5">
                                            <h1 className="text-lg md:text-xl font-bold text-neutral-900 dark:text-white tracking-tight leading-none">Google Search Console</h1>
                                            {activeSiteName && (
                                                <a 
                                                    href={activeSiteUrl || '#'} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="px-2.5 py-0.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/20 dark:border-amber-500/30 rounded-full text-[8px] font-black uppercase tracking-widest leading-none hover:scale-105 hover:border-amber-500/40 active:scale-95 transition-all duration-300 cursor-pointer inline-flex items-center gap-1"
                                                >
                                                    {activeSiteName}
                                                    <svg className="w-2 h-2 shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                                    </svg>
                                                </a>
                                            )}
                                        </div>
                                        <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-semibold leading-relaxed mt-1.5 selection:bg-brand-500/20 max-w-lg">
                                            Monitor your search performance and optimize keywords with AI-powered SEO intelligence.
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-2 shrink-0 self-start lg:self-center">
                                    <button
                                        onClick={() => {
                                            const fullPrompt = `Act as my elite Organic Search Coach and SEO Growth Strategist. I want you to perform a deep-dive, professional technical SEO audit of my Google Search Console (GSC) dashboard for the period ${gscStart} to ${gscEnd}.
      
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
                                            openWithQuestion(fullPrompt, '🔍 Full GSC Executive SEO Audit');
                                        }}
                                        className="h-8 px-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                        AI SUMMARY
                                    </button>
                                    <button
                                        onClick={handlePdfExport}
                                        disabled={isExportingPdf}
                                        className={`h-8 px-3 bg-white dark:bg-neutral-800/20 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-lg text-[9px] font-black tracking-widest flex items-center justify-center gap-2 hover:bg-neutral-50 transition-all ${isExportingPdf ? 'opacity-50 cursor-not-allowed' : ''}`}
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

                            {/* Thin Divider Line */}
                            <div className="w-full h-px bg-blue-200/50 dark:bg-blue-900/30 my-1 shrink-0"></div>

                            {/* Bottom Block: Filters, Status & Metadata Badges */}
                            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                                {/* Left: Status & Filters */}
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex items-center gap-3 hide-in-pdf">
                                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/5 rounded-full border border-emerald-500/10 shrink-0">
                                            <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
                                            <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">Active</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[9.5px] text-neutral-700 font-bold uppercase tracking-widest shrink-0">
                                            Synced: <span className={`tabular-nums font-black ${isSyncing ? 'text-amber-500' : 'text-neutral-500 dark:text-neutral-300'}`}>
                                                {isSyncing ? 'Syncing...' : gsc?.gscLastSyncedAt ? formatDistanceToNow(new Date(gsc.gscLastSyncedAt), { addSuffix: true }) : 'Never'}
                                            </span>
                                            <button onClick={handleManualRefresh} className="hover:text-brand-500 transition-all active:rotate-180 ml-1">
                                                <ArrowPathIcon className={`w-3 h-3 ${(loading || isSyncing) ? 'animate-spin' : ''}`} />
                                            </button>
                                        </div>

                                        {/* Date Selector Integration */}
                                        <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block"></div>

                                        <div className="relative">
                                            <button
                                                onClick={() => { setIsDateMenuOpen(!isDateMenuOpen); setIsDeviceMenuOpen(false); }}
                                                className={`flex items-center gap-2 px-3 py-1 transition-all active:scale-95 group/date rounded-full border shadow-sm ${isDateMenuOpen
                                                    ? 'bg-brand-600 border-brand-500 text-white'
                                                    : 'bg-white/50 dark:bg-dark-surface/50 border-neutral-200/50 dark:border-neutral-800/60'
                                                    }`}
                                            >
                                                <CalendarIcon className={`w-3.5 h-3.5 ${isDateMenuOpen ? 'text-white' : 'text-brand-600'}`} />
                                                <span className={`text-[9.5px] font-black uppercase tracking-widest ${isDateMenuOpen ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'}`}>
                                                    Date: {preset === 'custom' ? 'Custom' : (presetLabels[preset] || preset)}
                                                </span>
                                                <ChevronDownIcon className={`w-3 h-3 transition-transform ${isDateMenuOpen ? 'rotate-180 opacity-100' : 'opacity-40'}`} />
                                            </button>

                                            {isDateMenuOpen && (
                                                <div className="absolute top-full left-0 mt-2 z-[100] bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-1.5 min-w-[160px] animate-in fade-in zoom-in-95 duration-200 normal-case tracking-normal">
                                                    {!isCustomDateMode ? (
                                                        <>
                                                            {[
                                                                { label: 'Today', value: 'today' },
                                                                { label: 'Yesterday', value: 'yesterday' },
                                                                { label: 'Last 7 Days', value: '7d' },
                                                                { label: 'Last 28 Days', value: '28d' },
                                                                { label: 'This Week', value: 'this_week' },
                                                                { label: 'Last Week', value: 'last_week' },
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
                                                                        value={tempStartDate}
                                                                        onChange={(e) => setTempStartDate(e.target.value)}
                                                                        className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none text-neutral-900 dark:text-white"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[8px] font-black text-neutral-400 uppercase ml-1">End</label>
                                                                    <input
                                                                        type="date"
                                                                        value={tempEndDate}
                                                                        onChange={(e) => setTempEndDate(e.target.value)}
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

                                        <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block"></div>

                                        <div className="relative">
                                            <button
                                                onClick={() => { setIsDeviceMenuOpen(!isDeviceMenuOpen); setIsDateMenuOpen(false); }}
                                                className={`flex items-center gap-2 px-3 py-1 transition-all active:scale-95 group/device rounded-full border shadow-sm ${isDeviceMenuOpen
                                                    ? 'bg-amber-500 border-amber-400 text-white'
                                                    : 'bg-white/50 dark:bg-dark-surface/50 border-neutral-200/50 dark:border-neutral-800/60'
                                                    }`}
                                            >
                                                <ComputerDesktopIcon className={`w-3.5 h-3.5 ${isDeviceMenuOpen ? 'text-white' : 'text-amber-500'}`} />
                                                <span className={`text-[9.5px] font-black uppercase tracking-widest ${isDeviceMenuOpen ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'}`}>
                                                    Device: {device ? {
                                                        mobile: 'Mobile',
                                                        desktop: 'Desktop',
                                                        tablet: 'Tablet'
                                                    }[device] || device : 'All'}
                                                </span>
                                                <ChevronDownIcon className={`w-3 h-3 transition-transform ${isDeviceMenuOpen ? 'rotate-180 opacity-100' : 'opacity-40'}`} />
                                            </button>

                                            {isDeviceMenuOpen && (
                                                <div className="absolute top-full left-0 mt-2 z-[100] bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-1.5 min-w-[120px] animate-in fade-in zoom-in-95 duration-200 normal-case tracking-normal">
                                                    {[
                                                        { label: 'All Devices', value: 'all', icon: FunnelIcon },
                                                        { label: 'Mobile', value: 'mobile', icon: DevicePhoneMobileIcon },
                                                        { label: 'Desktop', value: 'desktop', icon: ComputerDesktopIcon },
                                                        { label: 'Tablet', value: 'tablet', icon: DeviceTabletIcon },
                                                    ].map((d) => (
                                                        <button
                                                            key={d.value}
                                                            onClick={() => {
                                                                setFilters({ device: d.value });
                                                                setIsDeviceMenuOpen(false);
                                                            }}
                                                            className={`w-full text-left px-3 py-2 rounded-xl text-[10px] font-bold transition-all flex items-center gap-2 ${device === d.value
                                                                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                                                                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                                                }`}
                                                        >
                                                            <d.icon className="w-3 h-3" />
                                                            {d.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Property Metadata Badges */}
                                <div className="flex flex-wrap items-center gap-3 font-semibold">
                                    {[
                                        { 
                                            label: 'PROPERTY URL', 
                                            value: gsc?.gscSiteUrl?.replace('https://', '').replace('http://', '') || 'Unknown', 
                                            icon: GlobeAltIcon,
                                            iconBg: 'bg-amber-50 dark:bg-amber-950/40',
                                            iconBorder: 'border-amber-100/80 dark:border-amber-900/30',
                                            iconColor: 'text-amber-500 dark:text-amber-400',
                                            badgeBg: 'bg-amber-50/40 dark:bg-amber-950/10',
                                            badgeBorder: 'border-amber-100/50 dark:border-amber-900/20 hover:border-amber-500/30'
                                        },
                                        { 
                                            label: 'PROPERTY TYPE', 
                                            value: gsc?.gscSiteUrl?.startsWith('sc-domain:') ? 'Domain Property' : 'URL Prefix', 
                                            icon: DocumentTextIcon,
                                            iconBg: 'bg-blue-50 dark:bg-blue-950/40',
                                            iconBorder: 'border-blue-100/80 dark:border-blue-900/30',
                                            iconColor: 'text-blue-500 dark:text-blue-400',
                                            badgeBg: 'bg-blue-50/40 dark:bg-blue-950/10',
                                            badgeBorder: 'border-blue-100/50 dark:border-blue-900/20 hover:border-blue-500/30'
                                        },
                                        { 
                                            label: 'SYNC ACCOUNT', 
                                            value: gsc?.gscTokenEmail || 'Unknown', 
                                            icon: EnvelopeIcon,
                                            iconBg: 'bg-indigo-50 dark:bg-indigo-950/40',
                                            iconBorder: 'border-indigo-100/80 dark:border-indigo-900/30',
                                            iconColor: 'text-indigo-500 dark:text-indigo-400',
                                            badgeBg: 'bg-indigo-50/40 dark:bg-indigo-950/10',
                                            badgeBorder: 'border-indigo-100/50 dark:border-indigo-900/20 hover:border-indigo-500/30'
                                        }
                                    ].map((item, idx) => (
                                        <div 
                                            key={idx} 
                                            className={`flex items-center gap-3 px-3.5 py-1.5 rounded-2xl ${item.badgeBg} border ${item.badgeBorder} shadow-[0_1px_4px_rgba(0,0,0,0.01)] transition-all duration-300 hover:scale-[1.02] hover:shadow-sm min-w-max group`}
                                        >
                                            <div className={`w-7.5 h-7.5 rounded-xl ${item.iconBg} flex items-center justify-center border ${item.iconBorder} shrink-0 transition-transform duration-300 group-hover:scale-105`}>
                                                <item.icon className={`w-3.5 h-3.5 ${item.iconColor}`} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-neutral-700 dark:text-neutral-500 uppercase tracking-widest leading-none mb-1">{item.label}</span>
                                                <span className="text-[12px] font-bold text-neutral-500 dark:text-neutral-300 tracking-tight" title={item.value}>{item.value}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
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
                            platform="gsc"
                            sectionKey="searchClicks"
                            siteId={activeSiteId}
                            startDate={gscStart}
                            endDate={gscEnd}
                            device={device}
                            onInsightGenerated={handleInsightGenerated}
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
                            platform="gsc"
                            sectionKey="impressions"
                            siteId={activeSiteId}
                            startDate={gscStart}
                            endDate={gscEnd}
                            device={device}
                            onInsightGenerated={handleInsightGenerated}
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
                            platform="gsc"
                            sectionKey="avgCtr"
                            siteId={activeSiteId}
                            startDate={gscStart}
                            endDate={gscEnd}
                            device={device}
                            onInsightGenerated={handleInsightGenerated}
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
                            platform="gsc"
                            sectionKey="avgPosition"
                            siteId={activeSiteId}
                            startDate={gscStart}
                            endDate={gscEnd}
                            device={device}
                            onInsightGenerated={handleInsightGenerated}
                        />
                    </div>

                    {/* ADD 2 — Summary Strip */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        <SummaryStripCard
                            label="Total Queries"
                            value={formatNumber(data?.totalQueries || 0)}
                            icon={<MagnifyingGlassIcon className="w-5 h-5 text-blue-500" />}
                            insight={data?.intelligence?.totalQueries}
                            platform="gsc"
                            sectionKey="totalQueries"
                            siteId={activeSiteId}
                            startDate={gscStart}
                            endDate={gscEnd}
                            device={device}
                            onInsightGenerated={handleInsightGenerated}
                            loading={loading}
                            isSyncing={isSyncing}
                        />
                        <SummaryStripCard
                            label="Total Pages"
                            value={formatNumber(data?.totalPages || 0)}
                            icon={<Square3Stack3DIcon className="w-5 h-5 text-emerald-500" />}
                            insight={data?.intelligence?.totalPages}
                            platform="gsc"
                            sectionKey="totalPages"
                            siteId={activeSiteId}
                            startDate={gscStart}
                            endDate={gscEnd}
                            device={device}
                            onInsightGenerated={handleInsightGenerated}
                            loading={loading}
                            isSyncing={isSyncing}
                        />
                        <SummaryStripCard
                            label="Top Position"
                            value={data?.topPosition > 0 ? `#${data.topPosition.toFixed(1)}` : '—'}
                            icon={<TrophyIcon className="w-5 h-5 text-amber-500" />}
                            insight={data?.intelligence?.topPosition}
                            platform="gsc"
                            sectionKey="topPosition"
                            siteId={activeSiteId}
                            startDate={gscStart}
                            endDate={gscEnd}
                            device={device}
                            onInsightGenerated={handleInsightGenerated}
                            loading={loading}
                            isSyncing={isSyncing}
                        />
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
                                        openWithQuestion(`Act as my elite SEO Growth Strategist and Analytics Expert. Analyze my Search Performance Overview daily dataset for the period ${gscStart} to ${gscEnd}:

                                        Daily Click & Impression Trend:
                                        ${dailyDataStr}

                                        Identify significant trends, organic visibility spikes, seasonal patterns, or anomalies and provide detailed actionable insights.`, '📈 Search Click & Impression Trends');
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
                                platform="gsc"
                                sectionKey="searchPerformanceOverview"
                                siteId={activeSiteId}
                                startDate={gscStart}
                                endDate={gscEnd}
                                device={device}
                                onInsightGenerated={handleInsightGenerated}
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
                                            openWithQuestion(`Act as my elite SEO Growth Strategist. Analyze my GSC Click-Through Rate (CTR) Trend for the period ${gscStart} to ${gscEnd}:

                                            Daily CTR Trend:
                                            ${dailyCtrStr}

                                            Evaluate our click engagement profile. What are the key takeaways, and how can we optimize our snippets to maximize search CTR?`, '📊 Click-Through Rate (CTR) Trend');
                                        }}
                                        className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                        ASK AI
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-neutral-400 font-semibold mb-4">Daily CTR for selected period</p>
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
                                <SectionAiSummary 
                                    insight={data?.intelligence?.clickThroughRateTrend} 
                                    loading={loading || isSyncing} 
                                    sectionTitle="AI CTR INSIGHT"
                                    platform="gsc"
                                    sectionKey="clickThroughRateTrend"
                                    siteId={activeSiteId}
                                    startDate={gscStart}
                                    endDate={gscEnd}
                                    device={device}
                                    onInsightGenerated={handleInsightGenerated}
                                />
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
                                            openWithQuestion(`Act as my elite SEO Ranking Coach. Analyze my Average Ranking Position trend for the period ${gscStart} to ${gscEnd}:

                                                Daily Position Trend:
                                                ${dailyPosStr}

                                                Evaluate our search positions climbing, stabilizing, or slipping over time. What is the best SEO playbook to optimize our content structure to lift our overall positions?`, '🔢 Average Ranking Position Trend');
                                        }}
                                        className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                        ASK AI
                                    </button>
                                    <span className="text-xs font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-full border border-amber-100 dark:border-amber-800">Lower rank = Better</span>
                                </div>
                            </div>
                            <p className="text-xs text-neutral-400 font-semibold mb-4">Daily position for selected period</p>
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
                                <SectionAiSummary 
                                    insight={data?.intelligence?.averageRankingPosition} 
                                    loading={loading || isSyncing} 
                                    sectionTitle="AI POSITION INSIGHT"
                                    platform="gsc"
                                    sectionKey="averageRankingPosition"
                                    siteId={activeSiteId}
                                    startDate={gscStart}
                                    endDate={gscEnd}
                                    device={device}
                                    onInsightGenerated={handleInsightGenerated}
                                />
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
                                            openWithQuestion(`Act as my elite SEO Growth Strategist. Analyze my Low CTR Keyword dataset to capture missed clicks:

                                            Low CTR Keyword Opportunities:
                                            ${allLowCtrStr}

                                            Please evaluate the highest priority keywords, identify potential reasons for low click-through rates, and deliver a step-by-step metadata optimization blueprint.`, '💡 Low CTR Keyword Opportunities');
                                        }}
                                        className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                        ASK AI
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-neutral-400 font-semibold mb-4">These keywords get views but few clicks — fix your title & description</p>
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
                                                    <div className="text-[13px] font-bold text-neutral-800 dark:text-white truncate">{q.query}</div>
                                                    <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-1">{formatNumber(q.impressions)} impressions • rank #{q.position?.toFixed(1)}</div>
                                                </div>
                                                <div className="text-right ml-3">
                                                    <div className="text-[13px] font-extrabold text-amber-600 dark:text-amber-400">{q.ctr.toFixed(1)}% CTR</div>
                                                    <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-1">{q.clicks} clicks</div>
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
                                <SectionAiSummary 
                                    insight={data?.intelligence?.lowCTRKeywords} 
                                    loading={loading || isSyncing} 
                                    sectionTitle="AI OPPORTUNITY INSIGHT"
                                    platform="gsc"
                                    sectionKey="lowCTRKeywords"
                                    siteId={activeSiteId}
                                    startDate={gscStart}
                                    endDate={gscEnd}
                                    device={device}
                                    onInsightGenerated={handleInsightGenerated}
                                />
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
                                            openWithQuestion(`Act as my expert SEO Coach and ranking strategist. Analyze these high-opportunity keywords ranking near Page 1 (positions #8 to #20):

                                            Keywords Near Page 1:
                                            ${allNearStr}

                                            Please deliver a step-by-step ranking roadmap including priority recommendations, semantic content expansions, and link optimization to push these terms onto Page 1.`, '🚀 Near Page 1 Keywords (Ranking #8 - #20)');
                                        }}
                                        className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                        ASK AI
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-neutral-400 font-semibold mb-4">Keywords close to page 1 — a little SEO effort can push them up</p>
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
                                                    <div className="text-[13px] font-bold text-neutral-800 dark:text-white truncate">{q.query}</div>
                                                    <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-1">{formatNumber(q.impressions)} impressions • {q.clicks} clicks</div>
                                                </div>
                                                <div className="text-right ml-3">
                                                    <div className="text-[13px] font-extrabold text-green-600 dark:text-green-400">Pos #{q.position?.toFixed(1)}</div>
                                                    <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-1">{q.ctr.toFixed(1)}% CTR</div>
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
                                <SectionAiSummary 
                                    insight={data?.intelligence?.keywordsNearPage1} 
                                    loading={loading || isSyncing} 
                                    sectionTitle="AI RANKING INSIGHT"
                                    platform="gsc"
                                    sectionKey="keywordsNearPage1"
                                    siteId={activeSiteId}
                                    startDate={gscStart}
                                    endDate={gscEnd}
                                    device={device}
                                    onInsightGenerated={handleInsightGenerated}
                                />
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
                                            openWithQuestion(`Act as my elite SEO Strategist. Analyze my top-performing organic search queries driving search traffic:

                                            Top Organic Queries:
                                            ${allQueriesStr}

                                            Provide a tactical evaluation of keyword performance, organic defense tactics to secure these rankings, and long-tail query expansions.`, '📣 Top Performing Search Queries');
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
                                <SectionAiSummary 
                                    insight={data?.intelligence?.topQueries} 
                                    loading={loading || isSyncing} 
                                    sectionTitle="AI QUERY INSIGHT"
                                    platform="gsc"
                                    sectionKey="topQueries"
                                    siteId={activeSiteId}
                                    startDate={gscStart}
                                    endDate={gscEnd}
                                    device={device}
                                    onInsightGenerated={handleInsightGenerated}
                                />
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
                                            openWithQuestion(`Act as my expert organic engagement specialist. Perform a landing page performance and organic visibility audit:

                                            Top Landing Pages:
                                            ${allPagesStr}

                                            Identify pages with high impressions but low conversion CTR and suggest clear CRO improvements and content layout optimizations.`, '📝 Landing Page Performance Audit');
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
                                <SectionAiSummary 
                                    insight={data?.intelligence?.topLandingPages} 
                                    loading={loading || isSyncing} 
                                    sectionTitle="AI PAGE INSIGHT"
                                    platform="gsc"
                                    sectionKey="topLandingPages"
                                    siteId={activeSiteId}
                                    startDate={gscStart}
                                    endDate={gscEnd}
                                    device={device}
                                    onInsightGenerated={handleInsightGenerated}
                                />
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
                                        openWithQuestion(`Act as my expert Search Visibility Strategist. Analyze my daily organic impression volume and brand exposure:

                                        Daily Impression Trend:
                                        ${impressionsTrendStr}

                                        Evaluate this impression trajectory, identifying our search share of voice, brand exposure spikes, and tactical recommendations to keep driving visibility higher.`, '📺 Daily Organic Impression Trends');
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
                            <SectionAiSummary 
                                insight={data?.intelligence?.dailyImpressionVolume} 
                                loading={loading || isSyncing} 
                                sectionTitle="AI VISIBILITY INSIGHT"
                                platform="gsc"
                                sectionKey="dailyImpressionVolume"
                                siteId={activeSiteId}
                                startDate={gscStart}
                                endDate={gscEnd}
                                device={device}
                                onInsightGenerated={handleInsightGenerated}
                            />
                        </div>
                    </div>

                    {/* ADD 5 — Period Comparison Table */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                        <h3 className="text-sm font-black text-neutral-900 dark:text-white">Period Comparison</h3>
                        <p className="text-xs text-neutral-400 font-semibold mt-0.5">This period vs last period — all key metrics</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => {
                                    const comp = data?.periodComparison;
                                    openWithQuestion(`Act as my elite SEO Growth Analyst. Analyze my Organic Search Period Comparison dataset (This Period vs Prior Period):

                                    📊 [PERIOD COMPARISON]
                                    - Clicks: ${formatNumber(comp?.thisPeriod?.clicks || 0)} vs ${formatNumber(comp?.lastPeriod?.clicks || 0)} (${comp?.change?.clicks || 0}% change)
                                    - Impressions: ${formatNumber(comp?.thisPeriod?.impressions || 0)} vs ${formatNumber(comp?.lastPeriod?.impressions || 0)} (${comp?.change?.impressions || 0}% change)
                                    - Average CTR: ${(comp?.thisPeriod?.ctr || 0).toFixed(2)}% vs ${(comp?.lastPeriod?.ctr || 0).toFixed(2)}% (${comp?.change?.ctr || 0}% change)
                                    - Avg Position: #${(comp?.thisPeriod?.position || 0).toFixed(1)} vs #${(comp?.lastPeriod?.position || 0).toFixed(1)} (${comp?.change?.position || 0}% change)

                                    Please deliver an executive SEO audit analyzing this growth trajectory, key performance highlights, and priority organic growth recommendations.`, '📊 Period Comparison Analysis');
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
                         platform="gsc"
                         sectionKey="periodComparison"
                         siteId={activeSiteId}
                         startDate={gscStart}
                         endDate={gscEnd}
                         device={device}
                         onInsightGenerated={handleInsightGenerated}
                    />
                    </div>

                </div>
            </DashboardLayout>
        );
    };

    export default GscPage;
