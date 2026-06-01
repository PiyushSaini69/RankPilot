import cron from 'node-cron';
import { syncAllGsc, syncAllGa4, syncAllGoogleAds, syncAllFacebookAds, syncDailyForAllUsers } from './syncService.js';
import { 
    checkPerformanceDrops, 
    checkInactiveSources, 
    checkMonthlyGrowth, 
    checkAdSpendSpikes,
    generateWeeklyInsightsForAllUsers,
    generateSuggestedQuestionsForAllUsers
} from './notificationMonitoringService.js';
import { cleanupOldMetricsData } from './cleanupService.js';


export const initCronJobs = () => {
     // 🟢 SECTION 1: SYSTEM MONITORING & ALERTS

    // Daily Historical Data Cleanup - midnight at 3:00 AM
    cron.schedule('0 3 * * *', async () => {
        try {
            await cleanupOldMetricsData();
        } catch (err) {
            console.error('❌ [Cron] Data cleanup failed:', err);
        }
    }, { timezone: "Asia/Kolkata" });

    // Daily Checks (Tokens, Inactivity, Ad Spikes) - Midnight at 12:00 AM
    cron.schedule('0 0 * * *', async () => {
        await checkInactiveSources();
        await checkAdSpendSpikes();
    }, { timezone: "Asia/Kolkata" });
    
    // Weekly Insight Reports - Every Monday at 1 AM
    cron.schedule('0 1 * * 1', async () => {
        await checkPerformanceDrops();
        await generateWeeklyInsightsForAllUsers();
    }, { timezone: "Asia/Kolkata" });

    // Monthly Growth Summary - 1st of every month at 4 AM
    cron.schedule('0 4 1 * *', async () => {
        await checkMonthlyGrowth();
    }, { timezone: "Asia/Kolkata" });
    
    // AI Suggested Questions - Every night at 5 AM
    cron.schedule('0 5 * * *', async () => {
        await generateSuggestedQuestionsForAllUsers();
    }, { timezone: "Asia/Kolkata" });
    
    // 🔵 SECTION 2: PLATFORM DATA SYNCHRONIZATION

    // Facebook Ads Sync every 6 hours (9AM, 3PM, 9PM)
    cron.schedule('0 9,15,21 * * *', async () => {
        await syncAllFacebookAds();
    }, { timezone: "Asia/Kolkata" });
    
    // Google Ads Sync every 6 hours (8AM, 2PM, 8PM)
    cron.schedule('0 8,14,20 * * *', async () => {
        await syncAllGoogleAds();
    }, { timezone: "Asia/Kolkata" });
    
    // GA4 Sync every 6 hours (4AM, 10AM, 4PM, 10PM) to keep data fresher
    cron.schedule('0 4,10,16,22 * * *', async () => {
        await syncAllGa4();
    }, { timezone: "Asia/Kolkata" });
    
    // GSC Sync twice a day (4:30 AM, 4:30 PM) - GSC has 48h delay, so twice a day is enough
    cron.schedule('30 4,16 * * *', async () => {
        await syncAllGsc();
    }, { timezone: "Asia/Kolkata" });
    
    console.log('⚡ [Cron] Active');
};

export default { initCronJobs };
