import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAccountsStore = create(
    persist(
        (set) => ({
            userSites: [], // All sites from DB
            activeSiteId: null, // Currently selected site ID
            activeSiteName: null, // Active selected site name
            activeSiteUrl: null, // Active selected site URL

            // Flat Global Sync Status
            syncStatus: 'idle',

            // --- Separate Modular Connected Source Objects ---
            ga4: {
                ga4PropertyId: null,
                ga4PropertyName: null,
                ga4AccountId: null,
                ga4HistoricalComplete: false,
                ga4SyncStatus: 'idle',
                ga4SyncProgress: 0,
                ga4LastSyncedAt: null,
                ga4HistoricalChunkIndex: 0,
                ga4TokenEmail: null
            },

            gsc: {
                gscSiteUrl: null,
                gscPermission: null,
                gscHistoricalComplete: false,
                gscSyncStatus: 'idle',
                gscSyncProgress: 0,
                gscLastSyncedAt: null,
                gscHistoricalChunkIndex: 0,
                gscTokenEmail: null
            },

            googleAds: {
                googleAdsCustomerId: null,
                googleAdsAccountName: null,
                googleAdsCurrencyCode: null,
                googleAdsHistoricalComplete: false,
                googleAdsSyncStatus: 'idle',
                googleAdsSyncProgress: 0,
                googleAdsLastSyncedAt: null,
                googleAdsHistoricalChunkIndex: 0,
                googleAdsTokenEmail: null
            },

            facebook: {
                facebookAdAccountId: null,
                facebookAdAccountName: null,
                facebookAdCurrencyCode: null,
                facebookAdsHistoricalComplete: false,
                facebookAdsSyncStatus: 'idle',
                facebookAdsSyncProgress: 0,
                facebookAdsLastSyncedAt: null,
                facebookAdsHistoricalChunkIndex: 0,
                facebookTokenName: null
            },



            setAccounts: (updates) => set((state) => {
                const newState = { ...state, ...updates };

                // 1. If modular objects are passed, merge them
                if (updates.ga4) {
                    newState.ga4 = {
                        ...state.ga4,
                        ...updates.ga4
                    };
                }
                if (updates.gsc) {
                    newState.gsc = {
                        ...state.gsc,
                        ...updates.gsc
                    };
                }
                if (updates.googleAds) {
                    newState.googleAds = {
                        ...state.googleAds,
                        ...updates.googleAds
                    };
                }
                if (updates.facebook) {
                    newState.facebook = {
                        ...state.facebook,
                        ...updates.facebook
                    };
                }

                // Automatically keep activeSiteName & activeSiteUrl in sync with activeSiteId
                if (updates.activeSiteId !== undefined || updates.userSites !== undefined) {
                    const activeId = updates.activeSiteId !== undefined ? updates.activeSiteId : newState.activeSiteId;
                    const sitesList = updates.userSites !== undefined ? updates.userSites : newState.userSites;
                    const activeSite = sitesList?.find(s => s._id === activeId);

                    if (updates.activeSiteName === undefined && activeSite) {
                        newState.activeSiteName = activeSite.siteName;
                    }
                    if (updates.activeSiteUrl === undefined && activeSite) {
                        newState.activeSiteUrl = activeSite.siteUrl;
                    }
                }

                return newState;
            }),
            setUserSites: (sites) => set({ userSites: sites }),
            clearAccounts: () => set({
                userSites: [],
                activeSiteId: null,
                activeSiteName: null,
                activeSiteUrl: null,

                // Flat Global Sync Status
                syncStatus: 'idle',

                // Modular Connected Source Objects
                ga4: {
                    ga4PropertyId: null,
                    ga4PropertyName: null,
                    ga4AccountId: null,
                    ga4HistoricalComplete: false,
                    ga4SyncStatus: 'idle',
                    ga4SyncProgress: 0,
                    ga4LastSyncedAt: null,
                    ga4HistoricalChunkIndex: 0,
                    ga4TokenEmail: null
                },

                gsc: {
                    gscSiteUrl: null,
                    gscPermission: null,
                    gscHistoricalComplete: false,
                    gscSyncStatus: 'idle',
                    gscSyncProgress: 0,
                    gscLastSyncedAt: null,
                    gscHistoricalChunkIndex: 0,
                    gscTokenEmail: null
                },

                googleAds: {
                    googleAdsCustomerId: null,
                    googleAdsAccountName: null,
                    googleAdsCurrencyCode: null,
                    googleAdsHistoricalComplete: false,
                    googleAdsSyncStatus: 'idle',
                    googleAdsSyncProgress: 0,
                    googleAdsLastSyncedAt: null,
                    googleAdsHistoricalChunkIndex: 0,
                    googleAdsTokenEmail: null
                },

                facebook: {
                    facebookAdAccountId: null,
                    facebookAdAccountName: null,
                    facebookAdCurrencyCode: null,
                    facebookAdsHistoricalComplete: false,
                    facebookAdsSyncStatus: 'idle',
                    facebookAdsSyncProgress: 0,
                    facebookAdsLastSyncedAt: null,
                    facebookAdsHistoricalChunkIndex: 0,
                    facebookTokenName: null
                }
            }),
        }),
        {
            name: 'accounts-storage',
        }
    )
);
