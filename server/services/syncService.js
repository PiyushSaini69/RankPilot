import Ga4Metric from '../models/Ga4Metric.js';
import GscMetric from '../models/GscMetric.js';
import GoogleAdsMetric from '../models/GoogleAdsMetric.js';
import FacebookAdsMetric from '../models/FacebookAdsMetric.js';
import UserAccounts from '../models/UserAccounts.js';
import { runReport as runGa4Report } from './ga4Service.js';
import { runQuery as runGscQuery } from './gscService.js';
import { runQuery as runGAdsQuery } from './googleAdsService.js';
import { getInsights as getFbInsights } from './facebookAdsService.js';
import { createNotification } from '../utils/notification.js';
import { addSyncJob } from './queueService.js';
import { get as getConfig } from './configService.js';


let isGscCronRunning = false;
let isGa4CronRunning = false;
let isGAdsCronRunning = false;
let isFbCronRunning = false;

// Helper for retries
const withRetry = async (fn, retries = 3, delay = 1000) => {
    try {
        return await fn();
    } catch (err) {
        if (retries === 0) throw err;
        console.log(`[Retry] ⚠️ Attempt failed! Retrying in ${delay}ms... (Remaining: ${retries})`);
        await new Promise(res => setTimeout(res, delay));
        return withRetry(fn, retries - 1, delay * 2);
    }
};

// 10 days window for daily sync
const getSyncRange = () => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    let start = new Date();
    start.setDate(start.getDate() - 10);
    
    const startDateStr = start.toISOString().split('T')[0];
    return { startDate: startDateStr, endDate: todayStr };
};

export const syncHistoricalData = async (accountId, source) => {
    const acc = await UserAccounts.findById(accountId);
    if (!acc) return;

    const sourceMap = {
        'ga4': 'ga4',
        'gsc': 'gsc',
        'google-ads': 'googleAds',
        'facebook-ads': 'facebookAds'
    };

    const sourceToConfigField = {
        'ga4': 'ga4PropertyId',
        'gsc': 'gscSiteUrl',
        'google-ads': 'googleAdsCustomerId',
        'facebook-ads': 'facebookAdAccountId'
    };

    const prefix = sourceMap[source] || source;
    const configField = sourceToConfigField[source];
    const statusField = `${prefix}SyncStatus`;
    const progressField = `${prefix}SyncProgress`;
    const completeField = `${prefix}HistoricalComplete`;
    const indexField = `${prefix}HistoricalChunkIndex`;

    // If source is not configured OR historical sync is already complete, skip it
    if (!acc[configField] || acc[completeField]) {
        const reason = !acc[configField] ? 'Not Configured' : 'Already Complete';
        console.log(`[Historical Sync] ⏭️ Skipping [${source.toUpperCase()}] for "${acc.siteName}" (${reason})`);
        
        await UserAccounts.findByIdAndUpdate(accountId, { [statusField]: 'idle' });
        await checkNextPendingSync(accountId);
        return;
    }

    const syncStatusFields = ['ga4SyncStatus', 'gscSyncStatus', 'googleAdsSyncStatus', 'facebookAdsSyncStatus'];
    const syncingCheck = await UserAccounts.findOneAndUpdate(
        { 
            _id: accountId, 
            $and: syncStatusFields.map(field => ({ [field]: { $ne: 'syncing' } }))
        },
        { 
            $set: { 
                [statusField]: 'syncing',
                [progressField]: acc[progressField] || 0,
                syncStatus: 'syncing' 
            } 
        },
        { returnDocument: 'after' }
    );

    if (!syncingCheck) {
        const freshAcc = await UserAccounts.findById(accountId);
        if (freshAcc && freshAcc[statusField] !== 'syncing') {
            console.log(`[Historical Sync] ⏳ Queued [${source.toUpperCase()}] for "${acc.siteName}" | Waiting for other syncs...`);
            await UserAccounts.findByIdAndUpdate(accountId, { [statusField]: 'pending' });
        }
        return;
    }

    const limits = { 
        'gsc': parseInt(await getConfig('SYNC_LIMIT_GSC') || 28), 
        'ga4': parseInt(await getConfig('SYNC_LIMIT_GA4') || 28), 
        'google-ads': parseInt(await getConfig('SYNC_LIMIT_GOOGLE_ADS') || 28), 
        'facebook-ads': parseInt(await getConfig('SYNC_LIMIT_FACEBOOK_ADS') || 28) 
    };
    const targetDays = limits[source] || 28;
    const periodLabel = `${targetDays} Day${targetDays > 1 ? 's' : ''}`;
    console.log(`[Historical Sync] 🔄 Starting [${source.toUpperCase()}] for "${acc.siteName}" | Target: ${periodLabel}`);

    try {
        const now = new Date();
        const startIndex = acc[indexField] || 0;
        
        const chunkSize = 1;
        const totalChunks = Math.ceil(targetDays / chunkSize);

        for (let i = startIndex; i < totalChunks; i++) {
            const end = new Date(now);
            end.setDate(end.getDate() - (i * chunkSize));
            const start = new Date(end);
            start.setDate(start.getDate() - chunkSize + 1);

            const startDate = start.toISOString().split('T')[0];
            const endDate = (end > now ? now : end).toISOString().split('T')[0];

            const progressNum = Math.round(((i + 1) / totalChunks) * 100);
            console.log(`[Historical Sync] 📈 Progress [${source.toUpperCase()}] | "${acc.siteName}" | ${startDate} -> ${endDate} (${progressNum}%)`);

            switch (source) {
                case 'ga4': await withRetry(() => syncGa4(acc, startDate, endDate)); break;
                case 'gsc': await withRetry(() => syncGsc(acc, startDate, endDate)); break;
                case 'google-ads': await withRetry(() => syncGoogleAds(acc, startDate, endDate)); break;
                case 'facebook-ads': await withRetry(() => syncFacebookAds(acc, startDate, endDate)); break;
            }

            // Update progress & last completed chunk
            const nextIndex = i + 1;
            const progress = Math.min(100, Math.round((nextIndex / totalChunks) * 100));
            await UserAccounts.findByIdAndUpdate(accountId, { 
                [progressField]: progress,
                [indexField]: nextIndex
            });
        }

        const updateFields = {
            [statusField]: 'idle',
            [progressField]: 100,
            [completeField]: true,
            [indexField]: 0,
            [`${prefix}LastSyncedAt`]: new Date()
        };

        const updatedAcc = await UserAccounts.findByIdAndUpdate(accountId, { $set: updateFields }, { returnDocument: 'after' });
        await updateGlobalSyncStatus(updatedAcc);

        // Notify user about historical sync completion
        const prettyName = { 'ga4': 'GA4', 'gsc': 'Search Console', 'google-ads': 'Google Ads', 'facebook-ads': 'Facebook Ads' }[source] || source;
        await createNotification(acc.userId, {
            type: 'success',
            title: `${prettyName} Historical Sync Ready`,
            message: `Last ${periodLabel} of ${prettyName} data for "${acc.siteName}" has been successfully synced.`,
            source: source,
            actionLabel: 'View Dashboard',
            actionPath: '/dashboard'
        });

        console.log(`[Historical Sync] ✅ Completed [${source.toUpperCase()}] for "${acc.siteName}" | Total Days: ${targetDays}`);
    } catch (err) {
        console.error(`[Historical Sync] ❌ Failed [${source.toUpperCase()}] for "${acc.siteName}" | Error: ${err.message}`);
        const updatedAcc = await UserAccounts.findByIdAndUpdate(accountId, { 
            [statusField]: 'error' 
        }, { returnDocument: 'after' });
        await updateGlobalSyncStatus(updatedAcc);

        // Notify user about failure
        const prettyName = { 'ga4': 'GA4', 'gsc': 'Search Console', 'google-ads': 'Google Ads', 'facebook-ads': 'Facebook Ads' }[source] || source;
        await createNotification(acc.userId, {
            type: 'error',
            title: `${prettyName} Sync Failed`,
            message: `An error occurred while syncing ${prettyName} data for "${acc.siteName}". Please try reconnecting the source.`,
            source: source,
            actionLabel: 'Check Settings',
            actionPath: '/connect-accounts'
        });
    } finally {
        await checkNextPendingSync(accountId);
    }
};

const checkNextPendingSync = async (accountId) => {
    const acc = await UserAccounts.findById(accountId);
    if (!acc) return;

    const platforms = [
        { key: 'ga4', status: 'ga4SyncStatus', config: 'ga4PropertyId' },
        { key: 'gsc', status: 'gscSyncStatus', config: 'gscSiteUrl' },
        { key: 'google-ads', status: 'googleAdsSyncStatus', config: 'googleAdsCustomerId' },
        { key: 'facebook-ads', status: 'facebookAdsSyncStatus', config: 'facebookAdAccountId' }
    ];

    const next = platforms.find(p => acc[p.status] === 'pending');
    if (next) {
        if (!acc[next.config]) {
            console.log(`[Historical Sync] Clearing pending status for ${next.key} (not configured).`);
            const updatedAcc = await UserAccounts.findByIdAndUpdate(accountId, { [next.status]: 'idle' }, { returnDocument: 'after' });
            await updateGlobalSyncStatus(updatedAcc);
            return checkNextPendingSync(accountId); 
        }
        console.log(`[Historical Sync] Queue: Triggering next pending source: ${next.key} for ${acc.siteName}`);
        await addSyncJob('historical-sync', { accountId, accName: acc.siteName, source: next.key }, { priority: 20 });
    }
};

async function updateGlobalSyncStatus(acc) {
    const statuses = ['ga4SyncStatus', 'gscSyncStatus', 'googleAdsSyncStatus', 'facebookAdsSyncStatus'];
    const currentStates = statuses.map(s => acc[s]);

    let finalStatus = 'idle';
    if (currentStates.includes('syncing') || currentStates.includes('pending')) {
        finalStatus = 'syncing';
    } else if (currentStates.includes('error')) {
        finalStatus = 'error';
    }

    const isGa4Done = !acc.ga4PropertyId || acc.ga4HistoricalComplete;
    const isGscDone = !acc.gscSiteUrl || acc.gscHistoricalComplete;
    const isGAdsDone = !acc.googleAdsCustomerId || acc.googleAdsHistoricalComplete;
    const isFbDone = !acc.facebookAdAccountId || acc.facebookAdsHistoricalComplete;

    const isAllHistoricalDone = isGa4Done && isGscDone && isGAdsDone && isFbDone;

    await UserAccounts.findByIdAndUpdate(acc._id, { 
        syncStatus: finalStatus
    });
}

export const syncGa4 = async (acc, startDate, endDate) => {
    if (!acc || !acc.ga4PropertyId) return;
    const userId = acc.userId;

    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const currentDayStr = d.toISOString().split('T')[0];
        const formattedDateForGa4 = currentDayStr.replace(/-/g, ''); // GA4 expects YYYYMMDD in some cases, but runReport handles YYYY-MM-DD too. We'll use YYYY-MM-DD.

        try {
            const report = await runGa4Report(userId, acc.ga4PropertyId, 'ultra_detail_sync', currentDayStr, currentDayStr,
                ['date', 'sessionDefaultChannelGroup', 'sessionSourceMedium', 'deviceCategory', 'country', 'pagePath', 'landingPagePlusQueryString', 'pageTitle'],
                ['activeUsers', 'newUsers', 'sessions', 'engagedSessions', 'screenPageViews', 'averageSessionDuration', 'engagementRate', 'totalRevenue', 'transactions', 'conversions'],
                acc.ga4TokenId
            );

            if (report.rows && report.rows.length > 0) {
                const operations = report.rows.map(row => {
                    const dateStr = row.dimensionValues[0].value;
                    const formattedDate = new Date(`${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`);
                    return {
                        updateOne: {
                            filter: {
                                'metadata.userId': userId,
                                'metadata.siteId': acc._id,
                                'metadata.platformAccountId': acc.ga4PropertyId,
                                date: formattedDate,
                                'metadata.dimensions.channel': row.dimensionValues[1].value,
                                'metadata.dimensions.source': row.dimensionValues[2].value,
                                'metadata.dimensions.device': row.dimensionValues[3].value,
                                'metadata.dimensions.country': row.dimensionValues[4].value,
                                'metadata.dimensions.pagePath': row.dimensionValues[5].value,
                                'metadata.dimensions.landingPage': row.dimensionValues[6].value,
                                'metadata.dimensions.pageTitle': row.dimensionValues[7].value
                            },
                            update: {
                                $set: {
                                    metrics: {
                                        users: parseFloat(row.metricValues[0].value || 0),
                                        newUsers: parseFloat(row.metricValues[1].value || 0),
                                        sessions: parseFloat(row.metricValues[2].value || 0),
                                        engagedSessions: parseFloat(row.metricValues[3].value || 0),
                                        pageViews: parseFloat(row.metricValues[4].value || 0),
                                        avgSessionDuration: parseFloat(row.metricValues[5].value || 0),
                                        engagementRate: parseFloat(row.metricValues[6].value || 0) * 100,
                                        bounceRate: (1 - parseFloat(row.metricValues[6].value || 0)) * 100, 
                                        revenue: parseFloat(row.metricValues[7].value || 0),
                                        transactions: parseFloat(row.metricValues[8].value || 0),
                                        conversions: parseFloat(row.metricValues[9].value || 0)
                                    },
                                    syncedAt: new Date()
                                }
                            },
                            upsert: true
                        }
                    };
                });

                for (let i = 0; i < operations.length; i += 1000) {
                    const chunk = operations.slice(i, i + 1000);
                    await Ga4Metric.bulkWrite(chunk);
                }
            }
        } catch (err) {
            console.error(`[Sync] ❌ Error syncing GA4 for ${currentDayStr}: ${err.message}`);
        }
    }
};

export const syncGsc = async (acc, startDate, endDate) => {
    if (!acc || !acc.gscSiteUrl) return;
    const userId = acc.userId;

    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const currentDayStr = d.toISOString().split('T')[0];
        
        try {
            const res = await runGscQuery(userId, acc.gscSiteUrl, 'ultra_detail_sync', currentDayStr, currentDayStr, ['date', 'page', 'query'], acc.gscTokenId);

            if (res.rows && res.rows.length > 0) {
                const operations = res.rows
                    .filter(row => row.clicks > 0 || row.impressions >= 1) // Reduced threshold to catch more long-tail data
                    .map(row => {
                        const rowDate = new Date(row.keys[0]);
                        return {
                            updateOne: {
                                filter: {
                                    'metadata.userId': userId,
                                    'metadata.siteId': acc._id,
                                    'metadata.platformAccountId': acc.gscSiteUrl,
                                    date: rowDate,
                                    'metadata.dimensions.page': row.keys[1],
                                    'metadata.dimensions.query': row.keys[2]
                                },
                                update: {
                                    $set: {
                                        metrics: {
                                            clicks: parseFloat(row.clicks || 0),
                                            impressions: parseFloat(row.impressions || 0),
                                            ctr: parseFloat(row.ctr || 0) * 100,
                                            position: parseFloat(row.position || 0)
                                        },
                                        syncedAt: new Date()
                                    }
                                },
                                upsert: true
                            }
                        };
                    });

                for (let i = 0; i < operations.length; i += 1000) {
                    const chunk = operations.slice(i, i + 1000);
                    await GscMetric.bulkWrite(chunk);
                }
            }
        } catch (err) {
            console.error(`[Sync] ❌ Error syncing GSC for ${currentDayStr}: ${err.message}`);
        }
    }
};

export const syncGoogleAds = async (acc, startDate, endDate) => {
    if (!acc || !acc.googleAdsCustomerId) return;
    const userId = acc.userId;

    const query = `
        SELECT segments.date, campaign.name, campaign.status, ad_group.name, ad_group.status, segments.device, segments.ad_network_type, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value, metrics.all_conversions, metrics.view_through_conversions, metrics.search_impression_share, metrics.average_cpc, metrics.ctr, metrics.active_view_impressions
        FROM customer WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    `;
    const res = await runGAdsQuery(userId, acc.googleAdsCustomerId, 'ultra_detail_sync', startDate, endDate, query, acc.googleAdsTokenId);

    if (res && res.length > 0) {
        const operations = res.map(row => {
            const rowDate = new Date(row.segments.date);
            return {
                updateOne: {
                    filter: {
                        'metadata.userId': userId,
                        'metadata.siteId': acc._id,
                        'metadata.platformAccountId': acc.googleAdsCustomerId,
                        date: rowDate,
                        'metadata.dimensions.campaign': row.campaign.name,
                        'metadata.dimensions.campaignStatus': row.campaign.status,
                        'metadata.dimensions.adGroup': row.adGroup?.name,
                        'metadata.dimensions.adGroupStatus': row.adGroup?.status,
                        'metadata.dimensions.device': row.segments.device,
                        'metadata.dimensions.network': row.segments.adNetworkType
                    },
                    update: {
                        $set: {
                            metrics: {
                                spend: parseFloat(row.metrics.costMicros || 0) / 1000000,
                                impressions: parseFloat(row.metrics.impressions || 0),
                                clicks: parseFloat(row.metrics.clicks || 0),
                                conversions: parseFloat(row.metrics.conversions || 0),
                                conversionValue: parseFloat(row.metrics.conversionsValue || 0),
                                allConversions: parseFloat(row.metrics.allConversions || 0),
                                viewThroughConversions: parseFloat(row.metrics.viewThroughConversions || 0),
                                searchImpressionShare: parseFloat(row.metrics.searchImpressionShare || 0),
                                cpc: parseFloat(row.metrics.averageCpc || 0) / 1000000,
                                ctr: parseFloat(row.metrics.ctr || 0) * 100,
                                cpm: (parseFloat(row.metrics.costMicros || 0) / (parseFloat(row.metrics.impressions || 1) / 1000)) / 1000000
                            },
                            syncedAt: new Date()
                        }
                    },
                    upsert: true
                }
            };
        });

        for (let i = 0; i < operations.length; i += 1000) {
            const chunk = operations.slice(i, i + 1000);
            await GoogleAdsMetric.bulkWrite(chunk);
        }
    }
};

export const syncFacebookAds = async (acc, startDate, endDate) => {
    if (!acc || !acc.facebookAdAccountId) return;
    const userId = acc.userId;

    const res = await getFbInsights(userId, acc.facebookAdAccountId, 'ultra_detail_sync', startDate, endDate, 'adset', {
        time_increment: 1,
        breakdowns: ['device_platform']
    }, acc.facebookTokenId);

    if (res && res.length > 0) {
        const operations = res.map(row => {
            const rowDate = new Date(row.date_start);
            return {
                updateOne: {
                    filter: {
                        'metadata.userId': userId,
                        'metadata.siteId': acc._id,
                        'metadata.platformAccountId': acc.facebookAdAccountId,
                        date: rowDate,
                        'metadata.dimensions.campaign': row.campaign_name,
                        'metadata.dimensions.adset': row.adset_name,
                        'metadata.dimensions.device': row.device_platform
                    },
                    update: {
                        $set: {
                            metrics: {
                                spend: parseFloat(row.spend || 0),
                                impressions: parseFloat(row.impressions || 0),
                                clicks: parseFloat(row.clicks || 0),
                                reach: parseFloat(row.reach || 0),
                                conversions: parseFloat(
                                    (row.actions || []).reduce((acc, action) => {
                                        const convTypes = [
                                            'offsite_conversion.fb_pixel_purchase',
                                            'offsite_conversion.fb_pixel_lead',
                                            'offsite_conversion.fb_pixel_complete_registration',
                                            'offsite_conversion.fb_pixel_add_to_cart',
                                            'offsite_conversion.fb_pixel_contact',
                                            'offsite_conversion.fb_pixel_submit_application',
                                            'purchase',
                                            'lead'
                                        ];
                                        if (convTypes.includes(action.action_type)) {
                                            return acc + parseFloat(action.value || 0);
                                        }
                                        return acc;
                                    }, 0) || row.conversions?.[0]?.value || 0
                                ),
                                purchase_value: parseFloat(row.action_values?.find(a => a.action_type === 'offsite_conversion.fb_pixel_purchase' || a.action_type === 'purchase')?.value || 0),
                                landing_page_views: parseFloat(row.actions?.find(a => a.action_type === 'landing_page_view')?.value || 0),
                                link_clicks: parseFloat(row.actions?.find(a => a.action_type === 'link_click')?.value || 0),
                                frequency: parseFloat(row.frequency || 0),
                                engagement: parseFloat(row.actions?.find(a => a.action_type === 'post_engagement')?.value || 0),
                                cpc: parseFloat(row.cpc || 0),
                                cpm: parseFloat(row.cpm || 0),
                                ctr: parseFloat(row.ctr || 0)
                            },
                            syncedAt: new Date()
                        }
                    },
                    upsert: true
                }
            };
        });

        for (let i = 0; i < operations.length; i += 1000) {
            const chunk = operations.slice(i, i + 1000);
            await FacebookAdsMetric.bulkWrite(chunk);
        }
    }
};

export const syncAllGsc = async () => {
    if (isGscCronRunning) return;
    isGscCronRunning = true;
    console.log('[Cron] 🕒 Starting Global Sync: [GSC]...');
    try {
        const users = await UserAccounts.find({ gscSiteUrl: { $exists: true, $ne: null, $gt: '' } });
        for (const acc of users) {
            try {
                const { startDate, endDate } = getSyncRange();
                if (acc.syncStatus === 'syncing') continue;
                
                await addSyncJob('daily-sync-gsc', { acc, startDate, endDate }, { priority: 5 });
            } catch (e) { console.error(`[Cron] ❌ Queue Fail [GSC] | Account: ${acc._id} | Reason: ${e.message}`); }
        }
    } finally { isGscCronRunning = false; console.log('[Cron] ✨ [GSC] Global Sync Completed.'); }
};

export const syncAllGa4 = async () => {
    if (isGa4CronRunning) return;
    isGa4CronRunning = true;
    console.log('[Cron] 🕒 Starting Global Sync: [GA4]...');
    try {
        const users = await UserAccounts.find({ ga4PropertyId: { $exists: true, $ne: null, $gt: '' } });
        for (const acc of users) {
            try {
                const { startDate, endDate } = getSyncRange();
                if (acc.syncStatus === 'syncing') continue;
                
                await addSyncJob('daily-sync-ga4', { acc, startDate, endDate }, { priority: 5 });
            } catch (e) { console.error(`[Cron] ❌ Queue Fail [GA4] | Account: ${acc._id} | Reason: ${e.message}`); }
        }
    } finally { isGa4CronRunning = false; console.log('[Cron] ✨ [GA4] Global Sync Completed.'); }
};

export const syncAllGoogleAds = async () => {
    if (isGAdsCronRunning) return;
    isGAdsCronRunning = true;
    console.log('[Cron] 🕒 Starting Global Sync: [GOOGLE ADS]...');
    try {
        const users = await UserAccounts.find({ googleAdsCustomerId: { $exists: true, $ne: null, $gt: '' } });
        for (const acc of users) {
            try {
                const { startDate, endDate } = getSyncRange();
                if (acc.syncStatus === 'syncing') continue;
                
                await addSyncJob('daily-sync-google-ads', { acc, startDate, endDate }, { priority: 5 });
            } catch (e) { console.error(`[Cron] ❌ Queue Fail [GOOGLE ADS] | Account: ${acc._id} | Reason: ${e.message}`); }
        }
    } finally { isGAdsCronRunning = false; console.log('[Cron] ✨ [GOOGLE ADS] Global Sync Completed.'); }
};

export const syncAllFacebookAds = async () => {
    if (isFbCronRunning) return;
    isFbCronRunning = true;
    console.log('[Cron] 🕒 Starting Global Sync: [FB ADS]...');
    try {
        const users = await UserAccounts.find({ facebookAdAccountId: { $exists: true, $ne: null, $gt: '' } });
        for (const acc of users) {
            try {
                const { startDate, endDate } = getSyncRange();
                if (acc.syncStatus === 'syncing') continue;
                
                await addSyncJob('daily-sync-facebook-ads', { acc, startDate, endDate }, { priority: 5 });
            } catch (e) { console.error(`[Cron] ❌ Queue Fail [FB ADS] | Account: ${acc._id} | Reason: ${e.message}`); }
        }
    } finally { isFbCronRunning = false; console.log('[Cron] ✨ [FB ADS] Global Sync Completed.'); }
};

export const syncDailyForAllUsers = async () => {
    await syncAllFacebookAds();
    await syncAllGoogleAds();
    await syncAllGa4();
    await syncAllGsc();
};
