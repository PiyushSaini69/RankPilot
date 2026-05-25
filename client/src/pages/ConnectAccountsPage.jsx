import React, { useEffect, useState, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/ui/DashboardLayout';
import Button from '../components/ui/Button';
import { getMe } from '../api/authApi';
import { listGa4, listGsc, listGoogleAds, listGoogleAccounts, listFacebookAds, listFacebookAccounts, selectAccounts, getActiveAccounts, resumeSync } from '../api/accountApi';
import { useAccountsStore } from '../store/accountsStore';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import toast from 'react-hot-toast';
import { getApiUrl } from '../api/index';
import SearchableSelect from '../components/ui/SearchableSelect';
import { 
    LockClosedIcon, 
    CheckCircleIcon, 
    ExclamationTriangleIcon, 
    ArrowPathIcon,
    ArrowLeftIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/solid';

const ConnectAccountsPage = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [resumingSource, setResumingSource] = useState(null);
    const [showNameError, setShowNameError] = useState(false);
    const [showUrlError, setShowUrlError] = useState(false);
    const websiteNameRef = useRef(null);
    const websiteUrlRef = useRef(null);

    const { activeSiteId, setAccounts } = useAccountsStore();
    const [userConnectedSources, setUserConnectedSources] = useState([]);
    const { token } = useAuthStore();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(window.location.search);
    const isNew = queryParams.get('new') === 'true';
    const isViewOnly = queryParams.get('view') === 'true';

    const [googleAccounts, setGoogleAccounts] = useState([]);
    const [facebookAccounts, setFacebookAccounts] = useState([]);
    
    // Data lists
    const [ga4Props, setGa4Props] = useState([]);
    const [gscSites, setGscSites] = useState([]);
    const [gAdsAccounts, setGAdsAccounts] = useState([]);
    const [fbAdAccounts, setFbAdAccounts] = useState([]);

    // Selection Mappings (Token IDs)
    const [ga4TokenId, setGa4TokenId] = useState('');
    const [gscTokenId, setGscTokenId] = useState('');
    const [googleAdsTokenId, setGoogleAdsTokenId] = useState('');
    const [facebookTokenId, setFacebookTokenId] = useState('');

    // Selections (Property/Site IDs)
    const [selectedGa4, setSelectedGa4] = useState('');
    const [selectedGsc, setSelectedGsc] = useState('');
    const [selectedGAds, setSelectedGAds] = useState('');
    const [selectedFbAds, setSelectedFbAds] = useState('');
    const [siteName, setSiteName] = useState('');
    const [siteUrl, setSiteUrl] = useState('');
    const [initialValues, setInitialValues] = useState({});

    // Modification state (to unlock fields in 'view' mode)
    const [modifyingGa4, setModifyingGa4] = useState(false);
    const [modifyingGsc, setModifyingGsc] = useState(false);
    const [modifyingGAds, setModifyingGAds] = useState(false);
    const [modifyingFbAds, setModifyingFbAds] = useState(false);

    // Connection Status Helpers
    const isGa4Connected = !!initialValues.ga4 && !!initialValues.ga4TokenId;
    const isGscConnected = !!initialValues.gsc && !!initialValues.gscTokenId;
    const isGAdsConnected = !!initialValues.gAds && !!initialValues.googleAdsTokenId;
    const isFbAdsConnected = !!initialValues.fbAds && !!initialValues.facebookTokenId;

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const me = await getMe();
                setUserConnectedSources(me.data.connectedSources || []);

                if (me.data.connectedSources.includes('google')) {
                    const accs = await listGoogleAccounts();
                    setGoogleAccounts(accs.data || []);
                }

                if (!isNew) {
                    const active = await getActiveAccounts(activeSiteId);
                    if (active.data && active.data._id) {
                        setAccounts({ activeSiteId: active.data._id });

                        const vals = {
                            siteId: active.data._id,
                            siteName: active.data.siteName || '',
                            siteUrl: active.data.siteUrl || '',
                            ga4: active.data.ga4PropertyId || '',
                            ga4TokenId: active.data.ga4TokenId?._id || active.data.ga4TokenId || '',
                            ga4SyncStatus: active.data.ga4SyncStatus || 'idle',
                            ga4HistoricalComplete: active.data.ga4HistoricalComplete,
                            gsc: active.data.gscSiteUrl || '',
                            gscTokenId: active.data.gscTokenId?._id || active.data.gscTokenId || '',
                            gscSyncStatus: active.data.gscSyncStatus || 'idle',
                            gscHistoricalComplete: active.data.gscHistoricalComplete,
                            gAds: active.data.googleAdsCustomerId || '',
                            googleAdsTokenId: active.data.googleAdsTokenId?._id || active.data.googleAdsTokenId || '',
                            googleAdsSyncStatus: active.data.googleAdsSyncStatus || 'idle',
                            googleAdsHistoricalComplete: active.data.googleAdsHistoricalComplete,
                            fbAds: active.data.facebookAdAccountId || '',
                            facebookTokenId: active.data.facebookTokenId?._id || active.data.facebookTokenId || '',
                            facebookAdsSyncStatus: active.data.facebookAdsSyncStatus || 'idle',
                            facebookAdsHistoricalComplete: active.data.facebookAdsHistoricalComplete,
                            ga4LastSyncedAt: active.data.ga4LastSyncedAt,
                            gscLastSyncedAt: active.data.gscLastSyncedAt,
                            googleAdsLastSyncedAt: active.data.googleAdsLastSyncedAt,
                            facebookAdsLastSyncedAt: active.data.facebookAdsLastSyncedAt
                        };
                        setInitialValues(vals);
                        if (vals.siteName) setSiteName(vals.siteName);
                        if (vals.siteUrl) setSiteUrl(vals.siteUrl);
                        if (vals.ga4) setSelectedGa4(vals.ga4);
                        if (vals.ga4TokenId) setGa4TokenId(vals.ga4TokenId);
                        if (vals.gsc) setSelectedGsc(vals.gsc);
                        if (vals.gscTokenId) setGscTokenId(vals.gscTokenId);
                        if (vals.gAds) setSelectedGAds(vals.gAds);
                        if (vals.googleAdsTokenId) setGoogleAdsTokenId(vals.googleAdsTokenId);
                        if (vals.fbAds) setSelectedFbAds(vals.fbAds);
                        if (vals.facebookTokenId) setFacebookTokenId(vals.facebookTokenId);
                    } else {
                        if (activeSiteId) setAccounts({ activeSiteId: null });
                        setInitialValues({});
                        setSiteName('');
                        setSiteUrl('');
                    }
                } else {
                    setInitialValues({});
                    setSiteName('');
                    setSiteUrl('');
                    setSelectedGa4('');
                    setSelectedGsc('');
                    setSelectedGAds('');
                    setSelectedFbAds('');
                    setGa4TokenId('');
                    setGscTokenId('');
                    setGoogleAdsTokenId('');
                    setFacebookTokenId('');
                }

                if (me.data.connectedSources.includes('facebook')) {
                    const faccs = await listFacebookAccounts();
                    setFacebookAccounts(faccs.data || []);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [activeSiteId, isNew, setAccounts]);

    useEffect(() => {
        if (ga4TokenId) {
            listGa4(ga4TokenId).then(res => setGa4Props(res.data || [])).catch((err) => {
                if (err.response?.data?.message === 'GOOGLE_AUTH_EXPIRED') {
                    toast.error('Google session expired. Please reconnect your account.');
                }
                setGa4Props([]);
            });
        } else {
            setGa4Props([]);
        }
    }, [ga4TokenId]);

    useEffect(() => {
        if (gscTokenId) {
            listGsc(gscTokenId).then(res => setGscSites(res.data || [])).catch((err) => {
                if (err.response?.data?.message === 'GOOGLE_AUTH_EXPIRED') {
                    toast.error('Google session expired. Please reconnect your account.');
                }
                setGscSites([]);
            });
        } else {
            setGscSites([]);
        }
    }, [gscTokenId]);

    useEffect(() => {
        if (googleAdsTokenId) {
            listGoogleAds(googleAdsTokenId).then(res => setGAdsAccounts(res.data || [])).catch((err) => {
                if (err.response?.data?.message === 'GOOGLE_AUTH_EXPIRED') {
                    toast.error('Google session expired. Please reconnect your account.');
                }
                setGAdsAccounts([]);
            });
        } else {
            setGAdsAccounts([]);
        }
    }, [googleAdsTokenId]);

    useEffect(() => {
        if (facebookTokenId) {
            listFacebookAds(facebookTokenId).then(res => setFbAdAccounts(res.data || [])).catch(() => setFbAdAccounts([]));
        } else {
            setFbAdAccounts([]);
        }
    }, [facebookTokenId]);

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        
        if (!siteName.trim()) {
            setShowNameError(true);
            toast.error('Please enter a website name');
            websiteNameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            websiteNameRef.current?.focus();
            return;
        }

        if (!siteUrl.trim()) {
            setShowUrlError(true);
            toast.error('Please enter a website URL');
            websiteUrlRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            websiteUrlRef.current?.focus();
            return;
        }

        setSaving(true);
        try {
            const selectedGa4Obj = ga4Props.find(p => p.id === selectedGa4);
            const selectedGAdsObj = gAdsAccounts.find(g => g === selectedGAds);
            const selectedFbAdsObj = fbAdAccounts.find(f => f.id === selectedFbAds);

            const data = {
                siteId: (isNew || !activeSiteId) ? undefined : activeSiteId,
                siteName: siteName,
                siteUrl: siteUrl,
                ga4PropertyId: selectedGa4,
                ga4PropertyName: selectedGa4Obj?.name || '',
                ga4AccountId: selectedGa4Obj?.accountId || '',
                ga4TokenId: ga4TokenId,
                gscSiteUrl: selectedGsc,
                gscTokenId: gscTokenId,
                googleAdsCustomerId: selectedGAds,
                googleAdsAccountName: selectedGAdsObj || '',
                googleAdsTokenId: googleAdsTokenId,
                facebookAdAccountId: selectedFbAds,
                facebookAdAccountName: selectedFbAdsObj?.name || '',
                facebookTokenId: facebookTokenId
            };
            
            const res = await selectAccounts(data);
            const updatedAccount = res.data.accounts;

            setAccounts({
                activeSiteId: updatedAccount._id,
                gsc: {
                    gscSiteUrl: updatedAccount.gscSiteUrl || null,
                    gscPermission: updatedAccount.gscPermission || null,
                    gscHistoricalComplete: updatedAccount.gscHistoricalComplete || false,
                    gscSyncStatus: updatedAccount.gscSyncStatus || 'idle',
                    gscSyncProgress: updatedAccount.gscSyncProgress || 0,
                    gscLastSyncedAt: updatedAccount.gscLastSyncedAt || null,
                    gscHistoricalChunkIndex: updatedAccount.gscHistoricalChunkIndex || 0
                },
                ga4: {
                    ga4PropertyId: updatedAccount.ga4PropertyId || null,
                    ga4PropertyName: updatedAccount.ga4PropertyName || null,
                    ga4AccountId: updatedAccount.ga4AccountId || null,
                    ga4HistoricalComplete: updatedAccount.ga4HistoricalComplete || false,
                    ga4SyncStatus: updatedAccount.ga4SyncStatus || 'idle',
                    ga4SyncProgress: updatedAccount.ga4SyncProgress || 0,
                    ga4LastSyncedAt: updatedAccount.ga4LastSyncedAt || null,
                    ga4HistoricalChunkIndex: updatedAccount.ga4HistoricalChunkIndex || 0
                },
                googleAds: {
                    googleAdsCustomerId: updatedAccount.googleAdsCustomerId || null,
                    googleAdsAccountName: updatedAccount.googleAdsAccountName || null,
                    googleAdsCurrencyCode: updatedAccount.googleAdsCurrencyCode || null,
                    googleAdsHistoricalComplete: updatedAccount.googleAdsHistoricalComplete || false,
                    googleAdsSyncStatus: updatedAccount.googleAdsSyncStatus || 'idle',
                    googleAdsSyncProgress: updatedAccount.googleAdsSyncProgress || 0,
                    googleAdsLastSyncedAt: updatedAccount.googleAdsLastSyncedAt || null,
                    googleAdsHistoricalChunkIndex: updatedAccount.googleAdsHistoricalChunkIndex || 0
                },
                facebook: {
                    facebookAdAccountId: updatedAccount.facebookAdAccountId || null,
                    facebookAdAccountName: updatedAccount.facebookAdAccountName || null,
                    facebookAdCurrencyCode: updatedAccount.facebookAdCurrencyCode || null,
                    facebookAdsHistoricalComplete: updatedAccount.facebookAdsHistoricalComplete || false,
                    facebookAdsSyncStatus: updatedAccount.facebookAdsSyncStatus || 'idle',
                    facebookAdsSyncProgress: updatedAccount.facebookAdsSyncProgress || 0,
                    facebookAdsLastSyncedAt: updatedAccount.facebookAdsLastSyncedAt || null,
                    facebookAdsHistoricalChunkIndex: updatedAccount.facebookAdsHistoricalChunkIndex || 0
                }
            });

            toast.success(isNew ? 'New website added!' : 'Integrations updated!');
            navigate('/dashboard');
        } catch (err) {
            console.error('Save Accounts Error:', err);
            const message = err.response?.data?.message || 'Failed to link accounts';
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const handleResumeSync = async (source) => {
        setResumingSource(source);
        try {
            await resumeSync({ siteId: activeSiteId, source });
            toast.success(`Sync for ${source.toUpperCase().replace('-', ' ')} resumed!`);
            
            setInitialValues(prev => ({
                ...prev,
                [`${source.replace('-', 'Ads').replace('googleAds', 'googleAds').replace('facebookAds', 'facebookAds')}SyncStatus`]: 'pending'
            }));
        } catch (error) {
            toast.error('Failed to resume sync');
        } finally {
            setResumingSource(null);
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-4 pb-8 px-6 pt-2">
                {/* 1. Page Header */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-widest">
                        <button 
                            onClick={() => navigate('/dashboard/sites')} 
                            className="flex items-center gap-1 text-brand-600 hover:text-brand-700 transition-colors font-black"
                        >
                            <ArrowLeftIcon className="w-3 h-3" strokeWidth={3} />
                            My Sites
                        </button>
                        <span className="text-neutral-300">→</span>
                        <span className="text-neutral-900 dark:text-white">Connect</span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">Connect Your Marketing Platforms</h1>
                        <p className="text-neutral-500 dark:text-neutral-400 font-bold mt-1">Link your analytics and advertising accounts to track everything in one place</p>
                    </div>
                </div>

                {/* 2. Loading Skeleton */}
                {loading ? (
                    <div className="space-y-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-48 bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-800 rounded-2xl animate-pulse shadow-sm" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* 3. Website Details Card */}
                        <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Website Name */}
                                <div className="space-y-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <label className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider">Website Name <span className="text-red-500">*</span></label>
                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 uppercase tracking-wider">Required</span>
                                        </div>
                                        <p className="text-xs text-neutral-400 dark:text-neutral-500 font-bold">Give this website a name so you can identify it easily</p>
                                    </div>
                                    <div className="relative">
                                        <input
                                            ref={websiteNameRef}
                                            type="text"
                                            value={siteName}
                                            onChange={e => {
                                                setSiteName(e.target.value);
                                                if (e.target.value.trim()) setShowNameError(false);
                                            }}
                                            required
                                            placeholder="e.g. My Portfolio, Client XYZ"
                                            className={`w-full text-base font-bold rounded-xl border bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:border-transparent py-3 px-4 outline-none transition-all placeholder:text-neutral-300 dark:placeholder:text-neutral-600 ${
                                                showNameError 
                                                    ? 'border-red-500 focus:ring-red-500 dark:border-red-500/50' 
                                                    : 'border-neutral-200 dark:border-neutral-700 focus:ring-brand-500'
                                            }`}
                                        />
                                        {showNameError && (
                                            <p className="text-xs text-red-500 font-bold mt-1.5 flex items-center gap-1.5 pl-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                                Website name is required
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Website URL */}
                                <div className="space-y-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <label className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider">Website URL <span className="text-red-500">*</span></label>
                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 uppercase tracking-wider">Required</span>
                                        </div>
                                        <p className="text-xs text-neutral-400 dark:text-neutral-500 font-bold">Enter your website's main domain or full URL</p>
                                    </div>
                                    <div className="relative">
                                        <input
                                            ref={websiteUrlRef}
                                            type="text"
                                            value={siteUrl}
                                            onChange={e => {
                                                setSiteUrl(e.target.value);
                                                if (e.target.value.trim()) setShowUrlError(false);
                                            }}
                                            required
                                            placeholder="e.g. https://myportfolio.com"
                                            className={`w-full text-base font-bold rounded-xl border bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:border-transparent py-3 px-4 outline-none transition-all placeholder:text-neutral-300 dark:placeholder:text-neutral-600 ${
                                                showUrlError 
                                                    ? 'border-red-500 focus:ring-red-500 dark:border-red-500/50' 
                                                    : 'border-neutral-200 dark:border-neutral-700 focus:ring-brand-500'
                                            }`}
                                        />
                                        {showUrlError && (
                                            <p className="text-xs text-red-500 font-bold mt-1.5 flex items-center gap-1.5 pl-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                                Website URL is required
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. Google Integration Card */}
                        <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm overflow-hidden border-t-4 border-t-[#4285F4]">
                            {!userConnectedSources.includes('google') ? (
                                <div className="p-8 flex flex-col items-center text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 flex items-center justify-center p-3.5 shadow-sm mb-6">
                                        <svg viewBox="0 0 24 24" className="w-full h-full">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-black text-neutral-900 dark:text-white">Google Analytics & Search Console</h3>
                                    <p className="text-neutral-500 dark:text-neutral-400 font-bold mt-2 max-w-sm mb-8">Connect once to access GA4, Search Console, and Google Ads data automatically.</p>
                                    <Button
                                        onClick={() => window.location.href = getApiUrl(`/auth/google?token=${encodeURIComponent(token)}`)}
                                        className="px-10 py-4 text-base shadow-xl shadow-brand-600/20"
                                    >
                                        Connect Google Account
                                    </Button>
                                    <p className="mt-6 flex items-center gap-2 text-xs font-bold text-neutral-400">
                                        <LockClosedIcon className="w-4 h-4" />
                                        Secure OAuth — we never see your password
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                                    <div className="p-6 bg-neutral-50/50 dark:bg-dark-surface/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 flex items-center justify-center p-2.5 shadow-sm">
                                                <svg viewBox="0 0 24 24" className="w-full h-full">
                                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                                </svg>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-black text-neutral-900 dark:text-white">Google Account Linked</h3>
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50">
                                                        <CheckCircleIcon className="w-3 h-3" /> CONNECTED
                                                    </span>
                                                </div>
                                                <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500">Managing multiple Google properties</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <button 
                                                onClick={() => window.location.href = getApiUrl(`/auth/google?token=${encodeURIComponent(token)}`)}
                                                className="text-xs font-black text-brand-600 hover:text-brand-700 border border-brand-200 dark:border-brand-500/30 px-4 py-2.5 rounded-xl bg-white dark:bg-dark-card transition-all shadow-sm active:scale-95 whitespace-nowrap"
                                            >
                                                + Link Another Account
                                            </button>
                                            <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 text-right mt-0.5">
                                                Adds another account to the selection lists below
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-6 space-y-8">
                                        {/* GA4 */}
                                        <div className="space-y-4">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h4 className="text-base font-black text-neutral-900 dark:text-white">Google Analytics 4</h4>
                                                    <p className="text-xs text-neutral-400 dark:text-neutral-500 font-bold">Track website visitors and behavior</p>
                                                </div>
                                                {isGa4Connected && !modifyingGa4 && (
                                                    <div className="flex items-center gap-2">
                                                        {(initialValues.ga4SyncStatus === 'error' || !initialValues.ga4HistoricalComplete) && (
                                                            <button 
                                                                onClick={() => handleResumeSync('ga4')}
                                                                disabled={resumingSource === 'ga4' || initialValues.ga4SyncStatus === 'syncing'}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all"
                                                            >
                                                                <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                                                                {initialValues.ga4SyncStatus === 'syncing' ? 'Syncing...' : 'Resume Sync'}
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => { setModifyingGa4(true); setGa4TokenId(''); setSelectedGa4(''); }}
                                                            className="text-[10px] font-black uppercase text-brand-600 bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition-all"
                                                        >
                                                            Change
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.15em] ml-1">Step 1: Select Google Account</label>
                                                    <SearchableSelect
                                                        value={ga4TokenId}
                                                        onChange={e => setGa4TokenId(e.target.value)}
                                                        disabled={isGa4Connected && !modifyingGa4}
                                                        options={googleAccounts.map(acc => ({ label: acc.email, value: acc._id }))}
                                                        placeholder="Choose an account..."
                                                        className={isGa4Connected && !modifyingGa4 ? 'opacity-50' : ''}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.15em] ml-1">Step 2: Select GA4 Property</label>
                                                    <SearchableSelect
                                                        value={selectedGa4}
                                                        onChange={e => setSelectedGa4(e.target.value)}
                                                        disabled={!ga4TokenId || (isGa4Connected && !modifyingGa4)}
                                                        options={ga4Props.map(p => ({ label: p.name, value: p.id }))}
                                                        placeholder="Select a property..."
                                                        className={(!ga4TokenId || (isGa4Connected && !modifyingGa4)) ? 'opacity-50' : ''}
                                                    />
                                                </div>
                                            </div>
                                            {isGa4Connected && initialValues.ga4LastSyncedAt && !modifyingGa4 && (
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 px-1">
                                                    <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" />
                                                    Synced {formatDistanceToNow(new Date(initialValues.ga4LastSyncedAt), { addSuffix: true })}
                                                </div>
                                            )}
                                        </div>

                                        {/* GSC */}
                                        <div className="space-y-4 pt-4 border-t border-neutral-100 dark:border-neutral-700">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h4 className="text-base font-black text-neutral-900 dark:text-white">Google Search Console</h4>
                                                    <p className="text-xs text-neutral-400 dark:text-neutral-500 font-bold">Track keywords and search rankings</p>
                                                </div>
                                                {isGscConnected && !modifyingGsc && (
                                                    <div className="flex items-center gap-2">
                                                        {(initialValues.gscSyncStatus === 'error' || !initialValues.gscHistoricalComplete) && (
                                                            <button 
                                                                onClick={() => handleResumeSync('gsc')}
                                                                disabled={resumingSource === 'gsc' || initialValues.gscSyncStatus === 'syncing'}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all"
                                                            >
                                                                <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                                                                {initialValues.gscSyncStatus === 'syncing' ? 'Syncing...' : 'Resume Sync'}
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => { setModifyingGsc(true); setGscTokenId(''); setSelectedGsc(''); }}
                                                            className="text-[10px] font-black uppercase text-brand-600 bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition-all"
                                                        >
                                                            Change
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.15em] ml-1">Step 1: Select Google Account</label>
                                                    <SearchableSelect
                                                        value={gscTokenId}
                                                        onChange={e => setGscTokenId(e.target.value)}
                                                        disabled={isGscConnected && !modifyingGsc}
                                                        options={googleAccounts.map(acc => ({ label: acc.email, value: acc._id }))}
                                                        placeholder="Choose an account..."
                                                        className={isGscConnected && !modifyingGsc ? 'opacity-50' : ''}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.15em] ml-1">Step 2: Select Website</label>
                                                    <SearchableSelect
                                                        value={selectedGsc}
                                                        onChange={e => setSelectedGsc(e.target.value)}
                                                        disabled={!gscTokenId || (isGscConnected && !modifyingGsc)}
                                                        options={gscSites.map(s => ({ label: s.siteUrl, value: s.siteUrl }))}
                                                        placeholder="Select a site..."
                                                        className={(!gscTokenId || (isGscConnected && !modifyingGsc)) ? 'opacity-50' : ''}
                                                    />
                                                </div>
                                            </div>
                                            {isGscConnected && initialValues.gscLastSyncedAt && !modifyingGsc && (
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 px-1">
                                                    <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" />
                                                    Synced {formatDistanceToNow(new Date(initialValues.gscLastSyncedAt), { addSuffix: true })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Google Ads */}
                                        <div className="space-y-4 pt-4 border-t border-neutral-100 dark:border-neutral-700">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h4 className="text-base font-black text-neutral-900 dark:text-white">Google Ads</h4>
                                                    <p className="text-xs text-neutral-400 dark:text-neutral-500 font-bold">Track ad spend and conversions</p>
                                                </div>
                                                {isGAdsConnected && !modifyingGAds && (
                                                    <div className="flex items-center gap-2">
                                                        {(initialValues.googleAdsSyncStatus === 'error' || !initialValues.googleAdsHistoricalComplete) && (
                                                            <button 
                                                                onClick={() => handleResumeSync('google-ads')}
                                                                disabled={resumingSource === 'google-ads' || initialValues.googleAdsSyncStatus === 'syncing'}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all"
                                                            >
                                                                <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                                                                {initialValues.googleAdsSyncStatus === 'syncing' ? 'Syncing...' : 'Resume Sync'}
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => { setModifyingGAds(true); setGoogleAdsTokenId(''); setSelectedGAds(''); }}
                                                            className="text-[10px] font-black uppercase text-brand-600 bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition-all"
                                                        >
                                                            Change
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.15em] ml-1">Step 1: Select Google Account</label>
                                                    <SearchableSelect
                                                        value={googleAdsTokenId}
                                                        onChange={e => setGoogleAdsTokenId(e.target.value)}
                                                        disabled={isGAdsConnected && !modifyingGAds}
                                                        options={googleAccounts.map(acc => ({ label: acc.email, value: acc._id }))}
                                                        placeholder="Choose an account..."
                                                        className={isGAdsConnected && !modifyingGAds ? 'opacity-50' : ''}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.15em] ml-1">Step 2: Select Customer ID</label>
                                                    <SearchableSelect
                                                        value={selectedGAds}
                                                        onChange={e => setSelectedGAds(e.target.value)}
                                                        disabled={!googleAdsTokenId || (isGAdsConnected && !modifyingGAds)}
                                                        options={gAdsAccounts.map(g => ({ label: g, value: g }))}
                                                        placeholder="Choose an Ads account..."
                                                        className={(!googleAdsTokenId || (isGAdsConnected && !modifyingGAds)) ? 'opacity-50' : ''}
                                                    />
                                                </div>
                                            </div>
                                            {isGAdsConnected && initialValues.googleAdsLastSyncedAt && !modifyingGAds && (
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 px-1">
                                                    <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" />
                                                    Synced {formatDistanceToNow(new Date(initialValues.googleAdsLastSyncedAt), { addSuffix: true })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 5. Facebook Ads Card */}
                        <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm overflow-hidden border-t-4 border-t-[#1877F2]">
                            {!userConnectedSources.includes('facebook') ? (
                                <div className="p-8 flex flex-col items-center text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-[#1877F2] flex items-center justify-center p-3.5 shadow-sm mb-6">
                                        <svg fill="white" viewBox="0 0 24 24" className="w-full h-full">
                                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-black text-neutral-900 dark:text-white">Facebook Ads</h3>
                                    <p className="text-neutral-500 dark:text-neutral-400 font-bold mt-2 max-w-sm mb-8">Connect to track your Facebook ad performance automatically.</p>
                                    <Button
                                        onClick={() => window.location.href = getApiUrl(`/auth/facebook?token=${encodeURIComponent(token)}`)}
                                        className="px-10 py-4 text-base shadow-xl shadow-[#1877F2]/20 bg-[#1877F2] hover:bg-[#1565C0]"
                                    >
                                        Connect Facebook Account
                                    </Button>
                                    <p className="mt-6 flex items-center gap-2 text-xs font-bold text-neutral-400">
                                        <LockClosedIcon className="w-4 h-4" />
                                        Secure OAuth — we never see your password
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                                    <div className="p-6 bg-neutral-50/50 dark:bg-dark-surface/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-[#1877F2] flex items-center justify-center p-2.5 shadow-sm">
                                                <svg fill="white" viewBox="0 0 24 24" className="w-full h-full">
                                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                                </svg>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-black text-neutral-900 dark:text-white">Facebook Account Linked</h3>
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50">
                                                        <CheckCircleIcon className="w-3 h-3" /> CONNECTED
                                                    </span>
                                                </div>
                                                <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500">Syncing Facebook Ad Performance</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <button 
                                                onClick={() => window.location.href = getApiUrl(`/auth/facebook?token=${encodeURIComponent(token)}`)}
                                                className="text-xs font-black text-[#1877F2] hover:text-[#1565C0] border border-blue-200 dark:border-blue-500/30 px-4 py-2.5 rounded-xl bg-white dark:bg-dark-card transition-all shadow-sm active:scale-95 whitespace-nowrap"
                                            >
                                                + Link Another Profile
                                            </button>
                                            <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 text-right mt-0.5">
                                                Adds another profile to the selection lists below
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-6 space-y-6">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="text-base font-black text-neutral-900 dark:text-white">Ad Account Configuration</h4>
                                                <p className="text-xs text-neutral-400 dark:text-neutral-500 font-bold">Select the target ad account for this website</p>
                                            </div>
                                            {isFbAdsConnected && !modifyingFbAds && (
                                                <div className="flex items-center gap-2">
                                                    {(initialValues.facebookAdsSyncStatus === 'error' || !initialValues.facebookAdsHistoricalComplete) && (
                                                        <button 
                                                            onClick={() => handleResumeSync('facebook-ads')}
                                                            disabled={resumingSource === 'facebook-ads' || initialValues.facebookAdsSyncStatus === 'syncing'}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all"
                                                        >
                                                            <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                                                            {initialValues.facebookAdsSyncStatus === 'syncing' ? 'Syncing...' : 'Resume Sync'}
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => { setModifyingFbAds(true); setFacebookTokenId(''); setSelectedFbAds(''); }}
                                                        className="text-[10px] font-black uppercase text-[#1877F2] bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-all"
                                                    >
                                                        Change
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.15em] ml-1">Step 1: Select Profile</label>
                                                <SearchableSelect
                                                    value={facebookTokenId}
                                                    onChange={e => setFacebookTokenId(e.target.value)}
                                                    disabled={isFbAdsConnected && !modifyingFbAds}
                                                    options={facebookAccounts.map(f => ({ label: f.name, value: f._id }))}
                                                    placeholder="Choose a profile..."
                                                    className={isFbAdsConnected && !modifyingFbAds ? 'opacity-50' : ''}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.15em] ml-1">Step 2: Select Ad Account</label>
                                                <SearchableSelect
                                                    value={selectedFbAds}
                                                    onChange={e => setSelectedFbAds(e.target.value)}
                                                    disabled={!facebookTokenId || (isFbAdsConnected && !modifyingFbAds)}
                                                    options={fbAdAccounts.map(f => ({ label: `${f.name} (${f.id})`, value: f.id }))}
                                                    placeholder="Select an ad account..."
                                                    className={(!facebookTokenId || (isFbAdsConnected && !modifyingFbAds)) ? 'opacity-50' : ''}
                                                />
                                            </div>
                                        </div>
                                        {isFbAdsConnected && initialValues.facebookAdsLastSyncedAt && !modifyingFbAds && (
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 px-1">
                                                <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" />
                                                Synced {formatDistanceToNow(new Date(initialValues.facebookAdsLastSyncedAt), { addSuffix: true })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 6. Save Actions Footer */}
                        <div className="sticky bottom-4 bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl z-50 shadow-[0_8px_30px_rgb(0,0,0,0.08)] mt-8">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pl-6 pr-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                                    <p className="text-xs font-bold text-neutral-500">
                                        {isViewOnly ? '💡 Only disconnected marketing platforms can be updated' : isNew ? '💡 You can always add more connections later' : '💡 Changes will sync automatically'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <Button
                                        variant="secondary"
                                        onClick={() => navigate('/dashboard/sites')}
                                        className="flex-1 sm:flex-none px-6 py-3 font-bold border-neutral-200 dark:border-neutral-700 dark:text-white"
                                    >
                                        Go Back
                                    </Button>
                                    <Button
                                        loading={saving}
                                        onClick={handleSave}
                                        className="flex-1 sm:flex-none px-10 py-3 font-black shadow-xl shadow-brand-600/20"
                                    >
                                        {isViewOnly ? 'Update Connections' : isNew ? 'Save & Go to Dashboard' : 'Save Changes'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default ConnectAccountsPage;
