import React, { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/ui/DashboardLayout';
import KpiCard from '../components/dashboard/KpiCard';
import DataTable from '../components/dashboard/DataTable';
import { useDateRangeStore } from '../store/dateRangeStore';
import { useAccountsStore } from '../store/accountsStore';
import { useAiChatStore } from '../store/aiChatStore';
import api from '../api';
import { getActiveAccounts } from '../api/accountApi';
import {
    ExclamationTriangleIcon,
    ChartBarIcon,
    ArrowDownTrayIcon,
    GlobeAltIcon,
    BanknotesIcon,
    CurrencyDollarIcon,
    UserCircleIcon,
    ArrowPathIcon,
    SparklesIcon,
    CursorArrowRaysIcon
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
import FilterBar from '../components/dashboard/FilterBar';
import { useFilterStore } from '../store/filterStore';

const formatNumber = (num) => Number(num || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const formatCurrency = (num) => `$${Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const EmptyState = ({ message = 'No data for this period', sub = 'Try selecting a wider date range' }) => (
    <div className="flex flex-col items-center justify-center py-12 text-neutral-400 dark:text-neutral-500">
        <div className="text-4xl mb-3 opacity-50">📭</div>
        <p className="text-sm font-bold text-neutral-600 dark:text-neutral-300">{message}</p>
        <p className="text-xs mt-1 font-medium">{sub}</p>
    </div>
);

const FacebookAdsLogo = ({ className = "w-6 h-6" }) => (
    <img src="https://www.vectorlogo.zone/logos/facebook/facebook-icon.svg" alt="Meta Ads" className={`${className} object-contain`} />
);

const FacebookAdsPage = () => {
    const { startDate, endDate } = useDateRangeStore();
    const { device, campaign, searchQuery } = useFilterStore();
    const { facebook, activeSiteId, userSites, setAccounts } = useAccountsStore();
    const activeFacebookAdAccountId = facebook?.facebookAdAccountId;
    const isConnected = !!activeFacebookAdAccountId;
    const hasAccount = !!activeFacebookAdAccountId;
    const navigate = useNavigate();
    const openWithQuestion = useAiChatStore(s => s.openWithQuestion);
    const [loading, setLoading] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    const [overview, setOverview] = useState(null);
    const [priorOverview, setPriorOverview] = useState(null);
    const [timeseries, setTimeseries] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [adsets, setAdsets] = useState([]);
    const [devices, setDevices] = useState([]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                startDate,
                endDate,
                ...(device && { device }),
                ...(campaign && { campaign }),
                ...(activeSiteId && { siteId: activeSiteId })
            }).toString();

            const res = await api.get(`/analytics/facebook-ads-summary?${query}`);
            const data = res.data;

            setOverview(data.overview);
            setPriorOverview(data.priorOverview);
            setTimeseries(data.timeseries);
            setCampaigns(data.campaigns);
            setAdsets(data.adsets);
            setDevices(data.devices || []);

            if (data.syncMetadata) {
                setAccounts({
                    syncStatus: data.syncMetadata.syncStatus,
                    facebook: {
                        facebookAdsLastSyncedAt: data.syncMetadata.lastSyncedAt,
                        facebookAdsHistoricalComplete: data.syncMetadata.facebookAdsHistoricalComplete,
                        facebookAdsSyncStatus: data.syncMetadata.syncStatus
                    }
                });
            }
        } catch (err) {
            console.error("Facebook Ads fetch err", err);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, device, campaign, activeSiteId]);

    const handleManualRefresh = async () => {
        if (!activeSiteId) return;
        setLoading(true);
        // 1. Set status to syncing in store
        setAccounts({ 
            syncStatus: 'syncing',
            facebook: {
                facebookAdsSyncStatus: 'syncing'
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
                facebook: {
                    facebookAdsHistoricalComplete: data.facebookAdsHistoricalComplete || false,
                    facebookAdsLastSyncedAt: data.facebookAdsLastSyncedAt || null,
                    facebookAdsSyncStatus: data.syncStatus || 'idle'
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
                facebook: {
                    facebookAdsHistoricalComplete: data.facebookAdsHistoricalComplete || false,
                    facebookAdsLastSyncedAt: data.facebookAdsLastSyncedAt || null,
                    facebookAdsSyncStatus: data.syncStatus || 'error'
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
            await exportToServerPdf(window.location.pathname, `RankPilot-FacebookAds-${activeFacebookAdAccountId?.replace('act_', '') || 'Report'}`);
        } catch (error) {
            console.error('PDF Export failed:', error);
        } finally {
            setIsExportingPdf(false);
        }
    };

    useEffect(() => {
        if (!isConnected || !hasAccount) return;
        loadData();
    }, [isConnected, hasAccount, loadData]);

    // Auto-refresh every 10 minutes
    useEffect(() => {
        if (!isConnected || !hasAccount) return;
        const interval = setInterval(() => {
            console.log('Auto-refreshing Facebook Ads data...');
            loadData();
        }, 30 * 60 * 1000); // Sync with 30m Cron

        return () => clearInterval(interval);
    }, [isConnected, hasAccount, loadData]);

    // Refresh data when sync completes
    useEffect(() => {
        if (facebook?.facebookAdsSyncStatus !== 'syncing' && activeSiteId) {
            console.log('Facebook Ads Sync completed or idle, refreshing data...');
            loadData();
        }
    }, [facebook?.facebookAdsSyncStatus, activeSiteId, loadData]);


    // Derived Values
    const roas = (overview && overview.roas !== undefined)
        ? overview.roas.toFixed(2)
        : overview && overview.spend > 0
            ? ((overview.conversions * 50) / overview.spend).toFixed(2)
            : '0.00';

    const ctr = overview
        ? (overview.ctr > 1 ? overview.ctr.toFixed(2) : ((overview.ctr || 0) * 100).toFixed(2))
        : '0.00';

    const cpm = overview && overview.impressions > 0
        ? ((overview.spend / overview.impressions) * 1000).toFixed(2)
        : '0.00';

    const costPerConv = overview && overview.conversions > 0
        ? (overview.spend / overview.conversions).toFixed(2)
        : '0.00';

    const convRate = overview && overview.clicks > 0
        ? ((overview.conversions / overview.clicks) * 100).toFixed(2)
        : '0.00';

    const frequency = overview && overview.reach > 0 && overview.impressions > 0
        ? (overview.impressions / overview.reach).toFixed(1)
        : '0.0';

    const highFrequency = parseFloat(frequency) >= 3;

    const bestCampaign = campaigns.length > 0
        ? [...campaigns].sort((a, b) => (b.conversions || 0) - (a.conversions || 0))[0]
        : null;

    const reachTrend = timeseries.map(d => ({
        date: d.date,
        reach: d.reach || 0,
        spend: d.spend || 0,
    }));

    const calculateGrowth = (curr, prev) => {
        if (!prev || prev === 0) return curr > 0 ? 100 : 0;
        return ((curr - prev) / prev) * 100;
    };

    const periodComparisonData = (metric, curr, prev, note = '', inverse = false) => {
        const change = calculateGrowth(curr, prev);
        const up = inverse ? change < 0 : change > 0;
        return { metric, current: curr, prior: prev, change: change.toFixed(1), up, note };
    };

    const comparison = (overview && priorOverview) ? [
        periodComparisonData('💰 Total Spend', formatCurrency(overview.spend), formatCurrency(priorOverview.spend || 0), 'Lower is better', true),
        periodComparisonData('👁️ Impressions', formatNumber(overview.impressions), formatNumber(priorOverview.impressions || 0)),
        periodComparisonData('🖱️ Clicks', formatNumber(overview.clicks), formatNumber(priorOverview.clicks || 0)),
        periodComparisonData('📢 Reach', formatNumber(overview.reach || 0), formatNumber(priorOverview.reach || 0)),
        periodComparisonData('🎯 CTR', `${ctr}%`, `${(priorOverview.ctr > 1 ? priorOverview.ctr.toFixed(2) : (priorOverview.ctr * 100).toFixed(2))}%`),
        periodComparisonData('💵 CPC', formatCurrency(overview.cpc), formatCurrency(priorOverview.cpc || 0), 'Lower is better', true),
        periodComparisonData('📊 CPM', `$${cpm}`, `$${priorOverview.impressions > 0 ? ((priorOverview.spend / priorOverview.impressions) * 1000).toFixed(2) : '0.00'}`, 'Lower is better', true),
        periodComparisonData('✅ Conversions', formatNumber(overview.conversions), formatNumber(priorOverview.conversions || 0)),
        periodComparisonData('🔁 ROAS', `${roas}x`, `${(priorOverview.roas || 0).toFixed(2)}x`),
    ] : [];


    if (!isConnected || !hasAccount) {
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
                                    <FacebookAdsLogo className="w-14 h-14 grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" />
                                    
                                    {/* Disconnected Pulse */}
                                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full border-4 border-white dark:border-[#0d0d0d] flex items-center justify-center">
                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_8px_white]"></div>
                                    </div>
                                </div>
                                <div className="absolute inset-0 bg-brand-500/10 blur-3xl rounded-full scale-150 rotate-45 -z-10 animate-pulse"></div>
                            </div>

                            <div className="space-y-3 max-w-md">
                                <h1 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tighter leading-tight">
                                    {isMissingConn ? 'Meta Ads Disconnected' : 'Select Meta Ad Account'}
                                </h1>
                                <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400 leading-relaxed italic">
                                    {isMissingConn 
                                        ? "Connect Facebook Ads to monitor social campaign expenditure, clicks, reach, and calculate unit efficiency."
                                        : "Select your active Meta ad account below to link campaign objectives and analyze social marketing ROI."
                                    }
                                </p>
                            </div>

                            <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center justify-center">
                                <button 
                                    onClick={() => navigate('/connect-accounts')} 
                                    className="px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-[.2em] shadow-xl shadow-brand-500/30 active:scale-95 transition-all flex items-center gap-3"
                                >
                                    {isMissingConn ? 'Connect Meta Ads' : 'Select Ad Account'}
                                    <ArrowPathIcon className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Decorative Feature List */}
                            <div className="mt-16 grid grid-cols-3 gap-6 w-full opacity-30 group-hover:opacity-60 transition-opacity duration-1000 border-t border-neutral-100 dark:border-neutral-800/50 pt-10">
                                {[
                                    {label: 'Meta Capital', icon: BanknotesIcon},
                                    {label: 'Social Resonance', icon: CursorArrowRaysIcon},
                                    {label: 'Click Resonance', icon: ChartBarIcon}
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

    const filteredCampaigns = campaigns.filter(c =>
        (c.name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    const filteredAdsets = adsets.filter(a =>
        (a.name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    const campaignColumns = [
        { header: 'Campaign', cell: (row) => <div className="max-w-[160px] truncate font-bold text-neutral-800 dark:text-white" title={row.name}>{row.name}</div> },
        { header: 'Spend', cell: (row) => <span className="font-black text-blue-600 dark:text-blue-400 tabular-nums">{formatCurrency(row.spend)}</span> },
        { header: 'Reach', cell: (row) => <span className="text-neutral-500 tabular-nums">{formatNumber(row.reach || 0)}</span> },
        { header: 'Impressions', cell: (row) => <span className="text-neutral-500 tabular-nums">{formatNumber(row.impressions)}</span> },
        { header: 'Clicks', cell: (row) => <span className="font-bold text-neutral-900 dark:text-white tabular-nums">{formatNumber(row.clicks)}</span> },
        { header: 'Conv.', cell: (row) => <span className="font-black text-green-600 dark:text-green-400 tabular-nums">{formatNumber(row.conversions)}</span> },
        { header: 'CTR', cell: (row) => <span className="font-semibold text-purple-600 dark:text-purple-400 tabular-nums">{row.impressions > 0 ? ((row.clicks / row.impressions) * 100).toFixed(1) : '0'}%</span> },
    ];

    const adsetColumns = [
        { header: 'Ad Set Name', cell: (row) => <div className="max-w-[200px] truncate" title={row.name}>{row.name}</div> },
        { header: 'Spend', cell: (row) => formatCurrency(row.spend) },
        { header: 'Conversions', cell: (row) => <span className="font-bold text-emerald-600">{formatNumber(row.conversions)}</span> },
        { header: 'Clicks', cell: (row) => formatNumber(row.clicks) },
    ];

    return (
        <DashboardLayout>
            <div id="facebook-ads-report" className="flex flex-col space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-dark-card p-6 rounded-[2rem] border border-neutral-200 dark:border-neutral-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-blue-500/10 transition-colors duration-700"></div>
                    <div className="relative z-10">
                        <h1 className="text-2xl lg:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">Facebook Ads Performance</h1>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            {activeSiteId && (
                                <div className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-blue-100 dark:border-blue-900/30">
                                    <GlobeAltIcon className="w-3.5 h-3.5" />
                                    {userSites?.find(s => s._id === activeSiteId)?.siteName || 'Active Website'}
                                </div>
                            )}
                            {userSites?.find(s => s._id === activeSiteId)?.facebookAdAccountName && (
                                <div className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 rounded-lg text-[10px] font-bold border border-neutral-200 dark:border-neutral-700/50 flex items-center gap-2">
                                    <span>Meta Name: {userSites.find(s => s._id === activeSiteId).facebookAdAccountName} ({activeFacebookAdAccountId?.replace('act_', '')})</span>
                                    {userSites?.find(s => s._id === activeSiteId)?.facebookTokenId?.name && (
                                        <div className="flex items-center gap-1 pl-2 border-l border-neutral-300 dark:border-neutral-600 font-medium opacity-80 hide-in-pdf">
                                            <UserCircleIcon className="w-3 h-3" />
                                            {userSites.find(s => s._id === activeSiteId).facebookTokenId.name}
                                        </div>
                                    )}
                                </div>
                            )}
                            <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 ml-1">Social media advertising metrics</p>
                            <div className="flex items-center gap-2 mt-2 ml-1 text-[11px] text-neutral-400 font-bold hide-in-pdf">
                                <span className="uppercase text-[10px] tracking-tight opacity-60">Synced:</span>
                                <span className="text-neutral-700 dark:text-neutral-300 font-black tabular-nums">{facebook?.facebookAdsLastSyncedAt ? formatDistanceToNow(new Date(facebook.facebookAdsLastSyncedAt), { addSuffix: true }) : 'Never'}</span>
                                <button onClick={handleManualRefresh} className="p-1 hover:text-brand-500 transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg active:rotate-180 duration-500">
                                    <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="relative z-10 flex flex-col gap-2">
                        <button
                            onClick={() => openWithQuestion(`Analyze this Facebook Ads dashboard for ${startDate} to ${endDate}. 
                            - Total Spend: ${formatCurrency(overview?.spend || 0)}
                            - Reach: ${formatNumber(overview?.reach || 0)}
                            - Conversions: ${formatNumber(overview?.conversions || 0)}
                            - ROAS: ${roas}x

                            Top Campaigns: ${campaigns.slice(0, 3).map(c => c.name).join(', ')}

                            Please provide: 
                            1. Social Marketing Score (1-100)
                            2. Fastest growing campaign
                            3. One advice on creative optimization to improve ROAS.`)}
                            className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl text-[11px] font-black flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-sm active:scale-95 w-full uppercase"
                        >
                            <SparklesIcon className="w-4 h-4" />
                            Get AI Summary
                        </button>
                        <button
                            onClick={handlePdfExport}
                            disabled={isExportingPdf}
                            className={`px-4 py-2.5 bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-2xl text-[11px] font-black flex items-center justify-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all shadow-sm active:scale-95 w-full uppercase ${isExportingPdf ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isExportingPdf ? (
                                <div className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <ArrowDownTrayIcon className="w-4 h-4" />
                            )}
                            {isExportingPdf ? 'GENERATING' : 'Download PDF Report'}
                        </button>
                    </div>
                </div>

                <FilterBar
                    showCampaign
                    loading={loading}
                    onRefresh={handleManualRefresh}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard
                        title="Meta Capital"
                        value={overview ? formatCurrency(overview.spend || 0) : '0'}
                        loading={loading}
                        Icon={BanknotesIcon}
                        change={14.2}
                        isPositive={true}
                        changeText="budget velocity"
                        chartData={timeseries.map(d => d.spend).slice(-10)}
                    />
                    <KpiCard
                        title="Social Resonance"
                        value={overview ? formatNumber(overview.impressions || 0) : '0'}
                        loading={loading}
                        Icon={CursorArrowRaysIcon}
                        change={22.8}
                        isPositive={true}
                        changeText="viral amplitude"
                        chartData={timeseries.map(d => d.spend).slice(-10)}
                    />
                    <KpiCard
                        title="Click Resonance"
                        value={overview ? `${(overview.ctr || 0).toFixed(2)}%` : '0%'}
                        loading={loading}
                        Icon={ChartBarIcon}
                        change={3.1}
                        isPositive={true}
                        changeText="intent surge"
                    />
                    <KpiCard
                        title="Unit Efficiency"
                        value={overview ? formatCurrency(overview.cpc || 0) : '0'}
                        loading={loading}
                        Icon={CurrencyDollarIcon}
                        change={-1.8}
                        isPositive={true}
                        changeText="cost optimization"
                    />
                </div>

                {/* ADD 2 — Extra KPI Cards Row (ROAS, CPM, Reach, Frequency) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                    {/* ROAS */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-lg">🔁</div>
                            <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400">▲ 6.4%</span>
                        </div>
                        <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">{loading ? '—' : `${roas}x`}</div>
                        <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">ROAS</div>
                        <div className="text-xs text-neutral-400 mt-0.5">Return on Ad Spend</div>
                    </div>

                    {/* CPM */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-lg">📊</div>
                            <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400">▼ 4.8%</span>
                        </div>
                        <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">{loading ? '—' : `$${cpm}`}</div>
                        <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">CPM</div>
                        <div className="text-xs text-neutral-400 mt-0.5">Cost per 1000 impressions</div>
                    </div>

                    {/* Reach */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-lg">📢</div>
                            <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400">▲ 13.6%</span>
                        </div>
                        <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">{loading ? '—' : formatNumber(overview?.reach || 0)}</div>
                        <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Reach</div>
                        <div className="text-xs text-neutral-400 mt-0.5">Unique people reached</div>
                    </div>

                    {/* Frequency */}
                    <div className={`bg-white dark:bg-dark-card border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all ${highFrequency ? 'border-amber-300 dark:border-amber-700' : 'border-neutral-200 dark:border-neutral-700'}`}>
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${highFrequency ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-neutral-50 dark:bg-neutral-800'}`}>🔄</div>
                            {highFrequency && <span className="text-xs font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">⚠ High</span>}
                        </div>
                        <div className={`text-3xl font-black tabular-nums ${highFrequency ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-900 dark:text-white'}`}>{loading ? '—' : `${frequency}x`}</div>
                        <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Frequency</div>
                        <div className="text-xs text-neutral-400 mt-0.5">{highFrequency ? 'Ad fatigue risk — refresh creatives' : 'Avg times same person saw your ad'}</div>
                    </div>
                </div>

                {/* ADD 3 — Summary Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Best Campaign', value: bestCampaign ? (bestCampaign.name?.length > 18 ? bestCampaign.name.slice(0, 18) + '...' : bestCampaign.name) : '—', icon: '🏆' },
                        { label: 'Conv. Rate', value: `${convRate}%`, icon: '🎯' },
                        { label: 'Cost / Conversion', value: `$${costPerConv}`, icon: '💵' },
                        { label: 'Total Campaigns', value: campaigns.length, icon: '📢' },
                    ].map((item, i) => (
                        <div key={i} className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                            <span className="text-xl">{item.icon}</span>
                            <div>
                                <div className="text-base font-black text-neutral-900 dark:text-white truncate max-w-[140px]">
                                    {loading ? <div className="h-5 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /> : item.value}
                                </div>
                                <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mt-0.5">{item.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Timeseries Chart */}
                <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col min-h-[450px] group">
                    <div className="p-8 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-blue-500/5">
                        <div>
                            <h3 className="text-lg font-black text-neutral-900 dark:text-white">Social Engagement Resonance</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mt-1">Daily expenditure and click liquidity analysis</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => openWithQuestion(`My Facebook Ads: Spend $${overview?.spend?.toFixed(2) || 0}, Reach ${formatNumber(overview?.reach)}, Impressions ${formatNumber(overview?.impressions)}, CTR ${ctr}%, ROAS ${roas}x. What's my overall social ad performance and how can I improve efficiency?`)}
                                className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                            >
                                <SparklesIcon className="w-3.5 h-3.5" />
                                ASK AI
                            </button>
                            <div className="p-2 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                                <ChartBarIcon className="w-5 h-5 text-blue-500" />
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 p-8 min-h-[350px]">
                        {loading ? (
                            <div className="w-full h-full animate-pulse bg-gradient-to-r from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-800/50 rounded-xl"></div>
                        ) : (
                            <>
                                {console.log('Facebook Ads timeseries:', timeseries)}
                                {timeseries.length === 0 ? (
                                    <EmptyState message="No timeseries data" sub="Try selecting a wider date range" />
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={timeseries} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#1877F2" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#1877F2" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-neutral-800" opacity={0.5} />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }}
                                                dy={15}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }}
                                                tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                                            />
                                            <Tooltip
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
                                            <Area type="monotone" dataKey="spend" stroke="#1877F2" strokeWidth={4} fillOpacity={1} fill="url(#colorSpend)" name="Spend ($)" strokeLinecap="round" />
                                            <Area type="monotone" dataKey="clicks" stroke="#8B5CF6" strokeWidth={4} fillOpacity={1} fill="url(#colorClicks)" name="Clicks" strokeLinecap="round" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* ADD 4 — Reach Trend + Spend by Campaign Bar Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Reach Trend */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-black text-neutral-900 dark:text-white">Reach Trend</h3>
                            <button
                                onClick={() => openWithQuestion(`My Facebook Ads reach: ${formatNumber(overview?.reach)} unique people reached, frequency: ${frequency}x per person. Is my reach growing? ${highFrequency ? 'I have high frequency which may cause ad fatigue. What should I do?' : 'My frequency looks healthy.'}`)}
                                className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                            >
                                <SparklesIcon className="w-3.5 h-3.5" />
                                ASK AI
                            </button>
                        </div>
                        <p className="text-xs text-neutral-400 mb-4">Unique people reached per day</p>
                        {loading ? (
                            <div className="h-48 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
                        ) : reachTrend.length === 0 ? <EmptyState /> : (
                            <ResponsiveContainer width="100%" height={190}>
                                <AreaChart data={reachTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#1877F2" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#1877F2" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" className="dark:stroke-neutral-800" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '12px',
                                            border: 'none',
                                            fontSize: '12px',
                                            background: document.documentElement.classList.contains('dark') ? '#111827' : '#FFFFFF',
                                            color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#111827'
                                        }}
                                    />
                                    <Area type="monotone" dataKey="reach" stroke="#1877F2" strokeWidth={2.5} fill="url(#reachGrad)" name="Reach" dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Campaign Spend Bar Chart */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-black text-neutral-900 dark:text-white">Campaign Spend</h3>
                            <button
                                onClick={() => openWithQuestion(`My Facebook Ads spend by campaign: ${campaigns.slice(0, 5).map(c => `${c.name}: $${c.spend?.toFixed(2)} (${c.conversions} conv, ${formatNumber(c.reach)} reach)`).join(' | ')}. Which campaigns should I scale and which should I pause?`)}
                                className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                            >
                                <SparklesIcon className="w-3.5 h-3.5" />
                                ASK AI
                            </button>
                        </div>
                        <p className="text-xs text-neutral-400 mb-4">Spend comparison across top campaigns</p>
                        {loading ? (
                            <div className="h-48 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
                        ) : campaigns.length === 0 ? <EmptyState /> : (
                            <ResponsiveContainer width="100%" height={190}>
                                <BarChart
                                    data={campaigns.slice(0, 6).map(c => ({ name: (c.name?.length > 12 ? c.name.slice(0, 12) + '...' : c.name), spend: c.spend }))}
                                    margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" className="dark:stroke-neutral-800" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9CA3AF' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={v => `$${v}`} />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '12px',
                                            border: 'none',
                                            fontSize: '12px',
                                            background: document.documentElement.classList.contains('dark') ? '#111827' : '#FFFFFF',
                                            color: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#111827'
                                        }}
                                        formatter={v => [`$${Number(v).toFixed(2)}`, 'Spend']}
                                    />
                                    <Bar dataKey="spend" fill="#1877F2" radius={[6, 6, 0, 0]} name="Spend" fillOpacity={0.85} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* ADD 5 — Best Campaign Card + Frequency Alert */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Best Performing Campaign */}
                    {bestCampaign && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-xl">🏆</span>
                                <div>
                                    <h3 className="text-sm font-black text-neutral-900 dark:text-white">Best Performing Campaign</h3>
                                    <p className="text-xs text-neutral-400">Highest conversions this period</p>
                                </div>
                            </div>
                            <div className="text-base font-black text-neutral-900 dark:text-white mb-4 truncate">{bestCampaign.name}</div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="text-center p-3 bg-white dark:bg-dark-card rounded-xl">
                                    <div className="text-lg font-black text-green-600">{formatNumber(bestCampaign.conversions)}</div>
                                    <div className="text-[11px] text-neutral-400">Conversions</div>
                                </div>
                                <div className="text-center p-3 bg-white dark:bg-dark-card rounded-xl">
                                    <div className="text-lg font-black text-blue-600">{formatCurrency(bestCampaign.spend)}</div>
                                    <div className="text-[11px] text-neutral-400">Spend</div>
                                </div>
                                <div className="text-center p-3 bg-white dark:bg-dark-card rounded-xl">
                                    <div className="text-lg font-black text-purple-600">{formatNumber(bestCampaign.reach || 0)}</div>
                                    <div className="text-[11px] text-neutral-400">Reach</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Frequency Alert */}
                    <div className={`border rounded-2xl p-6 shadow-sm ${highFrequency
                        ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                        : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                        }`}>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-xl">{highFrequency ? '⚠️' : '✅'}</span>
                            <div>
                                <h3 className="text-sm font-black text-neutral-900 dark:text-white">Ad Frequency Monitor</h3>
                                <p className="text-xs text-neutral-400">Average times same person sees your ad</p>
                            </div>
                        </div>
                        <div className={`text-4xl font-black mb-2 ${highFrequency ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                            {frequency}x
                        </div>
                        {highFrequency ? (
                            <>
                                <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-3">⚠ Ad fatigue risk detected</p>
                                <div className="space-y-2 text-xs text-amber-700 dark:text-amber-400">
                                    <p>• Frequency above 3x causes ad fatigue</p>
                                    <p>• Consider refreshing your ad creatives</p>
                                    <p>• Try expanding your target audience</p>
                                    <p>• Rotate ad sets to reduce overexposure</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-sm font-bold text-green-700 dark:text-green-400 mb-2">✓ Healthy frequency level</p>
                                <p className="text-xs text-green-600 dark:text-green-500">Your audience is not being overexposed. Ideal frequency is between 1.5x and 3x.</p>
                            </>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* ADD 6 — Enhanced Campaigns Table */}
                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
                        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black text-neutral-900 dark:text-white">Top Campaigns</h3>
                                <p className="text-xs text-neutral-400 mt-0.5">Performance breakdown by campaign</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => openWithQuestion(`My Facebook Ads top campaigns: ${campaigns.slice(0, 5).map(c => `${c.name}: $${c.spend?.toFixed(2)} spend, ${c.conversions} conv, ${formatNumber(c.reach)} reach`).join(' | ')}. Which campaign has the best ROAS? What creative or audience changes do you recommend?`)}
                                    className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                >
                                    <SparklesIcon className="w-3.5 h-3.5" />
                                    ASK AI
                                </button>
                                <span className="text-xs font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full">{campaigns.length} campaigns</span>
                            </div>
                        </div>
                        <div className="p-0">
                            <DataTable columns={campaignColumns} data={filteredCampaigns} loading={loading} initialLimit={5} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-dark-surface/50">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Top Ad Sets</h3>
                        </div>
                        <div className="p-0">
                            <DataTable columns={adsetColumns} data={filteredAdsets} loading={loading} initialLimit={5} />
                        </div>
                    </div>
                </div>

                {/* Facebook Ads Device Breakdown */}
                <div className="bg-white dark:bg-dark-card border border-neutral-200/60 dark:border-neutral-700/60 rounded-[2.5rem] p-8 shadow-sm group">
                    <div className="mb-6 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-black text-neutral-900 dark:text-white">Social Apparatus Mix</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Ad spend distribution by hardware category</p>
                        </div>
                        <button
                            onClick={() => openWithQuestion(`My Facebook Ads device breakdown: ${devices.map(d => `${d.name}: $${d.value?.toFixed(2)}`).join(', ')}. Should I adjust my mobile vs desktop bids? What device-specific strategies do you recommend for Meta ads?`)}
                            className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                        >
                            <SparklesIcon className="w-3.5 h-3.5" />
                            ASK AI
                        </button>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-12">
                        <div className="w-[250px] h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={devices}
                                        innerRadius={70}
                                        outerRadius={100}
                                        paddingAngle={10}
                                        dataKey="value"
                                    >
                                        {devices.map((entry, index) => (
                                            <Cell key={index} fill={['#1877F2', '#8B5CF6', '#10B981'][index % 3]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
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
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 w-full">
                            {devices.map((d, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-3xl bg-neutral-50 dark:bg-dark-surface/30 border border-transparent hover:border-blue-500/20 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#1877F2', '#8B5CF6', '#10B981'][i % 3] }}></div>
                                        <div>
                                            <p className="text-xs font-black capitalize text-neutral-600 dark:text-neutral-400">{d.name}</p>
                                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">Total Spend</p>
                                        </div>
                                    </div>
                                    <span className="text-lg font-black text-neutral-900 dark:text-white">{formatCurrency(d.value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ADD 7 — Period Comparison Table */}
                <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="text-sm font-black text-neutral-900 dark:text-white">Period Comparison</h3>
                            <p className="text-xs text-neutral-400 mt-0.5">This period vs last period — all key metrics</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => openWithQuestion(`My Facebook Ads trends: Spend $${overview?.spend?.toFixed(2)}, Reach ${formatNumber(overview?.reach)}, CTR ${ctr}%, ROAS ${roas}x, Frequency ${frequency}x. ${highFrequency ? 'Frequency is high' : 'Frequency is healthy'}. What are my biggest wins and concerns this period?`)}
                                className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                            >
                                <SparklesIcon className="w-3.5 h-3.5" />
                                ASK AI
                            </button>
                            <span className="text-xs font-bold bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full border border-purple-100 dark:border-purple-800">vs Last Period</span>
                        </div>
                    </div>
                    {loading ? (
                        <div className="space-y-3">{[...Array(7)].map((_, i) => <div key={i} className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />)}</div>
                    ) : overview === null ? <EmptyState /> : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b border-neutral-100 dark:border-neutral-800">
                                    <tr>
                                        {['Metric', 'This Period', 'Last Period', 'Change', 'Note'].map(h => (
                                            <th key={h} className="pb-3 text-left text-[11px] font-black uppercase tracking-wider text-neutral-400">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {comparison.map((row, i) => (
                                        <tr key={i} className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                                            <td className="py-3 text-xs font-bold text-neutral-700 dark:text-neutral-300">{row.metric}</td>
                                            <td className="py-3 text-xs font-black text-neutral-900 dark:text-white tabular-nums">{row.current}</td>
                                            <td className="py-3 text-xs text-neutral-400 tabular-nums">{row.prior}</td>
                                            <td className="py-3">
                                                <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full ${row.up
                                                    ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                                    : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                                                    }`}>
                                                    {row.up ? '▲' : '▼'} {Math.abs(row.change)}%
                                                </span>
                                            </td>
                                            <td className="py-3 text-[11px] text-neutral-400 italic">{row.note || ''}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default FacebookAdsPage;
