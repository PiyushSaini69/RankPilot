import { startAgenticChat } from '../services/geminiService.js';
import { createNotification } from '../utils/notification.js';

import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import WeeklyInsight from '../models/WeeklyInsight.js';
import SuggestedQuestions from '../models/SuggestedQuestions.js';
import UserAccounts from '../models/UserAccounts.js';
import Ga4Metric from '../models/Ga4Metric.js';
import GscMetric from '../models/GscMetric.js';
import GoogleAdsMetric from '../models/GoogleAdsMetric.js';
import FacebookAdsMetric from '../models/FacebookAdsMetric.js';
import fs from 'fs';
import path from 'path';

const aiTools = [
    {
        name: "get_market_data",
        description: `Fetch analytics data from GA4, GSC, Google Ads, and Meta Ads.

CRITICAL - ALWAYS follow these rules to avoid fetching unnecessary data:

1. SOURCES: Only pass the platforms relevant to the question.
   - Bounce rate, sessions, traffic, pages → ['ga4']
   - CTR, impressions, search queries → ['gsc']
   - Ad spend, ROAS, campaigns → ['google-ads'] or ['facebook-ads']
   - Full report / overview → leave empty (fetches all)

2. FIELDS: Only pass the specific metrics needed.
   - "bounce rate" → fields: ['bounceRate']
   - "sessions" → fields: ['sessions']
   - "top pages" → fields: ['sessions', 'pageViews']
   - "ad spend" → fields: ['spend', 'conversions']
   - Full report → leave empty (fetches all)

3. MODE: Pick the right fetch depth.
   - Single metric question → mode: 'summary'   (fastest, totals only)
   - Top pages / channel breakdown → mode: 'standard' (totals + daily + top lists)
   - Full report / deep dive → mode: 'full'  (everything)

Examples:
- "What is my bounce rate?" → sources: ['ga4'], fields: ['bounceRate'], mode: 'summary'
- "Which pages get most traffic?" → sources: ['ga4'], fields: ['sessions','pageViews'], mode: 'standard'
- "How are my Google Ads campaigns?" → sources: ['google-ads'], fields: [], mode: 'standard'
- "Give me a full overview" → sources: [], fields: [], mode: 'full'`,

        parameters: {
            type: "OBJECT",
            properties: {
                startDate: { type: "STRING", description: "Start date in YYYY-MM-DD format." },
                endDate: { type: "STRING", description: "End date in YYYY-MM-DD format." },
                sources: { 
                    type: "ARRAY", 
                    items: { type: "STRING" }, 
                    description: "Platforms to fetch: 'ga4', 'gsc', 'google-ads', 'facebook-ads'. Pass only what's needed. Empty = all platforms." 
                },
                fields: {
                    type: "ARRAY",
                    items: { type: "STRING" },
                    description: "Specific metrics to fetch. Empty = all metrics. Examples: ['bounceRate'], ['sessions','pageViews'], ['spend','conversions']"
                },
                mode: {
                    type: "STRING",
                    description: "Fetch depth: 'summary' (totals only, fastest), 'standard' (totals + daily + top lists), 'full' (everything including countries, ad groups, page titles). Default: 'standard'"
                },
                device: { 
                    type: "STRING", 
                    description: "Filter by device: 'mobile', 'desktop', or 'tablet'. Leave empty for all." 
                }
            },
            required: ["startDate", "endDate"]
        }
    }
];

const executeTool = async (name, args, userId, siteId, userTimezone) => {
    if (name === "get_market_data") {
        return await fetchPlatformData(
            userId, 
            args.startDate, 
            args.endDate, 
            siteId, 
            args.sources || [], 
            args.device || null,
            userTimezone,
            args.fields || [],
            args.mode || 'standard'
        );
    }
    return { error: "Unknown tool" };
};

export const fetchPlatformData = async (
    userId,
    startDate,
    endDate,
    siteId,
    activeSources = [],
    device = null,
    userTimezone = 'UTC',
    fields = [],
    mode = 'standard'
) => {

    const sourceList = Array.isArray(activeSources) ? activeSources : (activeSources ? [activeSources] : []);
    const normalizedActiveSources = sourceList.map(s => String(s).toLowerCase().trim().replace(/[\s_]/g, '-'));
    const requestedFields = Array.isArray(fields) ? fields : [];

    // Correct timezone handling
    const nowLocal = new Date(new Date().toLocaleString('en-US', { timeZone: userTimezone }));

    if (!startDate || !endDate) {
        if (!endDate) endDate = nowLocal.toISOString().split('T')[0];
        if (!startDate) {
            const date = new Date(nowLocal);
            date.setDate(date.getDate() - 90);
            startDate = date.toISOString().split('T')[0];
        }
    }

    const query = siteId ? { _id: siteId, userId } : { userId };
    const userAcc = await UserAccounts.findOne(query).sort({ updatedAt: -1 });
    if (!userAcc) return { startDate, endDate, error: "No connected account found" };

    let data = {
        siteName: userAcc.siteName,
        startDate,
        endDate,
        mode,
        device: device || 'all',
        today: nowLocal.toISOString().split('T')[0]
    };

    // Comparison range (previous period = same length before current)
    const currentStart = new Date(startDate);
    const currentEnd = new Date(endDate);
    const daysDiff = Math.ceil((currentEnd - currentStart) / (1000 * 3600 * 24)) + 1;

    const prevEnd = new Date(currentStart);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - daysDiff + 1);

    data.comparisonRange = {
        startDate: prevStart.toISOString().split('T')[0],
        endDate: prevEnd.toISOString().split('T')[0]
    };

    const getGrowth = (curr, prev) => {
        if (!prev || prev === 0) return curr > 0 ? "100.0" : "0.0";
        return (((curr - prev) / prev) * 100).toFixed(1);
    };

    const deviceFilter = device ? { 'metadata.dimensions.device': device.toLowerCase() } : {};

    const ALL_METRICS = {
        'ga4': ['users', 'newUsers', 'sessions', 'engagedSessions', 'pageViews', 'avgSessionDuration', 'engagementRate', 'bounceRate', 'revenue', 'transactions', 'conversions'],
        'gsc': ['clicks', 'impressions', 'position', 'ctr'],
        'google-ads': ['spend', 'impressions', 'clicks', 'conversions', 'conversionValue', 'allConversions', 'viewThroughConversions', 'searchImpressionShare', 'cpc', 'ctr', 'cpm'],
        'facebook-ads': ['spend', 'impressions', 'clicks', 'reach', 'conversions', 'purchase_value', 'landing_page_views', 'link_clicks', 'frequency', 'engagement', 'cpc', 'cpm', 'ctr']
    };

    const DERIVED_DEPS = {
        bounceRate: ['engagedSessions', 'sessions'],
        engagementRate: ['engagedSessions', 'sessions'],
        ctr: ['clicks', 'impressions'],
        cpc: ['spend', 'clicks'],
        cpm: ['spend', 'impressions'],
        roas: ['conversionValue', 'spend'],
    };

    const expandFields = (fields, platformKey) => {
        if (fields.length === 0) return ALL_METRICS[platformKey];
        const expanded = new Set(fields);
        fields.forEach(f => { if (DERIVED_DEPS[f]) DERIVED_DEPS[f].forEach(d => expanded.add(d)); });
        return ALL_METRICS[platformKey].filter(m => expanded.has(m));
    };

    const AVG_METRICS = ['position', 'avgSessionDuration', 'frequency', 'searchImpressionShare', 'ctr', 'bounceRate', 'engagementRate', 'cpc', 'cpm'];

    const sourceConfigs = [
        { key: 'ga4',          model: Ga4Metric,        id: userAcc.ga4PropertyId,       type: 'analytics' },
        { key: 'gsc',          model: GscMetric,         id: userAcc.gscSiteUrl,           type: 'search'    },
        { key: 'google-ads',   model: GoogleAdsMetric,   id: userAcc.googleAdsCustomerId,  type: 'ads'       },
        { key: 'facebook-ads', model: FacebookAdsMetric, id: userAcc.facebookAdAccountId,  type: 'ads'       }
    ]
    .filter(s => s.id && (normalizedActiveSources.length === 0 || normalizedActiveSources.includes(s.key)))
    .map(s => ({ ...s, metrics: expandFields(requestedFields, s.key) }));

    const results = {
        totals: [], dailyBreakdown: [],
        // GA4
        topPages: [], topPageTitles: [], topLandingPages: [],
        topChannels: [], topSources: [], topDevices: [], topCountries: [],
        // GSC
        topQueries: [], topGscPages: [], topGscDevices: [], topGscCountries: [],
        // Ads
        topCampaigns: [], topAdGroups: [], topAdsets: [], topNetworks: [],
        platformErrors: []
    };

    const aggTasks = sourceConfigs.map(async (config) => {
        try {
            const baseFilter = { 'metadata.platformAccountId': config.id, ...deviceFilter };

            // ── 1. TOTALS (always) ──────────────────────────────────────────
            const totalsAgg = await config.model.aggregate([
                { $match: { ...baseFilter, date: { $gte: prevStart, $lte: currentEnd } } },
                {
                    $group: {
                        _id: { period: { $cond: [{ $gte: ['$date', currentStart] }, 'current', 'previous'] } },
                        ...Object.fromEntries(config.metrics.map(m => [
                            m, AVG_METRICS.includes(m) ? { $avg: `$metrics.${m}` } : { $sum: `$metrics.${m}` }
                        ])),
                        count: { $sum: 1 }
                    }
                }
            ]);
            totalsAgg.forEach(t => {
                const sums = {};
                config.metrics.forEach(m => { sums[m] = t[m] || 0; });
                results.totals.push({ source: config.key, period: t._id.period, sums, counts: t.count });
            });

            if (mode === 'summary') return; // stop here for simple queries

            // ── 2. DAILY BREAKDOWN (standard + full) ───────────────────────
            const dailyAgg = await config.model.aggregate([
                { $match: { ...baseFilter, date: { $gte: currentStart, $lte: currentEnd } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                        ...Object.fromEntries(config.metrics.map(m => [
                            m, AVG_METRICS.includes(m) ? { $avg: `$metrics.${m}` } : { $sum: `$metrics.${m}` }
                        ]))
                    }
                },
                { $sort: { _id: 1 } }
            ]);
            dailyAgg.forEach(d => {
                const metrics = {};
                config.metrics.forEach(m => { metrics[m] = d[m] || 0; });
                results.dailyBreakdown.push({ date: d._id, source: config.key, metrics });
            });

            const isFull = mode === 'full';

            // ── 3. GA4 DIMENSIONS ───────────────────────────────────────────
            if (config.key === 'ga4') {

                // Top Pages by pagePath (standard + full)
                const pages = await Ga4Metric.aggregate([
                    { $match: { ...baseFilter, date: { $gte: prevStart, $lte: currentEnd } } },
                    { $group: {
                        _id: { path: "$metadata.dimensions.pagePath", period: { $cond: [{ $gte: ['$date', currentStart] }, 'current', 'previous'] } },
                        sessions: { $sum: "$metrics.sessions" },
                        pageViews: { $sum: "$metrics.pageViews" },
                        engagedSessions: { $sum: "$metrics.engagedSessions" }
                    }},
                    { $group: {
                        _id: "$_id.path",
                        currentSessions: { $sum: { $cond: [{ $eq: ["$_id.period", "current"] }, "$sessions", 0] } },
                        priorSessions: { $sum: { $cond: [{ $eq: ["$_id.period", "previous"] }, "$sessions", 0] } },
                        pageViews: { $sum: { $cond: [{ $eq: ["$_id.period", "current"] }, "$pageViews", 0] } },
                        engagedSessions: { $sum: { $cond: [{ $eq: ["$_id.period", "current"] }, "$engagedSessions", 0] } }
                    }},
                    { $sort: { currentSessions: -1 } }, { $limit: 25 }
                ]);
                results.topPages = pages.map(i => ({
                    path: i._id,
                    sessions: i.currentSessions,
                    priorSessions: i.priorSessions,
                    growth: getGrowth(i.currentSessions, i.priorSessions),
                    pageViews: i.pageViews,
                    engagementRate: i.currentSessions > 0 ? ((i.engagedSessions / i.currentSessions) * 100).toFixed(1) + '%' : "0.0%"
                }));

                // Top Channels (standard + full)
                const channels = await Ga4Metric.aggregate([
                    { $match: { ...baseFilter, date: { $gte: prevStart, $lte: currentEnd } } },
                    { $group: {
                        _id: { channel: "$metadata.dimensions.channel", period: { $cond: [{ $gte: ['$date', currentStart] }, 'current', 'previous'] } },
                        sessions: { $sum: "$metrics.sessions" },
                        engagedSessions: { $sum: "$metrics.engagedSessions" }
                    }},
                    { $group: {
                        _id: "$_id.channel",
                        currentSessions: { $sum: { $cond: [{ $eq: ["$_id.period", "current"] }, "$sessions", 0] } },
                        priorSessions: { $sum: { $cond: [{ $eq: ["$_id.period", "previous"] }, "$sessions", 0] } },
                        engagedSessions: { $sum: { $cond: [{ $eq: ["$_id.period", "current"] }, "$engagedSessions", 0] } }
                    }},
                    { $sort: { currentSessions: -1 } }, { $limit: 15 }
                ]);
                results.topChannels = channels.map(i => ({
                    channel: i._id || 'Unknown',
                    sessions: i.currentSessions,
                    priorSessions: i.priorSessions,
                    growth: getGrowth(i.currentSessions, i.priorSessions),
                    engagementRate: i.currentSessions > 0 ? ((i.engagedSessions / i.currentSessions) * 100).toFixed(1) + '%' : "0.0%"
                }));

                // Devices (standard + full)
                const devices = await Ga4Metric.aggregate([
                    { $match: { ...baseFilter, date: { $gte: currentStart, $lte: currentEnd } } },
                    { $group: {
                        _id: "$metadata.dimensions.device",
                        sessions: { $sum: "$metrics.sessions" },
                        engagedSessions: { $sum: "$metrics.engagedSessions" }
                    }},
                    { $sort: { sessions: -1 } }
                ]);
                results.topDevices = devices.map(i => ({
                    device: i._id || 'Unknown',
                    sessions: i.sessions,
                    engagementRate: i.sessions > 0 ? ((i.engagedSessions / i.sessions) * 100).toFixed(1) + '%' : "0.0%",
                    source: 'ga4'
                }));

                if (isFull) {
                    // Top Sources — FIX: split "source / medium" into separate fields
                    const sources = await Ga4Metric.aggregate([
                        { $match: { ...baseFilter, date: { $gte: prevStart, $lte: currentEnd } } },
                        { $addFields: {
                            sourceName: { $trim: { input: { $arrayElemAt: [{ $split: ["$metadata.dimensions.source", " / "] }, 0] } } },
                            mediumName: { $trim: { input: { $arrayElemAt: [{ $split: ["$metadata.dimensions.source", " / "] }, 1] } } }
                        }},
                        { $group: {
                            _id: { source: "$sourceName", medium: "$mediumName", period: { $cond: [{ $gte: ['$date', currentStart] }, 'current', 'previous'] } },
                            sessions: { $sum: "$metrics.sessions" }
                        }},
                        { $group: {
                            _id: { source: "$_id.source", medium: "$_id.medium" },
                            currentSessions: { $sum: { $cond: [{ $eq: ["$_id.period", "current"] }, "$sessions", 0] } },
                            priorSessions: { $sum: { $cond: [{ $eq: ["$_id.period", "previous"] }, "$sessions", 0] } }
                        }},
                        { $sort: { currentSessions: -1 } }, { $limit: 25 }
                    ]);
                    results.topSources = sources.map(i => ({
                        source: i._id.source || 'Unknown',
                        medium: i._id.medium || 'Unknown',
                        sessions: i.currentSessions,
                        priorSessions: i.priorSessions,
                        growth: getGrowth(i.currentSessions, i.priorSessions)
                    }));

                    // Top Landing Pages
                    const landingPages = await Ga4Metric.aggregate([
                        { $match: { ...baseFilter, date: { $gte: prevStart, $lte: currentEnd } } },
                        { $group: {
                            _id: { page: "$metadata.dimensions.landingPage", period: { $cond: [{ $gte: ['$date', currentStart] }, 'current', 'previous'] } },
                            sessions: { $sum: "$metrics.sessions" },
                            engagedSessions: { $sum: "$metrics.engagedSessions" }
                        }},
                        { $group: {
                            _id: "$_id.page",
                            currentSessions: { $sum: { $cond: [{ $eq: ["$_id.period", "current"] }, "$sessions", 0] } },
                            priorSessions: { $sum: { $cond: [{ $eq: ["$_id.period", "previous"] }, "$sessions", 0] } },
                            engagedSessions: { $sum: { $cond: [{ $eq: ["$_id.period", "current"] }, "$engagedSessions", 0] } }
                        }},
                        { $sort: { currentSessions: -1 } }, { $limit: 25 }
                    ]);
                    results.topLandingPages = landingPages.map(i => ({
                        page: i._id || '(not set)',
                        sessions: i.currentSessions,
                        priorSessions: i.priorSessions,
                        growth: getGrowth(i.currentSessions, i.priorSessions),
                        engagementRate: i.currentSessions > 0 ? ((i.engagedSessions / i.currentSessions) * 100).toFixed(1) + '%' : "0.0%"
                    }));

                    // Top Page Titles
                    const pageTitles = await Ga4Metric.aggregate([
                        { $match: { ...baseFilter, date: { $gte: currentStart, $lte: currentEnd } } },
                        { $group: {
                            _id: "$metadata.dimensions.pageTitle",
                            sessions: { $sum: "$metrics.sessions" },
                            pageViews: { $sum: "$metrics.pageViews" }
                        }},
                        { $sort: { sessions: -1 } }, { $limit: 25 }
                    ]);
                    results.topPageTitles = pageTitles.map(i => ({
                        title: i._id || '(not set)',
                        sessions: i.sessions,
                        pageViews: i.pageViews
                    }));

                    // Top Countries
                    const countries = await Ga4Metric.aggregate([
                        { $match: { ...baseFilter, date: { $gte: currentStart, $lte: currentEnd } } },
                        { $group: {
                            _id: "$metadata.dimensions.country",
                            sessions: { $sum: "$metrics.sessions" }
                        }},
                        { $sort: { sessions: -1 } }, { $limit: 25 }
                    ]);
                    results.topCountries = countries.map(i => ({
                        country: i._id || 'Unknown',
                        sessions: i.sessions,
                        source: 'ga4'
                    }));
                }
            }

            // ── 4. GSC DIMENSIONS ───────────────────────────────────────────
            if (config.key === 'gsc') {

                // Top Queries with impression-weighted position (standard + full)
                const queries = await GscMetric.aggregate([
                    { $match: { ...baseFilter, date: { $gte: prevStart, $lte: currentEnd } } },
                    { $group: {
                        _id: { query: "$metadata.dimensions.query", period: { $cond: [{ $gte: ['$date', currentStart] }, 'current', 'previous'] } },
                        clicks: { $sum: "$metrics.clicks" },
                        impressions: { $sum: "$metrics.impressions" },
                        // FIX: impression-weighted position
                        weightedPosition: { $sum: { $multiply: ["$metrics.position", "$metrics.impressions"] } }
                    }},
                    { $group: {
                        _id: "$_id.query",
                        currentClicks: { $sum: { $cond: [{ $eq: ["$_id.period", "current"] }, "$clicks", 0] } },
                        priorClicks: { $sum: { $cond: [{ $eq: ["$_id.period", "previous"] }, "$clicks", 0] } },
                        impressions: { $sum: { $cond: [{ $eq: ["$_id.period", "current"] }, "$impressions", 0] } },
                        weightedPosition: { $sum: { $cond: [{ $eq: ["$_id.period", "current"] }, "$weightedPosition", 0] } }
                    }},
                    { $sort: { impressions: -1 } }, { $limit: 25 }
                ]);
                results.topQueries = queries.map(i => ({
                    query: i._id || '(not set)',
                    clicks: i.currentClicks,
                    priorClicks: i.priorClicks,
                    growth: getGrowth(i.currentClicks, i.priorClicks),
                    impressions: i.impressions,
                    ctr: i.impressions > 0 ? ((i.currentClicks / i.impressions) * 100).toFixed(2) + '%' : "0.00%",
                    // FIX: weighted avg position
                    position: i.impressions > 0 ? (i.weightedPosition / i.impressions).toFixed(1) : "0.0"
                }));

                // Top GSC Pages with impression-weighted position (standard + full)
                const gscPages = await GscMetric.aggregate([
                    { $match: { ...baseFilter, date: { $gte: prevStart, $lte: currentEnd } } },
                    { $group: {
                        _id: { page: "$metadata.dimensions.page", period: { $cond: [{ $gte: ['$date', currentStart] }, 'current', 'previous'] } },
                        clicks: { $sum: "$metrics.clicks" },
                        impressions: { $sum: "$metrics.impressions" },
                        weightedPosition: { $sum: { $multiply: ["$metrics.position", "$metrics.impressions"] } }
                    }},
                    { $group: {
                        _id: "$_id.page",
                        currentClicks: { $sum: { $cond: [{ $eq: ["$_id.period", "current"] }, "$clicks", 0] } },
                        priorClicks: { $sum: { $cond: [{ $eq: ["$_id.period", "previous"] }, "$clicks", 0] } },
                        impressions: { $sum: { $cond: [{ $eq: ["$_id.period", "current"] }, "$impressions", 0] } },
                        weightedPosition: { $sum: { $cond: [{ $eq: ["$_id.period", "current"] }, "$weightedPosition", 0] } }
                    }},
                    { $sort: { impressions: -1 } }, { $limit: 25 }
                ]);
                results.topGscPages = gscPages.map(i => ({
                    page: i._id || '(not set)',
                    clicks: i.currentClicks,
                    priorClicks: i.priorClicks,
                    growth: getGrowth(i.currentClicks, i.priorClicks),
                    impressions: i.impressions,
                    ctr: i.impressions > 0 ? ((i.currentClicks / i.impressions) * 100).toFixed(2) + '%' : "0.00%",
                    position: i.impressions > 0 ? (i.weightedPosition / i.impressions).toFixed(1) : "0.0"
                }));

                if (isFull) {
                    // GSC Countries
                    const gscCountries = await GscMetric.aggregate([
                        { $match: { ...baseFilter, date: { $gte: currentStart, $lte: currentEnd } } },
                        { $group: {
                            _id: "$metadata.dimensions.country",
                            clicks: { $sum: "$metrics.clicks" },
                            impressions: { $sum: "$metrics.impressions" }
                        }},
                        { $sort: { impressions: -1 } }, { $limit: 25 }
                    ]);
                    results.topGscCountries = gscCountries.map(i => ({
                        country: i._id || 'Unknown',
                        clicks: i.clicks,
                        impressions: i.impressions,
                        ctr: i.impressions > 0 ? ((i.clicks / i.impressions) * 100).toFixed(2) + '%' : "0.00%"
                    }));

                    // GSC Devices
                    const gscDevices = await GscMetric.aggregate([
                        { $match: { ...baseFilter, date: { $gte: currentStart, $lte: currentEnd } } },
                        { $group: {
                            _id: "$metadata.dimensions.device",
                            clicks: { $sum: "$metrics.clicks" },
                            impressions: { $sum: "$metrics.impressions" }
                        }},
                        { $sort: { impressions: -1 } }
                    ]);
                    results.topGscDevices = gscDevices.map(i => ({
                        device: i._id || 'Unknown',
                        clicks: i.clicks,
                        impressions: i.impressions,
                        ctr: i.impressions > 0 ? ((i.clicks / i.impressions) * 100).toFixed(2) + '%' : "0.00%"
                    }));
                }
            }

            // ── 5. ADS DIMENSIONS ───────────────────────────────────────────
            if (config.type === 'ads') {
                const convValueField = config.key === 'google-ads' ? "$metrics.conversionValue" : "$metrics.purchase_value";

                // Top Campaigns (standard + full)
                const campaigns = await config.model.aggregate([
                    { $match: { ...baseFilter, date: { $gte: prevStart, $lte: currentEnd } } },
                    { $group: {
                        _id: { campaign: "$metadata.dimensions.campaign", period: { $cond: [{ $gte: ['$date', currentStart] }, 'current', 'previous'] } },
                        spend: { $sum: "$metrics.spend" },
                        clicks: { $sum: "$metrics.clicks" },
                        impressions: { $sum: "$metrics.impressions" },
                        conversions: { $sum: "$metrics.conversions" },
                        conversionValue: { $sum: convValueField },
                        status: { $first: "$metadata.dimensions.campaignStatus" }
                    }},
                    { $group: {
                        _id: "$_id.campaign",
                        currentSpend: { $sum: { $cond: [{ $eq: ["$_id.period", "current"] }, "$spend", 0] } },
                        priorSpend: { $sum: { $cond: [{ $eq: ["$_id.period", "previous"] }, "$spend", 0] } },
                        clicks: { $sum: { $cond: [{ $eq: ["$_id.period", "current"] }, "$clicks", 0] } },
                        impressions: { $sum: { $cond: [{ $eq: ["$_id.period", "current"] }, "$impressions", 0] } },
                        conversions: { $sum: { $cond: [{ $eq: ["$_id.period", "current"] }, "$conversions", 0] } },
                        conversionValue: { $sum: { $cond: [{ $eq: ["$_id.period", "current"] }, "$conversionValue", 0] } },
                        status: { $first: "$status" }
                    }},
                    { $sort: { currentSpend: -1 } }, { $limit: 25 }
                ]);
                results.topCampaigns.push(...campaigns.map(i => ({
                    campaign: i._id || '(not set)',
                    spend: i.currentSpend.toFixed(2),
                    priorSpend: i.priorSpend.toFixed(2),
                    growth: getGrowth(i.currentSpend, i.priorSpend),
                    clicks: i.clicks,
                    impressions: i.impressions,
                    conversions: i.conversions,
                    cpc: i.clicks > 0 ? (i.currentSpend / i.clicks).toFixed(2) : "0.00",
                    ctr: i.impressions > 0 ? ((i.clicks / i.impressions) * 100).toFixed(2) + '%' : "0.00%",
                    roas: i.currentSpend > 0 ? (i.conversionValue / i.currentSpend).toFixed(2) + 'x' : "0.00x",
                    status: config.key === 'google-ads' ? (i.status || 'active') : 'active',
                    source: config.key
                })));

                if (isFull) {
                    if (config.key === 'google-ads') {
                        const adGroups = await config.model.aggregate([
                            { $match: { ...baseFilter, date: { $gte: currentStart, $lte: currentEnd } } },
                            { $group: {
                                _id: "$metadata.dimensions.adGroup",
                                spend: { $sum: "$metrics.spend" },
                                conversions: { $sum: "$metrics.conversions" },
                                status: { $first: "$metadata.dimensions.adGroupStatus" }
                            }},
                            { $sort: { spend: -1 } }, { $limit: 25 }
                        ]);
                        results.topAdGroups = adGroups.map(i => ({
                            adGroup: i._id || '(not set)',
                            spend: i.spend.toFixed(2),
                            conversions: i.conversions,
                            status: i.status || 'unknown'
                        }));

                        const networks = await config.model.aggregate([
                            { $match: { ...baseFilter, date: { $gte: currentStart, $lte: currentEnd } } },
                            { $group: { _id: "$metadata.dimensions.network", spend: { $sum: "$metrics.spend" } }},
                            { $sort: { spend: -1 } }
                        ]);
                        results.topNetworks = networks.map(i => ({
                            network: i._id || 'Unknown',
                            spend: i.spend.toFixed(2)
                        }));
                    }

                    if (config.key === 'facebook-ads') {
                        const adsets = await config.model.aggregate([
                            { $match: { ...baseFilter, date: { $gte: currentStart, $lte: currentEnd } } },
                            { $group: {
                                _id: "$metadata.dimensions.adset",
                                spend: { $sum: "$metrics.spend" },
                                conversions: { $sum: "$metrics.conversions" }
                            }},
                            { $sort: { spend: -1 } }, { $limit: 25 }
                        ]);
                        results.topAdsets = adsets.map(i => ({
                            adset: i._id || '(not set)',
                            spend: i.spend.toFixed(2),
                            conversions: i.conversions
                        }));
                    }
                }
            }

        } catch (error) {
            console.error(`Error fetching ${config.key}:`, error);
            results.platformErrors.push(config.key);
        }
    });

    await Promise.all(aggTasks);

    // Platform failure warnings
    if (results.platformErrors.length > 0) {
        data.warnings = results.platformErrors.map(p => `⚠️ ${p} data could not be fetched.`);
    }

    // Build totals map
    const sourceTotals = { current: {}, previous: {} };
    results.totals.forEach(t => { sourceTotals[t.period][t.source] = t.sums; });

    // Daily breakdown
    if (mode !== 'summary') {
        const allDates = [...new Set(results.dailyBreakdown.map(d => d.date))].sort();
        data.dailyBreakdown = {};
        sourceConfigs.forEach(s => {
            const sData = results.dailyBreakdown.filter(d => d.source === s.key);
            data.dailyBreakdown[s.key] = allDates.map(date => {
                const entry = sData.find(d => d.date === date);
                return { date, metrics: entry ? entry.metrics : Object.fromEntries(s.metrics.map(m => [m, 0])) };
            });
        });
    }

    // Top dimensions
    if (mode !== 'summary') {
        data.topDimensions = {
            // GA4
            pages: results.topPages,
            pageTitles: results.topPageTitles,
            landingPages: results.topLandingPages,
            channels: results.topChannels,
            sources: results.topSources,
            devices: results.topDevices,
            countries: results.topCountries,
            // GSC
            queries: results.topQueries,
            gscPages: results.topGscPages,
            gscDevices: results.topGscDevices,
            gscCountries: results.topGscCountries,
            // Ads
            campaigns: results.topCampaigns,
            adGroups: results.topAdGroups,
            adsets: results.topAdsets,
            networks: results.topNetworks
        };
    }

    // ── Platform Totals ──────────────────────────────────────────────────────
    if (sourceTotals.current['ga4']) {
        const curr = sourceTotals.current['ga4'];
        const prev = sourceTotals.previous['ga4'] || {};
        const engRate = curr.sessions > 0 ? (curr.engagedSessions / curr.sessions) * 100 : 0;

        data.ga4 = {
            users: Math.round(curr.users || 0), usersGrowth: getGrowth(curr.users, prev.users),
            newUsers: Math.round(curr.newUsers || 0), newUsersGrowth: getGrowth(curr.newUsers, prev.newUsers),
            sessions: Math.round(curr.sessions || 0), sessionsGrowth: getGrowth(curr.sessions, prev.sessions),
            engagedSessions: Math.round(curr.engagedSessions || 0),
            pageViews: Math.round(curr.pageViews || 0), pageViewsGrowth: getGrowth(curr.pageViews, prev.pageViews),
            avgSessionDuration: (curr.avgSessionDuration || 0).toFixed(1) + 's',
            engagementRate: engRate.toFixed(2) + '%',
            bounceRate: (100 - engRate).toFixed(2) + '%',
            revenue: (curr.revenue || 0).toFixed(2), revenueGrowth: getGrowth(curr.revenue, prev.revenue),
            transactions: curr.transactions || 0,
            conversions: curr.conversions || 0
        };
    }

    if (sourceTotals.current['gsc']) {
        const curr = sourceTotals.current['gsc'];
        const prev = sourceTotals.previous['gsc'] || {};
        const ctr = curr.impressions > 0 ? (curr.clicks / curr.impressions) * 100 : 0;

        data.gsc = {
            clicks: curr.clicks || 0, clicksGrowth: getGrowth(curr.clicks, prev.clicks),
            impressions: curr.impressions || 0, impressionsGrowth: getGrowth(curr.impressions, prev.impressions),
            // FIX: impression-weighted avg position
            position: curr.impressions > 0 ? (curr.position / curr.impressions).toFixed(1) : (curr.position || 0).toFixed(1),
            ctr: ctr.toFixed(2) + '%', ctrGrowth: getGrowth(ctr, prev.impressions > 0 ? (prev.clicks / prev.impressions) * 100 : 0)
        };
    }

    if (sourceTotals.current['google-ads']) {
        const curr = sourceTotals.current['google-ads'];
        const prev = sourceTotals.previous['google-ads'] || {};
        const ctr = curr.impressions > 0 ? (curr.clicks / curr.impressions) * 100 : 0;
        const cpc = curr.clicks > 0 ? curr.spend / curr.clicks : 0;

        data.googleAds = {
            spend: (curr.spend || 0).toFixed(2), spendGrowth: getGrowth(curr.spend, prev.spend),
            impressions: curr.impressions || 0, impressionsGrowth: getGrowth(curr.impressions, prev.impressions),
            clicks: curr.clicks || 0, clicksGrowth: getGrowth(curr.clicks, prev.clicks),
            conversions: curr.conversions || 0, conversionsGrowth: getGrowth(curr.conversions, prev.conversions),
            conversionValue: (curr.conversionValue || 0).toFixed(2),
            allConversions: curr.allConversions || 0,
            viewThroughConversions: curr.viewThroughConversions || 0,
            searchImpressionShare: (curr.searchImpressionShare || 0).toFixed(2) + '%',
            ctr: ctr.toFixed(2) + '%',
            cpc: cpc.toFixed(2),
            cpm: curr.impressions > 0 ? ((curr.spend / curr.impressions) * 1000).toFixed(2) : "0.00",
            roas: curr.spend > 0 ? (curr.conversionValue / curr.spend).toFixed(2) + 'x' : "0.00x"
        };
    }

    if (sourceTotals.current['facebook-ads']) {
        const curr = sourceTotals.current['facebook-ads'];
        const prev = sourceTotals.previous['facebook-ads'] || {};
        const ctr = curr.impressions > 0 ? (curr.clicks / curr.impressions) * 100 : 0;
        const cpc = curr.clicks > 0 ? curr.spend / curr.clicks : 0;

        data.facebookAds = {
            spend: (curr.spend || 0).toFixed(2), spendGrowth: getGrowth(curr.spend, prev.spend),
            impressions: curr.impressions || 0, impressionsGrowth: getGrowth(curr.impressions, prev.impressions),
            reach: curr.reach || 0, reachGrowth: getGrowth(curr.reach, prev.reach),
            clicks: curr.clicks || 0, clicksGrowth: getGrowth(curr.clicks, prev.clicks),
            conversions: curr.conversions || 0, conversionsGrowth: getGrowth(curr.conversions, prev.conversions),
            purchaseValue: (curr.purchase_value || 0).toFixed(2),
            landingPageViews: curr.landing_page_views || 0,
            linkClicks: curr.link_clicks || 0,
            frequency: (curr.frequency || 0).toFixed(2),
            engagement: curr.engagement || 0,
            ctr: ctr.toFixed(2) + '%',
            cpc: cpc.toFixed(2),
            cpm: curr.impressions > 0 ? ((curr.spend / curr.impressions) * 1000).toFixed(2) : "0.00",
            roas: curr.spend > 0 ? (curr.purchase_value / curr.spend).toFixed(2) + 'x' : "0.00x"
        };
    }

    return data;
};

export const askAi = async (req, res) => {
    let { question, conversationId, siteId, history, timezone } = req.body;
    const userId = req.user._id;

    // Check if historical sync is running
    const userAcc = await UserAccounts.findOne(siteId ? { _id: siteId, userId } : { userId }).sort({ updatedAt: -1 });
    const isSyncingHistorical = !!(userAcc && (
        (userAcc.ga4PropertyId && !userAcc.ga4HistoricalComplete) ||
        (userAcc.gscSiteUrl && !userAcc.gscHistoricalComplete) ||
        (userAcc.googleAdsCustomerId && !userAcc.googleAdsHistoricalComplete) ||
        (userAcc.facebookAdAccountId && !userAcc.facebookAdsHistoricalComplete)
    ));

    if (isSyncingHistorical) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.write(`data: ${JSON.stringify({ error: "RankPilot AI is paused while importing historical data. Your assistant will be fully active as soon as the historical sync completes." })}\n\n`);
        res.end();
        return;
    }

    // FIX 1: Track start time correctly for latency calculation
    const startTime = Date.now();

    // Prepare Sanitized History for Gemini
    // FIX 2: Increased history limit from 8 to 15 for better context retention
    let chatHistory = [];
    const rawHistory = (history || []).slice(-15);

    for (const msg of rawHistory) {
        const role = msg.role === 'user' ? 'user' : 'model';
        const text = String(msg.content || "").substring(0, 4000);
        
        if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === role) {
            // Combine consecutive messages of same role (Gemini strict alternation rule)
            chatHistory[chatHistory.length - 1].parts[0].text += "\n\n" + text;
        } else {
            chatHistory.push({ role, parts: [{ text }] });
        }
    }

    // Gemini strictly requires first message in history to be from 'user'
    if (chatHistory.length > 0 && chatHistory[0].role === 'model') {
        chatHistory.shift();
    }

    // Load System Instruction
    let systemIns = "";
    try {
        systemIns = fs.readFileSync(path.join(process.cwd(), 'server', 'prompts', 'system.txt'), 'utf8');
    } catch (e) {
        systemIns = fs.readFileSync(path.join(process.cwd(), 'prompts', 'system.txt'), 'utf8');
    }

    // FIX 3: Use user's timezone from request body (fallback to UTC)
    const userTimezone = timezone || 'UTC';
    const nowLocal = new Date(new Date().toLocaleString('en-US', { timeZone: userTimezone }));
    const todayStr = nowLocal.toISOString().split('T')[0];
    const dateContext = `\n\n[REAL-TIME CONTEXT]: Today's date is ${todayStr}. User timezone: ${userTimezone}. Use this for all relative date calculations.`;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let convId = conversationId;
    let finalContent = "";

    try {
        // 1. Ensure Conversation exists
        if (!convId) {
            const conv = await Conversation.create({
                userId, siteId: siteId || null, title: question.substring(0, 60)
            });
            convId = conv._id;
        }

        // 2. Save User Message
        await Message.create({ conversationId: convId, role: 'user', content: question });

        // Send conversationId immediately so UI can use it during streaming
        res.write(`data: ${JSON.stringify({ conversationId: convId })}\n\n`);

        const chat = await startAgenticChat(chatHistory, aiTools, systemIns + dateContext);
        
        // --- STREAMING LOOP ---
        let result = await chat.sendMessageStream(question);
        
        let iteration = 0;
        while (iteration < 5) {
            iteration++;
            
            // 1. Stream text tokens
            for await (const chunk of result.stream) {
                try {
                    const chunkText = chunk.text();
                    if (chunkText) {
                        finalContent += chunkText;
                        const cleanChunk = chunkText.replace(/(\r?\n)*.*response is advisory only.*/gi, '');
                        if (cleanChunk) {
                            res.write(`data: ${JSON.stringify({ chunk: cleanChunk })}\n\n`);
                        }
                    }
                } catch (e) {
                    // Ignore non-text chunks (e.g. function call parts)
                }
            }

            // 2. Check for Function Calls
            const response = await result.response;
            const calls = response.functionCalls();
            
            if (!calls || calls.length === 0) break;

            // 3. Execute Tools
            const toolResponses = [];
            for (const call of calls) {
                const data = await executeTool(call.name, call.args, userId, siteId, userTimezone);
                toolResponses.push({
                    functionResponse: {
                        name: call.name,
                        response: { content: data }
                    }
                });
            }
            
            // 4. Send tool results back to model
            result = await chat.sendMessageStream(toolResponses);
        }

        // Cleanup final content
        finalContent = finalContent.replace(/(\r?\n)*.*response is advisory only.*/gi, '').trim();

        // FIX 1: Correct latency — Date.now() - startTime (both are numbers)
        const latencyMs = Date.now() - startTime;

        // 3. Save Assistant Message
        const aiMsg = await Message.create({
            conversationId: convId,
            role: 'assistant',
            content: finalContent,
            model: "gemini-2.5-flash",
            latencyMs
        });

        // Send done signal
        res.write(`data: ${JSON.stringify({ done: true, conversationId: convId, messageId: aiMsg._id, answer: finalContent })}\n\n`);
        res.end();

    } catch (err) {
        console.error("Agentic AI Loop Error:", err);
        
        const getFriendlyError = (err) => {
            const msg = err?.message || "";
            if (msg.includes('429') || msg.includes('Quota')) {
                const retryMatch = msg.match(/retry in (\d+)/i);
                const wait = retryMatch?.[1];
                return wait
                ? `Request limit reached. Please try again in ${wait} seconds.`
                : "Request limit reached. Please try again shortly.";
            }
            if (msg.includes('getaddrinfo') || msg.includes('ENOTFOUND') || msg.includes('redis') || msg.includes('connect')) {
                return "We're having trouble connecting. Please try again shortly.";
            }
            if (msg.includes('API_KEY_INVALID') || msg.includes('auth')) {
                return "Service configuration issue detected. Please contact support.";
            }
            if (msg.includes('safety') || msg.includes('blocked')) {
                return "Your request couldn't be processed. Please try rewording it..";
            }
            return "We couldn't complete your request. Please try again";
        };

        const friendlyMsg = getFriendlyError(err);
        const errorMessage = finalContent 
            ? `${finalContent}\n\n**⚠️ AI Interrupted:** ${friendlyMsg}` 
            : friendlyMsg;
        
        if (convId) {
            await Message.create({
                conversationId: convId,
                role: 'assistant',
                content: errorMessage,
                isError: !finalContent,
                model: "system-error"
            });
        }

        res.write(`data: ${JSON.stringify({ error: friendlyMsg, conversationId: convId })}\n\n`);
        res.end();
    }
}

export const getConversations = async (req, res) => {
    const { siteId } = req.query;
    const query = siteId ? { userId: req.user._id, siteId } : { userId: req.user._id };
    const convs = await Conversation.find(query).sort({ createdAt: -1 });
    res.status(200).json(convs);
};

export const getConversation = async (req, res) => {
    const conv = await Conversation.findOne({ _id: req.params.id, userId: req.user._id });
    if (!conv) return res.status(404).json({ message: 'Not found' });
    const messages = await Message.find({ conversationId: conv._id }).sort({ createdAt: 1 });
    res.status(200).json({ _id: conv._id, title: conv.title, messages });
};

export const deleteConversation = async (req, res) => {
    const conv = await Conversation.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (conv) await Message.deleteMany({ conversationId: conv._id });
    res.status(200).json({ message: 'Conversation deleted' });
};

export const getWeeklyInsight = async (req, res) => {
    const { siteId } = req.query;
    const query = siteId ? { userId: req.user._id, siteId } : { userId: req.user._id };
    const insight = await WeeklyInsight.findOne(query);
    if (insight) return res.status(200).json(insight);

    res.status(404).json({ message: 'No insight found. Please refresh.' });
};

export const generateWeeklyInsightInternal = async (userId, siteId) => {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const nowLocal = new Date(Date.now() - tzOffset);
    const todayStr = nowLocal.toISOString().split('T')[0];
    
    // Load System and Insight Prompts
    let systemIns = "";
    let insightPrompt = "";
    try {
        systemIns = fs.readFileSync(path.join(process.cwd(), 'server', 'prompts', 'system.txt'), 'utf8');
        insightPrompt = fs.readFileSync(path.join(process.cwd(), 'server', 'prompts', 'weekly-insight.txt'), 'utf8');
    } catch (e) {
        systemIns = fs.readFileSync(path.join(process.cwd(), 'prompts', 'system.txt'), 'utf8');
        insightPrompt = fs.readFileSync(path.join(process.cwd(), 'prompts', 'weekly-insight.txt'), 'utf8');
    }

    const dateContext = `\n\n[REAL-TIME CONTEXT]: Today's date is ${todayStr}. Generate a performance insight for the LAST 7 DAYS.`;
    
    try {
        const chat = await startAgenticChat([], aiTools, systemIns + dateContext);
        
        // Initial command to start the analysis
        let result = await chat.sendMessage(insightPrompt);
        let response = result.response;

        // Tool Loop for data
        let iteration = 0;
        while (response.functionCalls()?.length > 0 && iteration < 3) {
            iteration++;
            const calls = response.functionCalls();
            const toolResponses = [];
            for (const call of calls) {
                const data = await executeTool(call.name, call.args, userId, siteId);
                toolResponses.push({ functionResponse: { name: call.name, response: { content: data } } });
            }
            result = await chat.sendMessage(toolResponses);
            response = result.response;
        }

        const finalContent = response.text()
            .replace(/(\r?\n)*.*response is advisory only.*/gi, '')
            .trim();

        const insight = await WeeklyInsight.findOneAndUpdate(
            { userId: userId, siteId: siteId || null },
            { content: finalContent },
            { upsert: true, returnDocument: 'after' }
        );

        await createNotification(userId, {
            type: 'info',
            title: 'Weekly AI Insight Ready',
            message: 'Your weekly performance analysis has been generated by AI.',
            source: 'ai',
            actionLabel: 'View Insight',
            actionPath: '/dashboard/ai-chat'
        });

        return insight;

    } catch (err) {
        console.error("Weekly Insight Internal Error:", err);
        throw err;
    }
};

export const refreshWeeklyInsight = async (req, res) => {
    try {
        const siteId = req.body?.siteId || req.query?.siteId;
        const insight = await generateWeeklyInsightInternal(req.user._id, siteId);
        res.status(200).json(insight);
    } catch (err) {
        res.status(err.statusCode || 503).json({ message: err.message });
    }
};

export const generateSuggestedQuestionsInternal = async (userId, siteId) => {
    try {
        // FIX 1: Correct timezone handling
        const userTimezone = 'UTC'; // replace with user's timezone if available in your DB
        const nowLocal = new Date(new Date().toLocaleString('en-US', { timeZone: userTimezone }));
        const todayStr = nowLocal.toISOString().split('T')[0];

        // Date range: last 30 days
        const endDate = todayStr;
        const startDate = new Date(nowLocal);
        startDate.setDate(startDate.getDate() - 30);
        const startDateStr = startDate.toISOString().split('T')[0];

        // Fetch Connection Status
        const acc = await UserAccounts.findOne({ _id: siteId, userId })
            .select('ga4PropertyId gscSiteUrl googleAdsCustomerId facebookAdAccountId');

        const conn = {
            ga4: !!acc?.ga4PropertyId,
            gsc: !!acc?.gscSiteUrl,
            googleAds: !!acc?.googleAdsCustomerId,
            facebookAds: !!acc?.facebookAdAccountId
        };

        // FIX 2: Pre-fetch real summary data BEFORE asking AI to generate questions
        // This gives AI actual numbers to generate specific, data-driven questions
        const connectedSources = Object.entries(conn)
            .filter(([_, v]) => v)
            .map(([k]) => {
                if (k === 'googleAds') return 'google-ads';
                if (k === 'facebookAds') return 'facebook-ads';
                return k; // ga4, gsc
            });

        let realDataContext = "";
        try {
            const summaryData = await fetchPlatformData(
                userId,
                startDateStr,
                endDate,
                siteId,
                connectedSources,
                null,
                userTimezone,
                [], // fetch all fields
                'standard' // standard mode — totals + daily + top pages/channels
            );

            // Build a compact data summary for the AI prompt
            const lines = [];

            if (summaryData.ga4) {
                const g = summaryData.ga4;
                lines.push(`[GA4 LAST 30 DAYS]`);
                lines.push(`- Sessions: ${g.sessions} (${g.sessionsGrowth}% vs prev period)`);
                lines.push(`- Users: ${g.users} (${g.usersGrowth}%)`);
                lines.push(`- New Users: ${g.newUsers} (${g.newUsersGrowth}%)`);
                lines.push(`- Page Views: ${g.pageViews} (${g.pageViewsGrowth}%)`);
                lines.push(`- Bounce Rate: ${g.bounceRate}`);
                lines.push(`- Engagement Rate: ${g.engagementRate}`);
                lines.push(`- Avg Session Duration: ${g.avgSessionDuration}`);
                lines.push(`- Revenue: $${g.revenue} (${g.revenueGrowth}%)`);
                lines.push(`- Conversions: ${g.conversions}`);
            }

            if (summaryData.topDimensions?.channels?.length > 0) {
                lines.push(`\n[TOP CHANNELS]`);
                summaryData.topDimensions.channels.slice(0, 5).forEach(c => {
                    lines.push(`- ${c.channel}: ${c.sessions} sessions (${c.growth}% growth, ${c.engagementRate} engagement)`);
                });
            }

            if (summaryData.topDimensions?.pages?.length > 0) {
                lines.push(`\n[TOP PAGES]`);
                summaryData.topDimensions.pages.slice(0, 5).forEach(p => {
                    lines.push(`- ${p.path}: ${p.sessions} sessions (${p.growth}% growth, ${p.engagementRate} engagement)`);
                });
            }

            if (summaryData.gsc) {
                const s = summaryData.gsc;
                lines.push(`\n[GSC LAST 30 DAYS]`);
                lines.push(`- Clicks: ${s.clicks} (${s.clicksGrowth}%)`);
                lines.push(`- Impressions: ${s.impressions} (${s.impressionsGrowth}%)`);
                lines.push(`- CTR: ${s.ctr}`);
                lines.push(`- Avg Position: ${s.position}`);
            }

            if (summaryData.topDimensions?.queries?.length > 0) {
                lines.push(`\n[TOP GSC QUERIES]`);
                summaryData.topDimensions.queries.slice(0, 5).forEach(q => {
                    lines.push(`- "${q.query}": ${q.clicks} clicks, ${q.impressions} impressions, CTR ${q.ctr}, Position ${q.position}`);
                });
            }

            if (summaryData.googleAds) {
                const a = summaryData.googleAds;
                lines.push(`\n[GOOGLE ADS LAST 30 DAYS]`);
                lines.push(`- Spend: $${a.spend} (${a.spendGrowth}%)`);
                lines.push(`- Clicks: ${a.clicks} (${a.clicksGrowth}%)`);
                lines.push(`- Conversions: ${a.conversions} (${a.conversionsGrowth}%)`);
                lines.push(`- ROAS: ${a.roas}`);
                lines.push(`- CPC: $${a.cpc}`);
                lines.push(`- CTR: ${a.ctr}`);
            }

            if (summaryData.facebookAds) {
                const f = summaryData.facebookAds;
                lines.push(`\n[META ADS LAST 30 DAYS]`);
                lines.push(`- Spend: $${f.spend} (${f.spendGrowth}%)`);
                lines.push(`- Clicks: ${f.clicks} (${f.clicksGrowth}%)`);
                lines.push(`- Conversions: ${f.conversions} (${f.conversionsGrowth}%)`);
                lines.push(`- ROAS: ${f.roas}`);
                lines.push(`- CPC: $${f.cpc}`);
                lines.push(`- Reach: ${f.reach}`);
            }

            if (summaryData.topDimensions?.campaigns?.length > 0) {
                lines.push(`\n[TOP CAMPAIGNS]`);
                summaryData.topDimensions.campaigns.slice(0, 5).forEach(c => {
                    lines.push(`- ${c.campaign} (${c.source}): $${c.spend} spend, ${c.conversions} conversions, ROAS ${c.roas}`);
                });
            }

            realDataContext = lines.length > 0
                ? `\n\n[REAL ANALYTICS DATA - Last 30 Days]:\n${lines.join('\n')}`
                : "";

        } catch (dataErr) {
            console.error("Data pre-fetch error for suggestions:", dataErr.message);
            // Non-blocking — continue without real data, AI will use connection status only
        }

        // Connection status context
        const connectionContext = `\n\n[CONNECTION STATUS]:
- Google Analytics (GA4): ${conn.ga4 ? 'CONNECTED' : 'NOT CONNECTED'}
- Google Search Console (GSC): ${conn.gsc ? 'CONNECTED' : 'NOT CONNECTED'}
- Google Ads: ${conn.googleAds ? 'CONNECTED' : 'NOT CONNECTED'}
- Meta Ads (Facebook): ${conn.facebookAds ? 'CONNECTED' : 'NOT CONNECTED'}

CRITICAL: ONLY generate questions for platforms marked as 'CONNECTED'. Never mention disconnected platforms.`;

        // Load Prompts
        let systemIns = "";
        let suggestPrompt = "";
        try {
            systemIns = fs.readFileSync(path.join(process.cwd(), 'server', 'prompts', 'system.txt'), 'utf8');
            suggestPrompt = fs.readFileSync(path.join(process.cwd(), 'prompts', 'suggested-questions.txt'), 'utf8');
        } catch (e) {
            systemIns = fs.readFileSync(path.join(process.cwd(), 'prompts', 'system.txt'), 'utf8');
            suggestPrompt = fs.readFileSync(path.join(process.cwd(), 'prompts', 'suggested-questions.txt'), 'utf8');
        }

        const dateContext = `\n\n[REAL-TIME CONTEXT]: Today's date is ${todayStr}. Return ONLY a JSON array of 4 strings. Each question MUST be under 15 words, a single sentence, and based on the REAL DATA provided above — not generic.`;

        // FIX 3: Inject real data into the prompt — no tool call needed
        // AI now has actual numbers to generate specific questions
        const fullPrompt = systemIns + dateContext + connectionContext + realDataContext;

        const chat = await startAgenticChat([], [], fullPrompt); // No tools needed — data already injected
        
        let result = await chat.sendMessage(suggestPrompt);
        let response = result.response;

        // Fallback questions based on connected platforms
        const fallbacks = [];
        if (conn.gsc) fallbacks.push("Find keywords with high impressions but low CTR.");
        if (conn.ga4) fallbacks.push("Which page has the highest bounce rate this month?");
        if (conn.googleAds) fallbacks.push("Which Google Ads campaigns have the highest ROAS?");
        if (conn.facebookAds) fallbacks.push("Compare ROAS across Meta Ads campaigns this month.");
        while (fallbacks.length < 4) {
            fallbacks.push("How can I improve my website's overall conversion rate?");
        }

        // Parse AI response
        let questions = [];
        try {
            const content = response.text();
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            const jsonStr = jsonMatch ? jsonMatch[0] : content;
            const parsed = JSON.parse(jsonStr);
            questions = Array.isArray(parsed) ? parsed : (parsed.questions || []);
            if (!Array.isArray(questions)) questions = [];
        } catch (e) {
            console.error("AI Suggestions Parse Error:", e);
            questions = fallbacks.slice(0, 4);
        }

        // Ensure exactly 4 questions
        if (questions.length < 4) {
            questions = [...questions, ...fallbacks.slice(questions.length)].slice(0, 4);
        } else {
            questions = questions.slice(0, 4);
        }

        // Save to DB
        await SuggestedQuestions.findOneAndUpdate(
            { siteId, userId },
            { questions, createdAt: new Date() },
            { upsert: true }
        );

        return questions;

    } catch (err) {
        console.error("Internal Suggested Questions Error:", err.message);
        return [];
    }
};

export const getSuggestedQuestions = async (req, res) => {
    const siteId = req.query?.siteId || req.body?.siteId;
    const userId = req.user._id;

    try {
        const cached = await SuggestedQuestions.findOne({ siteId, userId });
        
        if (cached && cached.questions && cached.questions.length > 0) {
            return res.status(200).json({ questions: cached.questions });
        }

        // Generate and save (if not found or stale)
        const questions = await generateSuggestedQuestionsInternal(userId, siteId);
        res.status(200).json({ questions });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching suggested questions' });
    }
};
