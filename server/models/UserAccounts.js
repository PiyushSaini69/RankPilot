import mongoose from 'mongoose';

const userAccountsSchema = new mongoose.Schema({
    // Core Identity
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    siteName: { type: String, required: true },
    syncStatus: { type: String, enum: ['idle', 'syncing', 'error', 'pending'], default: 'idle' },

    // GA4 Integration
    ga4PropertyId: { type: String },
    ga4PropertyName: { type: String },
    ga4AccountId: { type: String },
    ga4TokenId: { type: mongoose.Schema.Types.ObjectId, ref: 'GoogleToken' },
    ga4HistoricalComplete: { type: Boolean, default: false },
    ga4SyncStatus: { type: String, enum: ['idle', 'syncing', 'error', 'pending'], default: 'idle' },
    ga4SyncProgress: { type: Number, default: 0 },
    ga4LastSyncedAt: { type: Date },
    ga4HistoricalChunkIndex: { type: Number, default: 0 },

    // Google Search Console Integration
    gscSiteUrl: { type: String },
    gscPermission: { type: String },
    gscTokenId: { type: mongoose.Schema.Types.ObjectId, ref: 'GoogleToken' },
    gscHistoricalComplete: { type: Boolean, default: false },
    gscSyncStatus: { type: String, enum: ['idle', 'syncing', 'error', 'pending'], default: 'idle' },
    gscSyncProgress: { type: Number, default: 0 },
    gscLastSyncedAt: { type: Date },
    gscHistoricalChunkIndex: { type: Number, default: 0 },
    
    // Google Ads Integration
    googleAdsCustomerId: { type: String },
    googleAdsAccountName: { type: String },
    googleAdsCurrencyCode: { type: String },
    googleAdsTokenId: { type: mongoose.Schema.Types.ObjectId, ref: 'GoogleToken' },
    googleAdsHistoricalComplete: { type: Boolean, default: false },
    googleAdsSyncStatus: { type: String, enum: ['idle', 'syncing', 'error', 'pending'], default: 'idle' },
    googleAdsSyncProgress: { type: Number, default: 0 },
    googleAdsLastSyncedAt: { type: Date },
    googleAdsHistoricalChunkIndex: { type: Number, default: 0 },
    
    // Facebook Ads Integration
    facebookAdAccountId: { type: String },
    facebookAdAccountName: { type: String },
    facebookAdCurrencyCode: { type: String },
    facebookTokenId: { type: mongoose.Schema.Types.ObjectId, ref: 'FacebookToken' },
    facebookAdsHistoricalComplete: { type: Boolean, default: false },
    facebookAdsSyncStatus: { type: String, enum: ['idle', 'syncing', 'error', 'pending'], default: 'idle' },
    facebookAdsSyncProgress: { type: Number, default: 0 },
    facebookAdsLastSyncedAt: { type: Date },
    facebookAdsHistoricalChunkIndex: { type: Number, default: 0 },
}, {
    timestamps: true
});

userAccountsSchema.index({ userId: 1, siteName: 1 }, { unique: true });

export default mongoose.model('UserAccounts', userAccountsSchema);
