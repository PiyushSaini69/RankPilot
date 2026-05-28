import React, { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';

import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/ui/DashboardLayout';
import KpiCard from '../components/dashboard/KpiCard';
import DataTable from '../components/dashboard/DataTable';
import { useDateRangeStore } from '../store/dateRangeStore';
import { useAccountsStore } from '../store/accountsStore';
import { useAiChatStore } from '../store/aiChatStore';
import api from '../api';
import { getActiveAccounts } from '../api/accountApi';
import {
    ArrowDownTrayIcon,
    GlobeAltIcon,
    EnvelopeIcon,
    ArrowPathIcon,
    UsersIcon,
    ChartBarIcon,
    ChevronRightIcon,
    ChevronDownIcon,
    CalendarIcon,
    ComputerDesktopIcon,
    FunnelIcon,
    DevicePhoneMobileIcon,
    DeviceTabletIcon,
    SparklesIcon,
    ClockIcon,
    CursorArrowRaysIcon,
    UserPlusIcon,
    EyeIcon,
    ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { exportToServerPdf } from '../utils/reportExport';
import {
    ResponsiveContainer,
    AreaChart, Area,
    BarChart, Bar,
    PieChart, Pie, Cell,
    XAxis, YAxis,
    Tooltip, CartesianGrid
} from 'recharts';
import { useFilterStore } from '../store/filterStore';

const formatNumber = (num) =>
    Number(num || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

const Ga4Logo = ({ className = "w-6 h-6" }) => (
    <img src="https://www.vectorlogo.zone/logos/google_analytics/google_analytics-icon.svg" alt="GA4" className={`${className} object-contain`} />
);

const SectionAiSummary = ({ insight, loading, title = "AI SUMMARY" }) => (
    <div className="mt-4 p-4 bg-brand-50/10 dark:bg-brand-500/5 border border-brand-100/50 dark:border-brand-500/20 rounded-[1.5rem] animate-in fade-in duration-700">
        <h4 className="text-[10px] font-black text-neutral-900 dark:text-white uppercase tracking-[0.15em] mb-3">{title}</h4>
        {loading ? (
            <div className="space-y-2 animate-pulse mb-4">
                <div className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full w-full" />
                <div className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full w-[85%]" />
            </div>
        ) : (
            <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4">
                {insight || "Analyzing section data for strategic intelligence..."}
            </p>
        )}
    </div>
);

const Ga4Page = () => {
    const startDate = useDateRangeStore(s => s.startDate);
    const endDate = useDateRangeStore(s => s.endDate);
    const device = useFilterStore(s => s.device);

    const activeSiteId = useAccountsStore(s => s.activeSiteId);
    const activeSiteName = useAccountsStore(s => s.activeSiteName);
    const activeSiteUrl = useAccountsStore(s => s.activeSiteUrl);
    const ga4 = useAccountsStore(s => s.ga4);
    const setAccounts = useAccountsStore(s => s.setAccounts);

    const isConnected = !!ga4?.ga4PropertyId;
    const hasProperty = !!ga4?.ga4PropertyId;
    const navigate = useNavigate();
    const openWithQuestion = useAiChatStore(s => s.openWithQuestion);
    const [loading, setLoading] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);


    const preset = useDateRangeStore(s => s.preset);
    const setPreset = useDateRangeStore(s => s.setPreset);
    const setFilters = useFilterStore(s => s.setFilters);
    const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
    const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false);
    const [isCustomDateMode, setIsCustomDateMode] = useState(false);
    const [tempDateRange, setTempDateRange] = useState({ start: startDate, end: endDate });

    const [data, setData] = useState(null);

    const presetLabels = {
        'today': 'Today',
        'yesterday': 'Yesterday',
        '7d': 'Last 7 Days',
        '28d': 'Last 28 Days',
        '90d': 'Last 90 Days',
        '1y': 'Last Year',
        'custom': 'Custom Range'
    };

    const loadData = useCallback(async () => {
        if (!isConnected || !hasProperty) return;
        setLoading(true);
        try {
            const query = new URLSearchParams({
                startDate,
                endDate,
                device: device || 'all',
                ...(activeSiteId && { siteId: activeSiteId })
            }).toString();

            const res = await api.get(`/analytics/ga4-summary?${query}`);
            const data = res.data;

            setData(data);
        } catch (err) {
            console.error("GA4 fetch err", err);
        } finally {
            setLoading(false);
        }
    }, [isConnected, hasProperty, startDate, endDate, device, activeSiteId]);

    const handleManualRefresh = async () => {
        if (!activeSiteId) return;
        setLoading(true);
        setAccounts({
            syncStatus: 'syncing',
            ga4: {
                ga4SyncStatus: 'syncing'
            }
        });
        try {
            await api.post('/analytics/sync', { siteId: activeSiteId });
            const res = await getActiveAccounts(activeSiteId);
            const data = res.data || {};
            setAccounts({
                syncStatus: data.syncStatus || 'idle',
                ga4: {
                    ga4HistoricalComplete: data.ga4HistoricalComplete || false,
                    ga4LastSyncedAt: data.ga4LastSyncedAt || null,
                    ga4SyncStatus: data.syncStatus || 'idle'
                }
            });
            await loadData();
        } catch (err) {
            console.error('Manual sync failed:', err);
            const res = await getActiveAccounts(activeSiteId).catch(() => ({ data: {} }));
            const data = res.data || {};
            setAccounts({
                syncStatus: data.syncStatus || 'error',
                ga4: {
                    ga4HistoricalComplete: data.ga4HistoricalComplete || false,
                    ga4LastSyncedAt: data.ga4LastSyncedAt || null,
                    ga4SyncStatus: data.syncStatus || 'error'
                }
            });
            await loadData();
        } finally {
            setLoading(false);
        }
    };

    const handlePdfExport = async () => {
        setIsExportingPdf(true);
        try {
            await exportToServerPdf('/dashboard/ga4', `RankPilot-GA4-${activeSiteId}`);
        } catch (err) {
            toast.error('Failed to generate PDF. The server might be busy.');
        } finally {
            setIsExportingPdf(false);
        }
    };

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

    const handleDeviceSelect = (val) => {
        setFilters({ device: val });
        setIsDeviceMenuOpen(false);
    };

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        const interval = setInterval(() => {
            console.log('Auto-refreshing GA4 data...');
            loadData();
        }, 30 * 60 * 1000);

        return () => clearInterval(interval);
    }, [loadData]);

    useEffect(() => {
        if (ga4?.ga4SyncStatus !== 'syncing' && activeSiteId) {
            console.log('GA4 Sync completed or idle, refreshing data...');
            loadData();
        }
    }, [ga4?.ga4SyncStatus, activeSiteId, loadData]);

    useEffect(() => {
        let interval;
        if (activeSiteId && ga4?.ga4SyncStatus === 'syncing') {
            interval = setInterval(async () => {
                try {
                    const res = await getActiveAccounts(activeSiteId);
                    const data = res.data || {};
                    setAccounts({
                        syncStatus: data.syncStatus || 'idle',
                        ga4: {
                            ga4HistoricalComplete: data.ga4HistoricalComplete || false,
                            ga4LastSyncedAt: data.ga4LastSyncedAt || null,
                            ga4SyncStatus: data.ga4SyncStatus || 'idle',
                            ga4SyncProgress: data.ga4SyncProgress || 0,
                            ga4HistoricalChunkIndex: data.ga4HistoricalChunkIndex || 0,
                            ga4TokenEmail: data.ga4TokenId?.email || null
                        }
                    });
                } catch (e) {
                    console.error("Polling GA4 sync status error", e);
                }
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [activeSiteId, ga4?.ga4SyncStatus, setAccounts]);

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


    if (!isConnected || !hasProperty) {
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
                                    <Ga4Logo className="w-14 h-14 grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" />

                                    {/* Disconnected Pulse */}
                                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full border-4 border-white dark:border-[#0d0d0d] flex items-center justify-center">
                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_8px_white]"></div>
                                    </div>
                                </div>
                                <div className="absolute inset-0 bg-brand-500/10 blur-3xl rounded-full scale-150 rotate-45 -z-10 animate-pulse"></div>
                            </div>

                            <div className="space-y-3 max-w-md">
                                <h1 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tighter leading-tight">
                                    {isMissingConn ? 'Google Analytics Disconnected' : 'Select Analytics Property'}
                                </h1>
                                <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400 leading-relaxed italic">
                                    {isMissingConn
                                        ? "Connect Google Analytics 4 to track active visitors, user acquisition, engagement trends, and content performance."
                                        : "Select your verified GA4 property below to sync user behavior metrics with RankPilot's AI mapping."
                                    }
                                </p>
                            </div>

                            <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center justify-center">
                                <button
                                    onClick={() => navigate('/connect-accounts')}
                                    className="px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-[.2em] shadow-xl shadow-brand-500/30 active:scale-95 transition-all flex items-center gap-3"
                                >
                                    {isMissingConn ? 'Connect Analytics' : 'Select Property'}
                                    <ArrowPathIcon className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Decorative Feature List */}
                            <div className="mt-16 grid grid-cols-3 gap-6 w-full opacity-30 group-hover:opacity-60 transition-opacity duration-1000 border-t border-neutral-100 dark:border-neutral-800/50 pt-10">
                                {[
                                    { label: 'Active Users', icon: UsersIcon },
                                    { label: 'Total Sessions', icon: ChartBarIcon },
                                    { label: 'Engagement Rate', icon: CursorArrowRaysIcon }
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

    const searchQuery = useFilterStore(s => s.searchQuery);
    const setSearchQuery = useFilterStore(s => s.setSearchQuery);

    // Sync chal raha hai to shimmer dikhao
    const isSyncing = ga4?.ga4HistoricalComplete === false;
    const syncedDays = ga4?.ga4HistoricalChunkIndex || 0;
    const syncProgress = ga4?.ga4SyncProgress || 0;
    const totalSyncDays = syncProgress > 0
        ? Math.min(90, Math.round(syncedDays / (syncProgress / 100) / 10) * 10)
        : 90;

    return (
        <DashboardLayout>
            <div id="ga4-report" className="flex flex-col space-y-8">
                {isSyncing && (
                    <div className="relative overflow-hidden w-full bg-white dark:bg-[#0d0d0d] border border-amber-500/30 dark:border-amber-500/20 rounded-[2rem] p-6 shadow-xl shadow-amber-500/5 animate-in fade-in slide-in-from-top-4 duration-1000 group">
                        {/* Decorative background glows */}
                        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none transition-transform duration-1000 group-hover:scale-110"></div>
                        <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-500/5 rounded-full blur-[100px] pointer-events-none transition-transform duration-1000 group-hover:scale-110"></div>

                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-5">
                                {/* Dynamic animated sync icon */}
                                <div className="relative shrink-0 w-14 h-14 bg-amber-500/10 rounded-[1.25rem] border border-amber-500/20 flex items-center justify-center overflow-hidden">
                                    <ArrowPathIcon className={`w-7 h-7 text-amber-500 ${ga4?.ga4SyncStatus === 'syncing' ? 'animate-spin' : 'animate-pulse'}`} />
                                    <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/0 via-amber-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 duration-700 transition-opacity"></div>
                                </div>

                                <div className="space-y-1.5 text-left">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-[0.15em]">
                                            Syncing Historical Data
                                        </h3>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                                            {ga4?.ga4SyncStatus === 'syncing' ? 'Importing Data' : 'In Queue'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-2xl italic">
                                        We are importing your historical Google Analytics data. Your dashboard metrics, performance charts, and AI insights will automatically populate and update as the sync progresses.
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
                                    <Ga4Logo className="w-7 h-7" />
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2.5">
                                        <h1 className="text-lg md:text-xl font-bold text-neutral-900 dark:text-white tracking-tight leading-none">Google Analytics 4</h1>
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
                                        Understand your visitors in real-time and get AI-powered insights to grow your site.
                                    </p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-2 shrink-0 self-start lg:self-center">
                                <button
                                    onClick={() => {
                                        const fullPrompt = `Act as my elite Marketing Coach and Growth Strategist. I want you to perform a deep-dive, professional marketing audit of my Google Analytics 4 (GA4) dashboard for the period ${startDate} to ${endDate}.
 
                                            Here is the COMPLETE raw analytical dataset of my site's GA4 integration:
 
                                            📊 [CORE PERFORMANCE METRICS]
                                            - Active Users: ${formatNumber(data?.activeUsers?.value)} (${data?.activeUsers?.change}% vs prior period)
                                            - Total Sessions: ${formatNumber(data?.totalSessions?.value)} (${data?.totalSessions?.change}% vs prior period)
                                            - Total Page Views: ${formatNumber(data?.pageViews)}
                                            - Engagement Rate: ${data?.engagementRates?.engagementRate || '0'}% (${data?.engagementRate?.change}% vs prior period)
                                            - Average Session Duration: ${data?.avgSessionDuration?.value}
                                            - Bounce Rate: ${(data?.thisPeriodVsLastPeriod?.thisPeriod?.bounceRate || 0).toFixed(1)}%
 
                                            📈 [PERIOD VS PERIOD TRAJECTORY METRICS]
                                            - Users: This Period ${formatNumber(data?.thisPeriodVsLastPeriod?.thisPeriod?.users)} vs Prior Period ${formatNumber(data?.thisPeriodVsLastPeriod?.lastPeriod?.users)} (Change: ${data?.thisPeriodVsLastPeriod?.change?.users}%)
                                            - Sessions: This Period ${formatNumber(data?.thisPeriodVsLastPeriod?.thisPeriod?.sessions)} vs Prior Period ${formatNumber(data?.thisPeriodVsLastPeriod?.lastPeriod?.sessions)} (Change: ${data?.thisPeriodVsLastPeriod?.change?.sessions}%)
                                            - Page Views: This Period ${formatNumber(data?.thisPeriodVsLastPeriod?.thisPeriod?.pageViews)} vs Prior Period ${formatNumber(data?.thisPeriodVsLastPeriod?.lastPeriod?.pageViews)} (Change: ${data?.thisPeriodVsLastPeriod?.change?.pageViews}%)
                                            - Bounce Rate: This Period ${(data?.thisPeriodVsLastPeriod?.thisPeriod?.bounceRate || 0).toFixed(1)}% vs Prior Period ${(data?.thisPeriodVsLastPeriod?.lastPeriod?.bounceRate || 0).toFixed(1)}% (Change: ${data?.thisPeriodVsLastPeriod?.change?.bounceRate}%)
                                            - Avg Session Duration: This Period ${data?.thisPeriodVsLastPeriod?.thisPeriod?.avgSessionDuration} vs Prior Period ${data?.thisPeriodVsLastPeriod?.lastPeriod?.avgSessionDuration} (Change: ${data?.thisPeriodVsLastPeriod?.change?.avgSessionDuration}%)
 
                                            📣 [USER ACQUISITION BY TRAFFIC CHANNEL]
                                            ${(data?.topTrafficSources || []).map((t, idx) => `${idx + 1}. Source: ${t.source} | Sessions: ${formatNumber(t.sessions)} | Users: ${formatNumber(t.users)}`).join('\n')}
 
                                            📝 [TOP RESOUNDING PAGES & CONTENT PATHS]
                                            ${(data?.topPages || []).map((p, idx) => `${idx + 1}. Path: ${p.path} | Title: "${p.title || 'Untitled'}" | Views: ${formatNumber(p.views)} | Users: ${formatNumber(p.users)} | Bounce Rate: ${(p.bounceRate || 0).toFixed(1)}%`).join('\n')}
 
                                            👥 [AUDIENCE PERSONA & DEMOGRAPHICS]
                                            - New Visitors: ${data?.newVsReturningUsers?.newUsersPercentage || '0'}% of users
                                            - Returning Visitors: ${data?.newVsReturningUsers?.returningUsersPercentage || '0'}% of users
 
                                            📱 [DEVICE & EXPERIENCE CHANNELS]
                                            ${(data?.deviceBreakdown?.devices || []).map(d => `- ${d.name}: ${d.percentage}% of traffic (${formatNumber(d.value)} sessions)`).join('\n')}
 
                                            ---
 
                                            Based on this complete, granular dataset, please deliver:
                                            1. A **Comprehensive Executive Health Check** summarizing the overall trajectory and identifying any hidden anomalies.
                                            2. A **Traffic-to-Content Correlation Audit** explaining which channels drive high-quality traffic (low bounce, high duration) and which pages suffer from friction.
                                            3. A **3-Part Actionable Growth Blueprint** containing step-by-step strategies for conversion rate optimization (CRO) and organic acquisition scaling.`;
                                        openWithQuestion(fullPrompt, '📊 Full GA4 Dashboard Analysis');
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
                                <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/5 rounded-full border border-emerald-500/10 shrink-0 hide-in-pdf">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
                                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">Active</span>
                                </div>
                                <div className="flex items-center gap-3 hide-in-pdf">
                                    <div className="flex items-center gap-1.5 text-[9.5px] text-neutral-400 font-bold uppercase tracking-widest">
                                        Synced: <span className={`tabular-nums font-black ${isSyncing ? 'text-amber-500' : 'text-neutral-700 dark:text-neutral-300'}`}>
                                            {isSyncing ? 'Syncing...' : ga4?.ga4LastSyncedAt ? formatDistanceToNow(new Date(ga4.ga4LastSyncedAt), { addSuffix: true }) : 'Never'}
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
                                                        onClick={() => handleDeviceSelect(d.value)}
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
                            <div className="flex flex-wrap items-center gap-3">
                                {[
                                    { 
                                        label: 'PROPERTY NAME', 
                                        value: ga4?.ga4PropertyName || 'Unknown', 
                                        icon: GlobeAltIcon,
                                        iconBg: 'bg-blue-50 dark:bg-blue-950/40',
                                        iconBorder: 'border-blue-100/80 dark:border-blue-900/30',
                                        iconColor: 'text-blue-500 dark:text-blue-400',
                                        badgeBg: 'bg-blue-50/40 dark:bg-blue-950/10',
                                        badgeBorder: 'border-blue-100/50 dark:border-blue-900/20 hover:border-blue-500/30'
                                    },
                                    { 
                                        label: 'PROPERTY ID', 
                                        value: ga4?.ga4PropertyId ? '#' + ga4.ga4PropertyId.replace('properties/', '') : 'Unknown', 
                                        icon: ChartBarIcon,
                                        iconBg: 'bg-amber-50 dark:bg-amber-950/40',
                                        iconBorder: 'border-amber-100/80 dark:border-amber-900/30',
                                        iconColor: 'text-amber-500 dark:text-amber-400',
                                        badgeBg: 'bg-amber-50/40 dark:bg-amber-950/10',
                                        badgeBorder: 'border-amber-100/50 dark:border-amber-900/20 hover:border-amber-500/30'
                                    },
                                    { 
                                        label: 'SYNC ACCOUNT', 
                                        value: ga4?.ga4TokenEmail || 'Unknown', 
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
                                            <span className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest leading-none mb-1">{item.label}</span>
                                            <span className="text-[12px] font-bold text-neutral-700 dark:text-neutral-300 tracking-tight" title={item.value}>{item.value}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard
                        title="Active Users"
                        value={formatNumber(data?.activeUsers.value)}
                        loading={loading || isSyncing}
                        Icon={UsersIcon}
                        change={data?.activeUsers.change}
                        isPositive={data?.activeUsers.isPositive}
                        changeText="vs last period"
                        chartData={data?.activeUsers.timeseries.map(d => d.users).slice(-10)}
                        insight={data?.intelligence.activeUsers}
                        contextPrompt={`Act as my Marketing Coach. My website has ${formatNumber(data?.activeUsers?.value)} active users with ${formatNumber(data?.newUsers)} being new visitors. Daily active users trend for the last 30 days: ${(data?.activeUsers?.timeseries || []).slice(-30).map(d => d.users).join(', ')}. Analyze this acquisition and provide a 1-sentence summary + 1-sentence strategic insight.`}
                    />
                    <KpiCard
                        title="Total Sessions"
                        value={formatNumber(data?.totalSessions.value)}
                        loading={loading || isSyncing}
                        Icon={ChartBarIcon}
                        change={data?.totalSessions.change}
                        isPositive={data?.totalSessions.isPositive}
                        changeText="vs last period"
                        chartData={data?.totalSessions.timeseries.map(d => d.sessions).slice(-10)}
                        insight={data?.intelligence.totalSessions}
                        contextPrompt={`Act as my Marketing Coach. Total sessions are ${formatNumber(data?.totalSessions?.value)} with ${formatNumber(data?.activeUsers?.value)} active users. Daily sessions trend for the last 30 days: ${(data?.totalSessions?.timeseries || []).slice(-30).map(d => d.sessions).join(', ')}. Compare this volume to my user base and provide a 1-sentence summary + 1-sentence strategic insight.`}
                    />
                    <KpiCard
                        title="Engagement Rate"
                        value={(data?.engagementRate.value) + "%"}
                        loading={loading || isSyncing}
                        Icon={CursorArrowRaysIcon}
                        change={data?.engagementRate.change}
                        isPositive={data?.engagementRate.isPositive}
                        changeText="vs last period"
                        chartData={data?.engagementRate.timeseries.map(d => d.engagementRate).slice(-10)}
                        insight={data?.intelligence.engagementRate}
                        contextPrompt={`Act as my Marketing Coach. My Engagement Rate is ${data?.engagementRates?.engagementRate || '0'}%. Daily engagement rate trend for the last 30 days: ${(data?.engagementRate?.timeseries || []).slice(-30).map(d => `${d.engagementRate}%`).join(', ')}. Analyze this content resonance and provide a 1-sentence summary + 1-sentence strategic insight.`}
                    />
                    <KpiCard
                        title="Avg. Session Duration"
                        value={data?.avgSessionDuration.value}
                        loading={loading || isSyncing}
                        Icon={ClockIcon}
                        change={data?.avgSessionDuration.change}
                        isPositive={data?.avgSessionDuration.isPositive}
                        changeText="vs last period"
                        chartData={data?.avgSessionDuration.timeseries.map(d => d.avgSessionDuration).slice(-10)}
                        insight={data?.intelligence.avgSessionDuration}
                        contextPrompt={`Act as my Marketing Coach. Users spend an average of ${data?.avgSessionDuration?.value} on site. Daily session duration trend for the last 30 days: ${(data?.avgSessionDuration?.timeseries || []).slice(-30).map(d => `${d.avgSessionDuration}s`).join(', ')}. Analyze this retention and provide a 1-sentence summary + 1-sentence strategic insight.`}
                    />
                </div>

                {/* ADD 2 — Summary Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {[
                        { label: 'Page Views', value: formatNumber(data?.pageViews), icon: <ChartBarIcon className="w-5 h-5 text-blue-500" />, insight: data?.intelligence.pageViews },
                        { label: 'New Users', value: formatNumber(data?.newUsers), icon: <UsersIcon className="w-5 h-5 text-emerald-500" />, insight: data?.intelligence.newUsers },
                        { label: 'Pages Per Session', value: data?.pagesPerSession, icon: <GlobeAltIcon className="w-5 h-5 text-purple-500" />, insight: data?.intelligence.pagesPerSession }
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
                                    <div className="text-xs text-neutral-800 dark:text-neutral-200 font-bold mt-0.5">{card.label}</div>
                                </div>
                            </div>
                            {card.insight && !(loading || isSyncing) && (
                                <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 leading-relaxed italic border-t border-neutral-100 dark:border-neutral-800 pt-2 mt-auto">
                                    "{card.insight}"
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                {/* Timeseries Chart Row (FIX Matrix + ADD New vs Returning) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* lg:col-span-2: Engagement Resonance Matrix */}
                    <div className="lg:col-span-2 bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col min-h-[450px] group relative">
                        <div className="p-8 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-emerald-500/5">
                            <div>
                                <h3 className="text-lg font-black text-neutral-900 dark:text-white">Sessions Over Time</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mt-1">{presetLabels[preset] || 'Custom Range'}</p>
                            </div>
                            <div className="p-2 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center gap-2">
                                <button
                                    onClick={() => openWithQuestion(`Act as my Marketing Coach. Analyze my Sessions Over Time trend for the period ${startDate} to ${endDate}:

                                    Daily Session Trend:
                                    ${(data?.sessionsOverTime || []).slice(-30).map(d => `- Date: ${d.date} | Sessions: ${d.sessions}`).join('\n')}

                                    Identify any patterns (like weekend surges) and provide a 1-sentence summary + 1-sentence strategic insight.`, '📈 Analyzing Sessions Over Time...')}
                                    className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                >
                                    <SparklesIcon className="w-3.5 h-3.5" />
                                    ASK AI
                                </button>
                                <ChartBarIcon className="w-5 h-5 text-emerald-500" />
                            </div>
                        </div>

                        <div className="flex-1 p-8 min-h-[350px] relative">
                            {(loading || isSyncing) ? (
                                <div className="w-full h-full animate-pulse bg-gradient-to-r from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-800/50 rounded-xl"></div>
                            ) : data?.sessionsOverTime.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-neutral-400">
                                    <div className="text-4xl mb-3">📭</div>
                                    <p className="text-sm font-semibold">No session data for this period</p>
                                    <p className="text-xs mt-1">Try selecting a wider date range</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data?.sessionsOverTime} margin={{ top: 10, right: 30, left: -20, bottom: 20 }}>
                                        <defs>
                                            <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
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
                                            interval={2}
                                            tickFormatter={(val) => {
                                                const d = new Date(val);
                                                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                            }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }}
                                            tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                                            domain={['auto', 'auto']}
                                        />
                                        <Tooltip
                                            labelFormatter={(label) => {
                                                const d = new Date(label);
                                                return d.toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                });
                                            }}
                                            contentStyle={{
                                                borderRadius: '20px',
                                                border: 'none',
                                                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                                                background: document.documentElement.classList.contains('dark') ? '#111827' : 'rgba(255, 255, 255, 0.95)',
                                                color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#111827',
                                                padding: '12px'
                                            }}
                                            itemStyle={{ fontWeight: '900', fontSize: '12px' }}
                                        />
                                        <Area type="monotone" dataKey="sessions" stroke="#10B981" strokeWidth={4} fillOpacity={1} fill="url(#colorSessions)" name="Sessions" strokeLinecap="round" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        <div className="px-8 pb-8">
                            <SectionAiSummary
                                insight={data?.intelligence.sessionsOverTime}
                                loading={loading || isSyncing}
                            />
                        </div>
                    </div>

                    {/* lg:col-span-1: ADD 3 — New vs Returning Users */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-[2rem] p-6 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-base font-black text-neutral-900 dark:text-white">New vs Returning Users</h3>
                            <button
                                onClick={() => openWithQuestion(`Act as my Marketing Coach. Analyze my user loyalty split (New vs Returning Users) for the period ${startDate} to ${endDate}:

                                    User Mix:
                                    - Total Users: ${formatNumber(data?.newVsReturningUsers?.totalUsers)}
                                    - New Users: ${formatNumber(data?.newVsReturningUsers?.totalNewUsers)} (${data?.newVsReturningUsers?.newUsersPercentage || '0'}%)
                                    - Returning Users: ${formatNumber(data?.newVsReturningUsers?.totalReturningUsers)} (${data?.newVsReturningUsers?.returningUsersPercentage || '0'}%)

                                    Provide a 1-sentence summary of this user loyalty and a 1-sentence strategic insight to improve retention.`, '👥 Analyzing New vs Returning Users...')}
                                className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                            >
                                <SparklesIcon className="w-3.5 h-3.5" />
                                ASK AI
                            </button>
                        </div>
                        <p className="text-xs text-neutral-400 font-semibold mb-4">Based on selected date range</p>

                        <div className="flex-1 flex items-center justify-center relative" style={{ minHeight: 220 }}>
                            {(loading || isSyncing) ? (
                                <div className="w-32 h-32 rounded-full border-8 border-neutral-100 dark:border-neutral-800 border-t-brand-500 animate-spin"></div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[{ name: 'New Users', value: data?.newVsReturningUsers.totalNewUsers }, { name: 'Returning', value: data?.newVsReturningUsers.totalReturningUsers }]}
                                            innerRadius={65} outerRadius={85} paddingAngle={4} dataKey="value"
                                        >
                                            <Cell fill="#3B82F6" />
                                            <Cell fill="#10B981" />
                                        </Pie>
                                        <text x="50%" y="44%" textAnchor="middle" dominantBaseline="middle"
                                            className="fill-neutral-900 dark:fill-white"
                                            style={{ fontSize: '24px', fontWeight: '900' }}>
                                            {formatNumber(data?.newVsReturningUsers.totalUsers)}
                                        </text>
                                        <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle"
                                            className="fill-neutral-500 dark:fill-neutral-400"
                                            style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.05em' }}>
                                            TOTAL USERS
                                        </text>
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '15px',
                                                border: 'none',
                                                background: document.documentElement.classList.contains('dark') ? '#111827' : '#FFFFFF',
                                                color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#111827'
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                                <div className="text-xl font-black text-blue-600 dark:text-blue-400 tabular-nums">
                                    {(loading || isSyncing) ? '...' : formatNumber(data?.newVsReturningUsers.totalNewUsers)}
                                </div>
                                <div className="text-xs text-neutral-500 mt-0.5">New Users</div>
                                <div className="text-xs font-black text-blue-500 mt-1">
                                    {(loading || isSyncing) ? <div className="h-3 w-10 bg-blue-200 dark:bg-blue-800 rounded animate-pulse mx-auto" /> : `${data?.newVsReturningUsers.newUsersPercentage}%`}
                                </div>
                            </div>
                            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl">
                                <div className="text-xl font-black text-green-600 dark:text-green-400 tabular-nums">
                                    {(loading || isSyncing) ? '...' : formatNumber(data?.newVsReturningUsers.totalReturningUsers)}
                                </div>
                                <div className="text-xs text-neutral-500 mt-0.5">Returning</div>
                                <div className="text-xs font-black text-green-500 mt-1">
                                    {(loading || isSyncing) ? <div className="h-3 w-10 bg-green-200 dark:bg-green-800 rounded animate-pulse mx-auto" /> : `${data?.newVsReturningUsers.returningUsersPercentage}%`}
                                </div>
                            </div>
                        </div>
                        <div className="mt-auto">
                            <SectionAiSummary
                                insight={data?.intelligence.newVsReturningUsers}
                                loading={loading || isSyncing}
                            />
                        </div>
                    </div>
                </div>

                {/* ADD 4 — Engagement Rate Section */}
                <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-[2rem] p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="text-base font-black text-neutral-900 dark:text-white">Engagement Rate</h3>
                            <p className="text-xs text-neutral-400 font-semibold mt-0.5">GA4 engagement metrics for selected period</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => openWithQuestion(`Act as my Marketing Coach. Analyze my engagement metrics for the period ${startDate} to ${endDate}:

                                    Engagement Profile:
                                    - Engagement Rate: ${data?.engagementRates?.engagementRate || '0'}%
                                    - Engaged Sessions: ${formatNumber(data?.engagementRates?.engagedSessions || 0)}
                                    - Avg Engaged Time: ${data?.engagementRates?.avgEngagedTime}

                                    Provide a 1-sentence summary of content resonance and a 1-sentence strategic insight to expand engagement.`, '⚡ Analyzing Engagement Rate...')}
                                className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                            >
                                <SparklesIcon className="w-3.5 h-3.5" />
                                ASK AI
                            </button>
                            <span className="text-xs font-bold bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 px-3 py-1 rounded-full border border-brand-100 dark:border-brand-800">GA4 Metric</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-800">
                            <div className="text-2xl font-black text-green-600 dark:text-green-400 tabular-nums">
                                {(loading || isSyncing) ? '—' : (data?.engagementRates.engagementRate + '%')}
                            </div>
                            <div className="text-xs text-neutral-500 mt-1">Engagement Rate</div>
                        </div>
                        <div className="text-center p-4 bg-brand-50 dark:bg-brand-900/10 rounded-2xl border border-brand-100 dark:border-brand-800">
                            <div className="text-2xl font-black text-brand-600 dark:text-brand-400 tabular-nums">
                                {(loading || isSyncing) ? '—' : formatNumber(data?.engagementRates.engagedSessions)}
                            </div>
                            <div className="text-xs text-neutral-500 mt-1">Engaged Sessions</div>
                        </div>
                        <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-800">
                            <div className="text-2xl font-black text-orange-500 tabular-nums">
                                {(loading || isSyncing) ? '—' : (data?.engagementRates.avgEngagedTime)}
                            </div>
                            <div className="text-xs text-neutral-500 mt-1">Avg Engaged Time</div>
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-brand-50 dark:bg-brand-900/20 rounded-xl text-xs text-brand-700 dark:text-brand-300">
                        💡 Engagement Rate counts sessions where user stayed 10+ sec, converted, or viewed 2+ pages.
                    </div>
                    <SectionAiSummary
                        insight={data?.intelligence.engagementRates}
                        loading={loading || isSyncing}
                    />
                </div>

                {/* ADD 5 — Bounce Rate Trend + Page Views Bar Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Bounce Rate Trend */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-black text-neutral-900 dark:text-white">Bounce Rate Over Time</h3>
                            <button
                                onClick={() => openWithQuestion(`Act as my Marketing Coach. Analyze my daily bounce rate trend for the period ${startDate} to ${endDate}:

                                    Daily Bounce Rate Trend:
                                    ${(data?.bounceRateOverTime || []).slice(-30).map(d => `- Date: ${d.date} | Bounce Rate: ${d.bounceRate}%`).join('\n')}

                                    Provide a 1-sentence summary of stability and a 1-sentence strategic insight to fix spikes.`, '📉 Analyzing Bounce Rate Trend...')}
                                className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                            >
                                <SparklesIcon className="w-3.5 h-3.5" />
                                ASK AI
                            </button>
                        </div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-neutral-400 mt-1">Daily bounce rate changes</p>
                        {(loading || isSyncing) ? (
                            <div className="h-48 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
                        ) : (
                            <ResponsiveContainer width="100%" height={190}>
                                <AreaChart data={data?.bounceRateOverTime} margin={{ top: 5, right: 10, left: -25, bottom: 15 }}>
                                    <defs>
                                        <linearGradient id="bounceGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#F97316" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-neutral-800" opacity={0.5} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }} dy={10} interval={6}
                                        tickFormatter={(val) => {
                                            const d = new Date(val);
                                            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                        }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }} tickFormatter={v => `${v}%`} domain={[10, 'auto']} />
                                    <Tooltip
                                        labelFormatter={(label) => {
                                            const d = new Date(label);
                                            return d.toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            });
                                        }}
                                        formatter={(value) => [`${value}%`, 'Bounce Rate']}
                                        contentStyle={{
                                            borderRadius: '15px',
                                            border: 'none',
                                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                            background: document.documentElement.classList.contains('dark') ? '#111827' : '#FFFFFF',
                                            color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#111827'
                                        }}
                                    />
                                    <Area type="monotone" dataKey="bounceRate" stroke="#F97316" strokeWidth={2.5} fill="url(#bounceGrad)" name="Bounce Rate" dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                        <SectionAiSummary
                            insight={data?.intelligence.bounceRateOverTime}
                            loading={loading || isSyncing}
                        />
                    </div>

                    {/* Right: Page Views Bar Chart */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-black text-neutral-900 dark:text-white">Page Views Over Time</h3>
                            <button
                                onClick={() => openWithQuestion(`Act as my Marketing Coach. Analyze my daily page views trend for the period ${startDate} to ${endDate}:

                                    Daily Page Views Trend:
                                    ${(data?.pageViewsOverTime || []).slice(-30).map(d => `- Date: ${d.date} | Page Views: ${formatNumber(d.pageViews)}`).join('\n')}

                                    Provide a 1-sentence summary of the traffic pattern and a 1-sentence strategic volume optimization insight.`, '📄 Analyzing Page Views Over Time...')}
                                className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                            >
                                <SparklesIcon className="w-3.5 h-3.5" />
                                ASK AI
                            </button>
                        </div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-neutral-400 mt-1">Daily page view count</p>
                        {(loading || isSyncing) ? (
                            <div className="h-48 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
                        ) : (
                            <ResponsiveContainer width="100%" height={190}>
                                <BarChart data={data?.pageViewsOverTime} margin={{ top: 5, right: 10, left: -25, bottom: 15 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-neutral-800" opacity={0.5} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }} dy={10} interval={6}
                                        tickFormatter={(val) => {
                                            const d = new Date(val);
                                            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                        }}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                                    <Tooltip
                                        labelFormatter={(label) => {
                                            const d = new Date(label);
                                            return d.toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            });
                                        }}
                                        formatter={(value) => [value.toLocaleString(), 'Page Views']}
                                        contentStyle={{
                                            borderRadius: '15px',
                                            border: 'none',
                                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                            background: document.documentElement.classList.contains('dark') ? '#111827' : '#FFFFFF',
                                            color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#111827'
                                        }}
                                    />
                                    <Bar dataKey="pageViews" fill="#3B82F6" radius={[3, 3, 0, 0]} maxBarSize={8} name="Page Views" fillOpacity={0.85} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                        <SectionAiSummary
                            insight={data?.intelligence.pageViewsOverTime}
                            loading={loading || isSyncing}
                        />
                    </div>
                </div>


                {/* Sub-Reports (Traffic & Pages) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-dark-surface/50 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Top Traffic Sources </h3>
                            <button
                                onClick={() => openWithQuestion(`Act as my Marketing Coach. Analyze my top organic traffic sources for the period ${startDate} to ${endDate}:

                                Top Traffic Sources:
                                ${(data?.topTrafficSources || []).slice(0, 10).map((t, idx) => `${idx + 1}. Source: ${t.source} (${t.channel}) | Sessions: ${formatNumber(t.sessions)} | Users: ${formatNumber(t.users)}`).join('\n')}

                                Provide a 1-sentence summary of channel acquisition performance and a 1-sentence strategic acquisition scaling recommendation.`, '🚦 Analyzing Top Traffic Sources...')}
                                className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                            >
                                <SparklesIcon className="w-3.5 h-3.5" />
                                ASK AI
                            </button>
                        </div>
                        <div className="p-0">
                            <DataTable
                                columns={[
                                    { header: 'Channel', accessor: 'channel' },
                                    { header: 'Source', accessor: 'source' },
                                    { header: 'Sessions', cell: (row) => row.sessions },
                                    { header: 'Users', cell: (row) => row.users },
                                ]}
                                data={data?.topTrafficSources}
                                loading={loading || isSyncing}
                                initialLimit={5}
                            />
                        </div>
                        <div className="p-5 pt-0">
                            <SectionAiSummary
                                insight={data?.intelligence.topTrafficSources}
                                loading={loading || isSyncing}
                            />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-dark-surface/50 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Top Pages</h3>
                            <button
                                onClick={() => openWithQuestion(`Act as my Marketing Coach. Analyze my top-performing content paths and landing pages for the period ${startDate} to ${endDate}:

                                Top Content Pages:
                                ${(data?.topPages || []).slice(0, 10).map((p, idx) => `${idx + 1}. Path: ${p.path} | Title: "${p.title || 'Untitled'}" | Views: ${formatNumber(p.views)} | Users: ${formatNumber(p.users)} | Bounce Rate: ${p.bounceRate}`).join('\n')}

                                Provide a 1-sentence content performance summary and a 1-sentence actionable user engagement optimization recommendation.`, '📝 Analyzing Top Pages...')}
                                className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                            >
                                <SparklesIcon className="w-3.5 h-3.5" />
                                ASK AI
                            </button>
                        </div>
                        <div className="p-0">
                            <DataTable
                                columns={[
                                    { header: 'Page Title', cell: (row) => <div className="max-w-[200px] truncate" title={row.title}>{row.title}</div> },
                                    { header: 'URL Path', cell: (row) => <div className="max-w-[200px] truncate text-brand-600 dark:text-brand-400" title={row.path}>{row.path}</div> },
                                    { header: 'Page Views', cell: (row) => row.views },
                                    { header: 'Users', cell: (row) => row.users },
                                    { header: 'Bounce Rate', cell: (row) => row.bounceRate },
                                ]}
                                data={data?.topPages}
                                loading={loading || isSyncing}
                                initialLimit={5}
                            />
                        </div>
                        <div className="p-5 pt-0">
                            <SectionAiSummary
                                insight={data?.intelligence.topPages}
                                loading={loading || isSyncing}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Device Mix Breakdown */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-[2.5rem] p-8 shadow-sm group flex flex-col h-full">
                        <div className="mb-6 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black text-neutral-900 dark:text-white">Device Breakdown</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Sessions by device type</p>
                            </div>
                            <button
                                onClick={() => openWithQuestion(`Act as my Marketing Coach. Analyze my traffic device breakdown for the period ${startDate} to ${endDate}:

                                    Device Breakdown:
                                    - Total Sessions: ${formatNumber(data?.deviceBreakdown?.totalSessions)}
                                    ${(data?.deviceBreakdown?.devices || []).map(d => `- ${d.name}: ${formatNumber(d.value)} sessions (${d.percentage}%)`).join('\n')}

                                    Provide a 1-sentence device mix summary and a 1-sentence strategic mobile UX/responsiveness recommendation.`, '📱 Analyzing Device Breakdown...')}
                                className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                            >
                                <SparklesIcon className="w-3.5 h-3.5" />
                                ASK AI
                            </button>
                        </div>
                        <div className="flex-1">
                            <div className="flex flex-col md:flex-row items-center gap-10 mb-8">
                                <div className="w-[240px] h-[240px]">
                                    {(loading || isSyncing) ? (
                                        <div className="w-full h-full rounded-full bg-neutral-100 dark:bg-neutral-800 animate-pulse"></div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={data?.deviceBreakdown.devices}
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={8}
                                                    dataKey="value"
                                                >
                                                    <text x="50%" y="44%" textAnchor="middle" dominantBaseline="middle"
                                                        className="fill-neutral-900 dark:fill-white"
                                                        style={{ fontSize: '24px', fontWeight: '900' }}>
                                                        {formatNumber(data?.deviceBreakdown.totalSessions)}
                                                    </text>

                                                    <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle"
                                                        className="fill-neutral-500 dark:fill-neutral-400"
                                                        style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.05em' }}>
                                                        TOTAL SESSIONS
                                                    </text>
                                                    {data?.deviceBreakdown.devices.map((entry, index) => (
                                                        <Cell key={index} fill={['#10B981', '#3B82F6', '#F59E0B', '#EF4444'][index % 4]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(value, name) => [
                                                        value.toLocaleString(),
                                                        name.charAt(0).toUpperCase() + name.slice(1)
                                                    ]}
                                                    contentStyle={{
                                                        borderRadius: '15px',
                                                        border: 'none',
                                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                                        background: document.documentElement.classList.contains('dark') ? '#111827' : '#FFFFFF',
                                                        color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#111827'
                                                    }}
                                                    itemStyle={{ fontWeight: 'bold', fontSize: '10px' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                                <div className="flex-1 space-y-4 w-full">
                                    {data?.deviceBreakdown.devices.map((d, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-dark-surface/30 group-hover:bg-emerald-500/5 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'][i % 4] }}></div>
                                                <span className="text-xs font-black capitalize text-neutral-600 dark:text-neutral-400">{d.name}</span>
                                            </div>
                                            <span className="text-xs font-black text-neutral-900 dark:text-white">{formatNumber(d.value)} ({d.percentage}%)</span>
                                        </div>
                                    ))}
                                </div>
                            </div> {/* md:flex-row inner content ends */}
                        </div> {/* flex-1 content wrapper ends */}
                        <div className="mt-auto">
                            <SectionAiSummary
                                insight={data?.intelligence.deviceBreakdown}
                                loading={loading || isSyncing}
                            />
                        </div>
                    </div> {/* Device Breakdown card ends */}

                    {/* Geography Breakdown */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-[2.5rem] p-8 shadow-sm group flex flex-col h-full">
                        <div className="mb-6 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black text-neutral-900 dark:text-white">Top Locations</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Top 5 countries by sessions</p>
                            </div>
                            <button
                                onClick={() => openWithQuestion(`Act as my Marketing Coach. Analyze my top geographic traffic locations for the period ${startDate} to ${endDate}:

                                Top Geographic Markets:
                                ${(data?.topLocations || []).slice(0, 5).map((l, idx) => `${idx + 1}. Country: ${l.name} | Sessions: ${formatNumber(l.value)} (${l.percentage}%)`).join('\n')}

                                Provide a 1-sentence geographical breakdown summary and a 1-sentence strategic international expansion recommendation.`, '🌍 Analyzing Geographic Traffic Locations...')}
                                className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                            >
                                <SparklesIcon className="w-3.5 h-3.5" />
                                ASK AI
                            </button>
                        </div>
                        <div className="flex-1 space-y-7">
                            {(loading || isSyncing) ? (
                                Array(5).fill(0).map((_, i) => (
                                    <div key={i} className="h-10 w-full bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse"></div>
                                ))
                            ) : data?.topLocations.map((loc, i) => {
                                const width = (loc.value / data?.totalSessions.value) * 100;
                                return (
                                    <div key={i} className="space-y-3">
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs font-black text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                                                <span className="w-5 h-5 flex items-center justify-center bg-neutral-100 dark:bg-dark-surface rounded-md text-[10px]">{i + 1}</span>
                                                {loc.name}
                                            </span>
                                            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 tabular-nums">{formatNumber(loc.value)} ({loc.percentage}%)</span>
                                        </div>
                                        <div className="h-2 w-full bg-neutral-100 dark:bg-dark-surface rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000"
                                                style={{ width: `${width}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div> {/* flex-1 content wrapper ends */}
                        <div className="mt-auto">
                            <SectionAiSummary
                                insight={data?.intelligence.topLocations}
                                loading={loading || isSyncing}
                            />
                        </div>
                    </div> {/* Geography Breakdown card ends */}
                </div> {/* grid ends */}

                {/* ADD 6 — Period Comparison Table */}
                <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="text-sm font-black text-neutral-900 dark:text-white">This Period vs Last Period</h3>
                            <p className="text-xs text-neutral-400 mt-0.5">Compare performance with previous period</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => openWithQuestion(`Act as my Marketing Coach. Analyze my Period Comparison dataset (This Period vs Last Period):

                                📊 [PERIOD COMPARISON]
                                - Active Users: ${formatNumber(data?.thisPeriodVsLastPeriod?.thisPeriod?.users)} vs ${formatNumber(data?.thisPeriodVsLastPeriod?.lastPeriod?.users)} (${data?.thisPeriodVsLastPeriod?.change?.users || 0}% change)
                                - Sessions: ${formatNumber(data?.thisPeriodVsLastPeriod?.thisPeriod?.sessions)} vs ${formatNumber(data?.thisPeriodVsLastPeriod?.lastPeriod?.sessions)} (${data?.thisPeriodVsLastPeriod?.change?.sessions || 0}% change)
                                - Page Views: ${formatNumber(data?.thisPeriodVsLastPeriod?.thisPeriod?.pageViews)} vs ${formatNumber(data?.thisPeriodVsLastPeriod?.lastPeriod?.pageViews)} (${data?.thisPeriodVsLastPeriod?.change?.pageViews || 0}% change)
                                - Bounce Rate: ${data?.thisPeriodVsLastPeriod?.thisPeriod?.bounceRate}% vs ${data?.thisPeriodVsLastPeriod?.lastPeriod?.bounceRate}% (${data?.thisPeriodVsLastPeriod?.change?.bounceRate || 0}% change)
                                - Avg Session Duration: ${data?.thisPeriodVsLastPeriod?.thisPeriod?.avgSessionDuration} vs ${data?.thisPeriodVsLastPeriod?.lastPeriod?.avgSessionDuration} (${data?.thisPeriodVsLastPeriod?.change?.avgSessionDuration || 0}% change)
                                - New Users: ${formatNumber(data?.thisPeriodVsLastPeriod?.thisPeriod?.newUsers)} vs ${formatNumber(data?.thisPeriodVsLastPeriod?.lastPeriod?.newUsers)} (${data?.thisPeriodVsLastPeriod?.change?.newUsers || 0}% change)

                                Provide a 1-sentence trajectory summary + 1-sentence strategic future insight.`, '📊 GA4 Period-over-Period Performance Comparison')}
                                className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                            >
                                <SparklesIcon className="w-3.5 h-3.5" />
                                ASK AI
                            </button>
                            <span className="text-xs font-bold bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full border border-purple-100 dark:border-purple-800">Previous Period
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
                                    Array(7).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={4} className="py-3"><div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg"></div></td>
                                        </tr>
                                    ))
                                ) : (
                                    Object.keys(data?.thisPeriodVsLastPeriod?.thisPeriod || {}).map((key) => {
                                        const thisVal = data.thisPeriodVsLastPeriod.thisPeriod[key];
                                        const lastVal = data.thisPeriodVsLastPeriod.lastPeriod[key];
                                        const changeVal = data.thisPeriodVsLastPeriod.change[key];
                                        const up = changeVal >= 0;
                                        const isGood = key === 'bounceRate' ? !up : up;

                                        const metricLabel = {
                                            users: 'Active Users',
                                            sessions: 'Sessions',
                                            pageViews: 'Page Views',
                                            bounceRate: 'Bounce Rate',
                                            avgSessionDuration: 'Avg. Session Duration',
                                            newUsers: 'New Users'
                                        }[key] || key;

                                        const metricConfig = {
                                            users: { Icon: UsersIcon, colorClass: 'text-blue-500 dark:text-blue-400' },
                                            sessions: { Icon: ArrowPathIcon, colorClass: 'text-purple-500 dark:text-purple-400' },
                                            pageViews: { Icon: EyeIcon, colorClass: 'text-teal-500 dark:text-teal-400' },
                                            bounceRate: { Icon: ArrowTrendingDownIcon, colorClass: 'text-amber-500 dark:text-amber-400' },
                                            avgSessionDuration: { Icon: ClockIcon, colorClass: 'text-rose-500 dark:text-rose-400' },
                                            newUsers: { Icon: UserPlusIcon, colorClass: 'text-sky-500 dark:text-sky-400' }
                                        }[key] || { Icon: GlobeAltIcon, colorClass: 'text-neutral-400 dark:text-neutral-500' };

                                        const MetricIcon = metricConfig.Icon;
                                        const iconColor = metricConfig.colorClass;

                                        const formatVal = (val) => {
                                            if (typeof val === 'number') {
                                                if (key === 'bounceRate') return `${val}%`;
                                                return val.toLocaleString();
                                            }
                                            return val;
                                        };

                                        return (
                                            <tr key={key} className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                                                <td className="py-3 text-xs font-bold text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <MetricIcon className={`w-3.5 h-3.5 ${iconColor} flex-shrink-0`} />
                                                        <span>{metricLabel}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 text-xs font-black text-neutral-900 dark:text-white tabular-nums">
                                                    {formatVal(thisVal)}
                                                </td>
                                                <td className="py-3 text-xs font-black text-neutral-900 dark:text-white tabular-nums">
                                                    {formatVal(lastVal)}
                                                </td>
                                                <td className="py-3">
                                                    <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full ${isGood
                                                        ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                                        : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                                                        }`}>
                                                        {up ? '▲' : '▼'} {Math.abs(changeVal)}%
                                                        {key === 'bounceRate' && (
                                                            <span className="ml-1 text-[9px] font-bold">
                                                                {up ? '(worse)' : '(better)'}
                                                            </span>
                                                        )}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    <SectionAiSummary
                        insight={data?.intelligence.thisPeriodVsLastPeriod}
                        loading={loading || isSyncing}
                    />
                </div>

            </div>
        </DashboardLayout>
    );
};

export default Ga4Page;


