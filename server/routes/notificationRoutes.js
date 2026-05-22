import express from 'express';
import { protect } from '../middleware/auth.js';
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearReadNotifications,
    clearAllNotifications,
    createNotification
} from '../controllers/notificationController.js';

const router = express.Router();

// Apply auth middleware to all notification routes
router.use(protect);

router.route('/')
    .get(getNotifications)
    .post(createNotification);

router.put('/read-all', markAllAsRead);
router.delete('/clear-read', clearReadNotifications);
router.delete('/clear-all', clearAllNotifications);

router.route('/:id')
    .delete(deleteNotification);

router.put('/:id/read', markAsRead);

export default router;
