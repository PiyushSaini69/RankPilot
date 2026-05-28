import React, { useState, useEffect, useCallback, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';

import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/ui/DashboardLayout';
import Logo from '../components/ui/Logo';

import KpiCard from '../components/dashboard/KpiCard';
import { useDateRangeStore } from '../store/dateRangeStore';
import { useAccountsStore } from '../store/accountsStore';
import { useAiChatStore } from '../store/aiChatStore';
import { useFilterStore } from '../store/filterStore';
import {
  FunnelIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  CheckCircleIcon,
  GlobeAltIcon,
  ArrowRightIcon,
  SparklesIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  ComputerDesktopIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  UsersIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  EyeIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import api from '../api';
import { getActiveAccounts } from '../api/accountApi';
import { useAuthStore } from '../store/authStore';
import DataTable from '../components/dashboard/DataTable';
import { exportToServerPdf } from '../utils/reportExport';

const formatNumber = (num) => Number(num || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const formatCurrency = (num) => `$${Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatPct = (val, d = 1) => `${Number(val || 0).toFixed(d)}%`;
const formatTime = (secs) => { const s = Math.floor(secs || 0); return `${Math.floor(s / 60)}m ${s % 60}s`; };

const EmptyState = ({ message = 'No data', sub = 'Try a wider date range', onAction }) => (
  <div className="flex flex-col items-center justify-center p-4 text-neutral-400 dark:text-neutral-500 h-full w-full">
    <p className="text-[11px] font-black text-neutral-900 dark:text-white uppercase tracking-wider">{message}</p>
    <p className="text-[10px] mt-1 font-bold text-neutral-400 max-w-[220px] text-center leading-tight">{sub}</p>
    {onAction && (
      <button
        onClick={onAction}
        className="mt-4 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[9px] font-black rounded-lg shadow-lg shadow-brand-500/20 transition-all hover:-translate-y-0.5"
      >
        CONNECT ACCOUNT
      </button>
    )}
  </div>
);

const Ga4Logo = ({ className = "w-5 h-5" }) => (
  <img src="https://www.vectorlogo.zone/logos/google_analytics/google_analytics-icon.svg" alt="GA4" className={`${className} object-contain`} />
);

const GscLogo = ({ className = "w-5 h-5" }) => (
  <img src="https://www.gstatic.com/images/branding/product/2x/search_console_64dp.png" alt="GSC" className={`${className} object-contain`} />
);

const GoogleAdsLogo = ({ className = "w-5 h-5" }) => (
  <img src="https://www.vectorlogo.zone/logos/google_ads/google_ads-icon.svg" alt="Google Ads" className={`${className} object-contain`} />
);

const FacebookAdsLogo = ({ className = "w-5 h-5" }) => (
  <img src="https://www.vectorlogo.zone/logos/facebook/facebook-icon.svg" alt="Meta Ads" className={`${className} object-contain`} />
);

const SuccessLogo = ({ className = "w-5 h-5" }) => (
  <CheckCircleIcon className={className} />
);

const PerformanceLogo = ({ className = "w-5 h-5" }) => (
  <SparklesIcon className={className} />
);

const RankPilotLogo = ({ className = "w-5 h-5" }) => (
  <Logo className={className} iconOnly={true} />
);

const DashboardPage = () => {
  const navigate = useNavigate();
  const { openWithQuestion } = useAiChatStore();
  const { preset, startDate, endDate, setPreset } = useDateRangeStore();
  const { device, campaign, channel, searchQuery, setFilters } = useFilterStore();
  const {
    gsc,
    ga4,
    googleAds,
    facebook,
    activeSiteId,
    activeSiteName,
    activeSiteUrl,
    syncStatus,
    userSites,
    setAccounts,
    setUserSites
  } = useAccountsStore();

  const activeGscSite = gsc?.gscSiteUrl;
  const activeGa4PropertyId = ga4?.ga4PropertyId;
  const activeGoogleAdsCustomerId = googleAds?.googleAdsCustomerId;
  const activeFacebookAdAccountId = facebook?.facebookAdAccountId;

  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState({ ga4: null, gsc: null, googleAds: null, facebookAds: null, intelligence: null });
  const [timeseriesData, setTimeseriesData] = useState([]);
  const [topPages, setTopPages] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('Sessions');
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false);
  const [isCustomDateMode, setIsCustomDateMode] = useState(false);
  const [tempDateRange, setTempDateRange] = useState({ start: startDate, end: endDate });
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const downloadCSV = () => {
    if (!topPages.length) return;
    const headers = "Page URL,Visitors,Bounce Rate,Traffic Share\n";
    const rows = topPages.map(p => `${p.url},${p.visitors},${p.bounce},${p.share}%`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `rankpilot-top-pages-${new Date().toISOString().split('T')[0]}.csv`);
    a.click();
  };

  const handlePdfExport = async () => {
    setIsExportingPdf(true);
    try {
      await exportToServerPdf(window.location.pathname, `RankPilot-Dashboard-${activeSite?.siteName || 'Report'}`);
    } catch (error) {
      console.error('PDF Export failed:', error);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        startDate,
        endDate,
        device: device || 'all',
        ...(campaign && { campaign }),
        ...(channel && { channel }),
        ...(activeSiteId && { siteId: activeSiteId })
      }).toString();

      const res = await api.get(`/analytics/dashboard-summary?${query}`);
      const data = res.data || {};

      setOverviewData({
        userName: data.userName,
        siteName: data.siteName,
        ga4: data.ga4 || { users: 0, sessions: 0, pageViews: 0, bounceRate: 0, avgSessionDuration: 0, growth: 0 },
        gsc: data.gsc || { clicks: 0, impressions: 0, position: 0, ctr: 0, growth: 0 },
        googleAds: data.googleAds || { spend: 0, conversions: 0, clicks: 0, impressions: 0, cpc: 0, ctr: 0, growth: 0 },
        facebookAds: data.facebookAds || { spend: 0, conversions: 0, clicks: 0, impressions: 0, reach: 0, purchaseValue: 0, roas: 0, growth: 0 },
        intelligence: data.intelligence || {},
        adWinner: data.adWinner,
        syncMetadata: data.syncMetadata
      });

      setTimeseriesData(data.timeseries || []);

      const totalSessions = data.ga4?.sessions || 1;
      const pagesWithShare = (data.topPages || []).map(p => ({
        ...p,
        share: totalSessions > 0 ? ((p.visitors / totalSessions) * 100).toFixed(1) : 0
      }));
      setTopPages(pagesWithShare);

      if (data.syncMetadata) {
        setAccounts({
          syncStatus: data.syncStatus,
          ga4: {
            ga4HistoricalComplete: data.ga4HistoricalComplete || false,
            ga4LastSyncedAt: data.ga4LastSyncedAt || null,
            ga4SyncStatus: data.syncStatus || 'idle'
          },
          gsc: {
            gscHistoricalComplete: data.gscHistoricalComplete || false,
            gscLastSyncedAt: data.gscLastSyncedAt || null,
            gscSyncStatus: data.syncStatus || 'idle'
          },
          googleAds: {
            googleAdsHistoricalComplete: data.googleAdsHistoricalComplete || false,
            googleAdsLastSyncedAt: data.googleAdsLastSyncedAt || null,
            googleAdsSyncStatus: data.syncStatus || 'idle'
          },
          facebook: {
            facebookAdsHistoricalComplete: data.facebookAdsHistoricalComplete || false,
            facebookAdsLastSyncedAt: data.facebookAdsLastSyncedAt || null,
            facebookAdsSyncStatus: data.syncStatus || 'idle'
          }
        });
      }
    } catch (err) {
      console.error('Failed to load unified dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, device, campaign, channel, activeSiteId, setAccounts]);

  const handleManualRefresh = async () => {
    if (!activeSiteId) return;
    setLoading(true);
    setAccounts({
      syncStatus: 'syncing',
      ga4: { ga4SyncStatus: 'syncing' },
      gsc: { gscSyncStatus: 'syncing' },
      googleAds: { googleAdsSyncStatus: 'syncing' },
      facebook: { facebookAdsSyncStatus: 'syncing' }
    });

    try {
      await api.post('/analytics/sync', { siteId: activeSiteId });
      const res = await getActiveAccounts(activeSiteId);
      const resData = res.data || {};
      setAccounts({
        syncStatus: resData.syncStatus || 'idle',
        ga4: {
          ga4HistoricalComplete: resData.ga4HistoricalComplete || false,
          ga4LastSyncedAt: resData.ga4LastSyncedAt || null,
          ga4SyncStatus: resData.syncStatus || 'idle'
        },
        gsc: {
          gscHistoricalComplete: resData.gscHistoricalComplete || false,
          gscLastSyncedAt: resData.gscLastSyncedAt || null,
          gscSyncStatus: resData.syncStatus || 'idle'
        },
        googleAds: {
          googleAdsHistoricalComplete: resData.googleAdsHistoricalComplete || false,
          googleAdsLastSyncedAt: resData.googleAdsLastSyncedAt || null,
          googleAdsSyncStatus: resData.syncStatus || 'idle'
        },
        facebook: {
          facebookAdsHistoricalComplete: resData.facebookAdsHistoricalComplete || false,
          facebookAdsLastSyncedAt: resData.facebookAdsLastSyncedAt || null,
          facebookAdsSyncStatus: resData.syncStatus || 'idle'
        }
      });
      await loadDashboardData();
    } catch (err) {
      console.error('Manual sync failed:', err);
      const res = await getActiveAccounts(activeSiteId).catch(() => ({ data: {} }));
      const resData = res.data || {};
      setAccounts({
        syncStatus: resData.syncStatus || 'error',
        ga4: {
          ga4HistoricalComplete: resData.ga4HistoricalComplete || false,
          ga4LastSyncedAt: resData.ga4LastSyncedAt || null,
          ga4SyncStatus: resData.syncStatus || 'error'
        },
        gsc: {
          gscHistoricalComplete: resData.gscHistoricalComplete || false,
          gscLastSyncedAt: resData.gscLastSyncedAt || null,
          gscSyncStatus: resData.syncStatus || 'error'
        },
        googleAds: {
          googleAdsHistoricalComplete: resData.googleAdsHistoricalComplete || false,
          googleAdsLastSyncedAt: resData.googleAdsLastSyncedAt || null,
          googleAdsSyncStatus: resData.syncStatus || 'error'
        },
        facebook: {
          facebookAdsHistoricalComplete: resData.facebookAdsHistoricalComplete || false,
          facebookAdsLastSyncedAt: resData.facebookAdsLastSyncedAt || null,
          facebookAdsSyncStatus: resData.syncStatus || 'error'
        }
      });
      await loadDashboardData();
    } finally {
      setLoading(false);
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
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  useEffect(() => {
    if (syncStatus !== 'syncing' && activeSiteId) {
      loadDashboardData();
    }
  }, [syncStatus, activeSiteId, loadDashboardData]);

  const activeSite = userSites?.find?.(s => s._id === activeSiteId);
  const isSyncingHistorical = !!(activeSite && (
    (activeSite.ga4PropertyId && !activeSite.ga4HistoricalComplete) ||
    (activeSite.gscSiteUrl && !activeSite.gscHistoricalComplete) ||
    (activeSite.googleAdsCustomerId && !activeSite.googleAdsHistoricalComplete) ||
    (activeSite.facebookAdAccountId && !activeSite.facebookAdsHistoricalComplete)
  ));

  const wasSyncingRef = useRef(false);
  useEffect(() => {
    if (isSyncingHistorical) {
      wasSyncingRef.current = true;
    } else if (wasSyncingRef.current && !isSyncingHistorical) {
      wasSyncingRef.current = false;
      loadDashboardData();
    }
  }, [isSyncingHistorical, loadDashboardData]);

  useEffect(() => {
    let interval;
    if (isSyncingHistorical) {
      interval = setInterval(async () => {
        try {
          const res = await api.get('/accounts/sites');
          if (res.data && Array.isArray(res.data)) setUserSites(res.data);
        } catch (e) { console.error("Polling error", e); }
      }, 3000); // Poll every 3 seconds for live progress updates
    }
    return () => clearInterval(interval);
  }, [isSyncingHistorical, setUserSites]);

  // Tab focus ya internet wapas aane par refresh
  useEffect(() => {
    const handleFocus = () => {
      loadDashboardData();
    };
    const handleOnline = () => {
      loadDashboardData();
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [loadDashboardData]);

  const { user } = useAuthStore();


  const filteredPages = topPages.filter(p =>
    (p.url?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );



  const pageColumns = [
    {
      header: 'Page URL',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <a
            href={row.url?.startsWith('http') ? row.url : `https://${row.url}`}
            target="_blank" rel="noopener noreferrer"
            className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-dark-bg flex items-center justify-center hover:bg-brand-500 hover:text-white transition-all shadow-sm active:scale-90 shrink-0"
          >
            <GlobeAltIcon className="w-4 h-4" />
          </a>
          <span className="truncate max-w-[200px] text-neutral-900 dark:text-white font-bold" title={row.url}>{row.url}</span>
        </div>
      )
    },
    { header: 'Visitors', cell: (row) => <span className="font-black tabular-nums">{formatNumber(row.visitors)}</span> },
    { header: 'Page Views', cell: (row) => <span className="font-bold text-neutral-500 dark:text-neutral-400 tabular-nums">{formatNumber(row.views)}</span> },
    { header: 'Bounce Rate', accessor: 'bounce' },
    {
      header: 'Traffic Share',
      cell: (row) => (
        <div className="flex items-center gap-3 w-full max-w-[160px]">
          <div className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${row.share}%` }}></div>
          </div>
          <span className="text-xs font-black text-neutral-500 dark:text-neutral-400 tabular-nums shrink-0 min-w-[36px] text-right">{row.share}%</span>
        </div>
      )
    },
  ];

  const chartDataToUse = timeseriesData;

  const metricColor = {
    Sessions: '#3B82F6',
    Clicks: '#10B981',
    Impressions: '#8B5CF6',
    Spend: '#F59E0B',
    Conversions: '#EF4444',
  }[selectedMetric] || '#3B82F6';

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-8 max-w-[1600px] mx-auto pb-20">
        {isSyncingHistorical && (() => {
          const platforms = [
            activeSite.ga4PropertyId && !activeSite.ga4HistoricalComplete && {
              key: 'ga4',
              label: 'Google Analytics 4',
              logo: <img src="https://www.vectorlogo.zone/logos/google_analytics/google_analytics-icon.svg" alt="GA4" className="w-7 h-7 object-contain" />,
              syncStatus: activeSite.ga4SyncStatus,
              syncProgress: activeSite.ga4SyncProgress || 0,
              syncedDays: activeSite.ga4HistoricalChunkIndex || 0,
              totalDays: 28,
              desc: 'We are importing your historical Google Analytics data. Your dashboard metrics, performance charts, and AI insights will automatically populate and update as the sync progresses.',
            },
            activeSite.gscSiteUrl && !activeSite.gscHistoricalComplete && {
              key: 'gsc',
              label: 'Google Search Console',
              logo: <img src="https://www.gstatic.com/images/branding/product/2x/search_console_64dp.png" alt="GSC" className="w-7 h-7 object-contain" />,
              syncStatus: activeSite.gscSyncStatus,
              syncProgress: activeSite.gscSyncProgress || 0,
              syncedDays: activeSite.gscHistoricalChunkIndex || 0,
              totalDays: 28,
              desc: 'We are importing your historical Google Search Console data. Your search trends and AI insights will automatically populate and update as the sync progresses.',
            },
            activeSite.googleAdsCustomerId && !activeSite.googleAdsHistoricalComplete && {
              key: 'gads',
              label: 'Google Ads',
              logo: <img src="https://www.vectorlogo.zone/logos/google_ads/google_ads-icon.svg" alt="Google Ads" className="w-7 h-7 object-contain" />,
              syncStatus: activeSite.googleAdsSyncStatus,
              syncProgress: activeSite.googleAdsSyncProgress || 0,
              syncedDays: activeSite.googleAdsHistoricalChunkIndex || 0,
              totalDays: 28,
              desc: 'We are importing your historical Google Ads data. Your campaign metrics and AI insights will automatically populate and update as the sync progresses.',
            },
            activeSite.facebookAdAccountId && !activeSite.facebookAdsHistoricalComplete && {
              key: 'meta',
              label: 'Meta Ads',
              logo: <img src="https://www.vectorlogo.zone/logos/facebook/facebook-icon.svg" alt="Meta Ads" className="w-7 h-7 object-contain" />,
              syncStatus: activeSite.facebookAdsSyncStatus,
              syncProgress: activeSite.facebookAdsSyncProgress || 0,
              syncedDays: activeSite.facebookAdsHistoricalChunkIndex || 0,
              totalDays: 28,
              desc: 'We are importing your historical Meta Ads data. Your ad performance metrics and AI insights will automatically populate and update as the sync progresses.',
            },
          ].filter(Boolean);

          return platforms.map(p => (
            <div key={p.key} className="relative overflow-hidden w-full bg-white dark:bg-[#0d0d0d] border border-amber-500/30 dark:border-amber-500/20 rounded-[2rem] p-6 shadow-xl shadow-amber-500/5 animate-in fade-in slide-in-from-top-4 duration-1000 group">
              {/* Decorative background glows */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none transition-transform duration-1000 group-hover:scale-110" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-500/5 rounded-full blur-[100px] pointer-events-none transition-transform duration-1000 group-hover:scale-110" />

              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  {/* Animated sync icon with platform logo */}
                  <div className="relative shrink-0 w-14 h-14 bg-amber-500/10 rounded-[1.25rem] border border-amber-500/20 flex items-center justify-center overflow-hidden">
                    {p.logo}
                    <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/0 via-amber-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 duration-700 transition-opacity" />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-[0.15em]">
                        Syncing Historical Data
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                        {p.syncStatus === 'syncing' ? 'Importing Data' : 'In Queue'}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-2xl italic">
                      {p.desc}
                    </p>
                    <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">{p.label}</p>
                  </div>
                </div>

                {/* Premium progress interface */}
                <div className="w-full md:w-72 space-y-2 shrink-0">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    <span>Sync Progress</span>
                    <span className="tabular-nums font-black text-amber-500">
                      {p.syncProgress ? `${p.syncProgress}%` : 'Starting...'}
                    </span>
                  </div>
                  <div className="relative h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden border border-neutral-200/20">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-brand-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                      style={{ width: `${p.syncProgress || 5}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-bold text-neutral-400">
                    <span>
                      Days Synced: <span className="text-amber-500 font-black tabular-nums">{p.syncedDays}</span> / {p.totalDays} Days
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      Live Sync Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ));
        })()}


        <div id="dashboard-report" className="flex flex-col space-y-8 min-w-0">
          {!activeGscSite && !activeGa4PropertyId && !activeGoogleAdsCustomerId && !activeFacebookAdAccountId && !loading ? (
            <div className="flex flex-col items-center justify-center p-6 md:p-12 py-12 md:py-20 bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-800 rounded-[2.5rem] text-center shadow-xl relative overflow-hidden group/empty transition-all duration-700 hover:shadow-brand-500/10">
              {/* Premium Background Elements */}
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-brand-500/5 rounded-full blur-[100px] -mr-32 -mt-32 transition-colors group-hover/empty:bg-brand-500/10"></div>
              <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-accent-500/5 rounded-full blur-[100px] -ml-32 -mb-32 transition-colors group-hover/empty:bg-accent-500/10"></div>

              <div className="relative z-10 max-w-2xl w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-5 duration-1000">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-brand-600 to-accent-500 flex items-center justify-center mb-6 shadow-2xl shadow-brand-500/30 group-hover/empty:scale-110 group-hover/empty:rotate-6 transition-all duration-500 relative">
                  <div className="absolute inset-0 rounded-3xl bg-brand-500/20 blur-lg -z-10"></div>
                  <GlobeAltIcon className="w-8 h-8 text-white stroke-[1.5]" />
                </div>

                <h2 className="text-3xl md:text-4xl font-black text-neutral-900 dark:text-white mb-3 tracking-tighter leading-tight">
                  No Website Connected <br />
                  <span className="inline-block pr-3 pb-1 bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent italic text-xl md:text-3xl whitespace-nowrap">
                    Link your site to unlock AI insights
                  </span>
                </h2>

                <p className="text-neutral-500 dark:text-neutral-400 font-bold leading-normal mb-8 max-w-sm mx-auto text-xs md:text-sm">
                  Connect your search, analytics, and advertising channels to track multi-channel marketing performance and unlock real-time AI-powered insights.
                </p>

                {/* Integration Grid Placeholder */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 w-full max-w-md">
                  {[
                    { id: 'ga', name: 'Analytics', logo: <Ga4Logo className="w-5 h-5" /> },
                    { id: 'sc', name: 'Search', logo: <GscLogo className="w-5 h-5" /> },
                    { id: 'ad', name: 'Ads', logo: <GoogleAdsLogo className="w-5 h-5" /> },
                    { id: 'meta', name: 'Meta', logo: <FacebookAdsLogo className="w-5 h-5" /> },
                  ].map((plat, idx) => (
                    <div key={plat.id}
                      className="flex flex-col items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 rounded-2xl grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500"
                    >
                      <div className="w-8 h-8 flex items-center justify-center">{plat.logo}</div>
                      <span className="text-[8px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">{plat.name}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
                  <button
                    onClick={() => navigate('/connect-accounts')}
                    className="w-full sm:w-auto px-8 py-3.5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[.2em] shadow-lg shadow-brand-500/20 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Connect Website</span>
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className={`bg-gradient-to-br from-indigo-50/90 via-white to-brand-50/90 dark:from-indigo-950/20 dark:via-dark-card dark:to-brand-950/20 backdrop-blur-xl border-2 border-brand-200/50 dark:border-brand-500/20 rounded-[2rem] shadow-[0_10px_30px_rgba(99,102,241,0.05)] relative group flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-1000 ${(isDateMenuOpen || isDeviceMenuOpen) ? 'z-40' : 'z-10'}`}>
                <div className="absolute inset-x-0 top-0 h-32 rounded-t-[2.5rem] overflow-hidden pointer-events-none">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-[100px] -mr-32 -mt-32 group-hover:bg-brand-500/10 transition-colors"></div>
                </div>

                <div className="p-4 md:py-4 md:px-6 relative z-10">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="space-y-0.5">
                        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-neutral-900 dark:text-white leading-none">
                          Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'},
                          <span className="block sm:inline ml-0 sm:ml-2 bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent capitalize">
                            {user?.name || 'Pilot'}
                          </span>
                        </h1>
                      </div>

                      <div className="space-y-1 border-l-2 border-brand-500/20 pl-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400 shrink-0">Overview</p>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-lg lg:text-2xl font-black text-neutral-900 dark:text-white tracking-tight leading-none">{activeSiteName || 'RankPilot'}</h2>
                          {activeSiteUrl && (
                            <a
                              href={activeSiteUrl.startsWith('http') ? activeSiteUrl : `https://${activeSiteUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group flex items-center gap-1.5 px-2.5 py-1 bg-neutral-100/50 hover:bg-brand-50/80 dark:bg-neutral-800/30 dark:hover:bg-brand-500/10 border border-neutral-200/40 hover:border-brand-500/20 dark:border-neutral-800/60 dark:hover:border-brand-500/20 rounded-full transition-all duration-300"
                            >
                              <GlobeAltIcon className="w-3.5 h-3.5 text-neutral-400 group-hover:text-brand-500 transition-colors" />
                              <span className="text-[11px] font-bold text-neutral-500 group-hover:text-brand-600 dark:text-neutral-400 dark:group-hover:text-brand-400 transition-colors lowercase tracking-tight">
                                {activeSiteUrl.replace(/https?:\/\//, '').replace(/\/$/, '')}
                              </span>
                              <svg className="w-3 h-3 text-neutral-400 group-hover:text-brand-500 dark:text-neutral-500 dark:group-hover:text-brand-400 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                              </svg>
                            </a>
                          )}
                        </div>
                        {(loading || !overviewData.intelligence?.websiteSummary) ? (
                          <div className="space-y-1.5 animate-pulse mt-2.5 max-w-md">
                            <div className="h-2 bg-neutral-200/60 dark:bg-neutral-800/60 rounded-full w-[95%]" />
                            <div className="h-2 bg-neutral-200/60 dark:bg-neutral-800/60 rounded-full w-[75%]" />
                          </div>
                        ) : (
                          <p className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-md mt-1.5 line-clamp-2">
                            {overviewData.intelligence?.websiteSummary}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-neutral-200/40 dark:border-neutral-800/40 mt-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border hide-in-pdf ${syncStatus === 'syncing' ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-100/50 dark:border-blue-500/20' : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100/50 dark:border-emerald-500/20'}`}>
                            <div className={`w-1 h-1 rounded-full ${syncStatus === 'syncing' ? 'bg-blue-500 animate-spin' : 'bg-emerald-500 animate-pulse'}`}></div>
                            <span className={`text-[9px] font-black uppercase tracking-widest ${syncStatus === 'syncing' ? 'text-blue-600 dark:text-blue-500' : 'text-emerald-600 dark:text-emerald-500'}`}>
                              {syncStatus === 'syncing' ? 'Syncing...' : 'Active'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 border-l border-neutral-200 dark:border-neutral-800 pl-3 hide-in-pdf">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Synced:</span>
                            <span className="text-[10px] font-black text-neutral-600 dark:text-neutral-300 uppercase">
                              {(() => {
                                const dates = [
                                  ga4?.ga4LastSyncedAt,
                                  gsc?.gscLastSyncedAt,
                                  googleAds?.googleAdsLastSyncedAt,
                                  facebook?.facebookAdsLastSyncedAt
                                ].filter(Boolean).map(d => new Date(d));
                                if (dates.length === 0) return 'Never';
                                const latest = new Date(Math.max(...dates));
                                return formatDistanceToNow(latest, { addSuffix: true });
                              })()}
                            </span>
                            <button
                              onClick={handleManualRefresh}
                              disabled={loading || syncStatus === 'syncing'}
                              className={`hover:rotate-180 transition-all duration-700 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg ${loading || syncStatus === 'syncing' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <ArrowPathIcon className={`w-3 h-3 text-neutral-500 ${(loading || syncStatus === 'syncing') ? 'animate-spin' : ''}`} />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 mt-3">
                        <div className="relative">
                          <button
                            onClick={() => { setIsDateMenuOpen(!isDateMenuOpen); setIsDeviceMenuOpen(false); }}
                            className={`flex items-center gap-2 px-2.5 py-1 transition-all active:scale-95 group/date rounded-full border shadow-sm ${isDateMenuOpen
                              ? 'bg-brand-600 border-brand-500 text-white'
                              : 'bg-white/50 dark:bg-dark-surface/50 border-neutral-200/50 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:border-neutral-300 dark:hover:border-neutral-700'
                              }`}
                          >
                            <CalendarIcon className={`w-3.5 h-3.5 ${isDateMenuOpen ? 'text-white' : 'text-brand-600'}`} />
                            <span className={`text-[9.5px] font-black uppercase tracking-wider ${isDateMenuOpen ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'}`}>
                              Date: {{
                                today: 'Today',
                                yesterday: 'Yesterday',
                                '7d': 'Last 7 Days',
                                '28d': 'Last 28 Days',
                                '90d': 'Last 90 Days',
                                '1y': 'Last Year',
                                custom: 'Custom'
                              }[preset] || preset}
                            </span>
                            <ChevronDownIcon className={`w-3 h-3 transition-transform ${isDateMenuOpen ? 'rotate-180 opacity-100' : 'opacity-40'}`} />
                          </button>

                          {isDateMenuOpen && (
                            <div className="absolute top-full left-0 mt-2 z-[100] bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-1.5 min-w-[160px] animate-in fade-in zoom-in-95 duration-200">
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
                                        className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[8px] font-black text-neutral-400 uppercase ml-1">End</label>
                                      <input
                                        type="date"
                                        value={tempDateRange.end}
                                        onChange={(e) => setTempDateRange({ ...tempDateRange, end: e.target.value })}
                                        className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none"
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

                        <div className="relative">
                          <button
                            onClick={() => { setIsDeviceMenuOpen(!isDeviceMenuOpen); setIsDateMenuOpen(false); }}
                            className={`flex items-center gap-2 px-2.5 py-1 transition-all active:scale-95 group/device rounded-full border shadow-sm ${isDeviceMenuOpen
                              ? 'bg-amber-500 border-amber-400 text-white'
                              : 'bg-white/50 dark:bg-dark-surface/50 border-neutral-200/50 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:border-neutral-300 dark:hover:border-neutral-700'
                              }`}
                          >
                            <ComputerDesktopIcon className={`w-3.5 h-3.5 ${isDeviceMenuOpen ? 'text-white' : 'text-amber-500'}`} />
                            <span className={`text-[9.5px] font-black uppercase tracking-wider ${isDeviceMenuOpen ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'}`}>
                              Device: {device ? {
                                mobile: 'Mobile',
                                desktop: 'Desktop',
                                tablet: 'Tablet'
                              }[device] || device : 'All'}
                            </span>
                            <ChevronDownIcon className={`w-3 h-3 transition-transform ${isDeviceMenuOpen ? 'rotate-180 opacity-100' : 'opacity-40'}`} />
                          </button>

                          {isDeviceMenuOpen && (
                            <div className="absolute top-full left-0 mt-2 z-[100] bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-1.5 min-w-[120px] animate-in fade-in zoom-in-95 duration-200">
                              {[
                                { label: 'All Devices', value: '', icon: FunnelIcon },
                                { label: 'Mobile', value: 'mobile', icon: DevicePhoneMobileIcon },
                                { label: 'Desktop', value: 'desktop', icon: ComputerDesktopIcon },
                                { label: 'Tablet', value: 'tablet', icon: DeviceTabletIcon },
                              ].map((d) => (
                                <button
                                  key={d.value}
                                  onClick={() => handleDeviceSelect(d.value)}
                                  className={`w-full text-left px-3 py-2 rounded-xl text-[10px] font-bold transition-all flex items-center gap-2 ${(device || '') === d.value
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

                    <div className="flex flex-col md:flex-row gap-6 lg:items-center">
                      <div className="grid grid-cols-2 gap-2.5 p-2 bg-neutral-100/40 dark:bg-neutral-900/25 rounded-[1.5rem] border border-neutral-200/50 dark:border-neutral-800/80 shadow-inner shrink-0">
                        {[
                          {
                            id: 'ga4',
                            active: !!activeGa4PropertyId,
                            label: 'GA4 Analytics',
                            logo: <Ga4Logo className="w-4 h-4" />,
                            accentGradient: 'from-orange-500 to-orange-400',
                            bgColor: 'bg-gradient-to-b from-orange-50/50 via-orange-50/5 to-white dark:from-orange-950/15 dark:via-dark-surface dark:to-dark-surface',
                            borderColor: 'border-orange-500/20 dark:border-orange-500/10',
                            activeShadow: 'shadow-orange-500/5',
                            color: 'bg-orange-50 dark:bg-orange-950/20',
                            details: activeGa4PropertyId ? [
                              `Name: ${ga4?.ga4PropertyName || (activeSiteUrl ? activeSiteUrl.replace(/https?:\/\//, '').replace(/\/$/, '') : 'Property')}`,
                              `ID: ${activeGa4PropertyId}`
                            ] : null,
                            tooltip: `Property: ${ga4?.ga4PropertyName || 'N/A'}\nID: ${activeGa4PropertyId || 'N/A'}\nEmail: ${ga4?.ga4TokenEmail || 'N/A'}`,
                            route: !!activeGa4PropertyId ? '/dashboard/ga4' : '/connect-accounts'
                          },
                          {
                            id: 'google-ads',
                            active: !!activeGoogleAdsCustomerId,
                            label: 'Google Ads',
                            logo: <GoogleAdsLogo className="w-4 h-4" />,
                            accentGradient: 'from-amber-500 to-yellow-400',
                            bgColor: 'bg-gradient-to-b from-amber-50/50 via-amber-50/5 to-white dark:from-amber-950/15 dark:via-dark-surface dark:to-dark-surface',
                            borderColor: 'border-amber-500/20 dark:border-amber-500/10',
                            activeShadow: 'shadow-amber-500/5',
                            color: 'bg-amber-50 dark:bg-amber-950/20',
                            details: activeGoogleAdsCustomerId ? [
                              `Name: ${googleAds?.googleAdsAccountName || (activeSiteUrl ? activeSiteUrl.replace(/https?:\/\//, '').replace(/\/$/, '') : 'Connected')}`,
                              `ID: ${activeGoogleAdsCustomerId}`
                            ] : null,
                            tooltip: `Account: ${googleAds?.googleAdsAccountName || 'N/A'}\nID: ${activeGoogleAdsCustomerId || 'N/A'}\nEmail: ${googleAds?.googleAdsTokenEmail || 'N/A'}`,
                            route: !!activeGoogleAdsCustomerId ? '/dashboard/google-ads' : '/connect-accounts'
                          },
                          {
                            id: 'gsc',
                            active: !!activeGscSite,
                            label: 'Search Console',
                            logo: <GscLogo className="w-4 h-4" />,
                            accentGradient: 'from-blue-500 to-sky-400',
                            bgColor: 'bg-gradient-to-b from-blue-50/50 via-blue-50/5 to-white dark:from-blue-950/15 dark:via-dark-surface dark:to-dark-surface',
                            borderColor: 'border-blue-500/20 dark:border-blue-500/10',
                            activeShadow: 'shadow-blue-500/5',
                            color: 'bg-blue-50 dark:bg-blue-950/20',
                            details: activeGscSite ? [
                              `Site: ${activeGscSite.replace(/https?:\/\//, '')}`
                            ] : null,
                            tooltip: `Site: ${activeGscSite || 'N/A'}\nEmail: ${gsc?.gscTokenEmail || 'N/A'}`,
                            route: !!activeGscSite ? '/dashboard/gsc' : '/connect-accounts'
                          },
                          {
                            id: 'facebook',
                            active: !!activeFacebookAdAccountId,
                            label: 'Facebook Ads',
                            logo: <FacebookAdsLogo className="w-4 h-4" />,
                            accentGradient: 'from-indigo-600 to-blue-500',
                            bgColor: 'bg-gradient-to-b from-indigo-50/50 via-indigo-50/5 to-white dark:from-indigo-950/15 dark:via-dark-surface dark:to-dark-surface',
                            borderColor: 'border-indigo-500/20 dark:border-indigo-500/10',
                            activeShadow: 'shadow-indigo-500/5',
                            color: 'bg-blue-50 dark:bg-indigo-950/20',
                            details: activeFacebookAdAccountId ? [
                              `Name: ${facebook?.facebookAdAccountName || (activeSiteUrl ? activeSiteUrl.replace(/https?:\/\//, '').replace(/\/$/, '') : 'Connected')}`,
                              `ID: ${activeFacebookAdAccountId.replace('act_', '')}`
                            ] : null,
                            tooltip: `Account: ${facebook?.facebookAdAccountName || 'N/A'}\nID: ${activeFacebookAdAccountId || 'N/A'}\nUser: ${facebook?.facebookTokenName || 'N/A'}`,
                            route: !!activeFacebookAdAccountId ? '/dashboard/facebook-ads' : '/connect-accounts'
                          }
                        ].map((card) => (
                          <div
                            key={card.id}
                            onClick={() => navigate(card.route)}
                            className={`flex flex-col gap-3 p-3.5 border rounded-2xl w-[182px] transition-all duration-300 hover:-translate-y-0.5 cursor-pointer group/item relative overflow-hidden ${card.active
                                ? `${card.bgColor} ${card.borderColor} shadow-[0_4px_16px_rgba(0,0,0,0.02)] hover:shadow-lg hover:${card.activeShadow}`
                                : 'border-dashed border-neutral-300/80 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-900/10 hover:bg-neutral-50/80 dark:hover:bg-neutral-900/20 hover:border-brand-500/30 dark:hover:border-brand-500/20 shadow-sm hover:shadow-md'
                              }`}
                          >
                            {card.active && (
                              <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${card.accentGradient}`} />
                            )}
                            <div className="flex items-center justify-between">
                              <div className={`w-8 h-8 rounded-xl ${card.color} flex items-center justify-center shrink-0 border border-neutral-200/10 dark:border-white/5 shadow-sm ${!card.active ? 'grayscale opacity-60' : ''}`}>
                                {card.logo}
                              </div>
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all ${card.active
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200/40 dark:border-neutral-800/40 shadow-sm'
                                }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${card.active ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400 dark:bg-neutral-600'}`}></span>
                                {card.active ? 'Linked' : 'Offline'}
                              </span>
                            </div>

                            <div className="space-y-1.5 min-h-[52px] flex flex-col justify-between">
                              <div>
                                <p className={`text-[9px] font-black uppercase tracking-widest leading-none transition-colors ${card.active
                                    ? 'text-neutral-400 dark:text-neutral-500 group-hover/item:text-neutral-500 dark:group-hover/item:text-neutral-400'
                                    : 'text-neutral-450 dark:text-neutral-550'
                                  }`}>
                                  {card.label}
                                </p>
                                {card.active && card.details ? (
                                  <div className="flex flex-col gap-0.5 mt-1.5">
                                    {card.details.map((detailText, idx) => (
                                      <p
                                        key={idx}
                                        className="text-[10px] font-black text-neutral-700 dark:text-neutral-200 truncate max-w-[155px] transition-colors group-hover/item:text-neutral-950 dark:group-hover/item:text-white"
                                        title={card.tooltip}
                                      >
                                        {detailText}
                                      </p>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-0.5 mt-2">
                                    <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-tighter">
                                      Not Connected
                                    </p>
                                    <span className="text-[11px] font-black text-brand-600 dark:text-brand-400 transition-colors flex items-center gap-1 mt-0.5 group-hover/item:text-brand-700 dark:group-hover/item:text-brand-300">
                                      Connect now <ArrowRightIcon className="w-2.5 h-2.5 transition-transform group-hover/item:translate-x-0.5" />
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col gap-2.5 min-w-[185px] self-stretch justify-center pl-6 border-l border-neutral-200/60 dark:border-neutral-800/80 ml-2 hide-in-pdf">
                        <button
                          onClick={() => openWithQuestion(`Analyze complete brand dashboard for ${startDate} to ${endDate}. 
                            - Total Web Traffic (GA4 Sessions): ${formatNumber(overviewData.ga4?.sessions || 0)}
                            - Total Organic Clicks (GSC): ${formatNumber(overviewData.gsc?.clicks || 0)}
                            - Total Ad Spend (Meta + Google): ${formatCurrency((overviewData.facebookAds?.spend || 0) + (overviewData.googleAds?.spend || 0))}
                            - Total Ad Conversions: ${formatNumber((overviewData.googleAds?.conversions || 0) + (overviewData.facebookAds?.conversions || 0))}
                            Strategic review: Brand Performance, Efficiency, Strategy.`, '📊 Complete Brand Performance Analysis')}
                          className="h-10 px-4 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-2xl text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all duration-300 shadow-md shadow-brand-500/10 hover:shadow-lg hover:shadow-brand-500/25 hover:-translate-y-0.5 active:scale-95"
                        >
                          <SparklesIcon className="w-4 h-4 text-white/95 animate-pulse" />
                          AI SUMMARY
                        </button>
                        <button
                          onClick={handlePdfExport}
                          disabled={isExportingPdf}
                          className={`h-10 px-4 bg-white hover:bg-neutral-50 dark:bg-neutral-900/60 dark:hover:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 ${isExportingPdf ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isExportingPdf ? (
                            <div className="w-3.5 h-3.5 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <ArrowDownTrayIcon className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                          )}
                          {isExportingPdf ? 'GENERATING' : 'PDF REPORT'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <KpiCard title="Website Traffic" value={formatNumber(overviewData.ga4?.sessions || 0)} change={overviewData.ga4?.growthSessions || 0} isPositive={(overviewData.ga4?.growthSessions || 0) >= 0} loading={loading || isSyncingHistorical} Icon={UsersIcon} platform="ga4" changeText="vs previous period" chartData={timeseriesData.map(d => d.Sessions)} disconnected={!activeGa4PropertyId} onClick={() => navigate(!activeGa4PropertyId ? '/connect-accounts' : '/dashboard/ga4')} insight={overviewData.intelligence?.metricTraffic} contextPrompt={`Analyze Audience Traffic: ${formatNumber(overviewData.ga4?.sessions || 0)} sessions with ${overviewData.ga4?.growthSessions || 0}% growth. What are the key drivers for this traffic trend and how can we scale it further?`} />
                <KpiCard title="Search Traffic" value={formatNumber(overviewData.gsc?.clicks || 0)} change={overviewData.gsc?.growthClicks || 0} isPositive={(overviewData.gsc?.growthClicks || 0) >= 0} loading={loading || isSyncingHistorical} Icon={MagnifyingGlassIcon} platform="gsc" changeText="vs previous period" chartData={timeseriesData.map(d => d.Clicks)} disconnected={!activeGscSite} onClick={() => navigate(!activeGscSite ? '/connect-accounts' : '/dashboard/gsc')} insight={overviewData.intelligence?.metricClicks} contextPrompt={`Examine Organic Search performance: ${formatNumber(overviewData.gsc?.clicks || 0)} clicks this period. How can we improve our SEO trajectory and keyword rankings?`} />
                <KpiCard title="Ad Spend" value={formatCurrency((overviewData.facebookAds?.spend || 0) + (overviewData.googleAds?.spend || 0))} change={Math.abs(overviewData.googleAds?.growthSpend || 0)} isPositive={(overviewData.googleAds?.growthSpend || 0) <= 0} loading={loading || isSyncingHistorical} Icon={CurrencyDollarIcon} platform="google-ads" changeText="vs previous period" chartData={timeseriesData.map(d => d.Spend || 0)} disconnected={!activeGoogleAdsCustomerId && !activeFacebookAdAccountId} onClick={() => navigate((!activeGoogleAdsCustomerId && !activeFacebookAdAccountId) ? '/connect-accounts' : '/dashboard/google-ads')} insight={overviewData.intelligence?.metricSpend} contextPrompt={`Review our total ad investment of ${formatCurrency((overviewData.facebookAds?.spend || 0) + (overviewData.googleAds?.spend || 0))}. Based on our growth, is our spend allocation between Google and Meta efficient?`} />
                <KpiCard title="Conversions" value={formatNumber((overviewData.googleAds?.conversions || 0) + (overviewData.facebookAds?.conversions || 0))} change={overviewData.googleAds?.growthConversions || 0} isPositive={(overviewData.googleAds?.growthConversions || 0) >= 0} loading={loading || isSyncingHistorical} Icon={CheckCircleIcon} platform="conversions" changeText="vs previous period" chartData={timeseriesData.map(d => d.Conversions || 0)} disconnected={!activeGoogleAdsCustomerId && !activeFacebookAdAccountId} onClick={() => navigate((!activeGoogleAdsCustomerId && !activeFacebookAdAccountId) ? '/connect-accounts' : '/dashboard/google-ads')} insight={overviewData.intelligence?.metricConversions} contextPrompt={`Analyze conversions: ${formatNumber((overviewData.googleAds?.conversions || 0) + (overviewData.facebookAds?.conversions || 0))} total actions. What specific strategies can we use to maximize ROI from these leads?`} />
                <KpiCard title="Ad Reach" value={formatNumber((overviewData.facebookAds?.impressions || 0) + (overviewData.googleAds?.impressions || 0))} change={overviewData.facebookAds?.growthReach || 0} isPositive={(overviewData.facebookAds?.growthReach || 0) >= 0} loading={loading || isSyncingHistorical} Icon={EyeIcon} platform="facebook" changeText="vs previous period" chartData={timeseriesData.map(d => d.Impressions || 0)} disconnected={!activeGoogleAdsCustomerId && !activeFacebookAdAccountId} onClick={() => navigate((!activeGoogleAdsCustomerId && !activeFacebookAdAccountId) ? '/connect-accounts' : '/dashboard/facebook-ads')} insight={overviewData.intelligence?.metricImpressions} contextPrompt={`Marketing visibility: ${formatNumber((overviewData.facebookAds?.impressions || 0) + (overviewData.googleAds?.impressions || 0))} impressions. Are we building enough brand awareness compared to our competitors?`} />
                <KpiCard title="Conversion Efficiency" value={((overviewData.facebookAds?.spend || 0) + (overviewData.googleAds?.spend || 0)) > 0 ? `+${(((overviewData.googleAds?.conversions || 0) + (overviewData.facebookAds?.conversions || 0)) / (((overviewData.facebookAds?.spend || 0) + (overviewData.googleAds?.spend || 0)) / 100)).toFixed(1)}x` : '0.0x'} change={4.2} isPositive={true} loading={loading || isSyncingHistorical} Icon={BoltIcon} platform="efficiency" changeText="vs previous period" chartData={timeseriesData.map(d => d.Spend > 0 ? (d.Conversions || 0) / ((d.Spend || 1) / 100) : 0)} disconnected={!activeGoogleAdsCustomerId && !activeFacebookAdAccountId} onClick={() => navigate((!activeGoogleAdsCustomerId && !activeFacebookAdAccountId) ? '/connect-accounts' : '/dashboard/google-ads')} insight={overviewData.intelligence?.metricEfficiency} contextPrompt={`Audit our Efficiency Score. With a ${formatPct((overviewData.googleAds?.ctr || 0) * 100)} Google CTR and ${(overviewData.facebookAds?.roas || 0).toFixed(2)}x Meta ROAS, how can we lower the cost per conversion?`} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 shadow-sm transition-all shadow-orange-500/5 ${!activeGa4PropertyId ? 'hide-in-pdf' : ''}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0"><Ga4Logo className="w-4 h-4" /></div>
                      <h3 className="text-sm font-black text-neutral-900 dark:text-white">Google Analytics 4</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeGa4PropertyId && !loading && (
                        <button
                          onClick={() => openWithQuestion(`Provide a detailed analysis for this GA4 traffic summary: ${overviewData.intelligence?.overviewGA4 || 'Traffic engagement overview'}.
                            Current Data: Users: ${formatNumber(overviewData.ga4?.users)}, Sessions: ${formatNumber(overviewData.ga4?.sessions)}, Growth: ${overviewData.ga4?.growthSessions}%, Bounce Rate: ${formatPct(overviewData.ga4?.bounceRate || 0)}, Avg Time: ${formatTime(overviewData.ga4?.avgSessionDuration)}, Page Views: ${formatNumber(overviewData.ga4?.pageViews)}`, '📈 GA4 Web Analytics Review')}
                          className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                        >
                          <SparklesIcon className="w-3.5 h-3.5" />
                          ASK AI
                        </button>
                      )}
                      {activeGa4PropertyId && (
                        <button onClick={() => navigate('/dashboard/ga4')} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 hide-in-pdf">View Full <ArrowRightIcon className="w-3 h-3" /></button>
                      )}
                    </div>
                  </div>
                  {(loading || isSyncingHistorical) ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-pulse">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="p-3 bg-neutral-100 dark:bg-neutral-800/10 rounded-xl h-[52px]" />
                      ))}
                    </div>
                  ) : !activeGa4PropertyId ? <div className="h-[148px]"><EmptyState message="Google Analytics Not Linked" sub="Connect GA4 for traffic analysis." onAction={() => navigate('/connect-accounts')} /></div> : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: 'Users', value: formatNumber(overviewData.ga4?.users) },
                        { label: 'Sessions', value: formatNumber(overviewData.ga4?.sessions) },
                        { label: 'Bounce Rate', value: formatPct(overviewData.ga4?.bounceRate || 0) },
                        { label: 'Avg. Session Duration', value: formatTime(overviewData.ga4?.avgSessionDuration) },
                        { label: 'Page Views', value: formatNumber(overviewData.ga4?.pageViews) },
                        { label: 'TRAFFIC CHANGE', value: `${(overviewData.ga4?.growthSessions || 0) >= 0 ? '↑' : '↓'} ${Math.abs(overviewData.ga4?.growthSessions || 0).toFixed(1)}%` },
                      ].map((m, i) => (
                        <div key={i} className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-xl transition-all">
                          <div className="text-base font-black text-neutral-900 dark:text-white tabular-nums">{m.value}</div>
                          <div className="text-[11px] text-neutral-400 mt-0.5 font-bold uppercase tracking-tight">{m.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeGa4PropertyId && (
                    <div className="mt-6 p-3.5 bg-brand-50/20 dark:bg-brand-500/5 border border-brand-100/50 dark:border-brand-500/20 rounded-2xl">
                      <h4 className="text-[10.5px] font-black text-neutral-900 dark:text-white mb-1.5 uppercase tracking-wider">AI Summary</h4>
                      {(loading || isSyncingHistorical) ? (
                        <div className="space-y-1.5 animate-pulse">
                          <div className="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full w-full" />
                          <div className="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full w-[80%]" />
                        </div>
                      ) : (
                        <div className="flex flex-col items-start gap-2.5">
                          <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 leading-relaxed">
                            {overviewData.intelligence?.overviewGA4 || "Analyzing high-volume traffic across user engagement."}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className={`bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 shadow-sm transition-all shadow-green-500/5 ${!activeGscSite ? 'hide-in-pdf' : ''}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0"><GscLogo className="w-4 h-4" /></div>
                      <h3 className="text-sm font-black text-neutral-900 dark:text-white">Search Console</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeGscSite && !loading && (
                        <button
                          onClick={() => openWithQuestion(`How can I improve my SEO strategy based on this Search Console summary? ${overviewData.intelligence?.overviewGSC || 'Organic visibility overview'}.
                            Current Data: Clicks: ${formatNumber(overviewData.gsc?.clicks)} (${overviewData.gsc?.growthClicks}% growth), Impressions: ${formatNumber(overviewData.gsc?.impressions)}, CTR: ${formatPct((overviewData.gsc?.ctr || 0) * 100)}, Avg Position: #${(overviewData.gsc?.position || 0).toFixed(1)}`, '🔍 GSC SEO Performance Audit')}
                          className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                        >
                          <SparklesIcon className="w-3.5 h-3.5" />
                          ASK AI
                        </button>
                      )}
                      {activeGscSite && (
                        <button onClick={() => navigate('/dashboard/gsc')} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 hide-in-pdf">View Full <ArrowRightIcon className="w-3 h-3" /></button>
                      )}
                    </div>
                  </div>
                  {(loading || isSyncingHistorical) ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-pulse">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="p-3 bg-neutral-100 dark:bg-neutral-800/10 rounded-xl h-[52px]" />
                      ))}
                    </div>
                  ) : !activeGscSite ? <div className="h-[148px]"><EmptyState message="Search Console Disconnected" sub="Connect to track rankings." onAction={() => navigate('/connect-accounts')} /></div> : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: 'Search Clicks', value: formatNumber(overviewData.gsc?.clicks) },
                        { label: 'Impressions', value: formatNumber(overviewData.gsc?.impressions) },
                        { label: 'Click Rate', value: formatPct((overviewData.gsc?.ctr || 0) * 100) },
                        { label: 'Avg. Position', value: `${(overviewData.gsc?.position || 0).toFixed(1)}` },
                        { label: 'Traffic Change', value: `${(overviewData.gsc?.growthClicks || 0) >= 0 ? '↑' : '↓'} ${Math.abs(overviewData.gsc?.growthClicks || 0).toFixed(1)}%` },
                      ].map((m, i) => (
                        <div key={i} className="p-3 bg-green-50 dark:bg-green-900/10 rounded-xl transition-all">
                          <div className="text-base font-black text-neutral-900 dark:text-white tabular-nums">{m.value}</div>
                          <div className="text-[11px] text-neutral-400 mt-0.5 font-bold uppercase tracking-tight">{m.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeGscSite && (
                    <div className="mt-6 p-3.5 bg-brand-50/20 dark:bg-brand-500/5 border border-brand-100/50 dark:border-brand-500/20 rounded-2xl">
                      <h4 className="text-[10.5px] font-black text-neutral-900 dark:text-white mb-1.5 uppercase tracking-wider">AI Summary</h4>
                      {(loading || isSyncingHistorical) ? (
                        <div className="space-y-1.5 animate-pulse">
                          <div className="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full w-full" />
                          <div className="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full w-[80%]" />
                        </div>
                      ) : (
                        <div className="flex flex-col items-start gap-2.5">
                          <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 leading-relaxed">
                            {overviewData.intelligence?.overviewGSC || "SEO visibility is showing stable organic growth."}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className={`bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 shadow-sm transition-all shadow-amber-500/5 ${!activeGoogleAdsCustomerId ? 'hide-in-pdf' : ''}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0"><GoogleAdsLogo className="w-4 h-4" /></div>
                      <h3 className="text-sm font-black text-neutral-900 dark:text-white">Google Ads</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeGoogleAdsCustomerId && !loading && (
                        <button
                          onClick={() => openWithQuestion(`Analyze Google Ads efficiency based on this overview: ${overviewData.intelligence?.overviewGAds || 'Ad campaign overview'}.
                            Current Data: Spend: ${formatCurrency(overviewData.googleAds?.spend)} (${overviewData.googleAds?.growthSpend}% growth), Clicks: ${formatNumber(overviewData.googleAds?.clicks)}, Impressions: ${formatNumber(overviewData.googleAds?.impressions)}, Conversions: ${formatNumber(overviewData.googleAds?.conversions)} (${overviewData.googleAds?.growthConversions}% growth), CPC: ${formatCurrency(overviewData.googleAds?.cpc)}, CTR: ${formatPct((overviewData.googleAds?.ctr || 0) * 100)}`, '🎯 Google Ads Optimization Review')}
                          className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                        >
                          <SparklesIcon className="w-3.5 h-3.5" />
                          ASK AI
                        </button>
                      )}
                      {activeGoogleAdsCustomerId && <button onClick={() => navigate('/dashboard/google-ads')} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">View Full <ArrowRightIcon className="w-3 h-3" /></button>}
                    </div>
                  </div>
                  {(loading || isSyncingHistorical) ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-pulse">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="p-3 bg-neutral-100 dark:bg-neutral-800/10 rounded-xl h-[52px]" />
                      ))}
                    </div>
                  ) : !activeGoogleAdsCustomerId ? <div className="h-[148px]"><EmptyState message="Google Ads Not Found" sub="Link to track spend." onAction={() => navigate('/connect-accounts')} /></div> : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: 'Ad Spend', value: formatCurrency(overviewData.googleAds?.spend) },
                        { label: 'Clicks', value: formatNumber(overviewData.googleAds?.clicks) },
                        { label: 'Impressions', value: formatNumber(overviewData.googleAds?.impressions) },
                        { label: 'Conversions', value: formatNumber(overviewData.googleAds?.conversions) },
                        { label: 'Cost Per Click', value: formatCurrency(overviewData.googleAds?.cpc) },
                        { label: 'Click Rate', value: formatPct((overviewData.googleAds?.ctr || 0) * 100) },
                      ].map((m, i) => (
                        <div key={i} className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl">
                          <div className="text-base font-black text-neutral-900 dark:text-white tabular-nums">{m.value}</div>
                          <div className="text-[11px] text-neutral-400 mt-0.5 uppercase tracking-tight font-bold">{m.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeGoogleAdsCustomerId && (
                    <div className="mt-6 p-3.5 bg-brand-50/20 dark:bg-brand-500/5 border border-brand-100/50 dark:border-brand-500/20 rounded-2xl">
                      <h4 className="text-[10.5px] font-black text-neutral-900 dark:text-white mb-1.5 uppercase tracking-wider">AI Summary</h4>
                      {(loading || isSyncingHistorical) ? (
                        <div className="space-y-1.5 animate-pulse">
                          <div className="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full w-full" />
                          <div className="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full w-[80%]" />
                        </div>
                      ) : (
                        <div className="flex flex-col items-start gap-2.5">
                          <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 leading-relaxed">
                            {overviewData.intelligence?.overviewGAds || "Google Ads campaigns are actively spending."}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className={`bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 shadow-sm transition-all shadow-blue-500/5 ${!activeFacebookAdAccountId ? 'hide-in-pdf' : ''}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0"><FacebookAdsLogo className="w-4 h-4" /></div>
                      <h3 className="text-sm font-black text-neutral-900 dark:text-white">Facebook Ads</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeFacebookAdAccountId && !loading && (
                        <button
                          onClick={() => openWithQuestion(`Give me actionable strategies to scale Meta Ads based on this summary: ${overviewData.intelligence?.overviewFAds || 'Meta ads overview'}.
                            Current Data: Spend: ${formatCurrency(overviewData.facebookAds?.spend)} (${overviewData.facebookAds?.growthSpend}% growth), Reach: ${formatNumber(overviewData.facebookAds?.reach)} (${overviewData.facebookAds?.growthReach}% growth), Impressions: ${formatNumber(overviewData.facebookAds?.impressions)}, Clicks: ${formatNumber(overviewData.facebookAds?.clicks)}, ROAS: ${(overviewData.facebookAds?.roas || 0).toFixed(2)}x, CTR: ${formatPct((overviewData.facebookAds?.ctr || 0) * 100)}`, '📱 Meta Ads Performance Review')}
                          className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                        >
                          <SparklesIcon className="w-3.5 h-3.5" />
                          ASK AI
                        </button>
                      )}
                      {activeFacebookAdAccountId && <button onClick={() => navigate('/dashboard/facebook-ads')} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">View Full <ArrowRightIcon className="w-3 h-3" /></button>}
                    </div>
                  </div>
                  {(loading || isSyncingHistorical) ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-pulse">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="p-3 bg-neutral-100 dark:bg-neutral-800/10 rounded-xl h-[52px]" />
                      ))}
                    </div>
                  ) : !activeFacebookAdAccountId ? <div className="h-[148px]"><EmptyState message="Meta Ads Not Found" sub="Connect to analyze spend." onAction={() => navigate('/connect-accounts')} /></div> : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: 'Ad Spend', value: formatCurrency(overviewData.facebookAds?.spend) },
                        { label: 'Reach', value: formatNumber(overviewData.facebookAds?.reach) },
                        { label: 'Impressions', value: formatNumber(overviewData.facebookAds?.impressions) },
                        { label: 'Clicks', value: formatNumber(overviewData.facebookAds?.clicks) },
                        { label: 'Return on Ad Spend', value: `${(overviewData.facebookAds?.roas || 0).toFixed(2)}x return` },
                        { label: 'Click Rate', value: formatPct((overviewData.facebookAds?.ctr || 0) * 100) },
                      ].map((m, i) => (
                        <div key={i} className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl">
                          <div className="text-base font-black text-neutral-900 dark:text-white tabular-nums">{m.value}</div>
                          <div className="text-[11px] text-neutral-400 mt-0.5 uppercase tracking-tight font-bold">{m.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeFacebookAdAccountId && (
                    <div className="mt-6 p-3.5 bg-brand-50/20 dark:bg-brand-500/5 border border-brand-100/50 dark:border-brand-500/20 rounded-2xl">
                      <h4 className="text-[10.5px] font-black text-neutral-900 dark:text-white mb-1.5 uppercase tracking-wider">AI Summary</h4>
                      {(loading || isSyncingHistorical) ? (
                        <div className="space-y-1.5 animate-pulse">
                          <div className="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full w-full" />
                          <div className="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full w-[80%]" />
                        </div>
                      ) : (
                        <div className="flex flex-col items-start gap-2.5">
                          <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 leading-relaxed">
                            {overviewData.intelligence?.overviewFAds || "Facebook ad reach is expanding profitably."}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className={`bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 mb-6 shadow-sm overflow-hidden ${(!overviewData.connectionStatus?.googleAds && !overviewData.connectionStatus?.facebookAds) ? 'hide-in-pdf' : ''}`}>
                <div className="flex justify-between items-start gap-4 mb-6">

                  {/* LEFT: Title + Subtitle */}
                  <div className="flex flex-col">
                    <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                      Ad Platform Comparison
                    </h3>
                    <p className="text-xs font-semibold text-neutral-500 mt-1">
                      See which ad platform is performing better
                    </p>
                  </div>

                  {/* RIGHT: Actions / Badges */}
                  <div className="flex items-center gap-2 flex-wrap justify-end">

                    {!loading && (activeGoogleAdsCustomerId || activeFacebookAdAccountId) && (
                      <button
                        onClick={() => openWithQuestion(`Based on the Ad Platform Comparison table, which channel should I prioritize? 
                        Google Stats: $${formatNumber(overviewData.googleAds?.spend)} spend, ${formatNumber(overviewData.googleAds?.conversions)} conv, ${formatPct((overviewData.googleAds?.ctr || 0) * 100)} CTR.
                        Meta Stats: $${formatNumber(overviewData.facebookAds?.spend)} spend, ${formatNumber(overviewData.facebookAds?.conversions)} conv, ${formatPct((overviewData.facebookAds?.ctr || 0) * 100)} CTR.
                        AI Insight: ${overviewData.intelligence?.adWinnerInsight || 'Comparison analysis needed.'}`, '📊 Cross-Channel Ad Platform Comparison')}
                        className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-semibold flex items-center gap-1.5"
                      >
                        <SparklesIcon className="w-3 h-3" />
                        Ask AI
                      </button>
                    )}

                    {!overviewData.connectionStatus?.googleAds && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-[10px] font-medium">
                        Google not connected
                      </span>
                    )}

                    {!overviewData.connectionStatus?.facebookAds && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-medium">
                        Meta not connected
                      </span>
                    )}

                    <span className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 rounded-full text-[10px] font-medium">
                      Cumulative
                    </span>

                  </div>

                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800 text-[9px] font-black uppercase text-neutral-400 text-left">
                        <th className="pb-3 px-1">Metric</th>
                        <th className="pb-3 px-1">Google</th>
                        <th className="pb-3 px-1">Meta</th>
                        <th className="pb-3 px-1 text-right pr-2">Better Platform</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800/50">
                      {(loading || isSyncingHistorical) ? (
                        [1, 2, 3, 4].map((i) => (
                          <tr key={i} className="animate-pulse">
                            <td className="py-4"><div className="w-16 h-3 bg-neutral-100 dark:bg-neutral-800 rounded-full" /></td>
                            <td className="py-4"><div className="w-12 h-3 bg-neutral-100 dark:bg-neutral-800 rounded-full" /></td>
                            <td className="py-4"><div className="w-12 h-3 bg-neutral-100 dark:bg-neutral-800 rounded-full" /></td>
                            <td className="py-4"><div className="w-20 h-3 bg-neutral-100 dark:bg-neutral-800 rounded-full ml-auto" /></td>
                          </tr>
                        ))
                      ) : (!overviewData.connectionStatus?.googleAds && !overviewData.connectionStatus?.facebookAds) ? (
                        <tr>
                          <td colSpan="4" className="py-12 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <p className="text-[11px] font-black text-neutral-900 dark:text-white uppercase tracking-wider">No Ad Sources Connected</p>
                              <p className="text-[10px] font-bold text-neutral-400 mb-4">Connect platforms for competitive analysis.</p>
                              <button onClick={() => navigate('/connect-accounts')} className="px-4 py-2 bg-brand-600 text-white text-[9px] font-black rounded-lg shadow-lg shadow-brand-500/10 uppercase tracking-widest transition-all">Connect Ads Account</button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        [
                          { label: 'Ad Spend', g: formatCurrency(overviewData.googleAds?.spend), f: formatCurrency(overviewData.facebookAds?.spend), w: overviewData.adWinners?.spend, gc: overviewData.connectionStatus?.googleAds, fc: overviewData.connectionStatus?.facebookAds },
                          { label: 'Clicks', g: formatNumber(overviewData.googleAds?.clicks), f: formatNumber(overviewData.facebookAds?.clicks), w: overviewData.adWinners?.clicks, gc: overviewData.connectionStatus?.googleAds, fc: overviewData.connectionStatus?.facebookAds },
                          { label: 'Conversions', g: formatNumber(overviewData.googleAds?.conversions), f: formatNumber(overviewData.facebookAds?.conversions), w: overviewData.adWinners?.conversions, gc: overviewData.connectionStatus?.googleAds, fc: overviewData.connectionStatus?.facebookAds },
                          { label: 'Cost per Click', g: formatCurrency(overviewData.googleAds?.cpc), f: formatCurrency(overviewData.facebookAds?.cpc), w: overviewData.adWinners?.cpc, gc: overviewData.connectionStatus?.googleAds, fc: overviewData.connectionStatus?.facebookAds },
                          { label: 'Click Rate', g: formatPct((overviewData.googleAds?.ctr || 0) * 100), f: formatPct((overviewData.facebookAds?.ctr || 0) * 100), w: overviewData.adWinners?.ctr, gc: overviewData.connectionStatus?.googleAds, fc: overviewData.connectionStatus?.facebookAds }
                        ].map((row, i) => (
                          <tr key={i} className="group hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-all">
                            <td className="py-2.5 px-1 font-bold text-neutral-500 dark:text-neutral-400 flex items-center gap-2 uppercase text-[9px] tracking-wide">{row.label}</td>
                            <td className={`py-2.5 px-1 font-black tabular-nums text-[10px] ${!row.gc ? 'text-neutral-300 dark:text-neutral-700 italic' : 'text-neutral-900 dark:text-white'}`}>
                              {row.gc ? row.g : 'Not connected'}
                            </td>
                            <td className={`py-2.5 px-1 font-black tabular-nums text-[10px] ${!row.fc ? 'text-neutral-300 dark:text-neutral-700 italic' : 'text-neutral-900 dark:text-white'}`}>
                              {row.fc ? row.f : 'Not connected'}
                            </td>
                            <td className="py-2.5 px-1 text-right pr-2">
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${row.w === 'Google performing better' && row.gc ? 'bg-amber-50 text-amber-600 border border-amber-100' : row.w === 'Meta performing better' && row.fc ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-neutral-50 text-neutral-400 border border-neutral-100'}`}>
                                {(row.gc && row.fc) ? (row.w || 'Analyzing...') : 'Not connected'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {(activeGoogleAdsCustomerId || activeFacebookAdAccountId) && (
                  <div className="mt-4 p-3.5 bg-brand-50/20 dark:bg-brand-500/5 border border-brand-100/50 dark:border-brand-500/20 rounded-2xl">
                    <h4 className="text-[10.5px] font-black text-neutral-900 dark:text-white mb-1.5 uppercase tracking-wider">AI Summary</h4>
                    {(loading || isSyncingHistorical) ? (
                      <div className="space-y-1.5 animate-pulse">
                        <div className="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full w-full" />
                        <div className="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full w-[80%]" />
                      </div>
                    ) : (
                      <div className="flex flex-col items-start gap-2.5">
                        <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 leading-relaxed">
                          {overviewData.intelligence?.adWinnerInsight || "Platform performance comparison shows clear efficiency leaders."}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>


              <div className={`bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 mb-6 shadow-sm ${timeseriesData.length === 0 ? 'hide-in-pdf' : ''}`}>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-5">
                  <div className="flex flex-col">
                    <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                      Traffic Trend
                    </h3>
                    <p className="text-xs font-semibold text-neutral-500 mt-1">
                      Track how your performance changes over time
                    </p>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto">
                    {!loading && (
                      <button
                        onClick={() => openWithQuestion(`Tell me more about this growth matrix insight: ${overviewData.intelligence?.growthMatrixInsight || 'Growth trends'}.
                          Detailed Context: Analyzing ${selectedMetric} trends over time. 
                          GA4 Sessions: ${formatNumber(overviewData.ga4?.sessions)} (${overviewData.ga4?.growthSessions}% growth).
                          GSC Clicks: ${formatNumber(overviewData.gsc?.clicks)} (${overviewData.gsc?.growthClicks}% growth).
                          Current Selection: Total ${selectedMetric} is ${selectedMetric === 'Spend' ? formatCurrency((overviewData.googleAds?.spend || 0) + (overviewData.facebookAds?.spend || 0)) : formatNumber(overviewData.ga4?.sessions || 0)}.`, '📈 Growth Matrix Trajectory Audit')}
                        className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                      >
                        <SparklesIcon className="w-3.5 h-3.5" />
                        ASK AI
                      </button>
                    )}
                    <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 shadow-inner">
                      {['Sessions', 'Clicks', 'Impressions', 'Spend', 'Conversions'].map((m) => (
                        <button
                          key={m}
                          onClick={() => setSelectedMetric(m)}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${selectedMetric === m
                              ? 'bg-white dark:bg-dark-card text-brand-600 shadow-md scale-100'
                              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-white/30 dark:hover:bg-neutral-800/30'
                            }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="h-[200px] w-full">
                  {(loading || isSyncingHistorical) ? (
                    <div className="w-full h-full bg-neutral-50 dark:bg-neutral-800/20 animate-pulse rounded-2xl flex items-end p-8 gap-4 overflow-hidden">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((i) => (
                        <div key={i} className="flex-1 bg-neutral-100 dark:bg-neutral-800/50 rounded-lg" style={{ height: `${20 + (i * 7) % 60}%` }} />
                      ))}
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartDataToUse}>
                        <defs>
                          <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={metricColor} stopOpacity={0.25} /><stop offset="95%" stopColor={metricColor} stopOpacity={0} /></linearGradient>
                          <linearGradient id="colorOrganic" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.25} /><stop offset="95%" stopColor="#10B981" stopOpacity={0} /></linearGradient>
                          <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} /><stop offset="95%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient>
                          <linearGradient id="colorOrganicImpr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.25} /><stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} /></linearGradient>
                          <linearGradient id="colorPaidImpr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F59E0B" stopOpacity={0.25} /><stop offset="95%" stopColor="#F59E0B" stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-neutral-800/20" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(str) => { const d = new Date(str); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }} minTickGap={30} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                        <Tooltip
                          contentStyle={{ borderRadius: '16px', border: 'none', background: '#FFFFFF', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                          labelStyle={{ fontSize: '10px', color: '#64748B', marginBottom: '4px', fontWeight: 'bold' }}
                        />
                        {selectedMetric === 'Clicks' ? (
                          <>
                            <Area type="monotone" dataKey="OrganicClicks" name="Organic Clicks" stroke="#10B981" strokeWidth={3} fill="url(#colorOrganic)" />
                            <Area type="monotone" dataKey="PaidClicks" name="Paid Clicks" stroke="#3B82F6" strokeWidth={3} fill="url(#colorPaid)" />
                          </>
                        ) : selectedMetric === 'Impressions' ? (
                          <>
                            <Area type="monotone" dataKey="OrganicImpressions" name="Organic Impressions" stroke="#8B5CF6" strokeWidth={3} fill="url(#colorOrganicImpr)" />
                            <Area type="monotone" dataKey="PaidImpressions" name="Paid Impressions" stroke="#F59E0B" strokeWidth={3} fill="url(#colorPaidImpr)" />
                          </>
                        ) : (
                          <Area type="monotone" dataKey={selectedMetric} stroke={metricColor} strokeWidth={3} fill="url(#colorMetric)" />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="mt-4 p-3.5 bg-brand-50/20 dark:bg-brand-500/5 border border-brand-100/50 dark:border-brand-500/20 rounded-2xl">
                  <h4 className="text-[10.5px] font-black text-neutral-900 dark:text-white mb-1.5 uppercase tracking-wider">AI Summary</h4>
                  {(loading || isSyncingHistorical) ? (
                    <div className="space-y-1.5 animate-pulse">
                      <div className="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full w-full" />
                      <div className="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full w-[90%]" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-start gap-2.5">
                      <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        {overviewData.intelligence?.growthMatrixInsight || "Organic and paid growth trends are being correlated to identify scaling triggers."}
                      </p>
                    </div>
                  )}
                </div>
              </div>



              <div className={`bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden mb-6 ${topPages.length === 0 ? 'hide-in-pdf' : ''}`}>
                <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                  <div className="flex flex-col">
                    <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                      Top Pages Performance
                    </h3>
                    <p className="text-xs font-semibold text-neutral-500 mt-1">
                      See how your top pages are performing
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {!loading && (
                      <button
                        onClick={() => openWithQuestion(`Analyze these top pages performance further: ${overviewData.intelligence?.topPagesInsight || 'Page performance'}.
                          Top Pages Breakdown: ${topPages.slice(0, 3).map(p => `${p.url} with ${formatNumber(p.visitors)} unique visitors and ${formatNumber(p.views)} views`).join(', ')}.`, '📝 Top Landing Pages Traffic Audit')}
                        className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                      >
                        <SparklesIcon className="w-3.5 h-3.5" />
                        ASK AI
                      </button>
                    )}
                    <button
                      onClick={downloadCSV}
                      className="text-[11px] font-black px-4 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl uppercase tracking-wider transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm shrink-0 hide-in-pdf"
                    >
                      Export CSV
                    </button>
                  </div>
                </div>
                <div className="p-2">
                  <DataTable columns={pageColumns} data={filteredPages} loading={loading || isSyncingHistorical} initialLimit={5} className="border-none" rowClassName="py-2" />
                </div>

                <div className="mx-4 mb-4 p-3.5 bg-brand-50/20 dark:bg-brand-500/5 border border-brand-100/50 dark:border-brand-500/20 rounded-2xl">
                  <h4 className="text-[11px] font-black text-neutral-900 dark:text-white mb-1.5 uppercase tracking-wider">AI Summary</h4>
                  {(loading || isSyncingHistorical) ? (
                    <div className="space-y-1.5 animate-pulse">
                      <div className="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full w-full" />
                      <div className="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full w-[80%]" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-start gap-2.5">
                      <p className="text-[12px] font-semibold text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        {overviewData.intelligence?.topPagesInsight || "Landing page performance and growth bottlenecks."}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex flex-col">
                    <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                      This Period vs Last Period
                    </h3>
                    <p className="text-xs font-semibold text-neutral-500 mt-1">
                      Compare your performance with the previous period
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {!loading && (
                      <button
                        onClick={() => openWithQuestion(`What actionable steps should I take based on these period comparisons? ${overviewData.intelligence?.comparisonInsight || 'Comparison trends'}. 
                          Current Period Metrics: Sessions ${formatNumber(overviewData.ga4?.sessions)}, GSC Clicks ${formatNumber(overviewData.gsc?.clicks)}, GAds Spend ${formatCurrency(overviewData.googleAds?.spend)}, Meta Spend ${formatCurrency(overviewData.facebookAds?.spend)}.
                          Prior Period Metrics: Sessions ${formatNumber(overviewData.ga4?.priorSessions)}, GSC Clicks ${formatNumber(overviewData.gsc?.priorClicks)}, GAds Spend ${formatCurrency(overviewData.googleAds?.priorSpend)}, Meta Spend ${formatCurrency(overviewData.facebookAds?.priorSpend)}.`, '📊 Period-over-Period Performance Comparison')}
                        className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                      >
                        <SparklesIcon className="w-3.5 h-3.5" />
                        ASK AI
                      </button>
                    )}
                    <span className="text-[11px] font-black bg-purple-50 text-purple-600 px-3 py-1 rounded-full border border-purple-100 uppercase tracking-widest flex items-center gap-1 shrink-0">
                      Compare Periods
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-neutral-100 dark:border-neutral-800 text-xs font-black uppercase text-neutral-400 text-left"><th className="pb-3 px-2">Source</th><th className="pb-3 px-2">Metric</th><th className="pb-3 px-2 text-right">THIS PERIOD</th><th className="pb-3 px-2 text-right">PRIOR PERIOD</th><th className="pb-3 px-2 text-right">CHANGE</th></tr></thead>
                    <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800/50">
                      {(loading || isSyncingHistorical) ? (
                        [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                          <tr key={i} className="animate-pulse">
                            <td className="py-5"><div className="h-2.5 w-20 bg-neutral-100 dark:bg-neutral-800 rounded-full" /></td>
                            <td className="py-5"><div className="h-2.5 w-16 bg-neutral-100 dark:bg-neutral-800 rounded-full" /></td>
                            <td className="py-5"><div className="h-2.5 w-12 bg-neutral-100 dark:bg-neutral-800 rounded-full" /></td>
                            <td className="py-5"><div className="h-2.5 w-12 bg-neutral-100 dark:bg-neutral-800 rounded-full" /></td>
                            <td className="py-5"><div className="h-5 w-14 bg-neutral-100 dark:bg-neutral-800 rounded-full" /></td>
                          </tr>
                        ))
                      ) : (
                        [
                          { logo: <Ga4Logo className="w-3.5 h-3.5" />, s: 'Google Analytics', m: 'Sessions', val: overviewData.ga4?.sessions, prior: overviewData.ga4?.priorSessions, grow: overviewData.ga4?.growthSessions, connected: !!activeGa4PropertyId },
                          { logo: <Ga4Logo className="w-3.5 h-3.5" />, s: 'Google Analytics', m: 'Users', val: overviewData.ga4?.users, prior: overviewData.ga4?.priorUsers, grow: overviewData.ga4?.growthUsers, connected: !!activeGa4PropertyId },
                          { logo: <GscLogo className="w-3.5 h-3.5" />, s: 'Search Console', m: 'Impressions', val: overviewData.gsc?.impressions, prior: overviewData.gsc?.priorImpressions, grow: overviewData.gsc?.growthImpressions, connected: !!activeGscSite },
                          { logo: <GscLogo className="w-3.5 h-3.5" />, s: 'Search Console', m: 'Clicks', val: overviewData.gsc?.clicks, prior: overviewData.gsc?.priorClicks, grow: overviewData.gsc?.growthClicks, connected: !!activeGscSite },
                          { logo: <GoogleAdsLogo className="w-3.5 h-3.5" />, s: 'Google Ads', m: 'Spend', val: overviewData.googleAds?.spend, prior: overviewData.googleAds?.priorSpend, grow: overviewData.googleAds?.growthSpend, isCurr: true, connected: !!activeGoogleAdsCustomerId },
                          { logo: <GoogleAdsLogo className="w-3.5 h-3.5" />, s: 'Google Ads', m: 'Conversions', val: overviewData.googleAds?.conversions, prior: overviewData.googleAds?.priorConversions, grow: overviewData.googleAds?.growthConversions, connected: !!activeGoogleAdsCustomerId },
                          { logo: <FacebookAdsLogo className="w-3.5 h-3.5" />, s: 'Meta Ads', m: 'Spend', val: overviewData.facebookAds?.spend, prior: overviewData.facebookAds?.priorSpend, grow: overviewData.facebookAds?.growthSpend, isCurr: true, connected: !!activeFacebookAdAccountId },
                          { logo: <FacebookAdsLogo className="w-3.5 h-3.5" />, s: 'Meta Ads', m: 'Reach', val: overviewData.facebookAds?.reach, prior: overviewData.facebookAds?.priorReach, grow: overviewData.facebookAds?.growthReach, connected: !!activeFacebookAdAccountId },
                        ].map((row, i) => {
                          const priorValue = row.prior || 0;
                          return (
                            <tr key={i} className={`hover:bg-neutral-50/50 transition-colors ${!row.connected ? 'opacity-65' : ''}`}>
                              <td className="py-3 px-2 font-black text-neutral-500 text-xs flex items-center gap-2">
                                <div className={`w-7 h-7 flex items-center justify-center bg-neutral-50 dark:bg-neutral-800 rounded-lg shrink-0 border border-neutral-100 dark:border-neutral-700/50 ${!row.connected ? 'grayscale' : ''}`}>{row.logo}</div>
                                {row.s}
                              </td>
                              <td className="py-3 px-2 font-bold text-neutral-700 dark:text-neutral-300 text-sm">{row.m}</td>
                              {row.connected ? (
                                <>
                                  <td className="py-3 px-2 font-black tabular-nums text-sm text-right">{row.isCurr ? formatCurrency(row.val) : formatNumber(row.val)}</td>
                                  <td className="py-3 px-2 font-bold text-neutral-400 tabular-nums text-sm text-right">{row.isCurr ? formatCurrency(priorValue) : formatNumber(priorValue)}</td>
                                  <td className="py-3 px-2 text-right">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-black inline-flex items-center gap-1 ${row.grow >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                      {row.grow >= 0 ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
                                      {Math.abs(row.grow || 0).toFixed(1)}%
                                    </span>
                                  </td>
                                </>
                              ) : (
                                <td colSpan="3" className="py-3 px-4 text-right text-xs italic font-bold text-neutral-400 dark:text-neutral-600 pr-6">
                                  Not connected
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 p-4 bg-brand-50/40 dark:bg-brand-500/5 border border-brand-100/30 dark:border-brand-500/10 rounded-2xl">
                  <h4 className="text-[11px] font-black text-neutral-900 dark:text-white mb-1.5 uppercase tracking-wider">AI Summary</h4>
                  {(loading || isSyncingHistorical) ? (
                    <div className="space-y-1.5 animate-pulse">
                      <div className="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full w-full" />
                      <div className="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full w-[90%]" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-start gap-2.5">
                      <p className="text-[12px] font-semibold text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        {overviewData.intelligence?.comparisonInsight || "Historical performance growth benchmarks."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
