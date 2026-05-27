import Ga4Metric from '../models/Ga4Metric.js';
import GscMetric from '../models/GscMetric.js';
import GoogleAdsMetric from '../models/GoogleAdsMetric.js';
import FacebookAdsMetric from '../models/FacebookAdsMetric.js';
import UserAccounts from '../models/UserAccounts.js';
import AiIntelligence from '../models/AiIntelligence.js';
import mongoose from 'mongoose';
import { syncGsc, syncGa4, syncGoogleAds, syncFacebookAds } from '../services/syncService.js';
import NodeCache from 'node-cache';
import { generateGa4Intelligence, generateGscIntelligence, generateDashboardIntelligence, getPlaceholderIntelligence } from '../services/aiIntelligenceService.js';

const analyticsCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });


const getAnalyticsCacheKey = (userId, prefix, query) => {
    const { startDate, endDate, siteId, device } = query;
    return `${prefix}_${userId}_${siteId || 'any'}_${startDate}_${endDate}_${device || 'all'}`;
};

const clearUserCache = (userId) => {
    const keys = analyticsCache.keys();
    const userKeys = keys.filter(k => k.includes(`_${userId}_`));
    if (userKeys.length > 0) analyticsCache.del(userKeys);
};

export const buildMatchFilter = async (userId, query) => {
    const { startDate, endDate, device, siteId } = query;

    const filter = {
        'metadata.userId': userId,
        date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };

    if (siteId) {
        filter['metadata.siteId'] = typeof siteId === 'string' ? new mongoose.Types.ObjectId(siteId) : siteId;
    }

    if (device && device !== 'all') filter["metadata.dimensions.device"] = device;

    return filter;
};

export const getDashboardSummary = async (req, res) => {
    const { startDate, endDate, siteId, device } = req.query;
    if (!siteId) {
        return res.status(400).json({ success: false, message: 'Site ID is required' });
    }
    const userId = req.user._id;

    const cacheKey = getAnalyticsCacheKey(userId, 'dash', req.query);
    const cachedData = analyticsCache.get(cacheKey);
    if (cachedData) return res.status(200).json(cachedData);

    try {
        const calculateGrowth = (current, previous) => {
            if (!previous || previous === 0) return current > 0 ? 100 : 0;
            const growth = ((current - previous) / previous) * 100;
            return Math.round(growth);
        };

        const acc = await UserAccounts.findOne({ _id: siteId, userId })
            .select('siteName syncStatus ga4HistoricalComplete gscHistoricalComplete googleAdsHistoricalComplete facebookAdsHistoricalComplete ga4PropertyId gscSiteUrl googleAdsCustomerId facebookAdAccountId ga4LastSyncedAt gscLastSyncedAt googleAdsLastSyncedAt facebookAdsLastSyncedAt');

        if (!acc) {
            return res.status(404).json({ success: false, message: 'Account not found' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const duration = end - start;
        const prevEnd = new Date(start.getTime() - (24 * 60 * 60 * 1000));
        const prevStart = new Date(prevEnd.getTime() - duration);

        const filters = await Promise.all([
            buildMatchFilter(userId, req.query),
            buildMatchFilter(userId, { ...req.query, startDate: prevStart.toISOString().split('T')[0], endDate: prevEnd.toISOString().split('T')[0] })
        ]);

        const gscFilters = await Promise.all([
            buildMatchFilter(userId, { ...req.query, device: 'all' }),
            buildMatchFilter(userId, { ...req.query, device: 'all', startDate: prevStart.toISOString().split('T')[0], endDate: prevEnd.toISOString().split('T')[0] })
        ]);

        const [ga4Data, gscData, gAdsData, fAdsData, ga4Ts, gscTs, adsTs, pGa4Data, pGscData, pGAdsData, pFAdsData, topPages] = await Promise.all([
            Ga4Metric.aggregate([{ $match: filters[0] }, { $group: { _id: null, users: { $sum: "$metrics.users" }, sessions: { $sum: "$metrics.sessions" }, pageViews: { $sum: "$metrics.pageViews" }, bounceRate: { $avg: "$metrics.bounceRate" }, avgSessionDuration: { $avg: "$metrics.avgSessionDuration" } } }]),
            GscMetric.aggregate([{ $match: gscFilters[0] }, { $group: { _id: null, clicks: { $sum: "$metrics.clicks" }, impressions: { $sum: "$metrics.impressions" }, position: { $avg: "$metrics.position" } } }]),
            GoogleAdsMetric.aggregate([{ $match: filters[0] }, { $group: { _id: null, spend: { $sum: "$metrics.spend" }, conversions: { $sum: "$metrics.conversions" }, impressions: { $sum: "$metrics.impressions" }, clicks: { $sum: "$metrics.clicks" }, reach: { $sum: "$metrics.reach" }, purchaseValue: { $sum: "$metrics.purchase_value" } } }]),
            FacebookAdsMetric.aggregate([{ $match: filters[0] }, { $group: { _id: null, spend: { $sum: "$metrics.spend" }, conversions: { $sum: "$metrics.conversions" }, impressions: { $sum: "$metrics.impressions" }, clicks: { $sum: "$metrics.clicks" }, reach: { $sum: "$metrics.reach" }, purchaseValue: { $sum: "$metrics.purchase_value" } } }]),
            Ga4Metric.aggregate([{ $match: filters[0] }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, sessions: { $sum: "$metrics.sessions" } } }, { $sort: { _id: 1 } }]),
            GscMetric.aggregate([{ $match: gscFilters[0] }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, clicks: { $sum: "$metrics.clicks" }, impressions: { $sum: "$metrics.impressions" } } }, { $sort: { _id: 1 } }]),
            Promise.all([
                GoogleAdsMetric.aggregate([{ $match: filters[0] }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, spend: { $sum: "$metrics.spend" }, conversions: { $sum: "$metrics.conversions" }, clicks: { $sum: "$metrics.clicks" }, impressions: { $sum: "$metrics.impressions" } } }]),
                FacebookAdsMetric.aggregate([{ $match: filters[0] }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, spend: { $sum: "$metrics.spend" }, conversions: { $sum: "$metrics.conversions" }, clicks: { $sum: "$metrics.clicks" }, impressions: { $sum: "$metrics.impressions" } } }])
            ]).then(([g, f]) => {
                const combined = [...g, ...f];
                const map = {};
                combined.forEach(d => {
                    if (!map[d._id]) map[d._id] = { _id: d._id, spend: 0, conversions: 0, clicks: 0, impressions: 0 };
                    map[d._id].spend += (d.spend || 0);
                    map[d._id].conversions += (d.conversions || 0);
                    map[d._id].clicks += (d.clicks || 0);
                    map[d._id].impressions += (d.impressions || 0);
                });
                return Object.values(map).sort((a, b) => a._id.localeCompare(b._id));
            }),

            Ga4Metric.aggregate([{ $match: filters[1] }, { $group: { _id: null, sessions: { $sum: "$metrics.sessions" }, users: { $sum: "$metrics.users" } } }]),
            GscMetric.aggregate([{ $match: gscFilters[1] }, { $group: { _id: null, clicks: { $sum: "$metrics.clicks" }, impressions: { $sum: "$metrics.impressions" } } }]),
            GoogleAdsMetric.aggregate([{ $match: filters[1] }, { $group: { _id: null, spend: { $sum: "$metrics.spend" }, conversions: { $sum: "$metrics.conversions" } } }]),
            FacebookAdsMetric.aggregate([{ $match: filters[1] }, { $group: { _id: null, spend: { $sum: "$metrics.spend" }, reach: { $sum: "$metrics.reach" } } }]),

            Ga4Metric.aggregate([{ $match: filters[0] }, { $group: { _id: "$metadata.dimensions.pagePath", views: { $sum: "$metrics.pageViews" }, users: { $sum: "$metrics.users" }, bounceRate: { $avg: "$metrics.bounceRate" } } }, { $sort: { views: -1 } }, { $limit: 10 }])
        ]);

        const ga = ga4Data[0] || { users: 0, sessions: 0, pageViews: 0, bounceRate: 0, avgSessionDuration: 0 };
        const gsRaw = gscData[0] || { clicks: 0, impressions: 0, position: 0 };
        const gs = { ...gsRaw, ctr: gsRaw.impressions > 0 ? (gsRaw.clicks / gsRaw.impressions) : 0 };

        const processAds = (data) => {
            const d = data || { spend: 0, conversions: 0, clicks: 0, impressions: 0, reach: 0, purchaseValue: 0 };
            return {
                ...d,
                cpc: d.clicks > 0 ? d.spend / d.clicks : 0,
                cpm: d.impressions > 0 ? (d.spend / d.impressions) * 1000 : 0,
                ctr: d.impressions > 0 ? (d.clicks / d.impressions) : 0,
                roas: d.spend > 0 ? (d.purchaseValue || 0) / d.spend : 0
            };
        };

        const ad = {
            google: processAds(gAdsData[0]),
            facebook: processAds(fAdsData[0])
        };

        const pAd = {
            google: pGAdsData[0] || { spend: 0, conversions: 0 },
            facebook: pFAdsData[0] || { spend: 0, reach: 0 }
        };

        const pGa = pGa4Data[0] || { users: 0, sessions: 0 };
        const pGs = pGscData[0] || { clicks: 0, impressions: 0 };

        const tsMap = {};
        const allDates = [...new Set([
            ...ga4Ts.map(d => d._id),
            ...gscTs.map(d => d._id),
            ...adsTs.map(d => d._id)
        ])].sort((a, b) => new Date(a) - new Date(b));

        allDates.forEach(date => {
            tsMap[date] = {
                date,
                Sessions: 0,
                Clicks: 0,
                OrganicClicks: 0,
                PaidClicks: 0,
                Impressions: 0,
                OrganicImpressions: 0,
                PaidImpressions: 0,
                Spend: 0,
                Conversions: 0
            };
        });

        ga4Ts.forEach(d => { if (tsMap[d._id]) tsMap[d._id].Sessions = d.sessions; });
        gscTs.forEach(d => {
            if (tsMap[d._id]) {
                const c = (d.clicks || 0);
                const i = (d.impressions || 0);
                tsMap[d._id].Clicks += c;
                tsMap[d._id].OrganicClicks = c;
                tsMap[d._id].Impressions += i;
                tsMap[d._id].OrganicImpressions = i;
            }
        });
        adsTs.forEach(d => {
            if (tsMap[d._id]) {
                const s = (d.spend || 0);
                const conv = (d.conversions || 0);
                const c = (d.clicks || 0);
                const i = (d.impressions || 0);

                tsMap[d._id].Spend += s;
                tsMap[d._id].Conversions += conv;
                tsMap[d._id].Clicks += c;
                tsMap[d._id].PaidClicks = c;
                tsMap[d._id].Impressions += i;
                tsMap[d._id].PaidImpressions = i;
            }
        });

        const totalSessions = ga.sessions || 0;
        const result = {
            userName: req.user?.displayName || 'User',
            siteName: acc?.siteName || 'Select Website',
            ga4LastSyncedAt: acc?.ga4LastSyncedAt,
            gscLastSyncedAt: acc?.gscLastSyncedAt,
            googleAdsLastSyncedAt: acc?.googleAdsLastSyncedAt,
            facebookAdsLastSyncedAt: acc?.facebookAdsLastSyncedAt,
            syncStatus: acc?.syncStatus || 'idle',
            ga4HistoricalComplete: acc?.ga4HistoricalComplete || false,
            gscHistoricalComplete: acc?.gscHistoricalComplete || false,
            googleAdsHistoricalComplete: acc?.googleAdsHistoricalComplete || false,
            facebookAdsHistoricalComplete: acc?.facebookAdsHistoricalComplete || false,

            ga4: {
                ...ga,
                priorSessions: pGa.sessions,
                priorUsers: pGa.users,
                growthSessions: calculateGrowth(ga.sessions, pGa.sessions),
                growthUsers: calculateGrowth(ga.users, pGa.users),
                growthStatus: ga.sessions >= pGa.sessions ? 'positive' : 'negative'
            },
            gsc: {
                ...gs,
                priorClicks: pGs.clicks,
                priorImpressions: pGs.impressions,
                growthClicks: calculateGrowth(gs.clicks, pGs.clicks),
                growthImpressions: calculateGrowth(gs.impressions, pGs.impressions),
                growthStatus: gs.clicks >= pGs.clicks ? 'positive' : 'negative'
            },
            googleAds: {
                ...ad.google,
                priorConversions: pAd.google.conversions,
                priorSpend: pAd.google.spend,
                growthConversions: calculateGrowth(ad.google.conversions, pAd.google.conversions),
                growthSpend: calculateGrowth(ad.google.spend, pAd.google.spend),
                growthStatus: ad.google.conversions >= pAd.google.conversions ? 'positive' : 'negative'
            },
            facebookAds: {
                ...ad.facebook,
                priorSpend: pAd.facebook.spend,
                priorReach: pAd.facebook.reach,
                growthSpend: calculateGrowth(ad.facebook.spend, pAd.facebook.spend),
                growthReach: calculateGrowth(ad.facebook.reach, pAd.facebook.reach),
                growthStatus: ad.facebook.spend <= pAd.facebook.spend ? 'positive' : 'negative'
            },

            adWinners: {
                spend: ad.google.spend < ad.facebook.spend ? 'Google Ads' : 'Facebook Ads',
                clicks: ad.google.clicks > ad.facebook.clicks ? 'Google Ads' : 'Facebook Ads',
                conversions: ad.google.conversions > ad.facebook.conversions ? 'Google Ads' : 'Facebook Ads',
                cpc: (ad.google.cpc > 0 && ad.google.cpc < ad.facebook.cpc) ? 'Google Ads' : 'Facebook Ads',
                ctr: ad.google.ctr > ad.facebook.ctr ? 'Google Ads' : 'Facebook Ads'
            },
            connectionStatus: { ga4: !!acc?.ga4PropertyId, gsc: !!acc?.gscSiteUrl, googleAds: !!acc?.googleAdsCustomerId, facebookAds: !!acc?.facebookAdAccountId },

            timeseries: Object.values(tsMap).sort((a, b) => a.date.localeCompare(b.date)),
            topPages: topPages.map(p => ({
                url: p._id || '/',
                visitors: p.users,
                views: p.views,
                bounce: (p.bounceRate || 0).toFixed(0) + '%',
                share: totalSessions > 0 ? ((p.users / totalSessions) * 100).toFixed(1) : 0
            }))
        };

        const latestSync = Math.max(
            new Date(acc?.gscLastSyncedAt || 0),
            new Date(acc?.ga4LastSyncedAt || 0),
            new Date(acc?.googleAdsLastSyncedAt || 0),
            new Date(acc?.facebookAdsLastSyncedAt || 0)
        );

        const existingAi = await AiIntelligence.findOne({
            siteId,
            platform: 'dash',
            startDate,
            endDate,
            device
        });

        const isAiValid = existingAi &&
            existingAi.lastSyncedAtOnGeneration >= latestSync;

        if (isAiValid) {
            result.intelligence = existingAi.content;
        } else {
            const isHistoricalSyncInProgress =
                (acc.ga4PropertyId && !acc.ga4HistoricalComplete) ||
                (acc.gscSiteUrl && !acc.gscHistoricalComplete) ||
                (acc.googleAdsCustomerId && !acc.googleAdsHistoricalComplete) ||
                (acc.facebookAdAccountId && !acc.facebookAdsHistoricalComplete);

            if (isHistoricalSyncInProgress) {
                result.intelligence = getPlaceholderIntelligence('dash', 'syncing');
            } else {
                const hasActualData =
                    (result.ga4?.sessions > 0) ||
                    (result.gsc?.clicks > 0) ||
                    (result.googleAds?.spend > 0) ||
                    (result.facebookAds?.spend > 0);

                if (!hasActualData) {
                    result.intelligence = getPlaceholderIntelligence('dash', 'no_data');
                } else {
                    result.intelligence = await generateDashboardIntelligence(result, acc);

                    if (siteId && !result.intelligence.isFallback) {
                        await AiIntelligence.findOneAndUpdate(
                            { siteId, platform: 'dash', startDate, endDate, device },
                            {
                                userId,
                                content: result.intelligence,
                                lastSyncedAtOnGeneration: new Date(latestSync),
                                createdAt: new Date()
                            },
                            { upsert: true }
                        );
                    }
                }
            }
        }

        // Cache only when no historical sync is in progress (to avoid caching incomplete data)
        const isDashHistoricalSyncing =
            (acc.ga4PropertyId && !acc.ga4HistoricalComplete) ||
            (acc.gscSiteUrl && !acc.gscHistoricalComplete) ||
            (acc.googleAdsCustomerId && !acc.googleAdsHistoricalComplete) ||
            (acc.facebookAdAccountId && !acc.facebookAdsHistoricalComplete);
        if (!isDashHistoricalSyncing) analyticsCache.set(cacheKey, result);

        res.status(200).json(result);
    } catch (error) {
        console.error('Dashboard Summary Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard summary' });
    }
};

export const getGa4Summary = async (req, res) => {
    const { startDate, endDate, siteId, device } = req.query;
    if (!siteId) {
        return res.status(400).json({ success: false, message: 'Site ID is required' });
    }
    const userId = req.user._id;

    const cacheKey = getAnalyticsCacheKey(userId, 'ga4', req.query);
    const cachedData = analyticsCache.get(cacheKey);
    if (cachedData) return res.status(200).json(cachedData);

    try {
        const acc = await UserAccounts.findOne({ _id: siteId, userId }).select('siteName ga4LastSyncedAt ga4HistoricalComplete');
        if (!acc) {
            return res.status(404).json({ success: false, message: 'Account not found' });
        }

        const siteName = acc.siteName || 'your website';
        const ga4LastSyncedAt = acc.ga4LastSyncedAt;
        const ga4HistoricalComplete = acc.ga4HistoricalComplete;

        const formatTime = (secs) => {
            const s = Math.floor(secs || 0);
            const min = Math.floor(s / 60);
            const remainingSecs = s % 60;
            return `${min}m ${remainingSecs}s`;
        };

        const filter = await buildMatchFilter(userId, req.query);

        const start = new Date(startDate);
        const end = new Date(endDate);
        const diff = end - start;
        const prevEnd = new Date(start.getTime() - (24 * 60 * 60 * 1000));
        const prevStart = new Date(prevEnd.getTime() - diff);
        const prevStartDate = prevStart.toISOString().split('T')[0];
        const prevEndDate = prevEnd.toISOString().split('T')[0];

        const prevFilter = await buildMatchFilter(userId, { ...req.query, startDate: prevStartDate, endDate: prevEndDate });

        const [overview, priorOverview, timeseries, traffic, pages, ga4BreakdownsDevices, ga4BreakdownsLocations] = await Promise.all([
            Ga4Metric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: null,
                        users: { $sum: "$metrics.users" },
                        newUsers: { $sum: "$metrics.newUsers" },
                        sessions: { $sum: "$metrics.sessions" },
                        engagedSessions: { $sum: "$metrics.engagedSessions" },
                        bounceRate: { $avg: "$metrics.bounceRate" },
                        avgSessionDuration: { $avg: "$metrics.avgSessionDuration" },
                        pageViews: { $sum: "$metrics.pageViews" }
                    }
                }
            ]),
            Ga4Metric.aggregate([
                { $match: prevFilter },
                {
                    $group: {
                        _id: null,
                        users: { $sum: "$metrics.users" },
                        newUsers: { $sum: "$metrics.newUsers" },
                        sessions: { $sum: "$metrics.sessions" },
                        engagedSessions: { $sum: "$metrics.engagedSessions" },
                        bounceRate: { $avg: "$metrics.bounceRate" },
                        avgSessionDuration: { $avg: "$metrics.avgSessionDuration" },
                        pageViews: { $sum: "$metrics.pageViews" }
                    }
                }
            ]),
            Ga4Metric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                        sessions: { $sum: "$metrics.sessions" },
                        pageViews: { $sum: "$metrics.pageViews" },
                        users: { $sum: "$metrics.users" },
                        bounceRate: { $avg: "$metrics.bounceRate" },
                        engagedSessions: { $sum: "$metrics.engagedSessions" },
                        avgSessionDuration: { $avg: "$metrics.avgSessionDuration" }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            Ga4Metric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: { channel: "$metadata.dimensions.channel", source: "$metadata.dimensions.source" },
                        sessions: { $sum: "$metrics.sessions" },
                        users: { $sum: "$metrics.users" }
                    }
                },
                { $sort: { sessions: -1 } },
                { $limit: 10 }
            ]),
            Ga4Metric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: { path: "$metadata.dimensions.pagePath", title: "$metadata.dimensions.pageTitle" },
                        views: { $sum: "$metrics.pageViews" },
                        users: { $sum: "$metrics.users" },
                        bounceRate: { $avg: "$metrics.bounceRate" }
                    }
                },
                { $sort: { views: -1 } },
                { $limit: 10 }
            ]),
            Ga4Metric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: "$metadata.dimensions.device",
                        value: { $sum: "$metrics.sessions" }
                    }
                },
                { $sort: { value: -1 } }
            ]),
            Ga4Metric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: "$metadata.dimensions.country",
                        value: { $sum: "$metrics.sessions" }
                    }
                },
                { $sort: { value: -1 } },
                { $limit: 5 }
            ])
        ]);

        const result = {
            activeUsers: { value: overview[0].users || 0, change: parseFloat((((overview[0].users - priorOverview[0].users) / priorOverview[0].users) * 100 || 0).toFixed(1)), isPositive: (overview[0].users || 0) >= (priorOverview[0].users || 0), timeseries: timeseries.map(d => ({ users: d.users })) },
            totalSessions: { value: overview[0].sessions || 0, change: parseFloat((((overview[0].sessions - priorOverview[0].sessions) / priorOverview[0].sessions) * 100 || 0).toFixed(1)), isPositive: (overview[0].sessions || 0) >= (priorOverview[0].sessions || 0), timeseries: timeseries.map(d => ({ sessions: d.sessions })) },
            engagementRate: { value: parseFloat(((overview[0].engagedSessions / overview[0].sessions) * 100 || 0).toFixed(1)), change: parseFloat((((overview[0].engagedSessions / overview[0].sessions) - (priorOverview[0].engagedSessions / priorOverview[0].sessions)) / (priorOverview[0].engagedSessions / priorOverview[0].sessions) * 100 || 0).toFixed(1)), isPositive: ((overview[0].engagedSessions / overview[0].sessions) || 0) >= ((priorOverview[0].engagedSessions / priorOverview[0].sessions) || 0), timeseries: timeseries.map(d => ({ engagementRate: parseFloat(((d.engagedSessions / (d.sessions || 1)) * 100 || 0).toFixed(1)) })) },
            avgSessionDuration: { value: formatTime(overview[0].avgSessionDuration), change: parseFloat((((overview[0].avgSessionDuration - priorOverview[0].avgSessionDuration) / priorOverview[0].avgSessionDuration) * 100 || 0).toFixed(1)), isPositive: (overview[0].avgSessionDuration || 0) >= (priorOverview[0].avgSessionDuration || 0), timeseries: timeseries.map(d => ({ avgSessionDuration: d.avgSessionDuration || 0 })) },
            pageViews: overview[0].pageViews || 0,
            newUsers: overview[0].newUsers || 0,
            pagesPerSession: parseFloat(((overview[0].pageViews / overview[0].sessions) || 0).toFixed(2)),

            sessionsOverTime: timeseries.map(d => ({
                date: d._id,
                sessions: d.sessions
            })),
            newVsReturningUsers: {
                totalUsers: overview[0].users || 0,
                totalNewUsers: overview[0].newUsers || 0,
                newUsersPercentage: parseFloat(((overview[0].newUsers / overview[0].users) * 100 || 0).toFixed(1)),
                totalReturningUsers: overview[0].users - overview[0].newUsers || 0,
                returningUsersPercentage: parseFloat(((overview[0].users - overview[0].newUsers) / overview[0].users * 100 || 0).toFixed(1)),
            },
            engagementRates: {
                engagementRate: parseFloat(((overview[0].engagedSessions / overview[0].sessions) * 100 || 0).toFixed(1)),
                engagedSessions: overview[0].engagedSessions || 0,
                avgEngagedTime: formatTime(overview[0].avgSessionDuration),
            },
            bounceRateOverTime: timeseries.map(d => ({
                date: d._id,
                bounceRate: parseFloat((d.bounceRate || 0).toFixed(1))
            })),
            pageViewsOverTime: timeseries.map(d => ({
                date: d._id,
                pageViews: d.pageViews || 0,
            })),
            topTrafficSources: traffic.map(d => ({ channel: d._id.channel, source: d._id.source, sessions: d.sessions, users: d.users })),
            topPages: pages.map(d => ({ title: d._id.title, path: d._id.path, views: d.views, users: d.users, bounceRate: parseFloat((d.bounceRate || 0).toFixed(1)) })),
            deviceBreakdown: {
                totalSessions: overview[0].sessions || 0,
                devices: (ga4BreakdownsDevices || []).map(d => ({ name: d._id || 'unknown', value: d.value, percentage: parseFloat((d.value / overview[0].sessions * 100 || 0).toFixed(1)) }))
            },
            topLocations: (ga4BreakdownsLocations || []).map(d => ({ name: d._id || 'unknown', value: d.value, percentage: parseFloat((d.value / overview[0].sessions * 100 || 0).toFixed(1)) })),
            thisPeriodVsLastPeriod: {
                thisPeriod: {
                    users: overview[0].users || 0,
                    sessions: overview[0].sessions || 0,
                    pageViews: overview[0].pageViews || 0,
                    bounceRate: parseFloat(((overview[0].bounceRate || 0)).toFixed(1)),
                    avgSessionDuration: formatTime(overview[0].avgSessionDuration),
                    newUsers: overview[0].newUsers || 0,
                },
                lastPeriod: {
                    users: priorOverview[0].users || 0,
                    sessions: priorOverview[0].sessions || 0,
                    pageViews: priorOverview[0].pageViews || 0,
                    bounceRate: parseFloat(((priorOverview[0].bounceRate || 0)).toFixed(1)),
                    avgSessionDuration: formatTime(priorOverview[0].avgSessionDuration),
                    newUsers: priorOverview[0].newUsers || 0,
                },
                change: {
                    users: parseFloat((((overview[0].users - priorOverview[0].users) / priorOverview[0].users) * 100 || 0).toFixed(1)),
                    sessions: parseFloat((((overview[0].sessions - priorOverview[0].sessions) / priorOverview[0].sessions) * 100 || 0).toFixed(1)),
                    pageViews: parseFloat((((overview[0].pageViews - priorOverview[0].pageViews) / priorOverview[0].pageViews) * 100 || 0).toFixed(1)),
                    bounceRate: parseFloat((((overview[0].bounceRate - priorOverview[0].bounceRate) / priorOverview[0].bounceRate) * 100 || 0).toFixed(1)),
                    avgSessionDuration: parseFloat((((overview[0].avgSessionDuration - priorOverview[0].avgSessionDuration) / priorOverview[0].avgSessionDuration) * 100 || 0).toFixed(1)),
                    newUsers: parseFloat((((overview[0].newUsers - priorOverview[0].newUsers) / priorOverview[0].newUsers) * 100 || 0).toFixed(1)),
                }
            },
        };

        const existingAi = await AiIntelligence.findOne({
            siteId,
            platform: 'ga4',
            startDate,
            endDate,
            device
        });

        const isAiValid = existingAi &&
            existingAi.lastSyncedAtOnGeneration >= (ga4LastSyncedAt || 0);

        if (isAiValid) {
            result.intelligence = existingAi.content;
        } else {
            if (!ga4HistoricalComplete) {
                result.intelligence = getPlaceholderIntelligence('ga4', 'syncing');
            } else {
                if (!(result.totalSessions?.value > 0)) {
                    result.intelligence = getPlaceholderIntelligence('ga4', 'no_data');
                } else {
                    result.intelligence = await generateGa4Intelligence(result, siteName);

                    if (siteId && !result.intelligence.isFallback) {
                        await AiIntelligence.findOneAndUpdate(
                            { siteId, platform: 'ga4', startDate, endDate, device },
                            {
                                userId,
                                content: result.intelligence,
                                lastSyncedAtOnGeneration: ga4LastSyncedAt || new Date(),
                                createdAt: new Date()
                            },
                            { upsert: true }
                        );
                    }
                }
            }
        }

        // Cache only when GA4 historical sync is complete
        if (ga4HistoricalComplete) analyticsCache.set(cacheKey, result);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getGscSummary = async (req, res) => {
    const { startDate, endDate, siteId, device = 'all' } = req.query;
    if (!siteId) {
        return res.status(400).json({ success: false, message: 'Site ID is required' });
    }
    const userId = req.user._id;

    const cacheKey = getAnalyticsCacheKey(userId, 'gsc', { ...req.query, startDate, endDate, device });
    const cachedData = analyticsCache.get(cacheKey);
    if (cachedData) return res.status(200).json(cachedData);

    try {
        const acc = await UserAccounts.findOne({ _id: siteId, userId }).select('siteName gscLastSyncedAt gscHistoricalComplete');
        if (!acc) {
            return res.status(404).json({ success: false, message: 'Account not found' });
        }
        const siteName = acc.siteName;
        const gscLastSyncedAt = acc.gscLastSyncedAt;
        const gscHistoricalComplete = acc.gscHistoricalComplete;

        const filter = await buildMatchFilter(userId, { ...req.query, device: 'all', startDate, endDate });

        const start = new Date(startDate);
        const end = new Date(endDate);
        const diff = end - start;
        const prevEnd = new Date(start.getTime() - (24 * 60 * 60 * 1000));
        const prevStart = new Date(prevEnd.getTime() - diff);
        const prevFilter = await buildMatchFilter(userId, { ...req.query, device: 'all', startDate: prevStart.toISOString().split('T')[0], endDate: prevEnd.toISOString().split('T')[0] });

        const [overview, priorOverview, timeseries, queries, pages, pagesCount, queriesCount, topPosData] = await Promise.all([
            GscMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: null,
                        clicks: { $sum: "$metrics.clicks" },
                        impressions: { $sum: "$metrics.impressions" },
                        position: { $avg: "$metrics.position" }
                    }
                }
            ]),
            GscMetric.aggregate([
                { $match: prevFilter },
                {
                    $group: {
                        _id: null,
                        clicks: { $sum: "$metrics.clicks" },
                        impressions: { $sum: "$metrics.impressions" },
                        position: { $avg: "$metrics.position" }
                    }
                }
            ]),
            GscMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                        clicks: { $sum: "$metrics.clicks" },
                        impressions: { $sum: "$metrics.impressions" },
                        position: { $avg: "$metrics.position" }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            GscMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: "$metadata.dimensions.query",
                        clicks: { $sum: "$metrics.clicks" },
                        impressions: { $sum: "$metrics.impressions" },
                        position: { $avg: "$metrics.position" }
                    }
                },
                { $sort: { clicks: -1 } },
                { $limit: 20 }
            ]),
            GscMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: "$metadata.dimensions.page",
                        clicks: { $sum: "$metrics.clicks" },
                        impressions: { $sum: "$metrics.impressions" },
                        position: { $avg: "$metrics.position" }
                    }
                },
                { $sort: { clicks: -1 } },
                { $limit: 10 }
            ]),
            GscMetric.aggregate([
                { $match: filter },
                { $group: { _id: "$metadata.dimensions.page" } },
                { $count: "count" }
            ]),
            GscMetric.aggregate([
                { $match: filter },
                { $group: { _id: "$metadata.dimensions.query" } },
                { $count: "count" }
            ]),
            GscMetric.aggregate([
                { $match: filter },
                { $group: { _id: null, minPos: { $min: "$metrics.position" } } }
            ])
        ]);

        const result = {
            searchClicks: {
                value: overview[0]?.clicks || 0,
                change: priorOverview[0]?.clicks ? parseFloat((((overview[0]?.clicks - priorOverview[0]?.clicks) / priorOverview[0]?.clicks) * 100 || 0).toFixed(1)) : 0,
                isPositive: (overview[0]?.clicks || 0) >= (priorOverview[0]?.clicks || 0),
                timeseries: timeseries.map(d => ({ clicks: d.clicks || 0 }))
            },
            impressions: {
                value: overview[0]?.impressions || 0,
                change: priorOverview[0]?.impressions ? parseFloat((((overview[0]?.impressions - priorOverview[0]?.impressions) / priorOverview[0]?.impressions) * 100 || 0).toFixed(1)) : 0,
                isPositive: (overview[0]?.impressions || 0) >= (priorOverview[0]?.impressions || 0),
                timeseries: timeseries.map(d => ({ impressions: d.impressions || 0 }))
            },
            avgCTR: {
                value: parseFloat(((overview[0]?.impressions > 0 ? overview[0]?.clicks / overview[0]?.impressions : 0) * 100).toFixed(2)),
                change: (priorOverview[0]?.impressions > 0 ? priorOverview[0]?.clicks / priorOverview[0]?.impressions : 0) > 0
                    ? parseFloat(((((overview[0]?.impressions > 0 ? overview[0]?.clicks / overview[0]?.impressions : 0) - (priorOverview[0]?.impressions > 0 ? priorOverview[0]?.clicks / priorOverview[0]?.impressions : 0)) / (priorOverview[0]?.impressions > 0 ? priorOverview[0]?.clicks / priorOverview[0]?.impressions : 0)) * 100 || 0).toFixed(1))
                    : 0,
                isPositive: (overview[0]?.impressions > 0 ? overview[0]?.clicks / overview[0]?.impressions : 0) >= (priorOverview[0]?.impressions > 0 ? priorOverview[0]?.clicks / priorOverview[0]?.impressions : 0),
                timeseries: timeseries.map(d => ({ ctr: parseFloat(((d.impressions > 0 ? d.clicks / d.impressions : 0) * 100).toFixed(2)) }))
            },
            avgPosition: {
                value: parseFloat((overview[0]?.position || 0).toFixed(1)),
                change: overview[0]?.position ? parseFloat((((priorOverview[0]?.position - overview[0]?.position) / overview[0]?.position) * 100 || 0).toFixed(1)) : 0,
                isPositive: (overview[0]?.position || 0) <= (priorOverview[0]?.position || 0),
                timeseries: timeseries.map(d => ({ position: parseFloat((d.position || 0).toFixed(1)) }))
            },
            totalQueries: queriesCount[0]?.count || 0,
            totalPages: pagesCount[0]?.count || 0,
            topPosition: parseFloat((topPosData[0]?.minPos || 0).toFixed(1)),
            searchPerformanceOverview: timeseries.map(d => ({
                date: d._id,
                clicks: d.clicks || 0,
                impressions: d.impressions || 0,
            })),
            clickThroughRateTrend: timeseries.map(d => ({
                date: d._id,
                ctr: parseFloat(((d.impressions > 0 ? d.clicks / d.impressions : 0) * 100).toFixed(2))
            })),
            averageRankingPosition: timeseries.map(d => ({
                date: d._id,
                position: parseFloat((d.position || 0).toFixed(1)),
            })),
            lowCTRKeywords: queries.map(d => ({
                query: d._id,
                clicks: d.clicks,
                impressions: d.impressions,
                ctr: parseFloat(((d.impressions > 0 ? d.clicks / d.impressions : 0) * 100).toFixed(2)),
                position: parseFloat((d.position || 0).toFixed(1))
            })).filter(d => d.impressions > 50 && d.ctr < 5.0),
            keywordsNearPage1: queries.map(d => ({
                query: d._id,
                clicks: d.clicks,
                impressions: d.impressions,
                ctr: parseFloat(((d.impressions > 0 ? d.clicks / d.impressions : 0) * 100).toFixed(2)),
                position: parseFloat((d.position || 0).toFixed(1))
            })).filter(d => d.position >= 8 && d.position <= 20),
            topQueries: queries.map(d => ({
                query: d._id,
                clicks: d.clicks,
                impressions: d.impressions,
                ctr: parseFloat(((d.impressions > 0 ? d.clicks / d.impressions : 0) * 100).toFixed(2)),
                position: parseFloat((d.position || 0).toFixed(1))
            })),
            topLandingPages: pages.map(d => ({
                page: d._id,
                clicks: d.clicks,
                impressions: d.impressions,
                ctr: parseFloat(((d.impressions > 0 ? d.clicks / d.impressions : 0) * 100).toFixed(2)),
                position: parseFloat((d.position || 0).toFixed(1))
            })),
            dailyImpressionVolume: timeseries.map(d => ({
                date: d._id,
                impressions: d.impressions || 0,
            })),
            periodComparison: {
                thisPeriod: {
                    clicks: overview[0]?.clicks || 0,
                    impressions: overview[0]?.impressions || 0,
                    ctr: parseFloat(((overview[0]?.impressions > 0 ? overview[0]?.clicks / overview[0]?.impressions : 0) * 100).toFixed(2)),
                    position: parseFloat((overview[0]?.position || 0).toFixed(1))
                },
                lastPeriod: {
                    clicks: priorOverview[0]?.clicks || 0,
                    impressions: priorOverview[0]?.impressions || 0,
                    ctr: parseFloat(((priorOverview[0]?.impressions > 0 ? priorOverview[0]?.clicks / priorOverview[0]?.impressions : 0) * 100).toFixed(2)),
                    position: parseFloat((priorOverview[0]?.position || 0).toFixed(1))
                },
                change: {
                    clicks: priorOverview[0]?.clicks ? parseFloat((((overview[0]?.clicks - priorOverview[0]?.clicks) / priorOverview[0]?.clicks) * 100 || 0).toFixed(1)) : 0,
                    impressions: priorOverview[0]?.impressions ? parseFloat((((overview[0]?.impressions - priorOverview[0]?.impressions) / priorOverview[0]?.impressions) * 100 || 0).toFixed(1)) : 0,
                    ctr: (priorOverview[0]?.impressions > 0 ? priorOverview[0]?.clicks / priorOverview[0]?.impressions : 0) > 0
                        ? parseFloat(((((overview[0]?.impressions > 0 ? overview[0]?.clicks / overview[0]?.impressions : 0) - (priorOverview[0]?.impressions > 0 ? priorOverview[0]?.clicks / priorOverview[0]?.impressions : 0)) / (priorOverview[0]?.impressions > 0 ? priorOverview[0]?.clicks / priorOverview[0]?.impressions : 0)) * 100 || 0).toFixed(1))
                        : 0,
                    position: overview[0]?.position ? parseFloat((((priorOverview[0]?.position - overview[0]?.position) / overview[0]?.position) * 100 || 0).toFixed(1)) : 0
                }
            }
        };

        const existingAi = await AiIntelligence.findOne({
            siteId,
            platform: 'gsc',
            startDate,
            endDate,
            device
        });

        const isAiValid = existingAi &&
            existingAi.lastSyncedAtOnGeneration >= (gscLastSyncedAt || 0);

        if (isAiValid) {
            result.intelligence = existingAi.content;
        } else {
            if (!gscHistoricalComplete) {
                result.intelligence = getPlaceholderIntelligence('gsc', 'syncing');
            } else {
                if (!(result.searchClicks?.value > 0)) {
                    result.intelligence = getPlaceholderIntelligence('gsc', 'no_data');
                } else {
                    result.intelligence = await generateGscIntelligence(result, siteName);

                    if (siteId && !result.intelligence.isFallback) {
                        await AiIntelligence.findOneAndUpdate(
                            { siteId, platform: 'gsc', startDate, endDate, device },
                            {
                                userId,
                                content: result.intelligence,
                                lastSyncedAtOnGeneration: gscLastSyncedAt || new Date(),
                                createdAt: new Date()
                            },
                            { upsert: true }
                        );
                    }
                }
            }
        }

        if (gscHistoricalComplete) analyticsCache.set(cacheKey, result);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getGoogleAdsSummary = async (req, res) => {
    const { startDate, endDate, siteId } = req.query;
    if (!siteId) {
        return res.status(400).json({ success: false, message: 'Site ID is required' });
    }
    const userId = req.user._id;

    const cacheKey = getAnalyticsCacheKey(userId, 'gads', req.query);
    const cachedData = analyticsCache.get(cacheKey);
    if (cachedData) return res.status(200).json(cachedData);

    try {
        const acc = await UserAccounts.findOne({ _id: siteId, userId }).select('siteName googleAdsLastSyncedAt syncStatus googleAdsHistoricalComplete');
        if (!acc) {
            return res.status(404).json({ success: false, message: 'Account not found' });
        }

        const syncMetadata = {
            siteName: acc.siteName,
            lastSyncedAt: acc.googleAdsLastSyncedAt,
            syncStatus: acc.syncStatus,
            googleAdsHistoricalComplete: acc.googleAdsHistoricalComplete
        };
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diff = end - start;
        const prevEnd = new Date(start.getTime() - (24 * 60 * 60 * 1000));
        const prevStart = new Date(prevEnd.getTime() - diff);
        const prevStartDate = prevStart.toISOString().split('T')[0];
        const prevEndDate = prevEnd.toISOString().split('T')[0];

        const filter = await buildMatchFilter(userId, req.query);
        const prevFilter = await buildMatchFilter(userId, { ...req.query, startDate: prevStartDate, endDate: prevEndDate });

        const [overview, priorOverview, timeseries, campaigns, keywords, deviceBreakdown] = await Promise.all([
            GoogleAdsMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: null,
                        cost: { $sum: "$metrics.spend" },
                        impressions: { $sum: "$metrics.impressions" },
                        clicks: { $sum: "$metrics.clicks" },
                        conversions: { $sum: "$metrics.conversions" }
                    }
                }
            ]),
            GoogleAdsMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                        cost: { $sum: "$metrics.spend" },
                        clicks: { $sum: "$metrics.clicks" },
                        impressions: { $sum: "$metrics.impressions" },
                        conversions: { $sum: "$metrics.conversions" }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            GoogleAdsMetric.aggregate([
                { $match: prevFilter },
                {
                    $group: {
                        _id: null,
                        cost: { $sum: "$metrics.spend" },
                        impressions: { $sum: "$metrics.impressions" },
                        clicks: { $sum: "$metrics.clicks" },
                        conversions: { $sum: "$metrics.conversions" }
                    }
                }
            ]),
            GoogleAdsMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: { name: "$metadata.dimensions.campaign", status: "$metadata.dimensions.campaignStatus" },
                        cost: { $sum: "$metrics.spend" },
                        impressions: { $sum: "$metrics.impressions" },
                        clicks: { $sum: "$metrics.clicks" },
                        conversions: { $sum: "$metrics.conversions" }
                    }
                },
                { $sort: { cost: -1 } }
            ]),
            GoogleAdsMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: "$metadata.dimensions.adGroup",
                        cost: { $sum: "$metrics.spend" },
                        impressions: { $sum: "$metrics.impressions" },
                        clicks: { $sum: "$metrics.clicks" }
                    }
                },
                { $sort: { cost: -1 } },
                { $limit: 10 }
            ]),
            GoogleAdsMetric.aggregate([
                { $match: filter },
                { $group: { _id: "$metadata.dimensions.device", value: { $sum: "$metrics.spend" } } }
            ])
        ]);


        const ov = overview[0] || { cost: 0, impressions: 0, clicks: 0, conversions: 0 };
        const pov = priorOverview[0] || { cost: 0, impressions: 0, clicks: 0, conversions: 0 };

        const result = {
            overview: {
                ...ov,
                spend: ov.cost,
                ctr: ov.impressions > 0 ? ov.clicks / ov.impressions : 0,
                cpc: ov.clicks > 0 ? ov.cost / ov.clicks : 0,
                conversionRate: ov.clicks > 0 ? ov.conversions / ov.clicks : 0
            },
            priorOverview: {
                ...pov,
                spend: pov.cost,
                ctr: pov.impressions > 0 ? pov.clicks / pov.impressions : 0,
                cpc: pov.clicks > 0 ? pov.cost / pov.clicks : 0,
                conversionRate: pov.clicks > 0 ? pov.conversions / pov.clicks : 0
            },
            timeseries: timeseries.map(d => ({
                date: d._id,
                cost: d.cost,
                clicks: d.clicks,
                impressions: d.impressions,
                conversions: d.conversions
            })),
            devices: deviceBreakdown.map(d => ({ name: d._id || 'unknown', value: d.value })),
            campaigns: campaigns.map(d => ({
                name: d._id.name,
                status: d._id.status,
                cost: d.cost,
                impressions: d.impressions,
                clicks: d.clicks,
                conversions: d.conversions,
                ctr: d.impressions > 0 ? d.clicks / d.impressions : 0,
                cpc: d.clicks > 0 ? d.cost / d.clicks : 0
            })),
            keywords: keywords.map(d => ({
                name: d._id,
                cost: d.cost,
                impressions: d.impressions,
                clicks: d.clicks,
                ctr: d.impressions > 0 ? d.clicks / d.impressions : 0,
                cpc: d.clicks > 0 ? d.cost / d.clicks : 0
            })),
            syncMetadata
        };

        // Cache only when Google Ads historical sync is complete
        if (syncMetadata.googleAdsHistoricalComplete) analyticsCache.set(cacheKey, result);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getFacebookAdsSummary = async (req, res) => {
    const { startDate, endDate, siteId } = req.query;
    if (!siteId) {
        return res.status(400).json({ success: false, message: 'Site ID is required' });
    }
    const userId = req.user._id;

    const cacheKey = getAnalyticsCacheKey(userId, 'fbads', req.query);
    const cachedData = analyticsCache.get(cacheKey);
    if (cachedData) return res.status(200).json(cachedData);

    try {
        const acc = await UserAccounts.findOne({ _id: siteId, userId }).select('siteName facebookAdsLastSyncedAt syncStatus facebookAdsHistoricalComplete');
        if (!acc) {
            return res.status(404).json({ success: false, message: 'Account not found' });
        }

        const syncMetadata = {
            siteName: acc.siteName,
            lastSyncedAt: acc.facebookAdsLastSyncedAt,
            syncStatus: acc.syncStatus,
            facebookAdsHistoricalComplete: acc.facebookAdsHistoricalComplete
        };
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diff = end - start;
        const prevEnd = new Date(start.getTime() - (24 * 60 * 60 * 1000));
        const prevStart = new Date(prevEnd.getTime() - diff);
        const prevStartDate = prevStart.toISOString().split('T')[0];
        const prevEndDate = prevEnd.toISOString().split('T')[0];

        const filter = await buildMatchFilter(userId, req.query);
        const prevFilter = await buildMatchFilter(userId, { ...req.query, startDate: prevStartDate, endDate: prevEndDate });

        const [overview, priorOverview, timeseries, campaigns, adsets, deviceBreakdown] = await Promise.all([
            FacebookAdsMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: null,
                        spend: { $sum: "$metrics.spend" },
                        impressions: { $sum: "$metrics.impressions" },
                        clicks: { $sum: "$metrics.clicks" },
                        conversions: { $sum: "$metrics.conversions" },
                        reach: { $sum: "$metrics.reach" },
                        purchase_value: { $sum: "$metrics.purchase_value" }
                    }
                }
            ]),
            FacebookAdsMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                        spend: { $sum: "$metrics.spend" },
                        clicks: { $sum: "$metrics.clicks" },
                        impressions: { $sum: "$metrics.impressions" },
                        reach: { $sum: "$metrics.reach" }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            FacebookAdsMetric.aggregate([
                { $match: prevFilter },
                {
                    $group: {
                        _id: null,
                        spend: { $sum: "$metrics.spend" },
                        impressions: { $sum: "$metrics.impressions" },
                        clicks: { $sum: "$metrics.clicks" },
                        conversions: { $sum: "$metrics.conversions" },
                        reach: { $sum: "$metrics.reach" },
                        purchase_value: { $sum: "$metrics.purchase_value" }
                    }
                }
            ]),
            FacebookAdsMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: "$metadata.dimensions.campaign",
                        spend: { $sum: "$metrics.spend" },
                        impressions: { $sum: "$metrics.impressions" },
                        clicks: { $sum: "$metrics.clicks" },
                        conversions: { $sum: "$metrics.conversions" },
                        reach: { $sum: "$metrics.reach" }
                    }
                },
                { $sort: { spend: -1 } }
            ]),
            FacebookAdsMetric.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: "$metadata.dimensions.adset",
                        spend: { $sum: "$metrics.spend" },
                        impressions: { $sum: "$metrics.impressions" },
                        clicks: { $sum: "$metrics.clicks" },
                        conversions: { $sum: "$metrics.conversions" },
                        reach: { $sum: "$metrics.reach" }
                    }
                },
                { $sort: { spend: -1 } },
                { $limit: 10 }
            ]),
            FacebookAdsMetric.aggregate([
                { $match: filter },
                { $group: { _id: "$metadata.dimensions.device", value: { $sum: "$metrics.spend" } } }
            ])
        ]);


        const ov = overview[0] || { spend: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0, purchase_value: 0 };
        const pov = priorOverview[0] || { spend: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0, purchase_value: 0 };

        const result = {
            overview: {
                ...ov,
                ctr: ov.impressions > 0 ? (ov.clicks / ov.impressions) * 100 : 0,
                cpc: ov.clicks > 0 ? ov.spend / ov.clicks : 0,
                roas: ov.spend > 0 ? (ov.purchase_value || (ov.conversions * 50)) / ov.spend : 0
            },
            priorOverview: {
                ...pov,
                ctr: pov.impressions > 0 ? (pov.clicks / pov.impressions) * 100 : 0,
                cpc: pov.clicks > 0 ? pov.spend / pov.clicks : 0,
                roas: pov.spend > 0 ? (pov.purchase_value || (pov.conversions * 50)) / pov.spend : 0
            },
            timeseries: timeseries.map(d => ({
                date: d._id,
                spend: d.spend,
                clicks: d.clicks,
                impressions: d.impressions,
                reach: d.reach || 0
            })),
            devices: deviceBreakdown.map(d => ({ name: d._id || 'unknown', value: d.value })),
            campaigns: campaigns.map(d => ({
                name: d._id,
                spend: d.spend,
                impressions: d.impressions,
                clicks: d.clicks,
                conversions: d.conversions,
                reach: d.reach || 0,
                ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
                cpc: d.clicks > 0 ? d.spend / d.clicks : 0
            })),
            adsets: adsets.map(d => ({
                name: d._id,
                spend: d.spend,
                impressions: d.impressions,
                clicks: d.clicks,
                conversions: d.conversions,
                reach: d.reach || 0,
                ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
                cpc: d.clicks > 0 ? d.spend / d.clicks : 0
            })),
            syncMetadata
        };

        // Cache only when Facebook Ads historical sync is complete
        if (syncMetadata.facebookAdsHistoricalComplete) analyticsCache.set(cacheKey, result);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const syncAccountData = async (req, res) => {
    const { siteId } = req.body;
    const userId = req.user._id;

    if (!siteId) {
        return res.status(400).json({ success: false, message: 'Site ID is required' });
    }

    try {
        const acc = await UserAccounts.findOne({ _id: siteId, userId });
        if (!acc) {
            return res.status(404).json({ success: false, message: 'Account not found' });
        }

        // Check if sync was done very recently (e.g. within 30 minutes) to prevent abuse
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
        // Use the most recent platform sync as the check
        const latestSync = Math.max(
            new Date(acc.gscLastSyncedAt || 0),
            new Date(acc.ga4LastSyncedAt || 0),
            new Date(acc.googleAdsLastSyncedAt || 0),
            new Date(acc.facebookAdsLastSyncedAt || 0)
        );

        if (latestSync > thirtyMinsAgo.getTime() && acc.syncStatus !== 'error') {
            return res.status(200).json({
                success: true,
                message: 'Data is already up to date (synced within last 30 minutes)',
                alreadySynced: true
            });
        }

        // Update status to syncing
        await UserAccounts.findByIdAndUpdate(siteId, { syncStatus: 'syncing' });

        // Calculate a small window for daily refresh (last 7 days)
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const startDate = sevenDaysAgo.toISOString().split('T')[0];
        const endDate = todayStr;

        // Perform sync for all connected platforms on this account
        const syncTasks = [];
        if (acc.gscSiteUrl) syncTasks.push(syncGsc(acc, startDate, endDate));
        if (acc.ga4PropertyId) syncTasks.push(syncGa4(acc, startDate, endDate));
        if (acc.googleAdsCustomerId) syncTasks.push(syncGoogleAds(acc, startDate, endDate));
        if (acc.facebookAdAccountId) syncTasks.push(syncFacebookAds(acc, startDate, endDate));

        await Promise.all(syncTasks);

        // Update status back to idle and refresh platform timestamps
        const updateFields = { syncStatus: 'idle' };
        if (acc.gscSiteUrl) updateFields.gscLastSyncedAt = new Date();
        if (acc.ga4PropertyId) updateFields.ga4LastSyncedAt = new Date();
        if (acc.googleAdsCustomerId) updateFields.googleAdsLastSyncedAt = new Date();
        if (acc.facebookAdAccountId) updateFields.facebookAdsLastSyncedAt = new Date();

        await UserAccounts.findByIdAndUpdate(siteId, updateFields);

        // Clear cache for this user since data has changed
        clearUserCache(userId);

        res.status(200).json({
            success: true,
            message: 'Synchronization completed successfully'
        });
    } catch (error) {
        console.error('Manual Sync Error:', error);
        await UserAccounts.findByIdAndUpdate(siteId, { syncStatus: 'error' });
        res.status(500).json({
            success: false,
            message: 'Synchronization failed: ' + error.message
        });
    }
};
