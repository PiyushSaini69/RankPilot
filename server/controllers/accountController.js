import UserAccounts from '../models/UserAccounts.js';
import mongoose from 'mongoose';
import GoogleToken from '../models/GoogleToken.js';
import FacebookToken from '../models/FacebookToken.js';
import Ga4Metric from '../models/Ga4Metric.js';
import GscMetric from '../models/GscMetric.js';
import GoogleAdsMetric from '../models/GoogleAdsMetric.js';
import FacebookAdsMetric from '../models/FacebookAdsMetric.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import WeeklyInsight from '../models/WeeklyInsight.js';
import SuggestedQuestions from '../models/SuggestedQuestions.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import AiIntelligence from '../models/AiIntelligence.js';
import { listProperties } from '../services/ga4Service.js';
import { listSites as fetchGscSites } from '../services/gscService.js';
import { listAccounts } from '../services/googleAdsService.js';
import { listAdAccounts } from '../services/facebookAdsService.js';
import { syncHistoricalData } from '../services/syncService.js';
import { addSyncJob } from '../services/queueService.js';
import { sendPasswordResetEmail } from '../utils/emailService.js';
import crypto from 'crypto';

// Helper to cleanup metrics if they are no longer used by any other site of the user
async function cleanupMetrics(userId, platformAccountId, ignoreSiteId = null) {
    if (!platformAccountId) return;

    const query = {
        userId,
        $or: [
            { ga4PropertyId: platformAccountId },
            { gscSiteUrl: platformAccountId },
            { googleAdsCustomerId: platformAccountId },
            { facebookAdAccountId: platformAccountId }
        ]
    };

    if (ignoreSiteId) {
        query._id = { $ne: ignoreSiteId };
    }

    const otherSiteUsingThis = await UserAccounts.findOne(query);

    if (!otherSiteUsingThis) {
        const filter = { 'metadata.userId': userId, 'metadata.platformAccountId': platformAccountId };
        await Promise.all([
            Ga4Metric.deleteMany(filter),
            GscMetric.deleteMany(filter),
            GoogleAdsMetric.deleteMany(filter),
            FacebookAdsMetric.deleteMany(filter)
        ]);
    }
}

// Internal helper to perform deep delete of a site and its data
async function performSiteDelete(userId, siteId, account = null) {
    if (!account) {
        account = await UserAccounts.findOne({ _id: siteId, userId });
    }
    if (!account) return;

    // 1. Collect platform IDs for metrics cleanup (if they haven't been unset yet)
    const platformIds = [
        account.ga4PropertyId,
        account.gscSiteUrl,
        account.googleAdsCustomerId,
        account.facebookAdAccountId
    ].filter(Boolean);

    // 2. Delete conversations and their messages
    const conversations = await Conversation.find({ siteId, userId });
    const convIds = conversations.map(c => c._id);
    
    if (convIds.length > 0) {
        await Message.deleteMany({ conversationId: { $in: convIds } });
        await Conversation.deleteMany({ _id: { $in: convIds } });
    }

    // 3. Delete weekly insights, suggested questions, notifications, and AI intelligence data
    await WeeklyInsight.deleteMany({ siteId, userId });
    await SuggestedQuestions.deleteMany({ siteId, userId });
    await Notification.deleteMany({ siteId, userId });
    await AiIntelligence.deleteMany({ siteId, userId });

    // 4. Delete all metrics associated with this specific site strictly by siteId
    const siteFilter = { 'metadata.siteId': siteId, 'metadata.userId': userId };
    await Promise.all([
        Ga4Metric.deleteMany(siteFilter),
        GscMetric.deleteMany(siteFilter),
        GoogleAdsMetric.deleteMany(siteFilter),
        FacebookAdsMetric.deleteMany(siteFilter)
    ]);

    // 5. Finally delete the site record
    await UserAccounts.deleteOne({ _id: siteId, userId });
}

export const listGa4 = async (req, res) => {
    try {
        const { tokenId } = req.query;
        const properties = await listProperties(req.user._id, tokenId);
        res.status(200).json(properties);
    } catch (error) {
        if (error.message.includes('GOOGLE_AUTH_MISSING')) {
            return res.status(401).json({ success: false, message: 'GOOGLE_AUTH_MISSING' });
        }
        if (error.message.includes('GOOGLE_AUTH_EXPIRED')) {
            return res.status(400).json({ success: false, message: 'GOOGLE_AUTH_EXPIRED' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

export const listGsc = async (req, res) => {
    try {
        const { tokenId } = req.query;
        const sites = await fetchGscSites(req.user._id, tokenId);
        res.status(200).json(sites);
    } catch (error) {
        if (error.message.includes('GOOGLE_AUTH_EXPIRED')) {
            return res.status(400).json({ success: false, message: 'GOOGLE_AUTH_EXPIRED' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

export const listGoogleAds = async (req, res) => {
    try {
        const { tokenId } = req.query;
        const accounts = await listAccounts(req.user._id, tokenId);
        res.status(200).json(accounts);
    } catch (error) {
        if (error.message.includes('GOOGLE_AUTH_EXPIRED')) {
            return res.status(400).json({ success: false, message: 'GOOGLE_AUTH_EXPIRED' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

export const listGoogleAccounts = async (req, res) => {
    try {
        const accounts = await GoogleToken.find({ userId: req.user._id }).select('email googleId updatedAt');
        res.status(200).json(accounts);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const listFacebookAds = async (req, res) => {
    try {
        const { tokenId } = req.query;
        const accounts = await listAdAccounts(req.user._id, tokenId);
        res.status(200).json(accounts);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const listFacebookAccounts = async (req, res) => {
    try {
        const accounts = await FacebookToken.find({ userId: req.user._id }).select('name facebookUserId updatedAt');
        res.status(200).json(accounts);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const selectAccounts = async (req, res) => {
    try {
        const updates = {};
        const fields = [
            'ga4PropertyId', 'ga4PropertyName', 'ga4AccountId', 'ga4TokenId',
            'gscSiteUrl', 'gscPermission', 'gscTokenId',
            'googleAdsCustomerId', 'googleAdsAccountName', 'googleAdsCurrencyCode', 'googleAdsTokenId',
            'facebookAdAccountId', 'facebookAdAccountName', 'facebookAdCurrencyCode', 'facebookTokenId',
            'siteName', 'siteUrl'
        ];

        // Clean up empty strings to null for consistent DB state
        fields.forEach(field => {
            if (req.body[field] !== undefined) {
                let value = req.body[field];
                if (value === "") value = null; 
                updates[field] = value;
            }
        });

        const siteId = req.body.siteId;
        let existingAccount;

        if (siteId && siteId.match(/^[0-9a-fA-F]{24}$/)) {
            existingAccount = await UserAccounts.findOne({ _id: siteId, userId: req.user._id });
            if (!existingAccount) {
                return res.status(404).json({ message: 'The specified site was not found. It might have been deleted or moved.' });
            }
            
            // Check if they are renaming to a name that another site already uses
            if (updates.siteName && updates.siteName !== existingAccount.siteName) {
                const collision = await UserAccounts.findOne({ 
                    userId: req.user._id, 
                    siteName: updates.siteName, 
                    _id: { $ne: existingAccount._id } 
                });
                if (collision) {
                    return res.status(400).json({ message: `A site with the name "${updates.siteName}" already exists.` });
                }
            }
        } else {
            // New Site Creation: Check name collision
            if (updates.siteName) {
                const collision = await UserAccounts.findOne({ userId: req.user._id, siteName: updates.siteName });
                if (collision) {
                    return res.status(400).json({ message: `A site with the name "${updates.siteName}" already exists.` });
                }
            }
            existingAccount = null;
        }

        const account = await UserAccounts.findOneAndUpdate(
            { userId: req.user._id, _id: existingAccount?._id || new mongoose.Types.ObjectId() },
            { $set: updates },
            { upsert: true, returnDocument: 'after' }
        );

        if (!account) return res.status(500).json({ message: 'Failed to create or update account' });
        
        // Check for changes to trigger cleanup and sync
        const hasChanged = (field, currentVal) => {
            return updates.hasOwnProperty(field) && updates[field] !== currentVal;
        };

        if (hasChanged('ga4PropertyId', existingAccount?.ga4PropertyId)) {
            if (existingAccount?.ga4PropertyId) {
                cleanupMetrics(req.user._id, existingAccount.ga4PropertyId);
                await AiIntelligence.deleteMany({ siteId: account._id, userId: req.user._id, platform: 'ga4' });
            }
            // Reset flags for the new integration
            await UserAccounts.findByIdAndUpdate(account._id, { 
                ga4HistoricalComplete: false, 
                ga4SyncProgress: 0,
                ga4HistoricalChunkIndex: 0
            });
            if (updates.ga4PropertyId) {
                addSyncJob('historical-sync', { accountId: account._id, accName: account.siteName, source: 'ga4' }, { priority: 20 }).catch(e => console.error('Queue GA4 Fail:', e));
            }
        }
        if (hasChanged('gscSiteUrl', existingAccount?.gscSiteUrl)) {
            if (existingAccount?.gscSiteUrl) {
                cleanupMetrics(req.user._id, existingAccount.gscSiteUrl);
                await AiIntelligence.deleteMany({ siteId: account._id, userId: req.user._id, platform: 'gsc' });
            }
            // Reset flags for the new integration
            await UserAccounts.findByIdAndUpdate(account._id, { 
                gscHistoricalComplete: false, 
                gscSyncProgress: 0,
                gscHistoricalChunkIndex: 0
            });
            if (updates.gscSiteUrl) {
                addSyncJob('historical-sync', { accountId: account._id, accName: account.siteName, source: 'gsc' }, { priority: 20 }).catch(e => console.error('Queue GSC Fail:', e));
            }
        }
        if (hasChanged('googleAdsCustomerId', existingAccount?.googleAdsCustomerId)) {
            if (existingAccount?.googleAdsCustomerId) {
                cleanupMetrics(req.user._id, existingAccount.googleAdsCustomerId);
                await AiIntelligence.deleteMany({ siteId: account._id, userId: req.user._id, platform: 'gads' });
            }
            // Reset flags for the new integration
            await UserAccounts.findByIdAndUpdate(account._id, { 
                googleAdsHistoricalComplete: false, 
                googleAdsSyncProgress: 0,
                googleAdsHistoricalChunkIndex: 0
            });
            if (updates.googleAdsCustomerId) {
                addSyncJob('historical-sync', { accountId: account._id, accName: account.siteName, source: 'google-ads' }, { priority: 20 }).catch(e => console.error('Queue Google Ads Fail:', e));
            }
        }
        if (hasChanged('facebookAdAccountId', existingAccount?.facebookAdAccountId)) {
            if (existingAccount?.facebookAdAccountId) {
                cleanupMetrics(req.user._id, existingAccount.facebookAdAccountId);
                await AiIntelligence.deleteMany({ siteId: account._id, userId: req.user._id, platform: 'fbads' });
            }
            // Reset flags for the new integration
            await UserAccounts.findByIdAndUpdate(account._id, { 
                facebookAdsHistoricalComplete: false, 
                facebookAdsSyncProgress: 0,
                facebookAdsHistoricalChunkIndex: 0
            });
            if (updates.facebookAdAccountId) {
                addSyncJob('historical-sync', { accountId: account._id, accName: account.siteName, source: 'facebook-ads' }, { priority: 20 }).catch(e => console.error('Queue Facebook Ads Fail:', e));
            }
        }

        // Success notification (Creation vs Update)
        const isNew = !siteId || !existingAccount;
        await Notification.create({
            userId: req.user._id,
            siteId: account._id,
            type: 'success',
            title: isNew ? 'Website Connected' : 'Integrations Updated',
            message: isNew 
                ? `Successfully connected "${account.siteName}" to your analytics dashboard.`
                : `Updated marketing data connections for "${account.siteName}".`,
            source: 'system',
            actionLabel: 'View Dashboard',
            actionPath: '/dashboard'
        });

        res.status(200).json({ message: 'Accounts selected', accounts: account });
    } catch (error) {
        console.error('Select Accounts Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getActiveAccounts = async (req, res) => {
    const { siteId } = req.query;
    let account;
    const query = { userId: req.user._id };
    if (siteId && siteId !== 'undefined') {
        query._id = siteId;
    }
    
    account = await UserAccounts.findOne(query)
        .populate('ga4TokenId', 'email')
        .populate('gscTokenId', 'email')
        .populate('googleAdsTokenId', 'email')
        .populate('facebookTokenId', 'name')
        .sort({ updatedAt: -1 });

    res.status(200).json(account || {});
};

export const listSites = async (req, res) => {
    try {
        const sites = await UserAccounts.find({ userId: req.user._id })
            .populate('ga4TokenId', 'email')
            .populate('gscTokenId', 'email')
            .populate('googleAdsTokenId', 'email')
            .populate('facebookTokenId', 'name')
            .sort({ updatedAt: -1 });
        res.status(200).json(sites);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteSite = async (req, res) => {
    try {
        const { siteId } = req.params;
        const userId = req.user._id;

        const account = await UserAccounts.findOne({ _id: siteId, userId });
        if (!account) return res.status(404).json({ message: 'Site not found' });

        await performSiteDelete(userId, siteId, account);

        res.status(200).json({ message: 'Site and all associated data deleted successfully' });
    } catch (error) {
        console.error('Delete Site Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const disconnectGoogle = async (req, res) => {
    const { tokenId } = req.body; // Allow disconnecting a specific Google account
    const user = await User.findById(req.user._id);

    if (tokenId) {
        const affectedAccounts = await UserAccounts.find({
            userId: req.user._id,
            $or: [{ ga4TokenId: tokenId }, { gscTokenId: tokenId }, { googleAdsTokenId: tokenId }]
        });

        await GoogleToken.deleteOne({ _id: tokenId, userId: req.user._id });

        // Unset services using this specific token
        await UserAccounts.updateMany({ userId: req.user._id, ga4TokenId: tokenId }, {
            $unset: { 
                ga4PropertyId: "", ga4PropertyName: "", ga4AccountId: "", ga4TokenId: "",
                ga4SyncStatus: "", ga4SyncProgress: "", ga4HistoricalComplete: "", ga4HistoricalChunkIndex: ""
            }
        });
        await UserAccounts.updateMany({ userId: req.user._id, gscTokenId: tokenId }, {
            $unset: { 
                gscSiteUrl: "", gscPermission: "", gscTokenId: "",
                gscSyncStatus: "", gscSyncProgress: "", gscHistoricalComplete: "", gscHistoricalChunkIndex: ""
            }
        });
        await UserAccounts.updateMany({ userId: req.user._id, googleAdsTokenId: tokenId }, {
            $unset: { 
                googleAdsCustomerId: "", googleAdsAccountName: "", googleAdsCurrencyCode: "", googleAdsTokenId: "",
                googleAdsSyncStatus: "", googleAdsSyncProgress: "", googleAdsHistoricalComplete: "", googleAdsHistoricalChunkIndex: ""
            }
        });

        // Cleanup metrics and check for empty sites
        for (const accData of affectedAccounts) {
            if (accData.ga4TokenId?.toString() === tokenId) {
                await cleanupMetrics(req.user._id, accData.ga4PropertyId);
                await AiIntelligence.deleteMany({ siteId: accData._id, userId: req.user._id, platform: 'ga4' });
            }
            if (accData.gscTokenId?.toString() === tokenId) {
                await cleanupMetrics(req.user._id, accData.gscSiteUrl);
                await AiIntelligence.deleteMany({ siteId: accData._id, userId: req.user._id, platform: 'gsc' });
            }
            if (accData.googleAdsTokenId?.toString() === tokenId) {
                await cleanupMetrics(req.user._id, accData.googleAdsCustomerId);
                await AiIntelligence.deleteMany({ siteId: accData._id, userId: req.user._id, platform: 'gads' });
            }
            
            // Check if site has ANY integrations left (fetch updated doc)
            const updatedAcc = await UserAccounts.findById(accData._id);
            if (updatedAcc && !updatedAcc.ga4TokenId && !updatedAcc.gscTokenId && !updatedAcc.googleAdsTokenId && !updatedAcc.facebookTokenId) {
                await performSiteDelete(req.user._id, accData._id, updatedAcc);
            }
        }
    } else {
        // Broad disconnect (legacy behavior or full disconnect)
        await GoogleToken.deleteMany({ userId: req.user._id });
        const affectedAccounts = await UserAccounts.find({ userId: req.user._id });
        await UserAccounts.updateMany({ userId: req.user._id }, {
            $unset: {
                ga4PropertyId: "", ga4PropertyName: "", ga4AccountId: "", ga4TokenId: "",
                gscSiteUrl: "", gscPermission: "", gscTokenId: "",
                googleAdsCustomerId: "", googleAdsAccountName: "", googleAdsCurrencyCode: "", googleAdsTokenId: ""
            }
        });
        // Check for empty sites after broad disconnect
        for (const accData of affectedAccounts) {
            await AiIntelligence.deleteMany({ siteId: accData._id, userId: req.user._id, platform: { $in: ['ga4', 'gsc', 'gads'] } });
            const updatedAcc = await UserAccounts.findById(accData._id);
            if (updatedAcc && !updatedAcc.ga4TokenId && !updatedAcc.gscTokenId && !updatedAcc.googleAdsTokenId && !updatedAcc.facebookTokenId) {
                await performSiteDelete(req.user._id, accData._id, updatedAcc);
            }
        }
    }

    const remainingTokens = await GoogleToken.countDocuments({ userId: req.user._id });
    let oauthOnly = false;

    // If no Google accounts left and no password, send reset email
    if (remainingTokens === 0 && !user.passwordHash) {
        oauthOnly = true;
        user.passwordResetToken = crypto.randomUUID();
        user.passwordResetExp = Date.now() + 24 * 60 * 60 * 1000;
        await user.save();
        try {
            await sendPasswordResetEmail(user.email, user.passwordResetToken);
        } catch (emailErr) {
            console.error('Password setup email failed:', emailErr.message);
        }
    }

    res.status(200).json({ message: tokenId ? 'Google account disconnected' : 'All Google accounts disconnected', oauthOnly });
};

export const disconnectFacebook = async (req, res) => {
    const { tokenId } = req.body;
    if (tokenId) {
        const affectedAccounts = await UserAccounts.find({ userId: req.user._id, facebookTokenId: tokenId });
        await FacebookToken.deleteOne({ _id: tokenId, userId: req.user._id });
        await UserAccounts.updateMany({ userId: req.user._id, facebookTokenId: tokenId }, {
            $unset: { 
                facebookAdAccountId: "", facebookAdAccountName: "", facebookAdCurrencyCode: "", facebookTokenId: "",
                facebookAdsSyncStatus: "", facebookAdsSyncProgress: "", facebookAdsHistoricalComplete: "", facebookAdsHistoricalChunkIndex: ""
            }
        });
        for (const accData of affectedAccounts) {
            await cleanupMetrics(req.user._id, accData.facebookAdAccountId);
            await AiIntelligence.deleteMany({ siteId: accData._id, userId: req.user._id, platform: 'fbads' });
            
            // Check if site has ANY integrations left
            const updatedAcc = await UserAccounts.findById(accData._id);
            if (updatedAcc && !updatedAcc.ga4TokenId && !updatedAcc.gscTokenId && !updatedAcc.googleAdsTokenId && !updatedAcc.facebookTokenId) {
                await performSiteDelete(req.user._id, accData._id, updatedAcc);
            }
        }
    } else {
        const affectedAccounts = await UserAccounts.find({ userId: req.user._id });
        await FacebookToken.deleteMany({ userId: req.user._id });
        await UserAccounts.updateMany({ userId: req.user._id }, {
            $unset: { 
                facebookAdAccountId: "", facebookAdAccountName: "", facebookAdCurrencyCode: "", facebookTokenId: "",
                facebookAdsSyncStatus: "", facebookAdsSyncProgress: "", facebookAdsHistoricalComplete: "", facebookAdsHistoricalChunkIndex: ""
            }
        });
        for (const accData of affectedAccounts) {
            await cleanupMetrics(req.user._id, accData.facebookAdAccountId);
            await AiIntelligence.deleteMany({ siteId: accData._id, userId: req.user._id, platform: 'fbads' });
            
            const updatedAcc = await UserAccounts.findById(accData._id);
            if (updatedAcc && !updatedAcc.ga4TokenId && !updatedAcc.gscTokenId && !updatedAcc.googleAdsTokenId && !updatedAcc.facebookTokenId) {
                await performSiteDelete(req.user._id, accData._id, updatedAcc);
            }
        }
    }
    res.status(200).json({ message: tokenId ? 'Facebook account disconnected' : 'All Facebook accounts disconnected' });
};

export const resumeHistoricalSync = async (req, res) => {
    try {
        const { siteId, source } = req.body;
        const userId = req.user._id;

        if (!siteId || !source) {
            return res.status(400).json({ message: 'Missing siteId or source' });
        }

        const account = await UserAccounts.findOne({ _id: siteId, userId });
        if (!account) return res.status(404).json({ message: 'Site not found' });

        const sourceMap = {
            'ga4': 'ga4',
            'gsc': 'gsc',
            'google-ads': 'googleAds',
            'facebook-ads': 'facebookAds'
        };
        const prefix = sourceMap[source];
        if (!prefix) return res.status(400).json({ message: 'Invalid source' });

        const statusField = `${prefix}SyncStatus`;

        // Reset status to idle/pending so syncHistoricalData can start it
        await UserAccounts.findByIdAndUpdate(siteId, { [statusField]: 'idle' });

        // Re-add the job to BullMQ
        await addSyncJob('historical-sync', { accountId: siteId, accName: account.siteName, source });

        res.status(200).json({ 
            success: true, 
            message: `Historical sync for ${source.toUpperCase().replace('-', ' ')} has been resumed.` 
        });
    } catch (error) {
        console.error('Resume Sync Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
