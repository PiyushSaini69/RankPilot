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
                },
                channelFilter: {
                    type: "STRING",
                    description: "Filter GA4 data by traffic channel. Use when user asks about specific traffic type. Values: 'Organic Search' (organic/SEO users), 'Paid Search' (paid/ad users), 'Direct' (direct visitors), 'Organic Social' (social traffic), 'Referral' (referral traffic). Leave empty for all channels."
                }
            },
            required: ["startDate", "endDate"]
        }
    }
];

const executeTool = async (name, args, userId, siteId) => {
    if (name === "get_market_data") {
        return await fetchPlatformData(
            userId, 
            args.startDate, 
            args.endDate, 
            siteId, 
            args.sources || [], 
            args.device || null,
            'UTC', // replace with user timezone if available
            args.fields || [],
            args.mode || 'standard',
            args.channelFilter || null
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
    mode = 'standard',
    channelFilter = null  // NEW: "Organic Search" | "Paid Search" | "Direct" | "Organic Social"
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
        channelFilter: channelFilter || 'all',
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
    const channelFilterQuery = channelFilter ? { 'metadata.dimensions.channel': channelFilter } : {};

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
            const baseFilter = { 'metadata.platformAccountId': config.id, ...deviceFilter, ...channelFilterQuery };

            // Use config-specific dates to support GSC 48h offset dynamically
            let configCurrentStart = currentStart;
            let configCurrentEnd = currentEnd;
            let configPrevStart = prevStart;
            let configPrevEnd = prevEnd;

            if (config.key === 'gsc') {
                const shiftDate = (dateObj, offset) => {
                    const d = new Date(dateObj);
                    d.setDate(d.getDate() + offset);
                    return d;
                };
                configCurrentStart = shiftDate(currentStart, -1);
                configCurrentEnd = shiftDate(currentEnd, -1);
                configPrevStart = shiftDate(prevStart, -1);
                configPrevEnd = shiftDate(prevEnd, -1);
            }

            // ── 1. TOTALS (always) ──────────────────────────────────────────
            const totalsAgg = await config.model.aggregate([
                { $match: { ...baseFilter, date: { $gte: configPrevStart, $lte: configCurrentEnd } } },
                {
                    $group: {
                        _id: { period: { $cond: [{ $gte: ['$date', configCurrentStart] }, 'current', 'previous'] } },
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
                { $match: { ...baseFilter, date: { $gte: configCurrentStart, $lte: configCurrentEnd } } },
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
                    { $match: { ...baseFilter, date: { $gte: configPrevStart, $lte: configCurrentEnd } } },
                    { $group: {
                        _id: { query: "$metadata.dimensions.query", period: { $cond: [{ $gte: ['$date', configCurrentStart] }, 'current', 'previous'] } },
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
                    { $match: { ...baseFilter, date: { $gte: configPrevStart, $lte: configCurrentEnd } } },
                    { $group: {
                        _id: { page: "$metadata.dimensions.page", period: { $cond: [{ $gte: ['$date', configCurrentStart] }, 'current', 'previous'] } },
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
                        { $match: { ...baseFilter, date: { $gte: configCurrentStart, $lte: configCurrentEnd } } },
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
                        { $match: { ...baseFilter, date: { $gte: configCurrentStart, $lte: configCurrentEnd } } },
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

    // FIX 4: Fetch connection status and inject into prompt
    let connectionContext = "";
    try {
        const accQuery = siteId ? { _id: siteId, userId } : { userId };
        const userAcc = await UserAccounts.findOne(accQuery)
            .select('ga4PropertyId gscSiteUrl googleAdsCustomerId facebookAdAccountId');

        const conn = {
            ga4: !!userAcc?.ga4PropertyId,
            gsc: !!userAcc?.gscSiteUrl,
            googleAds: !!userAcc?.googleAdsCustomerId,
            facebookAds: !!userAcc?.facebookAdAccountId
        };

        connectionContext = `\n\n[CONNECTION STATUS]:
- Google Analytics (GA4): ${conn.ga4 ? 'CONNECTED' : 'NOT CONNECTED'}
- Google Search Console (GSC): ${conn.gsc ? 'CONNECTED' : 'NOT CONNECTED'}
- Google Ads: ${conn.googleAds ? 'CONNECTED' : 'NOT CONNECTED'}
- Meta Ads (Facebook): ${conn.facebookAds ? 'CONNECTED' : 'NOT CONNECTED'}

CRITICAL RULES:
- ONLY recommend or mention platforms marked as CONNECTED.
- If a platform is NOT CONNECTED, never suggest the user to check it.
- Instead, use data from CONNECTED platforms to give the best possible answer.
- Example: If GSC is NOT CONNECTED and organic traffic drops — use GA4 channel and page data to analyze, not GSC.`;
    } catch (e) {
        console.error("Connection status fetch error:", e.message);
        // Non-blocking — continue without connection context
    }
    const nowLocal = new Date(new Date().toLocaleString('en-US', { timeZone: userTimezone }));
    const todayStr = nowLocal.toISOString().split('T')[0];

    // Pre-calculate common date ranges — ensures AI matches dashboard exactly (yesterday-anchored, inclusive)
    const getDatesForPresetVanilla = (preset) => {
        const fmt = (d) => d.toISOString().split('T')[0];
        const today = new Date(nowLocal);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (preset === 'today') {
            return { startDate: fmt(today), endDate: fmt(today) };
        }
        if (preset === 'yesterday') {
            return { startDate: fmt(yesterday), endDate: fmt(yesterday) };
        }
        if (preset === '7d') {
            const start = new Date(yesterday);
            start.setDate(start.getDate() - 6);
            return { startDate: fmt(start), endDate: fmt(yesterday) };
        }
        if (preset === '28d') {
            const start = new Date(yesterday);
            start.setDate(start.getDate() - 27);
            return { startDate: fmt(start), endDate: fmt(yesterday) };
        }
        if (preset === '30d') {
            const start = new Date(yesterday);
            start.setDate(start.getDate() - 29);
            return { startDate: fmt(start), endDate: fmt(yesterday) };
        }
        if (preset === '90d') {
            const start = new Date(yesterday);
            start.setDate(start.getDate() - 89);
            return { startDate: fmt(start), endDate: fmt(yesterday) };
        }
        if (preset === 'this_week') {
            const day = today.getDay();
            const diff = today.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(today);
            monday.setDate(diff);
            const end = day === 1 ? today : yesterday;
            return { startDate: fmt(monday), endDate: fmt(end) };
        }
        if (preset === 'last_week') {
            const day = today.getDay();
            const diff = today.getDate() - day + (day === 0 ? -6 : 1) - 7;
            const mondayLastWeek = new Date(today);
            mondayLastWeek.setDate(diff);
            const sundayLastWeek = new Date(mondayLastWeek);
            sundayLastWeek.setDate(sundayLastWeek.getDate() + 6);
            return { startDate: fmt(mondayLastWeek), endDate: fmt(sundayLastWeek) };
        }
        return null;
    };

    const range7d = getDatesForPresetVanilla('7d');
    const range28d = getDatesForPresetVanilla('28d');
    const range30d = getDatesForPresetVanilla('30d');
    const range90d = getDatesForPresetVanilla('90d');
    const rangeThisWeek = getDatesForPresetVanilla('this_week');
    const rangeLastWeek = getDatesForPresetVanilla('last_week');

    // GSC specific ranges (shifted 1 day back due to GSC 48h API delay)
    const shiftRangeStr = (rangeObj) => {
        if (!rangeObj) return null;
        const shiftStr = (dStr) => {
            const d = new Date(dStr + 'T00:00:00');
            d.setDate(d.getDate() - 1);
            return d.toISOString().split('T')[0];
        };
        return {
            startDate: shiftStr(rangeObj.startDate),
            endDate: shiftStr(rangeObj.endDate)
        };
    };

    const range7dGsc = shiftRangeStr(range7d);
    const range28dGsc = shiftRangeStr(range28d);
    const range30dGsc = shiftRangeStr(range30d);
    const range90dGsc = shiftRangeStr(range90d);
    const rangeThisWeekGsc = shiftRangeStr(rangeThisWeek);
    const rangeLastWeekGsc = shiftRangeStr(rangeLastWeek);

    const dateContext = `\n\n[REAL-TIME CONTEXT]:
- Today: ${todayStr}
- User Timezone: ${userTimezone}
- "Last 7 days" = ${range7d.startDate} to ${range7d.endDate} (Search Console: ${range7dGsc.startDate} to ${range7dGsc.endDate})
- "Last 28 days" = ${range28d.startDate} to ${range28d.endDate} (Search Console: ${range28dGsc.startDate} to ${range28dGsc.endDate})
- "Last 30 days" = ${range30d.startDate} to ${range30d.endDate} (Search Console: ${range30dGsc.startDate} to ${range30dGsc.endDate})
- "Last 90 days" = ${range90d.startDate} to ${range90d.endDate} (Search Console: ${range90dGsc.startDate} to ${range90dGsc.endDate})
- "This week" = ${rangeThisWeek.startDate} to ${rangeThisWeek.endDate} (Search Console: ${rangeThisWeekGsc.startDate} to ${rangeThisWeekGsc.endDate})
- "Last week" = ${rangeLastWeek.startDate} to ${rangeLastWeek.endDate} (Search Console: ${rangeLastWeekGsc.startDate} to ${rangeLastWeekGsc.endDate})
- "This month" = ${range30d.startDate} to ${range30d.endDate} (Search Console: ${range30dGsc.startDate} to ${range30dGsc.endDate})
- "Last quarter" = ${range90d.startDate} to ${range90d.endDate} (Search Console: ${range90dGsc.startDate} to ${range90dGsc.endDate})
ALWAYS use these exact date ranges. GSC ranges are automatically shifted 1 day earlier by the tool to account for GSC's 48-hour API delay.`;

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

        const chat = await startAgenticChat(chatHistory, aiTools, systemIns + dateContext + connectionContext);
        
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
                return "AI is busy. Please try again in 60 seconds.";
            }
            if (msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('high demand')) {
                return "AI is busy due to high demand. Please try again later.";
            }
            if (msg.includes('getaddrinfo') || msg.includes('ENOTFOUND') || msg.includes('redis') || msg.includes('connect')) {
                return "Connection glitch. Please try again in 2-3 minutes.";
            }
            if (msg.includes('API_KEY_INVALID') || msg.includes('auth')) {
                return "Configuration error. Please contact support.";
            }
            if (msg.includes('safety') || msg.includes('blocked')) {
                return "Question blocked for safety. Please rephrase.";
            }
            return "Something went wrong. Please refresh the page.";
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

export const generateWeeklyInsightInternal = async (userId, siteId, userTimezone) => {
    try {
        // FIX 1: Correct timezone handling
        const nowLocal = new Date(new Date().toLocaleString('en-US', { timeZone: userTimezone }));
        const todayStr = nowLocal.toISOString().split('T')[0];

        // Yesterday-anchored Last 7 days date range (inclusive, exactly 7 days)
        const yesterday = new Date(nowLocal);
        yesterday.setDate(yesterday.getDate() - 1);
        const endDate = yesterday.toISOString().split('T')[0];

        const startDate = new Date(yesterday);
        startDate.setDate(startDate.getDate() - 6);
        const startDateStr = startDate.toISOString().split('T')[0];

        // FIX 2: Fetch connection status
        const acc = await UserAccounts.findOne({ _id: siteId, userId })
            .select('ga4PropertyId gscSiteUrl googleAdsCustomerId facebookAdAccountId');

        const conn = {
            ga4: !!acc?.ga4PropertyId,
            gsc: !!acc?.gscSiteUrl,
            googleAds: !!acc?.googleAdsCustomerId,
            facebookAds: !!acc?.facebookAdAccountId
        };

        const connectedSources = [
            conn.ga4 && 'ga4',
            conn.gsc && 'gsc',
            conn.googleAds && 'google-ads',
            conn.facebookAds && 'facebook-ads'
        ].filter(Boolean);

        // FIX 3: Pre-fetch real data BEFORE AI call — full mode for weekly audit
        let realDataContext = "";
        try {
            const weeklyData = await fetchPlatformData(
                userId,
                startDateStr,
                endDate,
                siteId,
                connectedSources,
                null,
                userTimezone,
                [], // all fields
                'full' // full mode — weekly audit needs everything
            );

            const lines = [];

            if (weeklyData.ga4) {
                const g = weeklyData.ga4;
                lines.push(`[GA4 LAST 7 DAYS]`);
                lines.push(`- Sessions: ${g.sessions} (${g.sessionsGrowth}% vs prev week)`);
                lines.push(`- Users: ${g.users} (${g.usersGrowth}%)`);
                lines.push(`- New Users: ${g.newUsers} (${g.newUsersGrowth}%)`);
                lines.push(`- Page Views: ${g.pageViews} (${g.pageViewsGrowth}%)`);
                lines.push(`- Bounce Rate: ${g.bounceRate}`);
                lines.push(`- Engagement Rate: ${g.engagementRate}`);
                lines.push(`- Avg Session Duration: ${g.avgSessionDuration}`);
                lines.push(`- Revenue: $${g.revenue} (${g.revenueGrowth}%)`);
                lines.push(`- Conversions: ${g.conversions}`);
            }

            if (weeklyData.topDimensions?.channels?.length > 0) {
                lines.push(`\n[TOP CHANNELS]`);
                weeklyData.topDimensions.channels.slice(0, 5).forEach(c => {
                    lines.push(`- ${c.channel}: ${c.sessions} sessions (${c.growth}% growth, ${c.engagementRate} engagement)`);
                });
            }

            if (weeklyData.topDimensions?.pages?.length > 0) {
                lines.push(`\n[TOP PAGES]`);
                weeklyData.topDimensions.pages.slice(0, 5).forEach(p => {
                    lines.push(`- ${p.path}: ${p.sessions} sessions (${p.growth}% growth, ${p.engagementRate} engagement)`);
                });
            }

            if (weeklyData.dailyBreakdown?.ga4?.length > 0) {
                lines.push(`\n[GA4 DAILY SESSIONS]`);
                weeklyData.dailyBreakdown.ga4.forEach(d => {
                    lines.push(`- ${d.date}: ${d.metrics.sessions} sessions`);
                });
            }

            if (weeklyData.gsc) {
                const s = weeklyData.gsc;
                lines.push(`\n[GSC LAST 7 DAYS]`);
                lines.push(`- Clicks: ${s.clicks} (${s.clicksGrowth}%)`);
                lines.push(`- Impressions: ${s.impressions} (${s.impressionsGrowth}%)`);
                lines.push(`- CTR: ${s.ctr} (${s.ctrGrowth}%)`);
                lines.push(`- Avg Position: ${s.position}`);
            }

            if (weeklyData.topDimensions?.queries?.length > 0) {
                lines.push(`\n[TOP GSC QUERIES]`);
                weeklyData.topDimensions.queries.slice(0, 5).forEach(q => {
                    lines.push(`- "${q.query}": ${q.clicks} clicks, ${q.impressions} impressions, CTR ${q.ctr}, Position ${q.position} (${q.growth}% growth)`);
                });
            }

            if (weeklyData.topDimensions?.gscPages?.length > 0) {
                lines.push(`\n[TOP GSC PAGES]`);
                weeklyData.topDimensions.gscPages.slice(0, 5).forEach(p => {
                    lines.push(`- ${p.page}: ${p.clicks} clicks, ${p.impressions} impressions, CTR ${p.ctr}, Position ${p.position}`);
                });
            }

            if (weeklyData.dailyBreakdown?.gsc?.length > 0) {
                lines.push(`\n[GSC DAILY CLICKS]`);
                weeklyData.dailyBreakdown.gsc.forEach(d => {
                    lines.push(`- ${d.date}: ${d.metrics.clicks} clicks, ${d.metrics.impressions} impressions`);
                });
            }

            if (weeklyData.googleAds) {
                const a = weeklyData.googleAds;
                lines.push(`\n[GOOGLE ADS LAST 7 DAYS]`);
                lines.push(`- Spend: $${a.spend} (${a.spendGrowth}%)`);
                lines.push(`- Clicks: ${a.clicks} (${a.clicksGrowth}%)`);
                lines.push(`- Impressions: ${a.impressions} (${a.impressionsGrowth}%)`);
                lines.push(`- Conversions: ${a.conversions} (${a.conversionsGrowth}%)`);
                lines.push(`- ROAS: ${a.roas}`);
                lines.push(`- CPC: $${a.cpc}`);
                lines.push(`- CTR: ${a.ctr}`);
                lines.push(`- Search Impression Share: ${a.searchImpressionShare}`);
            }

            if (weeklyData.topDimensions?.campaigns?.length > 0) {
                lines.push(`\n[TOP CAMPAIGNS]`);
                weeklyData.topDimensions.campaigns.slice(0, 5).forEach(c => {
                    lines.push(`- ${c.campaign} (${c.source}): $${c.spend} spend, ${c.conversions} conversions, ROAS ${c.roas}, CPC $${c.cpc}, status: ${c.status}`);
                });
            }

            if (weeklyData.facebookAds) {
                const f = weeklyData.facebookAds;
                lines.push(`\n[META ADS LAST 7 DAYS]`);
                lines.push(`- Spend: $${f.spend} (${f.spendGrowth}%)`);
                lines.push(`- Clicks: ${f.clicks} (${f.clicksGrowth}%)`);
                lines.push(`- Reach: ${f.reach} (${f.reachGrowth}%)`);
                lines.push(`- Conversions: ${f.conversions} (${f.conversionsGrowth}%)`);
                lines.push(`- ROAS: ${f.roas}`);
                lines.push(`- CPC: $${f.cpc}`);
                lines.push(`- CTR: ${f.ctr}`);
                lines.push(`- Frequency: ${f.frequency}`);
            }

            if (weeklyData.topDimensions?.countries?.length > 0) {
                lines.push(`\n[TOP COUNTRIES (GA4)]`);
                weeklyData.topDimensions.countries.slice(0, 5).forEach(c => {
                    lines.push(`- ${c.country}: ${c.sessions} sessions`);
                });
            }

            if (weeklyData.topDimensions?.devices?.length > 0) {
                lines.push(`\n[DEVICES (GA4)]`);
                weeklyData.topDimensions.devices.forEach(d => {
                    lines.push(`- ${d.device}: ${d.sessions} sessions, ${d.engagementRate} engagement`);
                });
            }

            realDataContext = lines.length > 0
                ? `\n\n[REAL ANALYTICS DATA - Last 7 Days]:\n${lines.join('\n')}`
                : "";

        } catch (dataErr) {
            console.error("Data pre-fetch error for weekly insight:", dataErr.message);
            // Non-blocking — AI will use tool call as fallback
        }

        // Connection status for AI
        const connectionContext = `\n\n[CONNECTION STATUS]:
- Google Analytics (GA4): ${conn.ga4 ? 'CONNECTED' : 'NOT CONNECTED'}
- Google Search Console (GSC): ${conn.gsc ? 'CONNECTED' : 'NOT CONNECTED'}
- Google Ads: ${conn.googleAds ? 'CONNECTED' : 'NOT CONNECTED'}
- Meta Ads (Facebook): ${conn.facebookAds ? 'CONNECTED' : 'NOT CONNECTED'}

CRITICAL: ONLY audit platforms marked as CONNECTED. Skip disconnected platforms entirely — no placeholders, no N/A.`;

        // Load prompts
        let systemIns = "";
        let insightPrompt = "";
        try {
            systemIns = fs.readFileSync(path.join(process.cwd(), 'server', 'prompts', 'system.txt'), 'utf8');
            insightPrompt = fs.readFileSync(path.join(process.cwd(), 'server', 'prompts', 'weekly-insight.txt'), 'utf8');
        } catch (e) {
            systemIns = fs.readFileSync(path.join(process.cwd(), 'prompts', 'system.txt'), 'utf8');
            insightPrompt = fs.readFileSync(path.join(process.cwd(), 'prompts', 'weekly-insight.txt'), 'utf8');
        }

        const dateContext = `\n\n[REAL-TIME CONTEXT]: Today is ${todayStr}. Generate a weekly performance audit for the last 7 days (yesterday-anchored: ${startDateStr} to ${endDate}) using the REAL DATA provided above.`;

        // FIX 4: No tool calls needed — data already injected
        // Only use aiTools as fallback if real data fetch failed
        const toolsToUse = realDataContext ? [] : aiTools;
        const fullPrompt = systemIns + dateContext + connectionContext + realDataContext;

        const chat = await startAgenticChat([], toolsToUse, fullPrompt);
        let result = await chat.sendMessage(insightPrompt);
        let response = result.response;

        // Fallback tool loop (only triggers if realDataContext was empty)
        let iteration = 0;
        while (response.functionCalls()?.length > 0 && iteration < 3) {
            iteration++;
            const calls = response.functionCalls();
            const toolResponses = [];
            for (const call of calls) {
                // FIX 5: Pass userTimezone to executeTool
                const data = await executeTool(call.name, call.args, userId, siteId, userTimezone);
                toolResponses.push({ functionResponse: { name: call.name, response: { content: data } } });
            }
            result = await chat.sendMessage(toolResponses);
            response = result.response;
        }

        const finalContent = response.text()
            .replace(/(\r?\n)*.*response is advisory only.*/gi, '')
            .trim();

        // Save to DB
        const insight = await WeeklyInsight.findOneAndUpdate(
            { userId, siteId: siteId || null },
            { content: finalContent, generatedAt: new Date() },
            { upsert: true, returnDocument: 'after' }
        );

        // Notify user
        await createNotification(userId, {
            type: 'info',
            title: 'Weekly AI Insight Ready',
            message: 'Your weekly performance analysis has been generated.',
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
        const timezone = req.body?.timezone || req.query?.timezone || 'UTC';

        // Persist timezone for future cron jobs (fire-and-forget)
        if (timezone !== 'UTC' && siteId) {
            UserAccounts.findByIdAndUpdate(siteId, { timezone }).catch(() => {});
        }

        const insight = await generateWeeklyInsightInternal(req.user._id, siteId, timezone);
        res.status(200).json(insight);
    } catch (err) {
        res.status(err.statusCode || 503).json({ message: err.message });
    }
};


export const generateSuggestedQuestionsInternal = async (userId, siteId, timezone) => {
    try {
        const userTimezone = timezone || 'UTC';
        const nowLocal = new Date(new Date().toLocaleString('en-US', { timeZone: userTimezone }));
        const todayStr = nowLocal.toISOString().split('T')[0];

        // Date range: last 28 days (yesterday-anchored, inclusive, exactly 28 days)
        const yesterday = new Date(nowLocal);
        yesterday.setDate(yesterday.getDate() - 1);
        const endDate = yesterday.toISOString().split('T')[0];

        const startDate = new Date(yesterday);
        startDate.setDate(startDate.getDate() - 27);
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
                lines.push(`\n[GSC LAST 28 DAYS]`);
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
                lines.push(`\n[GOOGLE ADS LAST 28 DAYS]`);
                lines.push(`- Spend: $${a.spend} (${a.spendGrowth}%)`);
                lines.push(`- Clicks: ${a.clicks} (${a.clicksGrowth}%)`);
                lines.push(`- Conversions: ${a.conversions} (${a.conversionsGrowth}%)`);
                lines.push(`- ROAS: ${a.roas}`);
                lines.push(`- CPC: $${a.cpc}`);
                lines.push(`- CTR: ${a.ctr}`);
            }

            if (summaryData.facebookAds) {
                const f = summaryData.facebookAds;
                lines.push(`\n[META ADS LAST 28 DAYS]`);
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
                ? `\n\n[REAL ANALYTICS DATA - Last 28 Days]:\n${lines.join('\n')}`
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

        const dateContext = `\n\n[REAL-TIME CONTEXT]: Today's date is ${todayStr}. Suggested questions are for the last 28 days (yesterday-anchored: ${startDateStr} to ${endDate}). Return ONLY a JSON array of 4 strings. Each question MUST be under 15 words, a single sentence, and based on the REAL DATA provided above — not generic.`;

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
    const timezone = req.query?.timezone || req.body?.timezone || 'UTC';
    const userId = req.user._id;

    try {
        const cached = await SuggestedQuestions.findOne({ siteId, userId });

        // Use cache only if:
        // 1. It exists with valid questions, AND
        // 2. Client is not providing a specific non-UTC timezone (cron jobs generate with UTC, so
        //    if the user has a real timezone, regenerate to use correct date context)
        const hasValidCache = cached && cached.questions && cached.questions.length > 0;
        const clientHasTimezone = timezone && timezone !== 'UTC';

        if (hasValidCache && !clientHasTimezone) {
            return res.status(200).json({ questions: cached.questions });
        }

        // Generate and save (new user, or client has a real timezone to use)
        const questions = await generateSuggestedQuestionsInternal(userId, siteId, timezone);
        res.status(200).json({ questions });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching suggested questions' });
    }
};
