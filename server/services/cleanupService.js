import Ga4Metric from '../models/Ga4Metric.js';
import GscMetric from '../models/GscMetric.js';
import GoogleAdsMetric from '../models/GoogleAdsMetric.js';
import FacebookAdsMetric from '../models/FacebookAdsMetric.js';
import { get as getConfig } from './configService.js';

export const cleanupOldMetricsData = async () => {
    
    try {
        // Fetch retention days config parameter (defaults to 30 days if not set or invalid)
        const configVal = await getConfig('DATA_RETENTION_DAYS');
        const retentionDays = parseInt(configVal, 10) || 30;
        
        // Calculate threshold date (normalized to midnight)
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - retentionDays);
        thresholdDate.setHours(0, 0, 0, 0);
        
        // Run deletion operations in parallel for optimal database speed
        const [ga4Res, gscRes, gAdsRes, fbRes] = await Promise.all([
            Ga4Metric.deleteMany({ date: { $lt: thresholdDate } }),
            GscMetric.deleteMany({ date: { $lt: thresholdDate } }),
            GoogleAdsMetric.deleteMany({ date: { $lt: thresholdDate } }),
            FacebookAdsMetric.deleteMany({ date: { $lt: thresholdDate } })
        ]);
        
        return {
            retentionDays,
            thresholdDate,
            deletedCounts: {
                ga4: ga4Res.deletedCount || 0,
                gsc: gscRes.deletedCount || 0,
                googleAds: gAdsRes.deletedCount || 0,
                facebookAds: fbRes.deletedCount || 0
            }
        };
    } catch (err) {
        console.error('❌ [Cleanup] Error during metrics data pruning:', err);
        throw err;
    }
};

export default { cleanupOldMetricsData };
