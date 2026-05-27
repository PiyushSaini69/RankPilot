import FacebookToken from '../models/FacebookToken.js';
import Ga4Metric from '../models/Ga4Metric.js';
import GscMetric from '../models/GscMetric.js';
import GoogleAdsMetric from '../models/GoogleAdsMetric.js';
import FacebookAdsMetric from '../models/FacebookAdsMetric.js';
import UserAccounts from '../models/UserAccounts.js';
import { createNotification } from '../utils/notification.js';
import { generateWeeklyInsightInternal, generateSuggestedQuestionsInternal } from '../controllers/aiController.js';


// Weekly check for significant performance drops (comparing last 7 days with previous 7 days)
export const checkPerformanceDrops = async () => {
    const now = new Date();
    const splitDate = new Date();
    splitDate.setDate(now.getDate() - 7);
    const startDate = new Date();
    startDate.setDate(now.getDate() - 14);

    try {
        const accounts = await UserAccounts.find();
        for (const acc of accounts) {
            const platformChecks = [
                { id: acc.ga4PropertyId, model: Ga4Metric, metric: 'sessions', type: 'GA4' },
                { id: acc.gscSiteUrl, model: GscMetric, metric: 'clicks', type: 'GSC' }
            ].filter(p => p.id);

            for (const check of platformChecks) {
                const metrics = await check.model.aggregate([
                    { $match: { 'metadata.platformAccountId': check.id, date: { $gte: startDate, $lte: now } } },
                    { $group: { _id: { period: { $cond: [{ $gte: ['$date', splitDate] }, 'current', 'previous'] } }, total: { $sum: `$metrics.${check.metric}` } } }
                ]);

                const current = metrics.find(m => m._id.period === 'current');
                const previous = metrics.find(m => m._id.period === 'previous');

                if (current && previous) {
                    const prevVal = previous.total || 0;
                    const curVal = current.total || 0;

                    if (prevVal > 100 && curVal < prevVal * 0.7) {
                        const dropPercent = Math.round(((prevVal - curVal) / prevVal) * 100);
                        await createNotification(acc.userId, {
                            type: 'warning',
                            title: `${check.type} Traffic Alert: ${dropPercent}% Drop`,
                            message: `Your traffic for "${acc.siteName}" has dropped by ${dropPercent}% compared to last week. Explore AI insights to see why.`,
                            source: 'ai',
                            actionLabel: 'Analyze Now',
                            actionPath: '/dashboard/ai-chat'
                        });
                    }
                }
            }
        }
    } catch (err) {
        console.error('[Monitoring] Performance check failed:', err.message);
    }
};

// Checks for sources with zero data for the last 3 days.
export const checkInactiveSources = async () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    try {
        const accounts = await UserAccounts.find();
        for (const acc of accounts) {
            const sources = [
                { id: acc.ga4PropertyId, name: 'GA4', key: 'sessions', model: Ga4Metric },
                { id: acc.gscSiteUrl, name: 'Search Console', key: 'clicks', model: GscMetric },
                { id: acc.googleAdsCustomerId, name: 'Google Ads', key: 'spend', model: GoogleAdsMetric },
                { id: acc.facebookAdAccountId, name: 'Facebook Ads', key: 'spend', model: FacebookAdsMetric }
            ].filter(s => s.id);

            for (const source of sources) {
                const recentData = await source.model.findOne({
                    'metadata.platformAccountId': source.id,
                    date: { $gte: threeDaysAgo },
                    [`metrics.${source.key}`]: { $gt: 0 }
                });

                if (!recentData) {
                    await createNotification(acc.userId, {
                        type: 'error',
                        title: `Tracking Alert: No ${source.name} Data`,
                        message: `No data received from ${source.name} for "${acc.siteName}" in 3 days. Check your tracking setup.`,
                        source: source.name.toLowerCase().replace(' ', '-'),
                        actionLabel: 'Check Settings',
                        actionPath: '/connect-accounts'
                    });
                }
            }
        }
    } catch (err) {
        console.error('[Monitoring] Inactive source check failed:', err.message);
    }
};

// Monthly growth check (comparing last month vs previous month).
export const checkMonthlyGrowth = async () => {
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    try {
        const accounts = await UserAccounts.find();
        for (const acc of accounts) {
            const platformChecks = [
                { id: acc.ga4PropertyId, model: Ga4Metric, metric: 'sessions', type: 'GA4' },
                { id: acc.gscSiteUrl, model: GscMetric, metric: 'clicks', type: 'GSC' }
            ].filter(p => p.id);

            for (const check of platformChecks) {
                const metrics = await check.model.aggregate([
                    { $match: { 'metadata.platformAccountId': check.id, date: { $gte: firstDayPrevMonth, $lt: firstDayThisMonth } } },
                    { $group: { _id: { period: { $cond: [{ $gte: ['$date', firstDayLastMonth] }, 'lastMonth', 'prevMonth'] } }, total: { $sum: `$metrics.${check.metric}` } } }
                ]);

                const lastMonth = metrics.find(m => m._id.period === 'lastMonth');
                const prevMonth = metrics.find(m => m._id.period === 'prevMonth');

                if (lastMonth && prevMonth) {
                    const lastVal = lastMonth.total || 0;
                    const prevVal = prevMonth.total || 0;

                    if (prevVal > 100) {
                        const growthPercent = Math.round(((lastVal - prevVal) / prevVal) * 100);
                        if (growthPercent > 5) {
                            await createNotification(acc.userId, {
                                type: 'success',
                                title: `${check.type} Monthly Growth Report`,
                                message: `Your ${acc.siteName} grew by ${growthPercent}% last month! Keep it up! 🚀`,
                                source: 'ai',
                                actionLabel: 'View Monthly Full Report',
                                actionPath: '/dashboard'
                            });
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error('[Monitoring] Monthly growth check failed:', err.message);
    }
};

// Ad Spend Alert for sudden spikes.
export const checkAdSpendSpikes = async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0,0,0,0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 8);

    try {
        const accounts = await UserAccounts.find({ $or: [{ googleAdsCustomerId: { $ne: null } }, { facebookAdAccountId: { $ne: null } }] });
        for (const acc of accounts) {
            const platforms = [
                { id: acc.googleAdsCustomerId, model: GoogleAdsMetric, type: 'google-ads' },
                { id: acc.facebookAdAccountId, model: FacebookAdsMetric, type: 'facebook-ads' }
            ].filter(p => p.id);
            
            for (const platform of platforms) {
                const yesterdayData = await platform.model.findOne({ 'metadata.platformAccountId': platform.id, date: yesterday });
                if (!yesterdayData || !yesterdayData.metrics.spend) continue;

                const avgData = await platform.model.aggregate([
                    { $match: { 'metadata.platformAccountId': platform.id, date: { $gte: sevenDaysAgo, $lt: yesterday } } },
                    { $group: { _id: null, avgSpend: { $avg: '$metrics.spend' } } }
                ]);

                if (avgData.length > 0 && avgData[0].avgSpend > 5) {
                    const avg = avgData[0].avgSpend;
                    const spent = yesterdayData.metrics.spend;
                    if (spent > avg * 1.5) {
                        const spikePercent = Math.round(((spent - avg) / avg) * 100);
                        await createNotification(acc.userId, {
                            type: 'warning',
                            title: 'Ad Budget Spike Alert',
                            message: `Yesterday's spend for "${acc.siteName}" was ${spikePercent}% higher than average. Review your campaigns.`,
                            source: pId === acc.googleAdsCustomerId ? 'google-ads' : 'facebook-ads',
                            actionLabel: 'Check Ads',
                            actionPath: pId === acc.googleAdsCustomerId ? '/dashboard/google-ads' : '/dashboard/facebook-ads'
                        });
                    }
                }
            }
        }
    } catch (err) {
        console.error('[Monitoring] Ad spend spike check failed:', err.message);
    }
};

// Generate weekly reports for ALL users.
export const generateWeeklyInsightsForAllUsers = async () => {
    try {
        const accounts = await UserAccounts.find();
        for (const acc of accounts) {
            try {
                const timezone = acc.timezone || 'UTC';
                await generateWeeklyInsightInternal(acc.userId, acc._id, timezone);
            } catch (err) {
                console.error(`[AI] Failed to generate insight for ${acc.siteName}:`, err.message);
            }
        }
    } catch (err) {
        console.error('[AI] Weekly Insight Bulk Generation Error:', err.message);
    }
};

// Generate suggested questions for ALL users.
export const generateSuggestedQuestionsForAllUsers = async () => {
    try {
        const accounts = await UserAccounts.find();
        for (const acc of accounts) {
            try {
                const timezone = acc.timezone || 'UTC';
                await generateSuggestedQuestionsInternal(acc.userId, acc._id, timezone);
            } catch (err) {
                console.error(`[AI] Failed to generate questions for ${acc.siteName}:`, err.message);
            }
        }
    } catch (err) {
        console.error('[AI] Suggested Questions Bulk Generation Error:', err.message);
    }
};
