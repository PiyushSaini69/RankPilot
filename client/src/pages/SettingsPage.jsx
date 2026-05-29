import React from 'react';
import DashboardLayout from '../components/ui/DashboardLayout';
import Button from '../components/ui/Button';
import { useAuthStore } from '../store/authStore';
import { useAccountsStore } from '../store/accountsStore';
import { disconnectFacebook, disconnectGoogle, listGoogleAccounts, listFacebookAccounts } from '../api/accountApi';
import { getMe } from '../api/authApi';
import api, { getApiUrl } from '../api';
import toast from 'react-hot-toast';

const SettingsPage = () => {
    const { user, clearAuth, token, setAuth } = useAuthStore();
    const { setAccounts } = useAccountsStore();

    const connectGoogle = () => {
        sessionStorage.setItem('oauth_redirect_origin', window.location.pathname);
        window.location.href = getApiUrl(`/auth/google?token=${encodeURIComponent(token)}`);
    };

    const connectFacebook = () => {
        sessionStorage.setItem('oauth_redirect_origin', window.location.pathname);
        window.location.href = getApiUrl(`/auth/facebook?token=${encodeURIComponent(token)}`);
    };

    const [userConnectedSources, setUserConnectedSources] = React.useState([]);
    const [googleAccounts, setGoogleAccounts] = React.useState([]);
    const [facebookAccounts, setFacebookAccounts] = React.useState([]);
    const [loadingAccounts, setLoadingAccounts] = React.useState(false);

    React.useEffect(() => {
        const fetchUserSources = async () => {
            try {
                const res = await getMe();
                setUserConnectedSources(res.data.connectedSources || []);
            } catch (err) {
                console.error('Error fetching user connected sources:', err);
            }
        };
        fetchUserSources();
    }, []);

    React.useEffect(() => {
        if (userConnectedSources.includes('google')) {
            loadGoogleAccounts();
        }
        if (userConnectedSources.includes('facebook')) {
            loadFacebookAccounts();
        }
    }, [userConnectedSources]);

    const loadGoogleAccounts = async () => {
        setLoadingAccounts(true);
        try {
            const res = await listGoogleAccounts();
            setGoogleAccounts(res.data || []);
        } catch (err) { console.error(err); }
        finally { setLoadingAccounts(false); }
    };

    const loadFacebookAccounts = async () => {
        try {
            const res = await listFacebookAccounts();
            setFacebookAccounts(res.data || []);
        } catch (err) { console.error(err); }
    };

    const handleGoogleDisconnect = async (tokenId = null) => {
        const msg = tokenId 
            ? "Disconnect this specific Google account? Services using this account will stop syncing."
            : "Disconnect ALL Google data? All reports & API links will be lost.";

        if (!window.confirm(msg)) return;
        try {
            const res = await disconnectGoogle(tokenId);
            
            // Refresh user auth state with updated connectedSources
            try {
                const meRes = await getMe();
                if (meRes.data && meRes.data.user) {
                    setAuth(token, meRes.data.user);
                }
            } catch (err) {
                console.error('Failed to sync auth user state:', err);
            }
            
            if (tokenId) {
                // Remove from local state
                const remaining = googleAccounts.filter(a => a._id !== tokenId);
                setGoogleAccounts(remaining);
                if (remaining.length === 0) {
                    setUserConnectedSources(prev => prev.filter(s => s !== 'google'));
                }
                toast.success("Account disconnected");
            } else {
                setUserConnectedSources(prev => prev.filter(s => !['ga4', 'gsc', 'google-ads', 'google'].includes(s)));
                setAccounts({
                    gsc: {
                        gscSiteUrl: null,
                        gscPermission: null,
                        gscHistoricalComplete: false,
                        gscSyncStatus: 'idle',
                        gscSyncProgress: 0,
                        gscLastSyncedAt: null,
                        gscHistoricalChunkIndex: 0
                    }
                });
                if (res.data?.oauthOnly) {
                    toast.success("Google disconnected. Since you used Google to sign in, we've sent a password-setup email to your inbox so you can still log in.", { duration: 8000 });
                } else {
                    toast.success("Google disconnected");
                }
            }
        } catch { toast.error("Error disconnecting Google"); }
    };

    const handleFacebookDisconnect = async (tokenId = null) => {
        const msg = tokenId 
            ? "Disconnect this Facebook profile? All linked ad accounts will stop syncing."
            : "Disconnect ALL Facebook data?";
            
        if (!window.confirm(msg)) return;
        try {
            await disconnectFacebook(tokenId);
            
            // Refresh user auth state with updated connectedSources
            try {
                const meRes = await getMe();
                if (meRes.data && meRes.data.user) {
                    setAuth(token, meRes.data.user);
                }
            } catch (err) {
                console.error('Failed to sync auth user state:', err);
            }
            
            if (tokenId) {
                const remaining = facebookAccounts.filter(a => a._id !== tokenId);
                setFacebookAccounts(remaining);
                if (remaining.length === 0) {
                    setUserConnectedSources(prev => prev.filter(s => s !== 'facebook'));
                }
                toast.success("Profile disconnected");
            } else {
                setUserConnectedSources(prev => prev.filter(s => !['facebook', 'facebook-ads'].includes(s)));
                toast.success("Facebook disconnected");
            }
        } catch { toast.error("Error disconnecting Facebook"); }
    };

    const handleDeleteAccount = async () => {
        const conf = window.prompt(`To verify deletion, type exactly: ${user.email}`);
        if (conf === user.email) {
            try {
                await api.delete('/auth/me');
                clearAuth();
                window.location.href = '/';
            } catch { toast.error("Error deleting account."); }
        } else {
            toast.error("Confirmation string didn't match.");
        }
    };

    return (
        <DashboardLayout title="Settings">
            <div className="max-w-6xl mx-auto space-y-10 pb-6">
                
                {/* PAGE HEADER */}
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight text-neutral-900 dark:text-white">Settings</h1>
                    <p className="text-neutral-500 dark:text-neutral-400 font-medium">Manage your account, connected tools, and preferences</p>
                </div>

                {/* SECTION 1 — YOUR PROFILE */}
                <section className="space-y-4">
                    <h2 className="text-sm font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">Your Profile</h2>
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm flex items-center gap-6">
                        <img
                            src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=3B82F6&color=fff&size=128`}
                            alt="Avatar"
                            className="w-20 h-20 rounded-2xl object-cover shadow-sm ring-1 ring-neutral-100"
                        />
                        <div className="flex-1">
                            <h3 className="text-xl font-black text-neutral-900 dark:text-white">{user?.name}</h3>
                            <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-3">{user?.email}</p>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-100 dark:border-green-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Active Account</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION 2 — CONNECTED ACCOUNTS */}
                <section className="space-y-4">
                    <div className="space-y-1">
                        <h2 className="text-sm font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">Connected Accounts</h2>
                        <p className="text-[14px] text-neutral-500 dark:text-neutral-400">These are the platforms you have authorized RankPilot to access</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* GOOGLE CARD */}
                        <div className={`bg-white dark:bg-neutral-900 border ${userConnectedSources.includes('google') ? 'border-neutral-200 dark:border-neutral-800' : 'border-dashed border-neutral-300 dark:border-neutral-700'} rounded-2xl p-6 shadow-sm flex flex-col`}>
                            <div className="flex items-center justify-between mb-6">
                                <div className="w-12 h-12 rounded-xl bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center border border-neutral-100 dark:border-neutral-700 shadow-sm">
                                    <svg viewBox="0 0 24 24" className="w-6 h-6">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                </div>
                                {userConnectedSources.includes('google') && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-100 dark:border-green-800 text-[10px] font-black uppercase tracking-widest">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Connected
                                    </span>
                                )}
                            </div>

                            <div className="flex-1">
                                <h3 className="text-lg font-black text-neutral-900 dark:text-white">Google</h3>
                                {!userConnectedSources.includes('google') ? (
                                    <div className="mt-2 text-center">
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6">
                                            Connect to access Google Analytics, Search Console, and Google Ads
                                        </p>
                                        <Button
                                            onClick={connectGoogle}
                                            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3"
                                        >
                                            Connect Google Account
                                        </Button>
                                        <p className="text-[12px] text-neutral-400 mt-4 font-medium flex items-center justify-center gap-1.5">
                                            🔒 We use secure OAuth. We never store your password.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="mt-2">
                                        <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-4">GA4 · Search Console · Google Ads</p>
                                        <div className="space-y-3 mb-6">
                                            {googleAccounts.map(acc => (
                                                <div key={acc._id} className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-xl p-3 flex items-center justify-between shadow-sm">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300 truncate">{acc.email}</span>
                                                        {acc.email === user.email && (
                                                            <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 rounded border border-neutral-200 dark:border-neutral-600 flex-shrink-0">
                                                                Primary
                                                            </span>
                                                        )}
                                                    </div>
                                                    {acc.email !== user.email && (
                                                        <button 
                                                            onClick={() => handleGoogleDisconnect(acc._id)}
                                                            className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <Button
                                            variant="secondary"
                                            onClick={connectGoogle}
                                            className="w-full text-xs font-bold py-2 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                                        >
                                            + Add Another Google Account
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* META/FACEBOOK CARD */}
                        <div className={`bg-white dark:bg-neutral-900 border ${userConnectedSources.includes('facebook') ? 'border-neutral-200 dark:border-neutral-800' : 'border-dashed border-neutral-300 dark:border-neutral-700'} rounded-2xl p-6 shadow-sm flex flex-col`}>
                            <div className="flex items-center justify-between mb-6">
                                <div className="w-12 h-12 rounded-xl bg-[#1877F2] flex items-center justify-center border border-[#1877F2]/10 shadow-sm">
                                    <svg fill="white" viewBox="0 0 24 24" className="w-6 h-6">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                    </svg>
                                </div>
                                {userConnectedSources.includes('facebook') && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-100 dark:border-green-800 text-[10px] font-black uppercase tracking-widest">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Connected
                                    </span>
                                )}
                            </div>

                            <div className="flex-1">
                                <h3 className="text-lg font-black text-neutral-900 dark:text-white">Meta Business</h3>
                                {!userConnectedSources.includes('facebook') ? (
                                    <div className="mt-2 text-center">
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6">
                                            Connect to track Facebook ad performance
                                        </p>
                                        <Button
                                            onClick={connectFacebook}
                                            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3"
                                        >
                                            Connect Meta Account
                                        </Button>
                                        <p className="text-[12px] text-neutral-400 mt-4 font-medium flex items-center justify-center gap-1.5">
                                            🔒 Secure OAuth connection
                                        </p>
                                    </div>
                                ) : (
                                    <div className="mt-2">
                                        <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Facebook Ads · Instagram Ads</p>
                                        <div className="space-y-3 mb-6">
                                            {facebookAccounts.map(acc => (
                                                <div key={acc._id} className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-xl p-3 flex items-center justify-between shadow-sm">
                                                    <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300 truncate mr-2">{acc.name}</span>
                                                    <button 
                                                        onClick={() => handleFacebookDisconnect(acc._id)}
                                                        className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <Button
                                            variant="secondary"
                                            onClick={connectFacebook}
                                            className="w-full text-xs font-bold py-2 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                                        >
                                            + Add Another Meta Profile
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION 3 — DANGER ZONE */}
                <section className="space-y-4 pt-4">
                    <h2 className="text-sm font-black text-red-600 dark:text-red-400 uppercase tracking-wide">Danger Zone</h2>
                    <div className="bg-white dark:bg-neutral-900 border border-red-200 dark:border-red-900/40 rounded-2xl p-8 shadow-sm">
                        <div className="max-w-xl">
                            <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-2">Delete Your Account</h3>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-8">
                                This will permanently delete your RankPilot account, all connected platforms, analytics history, and AI conversations. This cannot be undone.
                            </p>

                            <div className="space-y-3 mb-10">
                                {[
                                    "All website connections",
                                    "All analytics data",
                                    "All AI conversations",
                                    "Your profile and settings"
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 text-red-500 dark:text-red-400">
                                        <span className="font-bold text-lg leading-none">×</span>
                                        <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300">{item}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleDeleteAccount}
                                className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl transition-all shadow-lg shadow-red-500/20 active:scale-95"
                            >
                                Delete My Account
                            </button>
                            <p className="text-[12px] text-neutral-400 dark:text-neutral-500 mt-4 font-medium italic">
                                You will need to type your email address to confirm
                            </p>
                        </div>
                    </div>
                </section>

            </div>
        </DashboardLayout>
    );
};

export default SettingsPage;
