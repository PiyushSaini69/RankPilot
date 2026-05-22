import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import UserAccounts from './models/UserAccounts.js';
import GscMetric from './models/GscMetric.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const run = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            console.error("❌ MONGODB_URI is not defined in your environment!");
            process.exit(1);
        }

        console.log("Connecting to Database...");
        await mongoose.connect(uri);
        console.log("✅ Database Connected.");

        // Find "Carweek" user account
        console.log("Finding account 'Carweek'...");
        const account = await UserAccounts.findOne({ siteName: { $regex: /^carweek$/i } });

        if (!account) {
            console.error("❌ Account 'Carweek' not found in database!");
            await mongoose.disconnect();
            return;
        }

        console.log(`✅ Found Account: "${account.siteName}" (ID: ${account._id})`);
        console.log(`GSC URL: ${account.gscSiteUrl}`);

        // Chunk index 18 corresponds to: May 4, 2026 and earlier
        const cutoffDate = new Date('2026-05-05T00:00:00.000Z');
        console.log(`Cutoff Date is: ${cutoffDate.toISOString()} (May 4th and earlier will be deleted)`);

        // 1. Count matching GSC metric records to delete
        const query = {
            'metadata.siteId': account._id,
            date: { $lt: cutoffDate }
        };

        const count = await GscMetric.countDocuments(query);
        console.log(`🔍 Found ${count} GSC Metric records for May 4th, 2026 and earlier.`);

        // 2. Delete the GSC records
        if (count > 0) {
            console.log("Deleting GSC records...");
            const deleteResult = await GscMetric.deleteMany(query);
            console.log(`💥 Successfully deleted ${deleteResult.deletedCount} GSC Metric records!`);
        } else {
            console.log("⚠️ No records found to delete for the specified range.");
        }

        // 3. Fallback query using platformAccountId just in case
        if (account.gscSiteUrl) {
            const fallbackQuery = {
                'metadata.platformAccountId': account.gscSiteUrl,
                date: { $lt: cutoffDate }
            };
            const fallbackCount = await GscMetric.countDocuments(fallbackQuery);
            if (fallbackCount > 0) {
                console.log(`🔍 Found an additional ${fallbackCount} records matching gscSiteUrl. Deleting them too...`);
                const deleteResult = await GscMetric.deleteMany(fallbackQuery);
                console.log(`💥 Successfully deleted ${deleteResult.deletedCount} additional GSC Metric records!`);
            }
        }

        // 4. Update the UserAccounts record
        console.log("\nUpdating UserAccount fields...");
        const updated = await UserAccounts.findOneAndUpdate(
            { _id: account._id },
            {
                $set: {
                    gscHistoricalChunkIndex: 18,
                    gscSyncProgress: 20, // 18 out of 90 chunks = 20%
                    gscSyncStatus: 'idle',
                    syncStatus: 'idle',
                    gscHistoricalComplete: false
                }
            },
            { returnDocument: 'after' }
        );

        console.log(`\n--- Updated Values ---`);
        console.log(`Site: "${updated.siteName}"`);
        console.log(`gscHistoricalChunkIndex: ${updated.gscHistoricalChunkIndex}`);
        console.log(`gscSyncProgress: ${updated.gscSyncProgress}`);
        console.log(`gscSyncStatus: ${updated.gscSyncStatus}`);
        console.log(`syncStatus: ${updated.syncStatus}`);
        console.log(`gscHistoricalComplete: ${updated.gscHistoricalComplete}`);
        console.log(`\n🎉 Success! UserAccount and GSC Data reset to index 18.`);

    } catch (err) {
        console.error("❌ Error running script:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from database.");
    }
};

run();
