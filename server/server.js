import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import connectDB from './config/db.js';
import { initConfig } from './services/configService.js';
import { configurePassport } from './config/passport.js';
import { initCronJobs } from './services/cronService.js';
import { initWorker } from './services/queueService.js';

const PORT = process.env.PORT || 5001;

connectDB().then(async () => {
    await initConfig();
    await configurePassport();
    initCronJobs();
    initWorker();

    app.listen(PORT, () => {
        console.log(`✅ [Server] Running on port ${PORT}`);
    });
});
 
//hello  