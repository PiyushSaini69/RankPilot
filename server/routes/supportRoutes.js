import express from 'express';
import SupportMessage from '../models/SupportMessage.js';
import { sendSupportNotificationEmail } from '../utils/emailService.js';

const router = express.Router();

// POST /api/support/contact
router.post('/contact', async (req, res, next) => {
    try {
        const { firstName, lastName, email, message, category, priority } = req.body;
        if (!firstName || !email || !message) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const supportMsg = new SupportMessage({
            firstName,
            lastName,
            email,
            message,
            category,
            priority
        });

        await supportMsg.save();

        // Send support notification email asynchronously in the background
        try {
            await sendSupportNotificationEmail({ firstName, lastName, email, message, category, priority });
        } catch (mailErr) {
            console.error('Error sending support notification email:', mailErr);
        }

        res.status(200).json({ success: true, message: 'Support ticket saved successfully' });
    } catch (err) {
        next(err);
    }
});

export default router;
