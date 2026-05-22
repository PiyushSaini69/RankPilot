import { create } from 'zustand';
import { notificationApi } from '../api/notificationApi';

// Notification types:
// 'success' — green  — data sync, connection success
// 'info'    — blue   — AI insights, tips
// 'warning' — amber  — token expiry, low data
// 'error'   — red    — sync failed, API error

export const useNotificationStore = create((set, get) => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,

    // ── Fetch notifications from backend ──
    fetchNotifications: async () => {
        set({ loading: true });
        try {
            const data = await notificationApi.getNotifications();
            if (data.success) {
                // Map _id and dates for compatibility
                const formatted = data.notifications.map(n => ({
                    ...n,
                    id: n._id,
                    timestamp: n.createdAt
                }));
                set({ 
                    notifications: formatted, 
                    unreadCount: data.unreadCount,
                    loading: false 
                });
            }
        } catch (err) {
            set({ error: err.message, loading: false });
        }
    },

    // ── Add single notification (now persists to backend) ──
    addNotification: async ({ type = 'info', title, message, source, actionLabel, actionPath }) => {
        try {
            const data = await notificationApi.createNotification({
                type, title, message, source, actionLabel, actionPath
            });
            if (data.success) {
                const newNotif = { 
                    ...data.notification, 
                    id: data.notification._id,
                    timestamp: data.notification.createdAt
                };
                set(state => ({
                    notifications: [newNotif, ...state.notifications].slice(0, 50),
                    unreadCount: state.unreadCount + 1
                }));
            }
        } catch (err) {
            console.error('Failed to create notification on backend', err);
            // Fallback: local only if backend fails? Better to just fail or handle error
        }
    },

    // ── Mark single as read ──
    markAsRead: async (id) => {
        try {
            const data = await notificationApi.markAsRead(id);
            if (data.success) {
                set(state => {
                    const updated = state.notifications.map(n =>
                        n.id === id ? { ...n, isRead: true } : n
                    );
                    return {
                        notifications: updated,
                        unreadCount: Math.max(0, state.unreadCount - 1),
                    };
                });
            }
        } catch (err) {
            console.error('Failed to mark notification as read', err);
        }
    },

    // ── Mark all as read ──
    markAllRead: async () => {
        try {
            const data = await notificationApi.markAllRead();
            if (data.success) {
                set(state => ({
                    notifications: state.notifications.map(n => ({ ...n, isRead: true })),
                    unreadCount: 0,
                }));
            }
        } catch (err) {
            console.error('Failed to mark all as read', err);
        }
    },

    // ── Delete single notification ──
    deleteNotification: async (id) => {
        try {
            const data = await notificationApi.deleteNotification(id);
            if (data.success) {
                set(state => {
                    const notificationToDelete = state.notifications.find(n => n.id === id);
                    const updated = state.notifications.filter(n => n.id !== id);
                    return {
                        notifications: updated,
                        unreadCount: notificationToDelete?.isRead ? state.unreadCount : Math.max(0, state.unreadCount - 1),
                    };
                });
            }
        } catch (err) {
            console.error('Failed to delete notification', err);
        }
    },

    // ── Clear only read notifications ──
    clearRead: async () => {
        try {
            const data = await notificationApi.clearRead();
            if (data.success) {
                set(state => ({
                    notifications: state.notifications.filter(n => !n.isRead),
                    unreadCount: state.unreadCount,
                }));
            }
        } catch (err) {
            console.error('Failed to clear read notifications', err);
        }
    },

    // ── Clear all notifications (both read and unread) ──
    clearAll: async () => {
        try {
            const markRes = await notificationApi.markAllRead();
            if (markRes.success) {
                const clearRes = await notificationApi.clearRead();
                if (clearRes.success) {
                    set({
                        notifications: [],
                        unreadCount: 0,
                    });
                }
            }
        } catch (err) {
            console.error('Failed to clear all notifications', err);
        }
    },

    // ── Get notifications by type ──
    getByType: (type) => get().notifications.filter(n => n.type === type),

    // ── Get notifications by source ──
    getBySource: (source) => get().notifications.filter(n => n.source === source),
}));

// ── Helper: use anywhere in app to trigger notifications ──
export const notify = {
    success: (title, message, options = {}) =>
        useNotificationStore.getState().addNotification({ type: 'success', title, message, ...options }),

    info: (title, message, options = {}) =>
        useNotificationStore.getState().addNotification({ type: 'info', title, message, ...options }),

    warning: (title, message, options = {}) =>
        useNotificationStore.getState().addNotification({ type: 'warning', title, message, ...options }),

    error: (title, message, options = {}) =>
        useNotificationStore.getState().addNotification({ type: 'error', title, message, ...options }),

    // Predefined notification templates:
    syncSuccess: (source) =>
        useNotificationStore.getState().addNotification({
            type: 'success',
            title: `${source} Sync Complete`,
            message: `Your ${source} data has been successfully synced and is ready to view.`,
            source: source.toLowerCase().replace(' ', '-'),
            actionLabel: 'View Dashboard',
            actionPath: '/dashboard',
        }),

    syncFailed: (source, reason) =>
        useNotificationStore.getState().addNotification({
            type: 'error',
            title: `${source} Sync Failed`,
            message: reason || `Failed to sync ${source} data. Please check your connection and try again.`,
            source: source.toLowerCase().replace(' ', '-'),
            actionLabel: 'Check Settings',
            actionPath: '/connect-accounts',
        }),

    tokenExpiring: (source, daysLeft) =>
        useNotificationStore.getState().addNotification({
            type: 'warning',
            title: `${source} Token Expiring`,
            message: `Your ${source} access token expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Reconnect to avoid data gaps.`,
            source: source.toLowerCase().replace(' ', '-'),
            actionLabel: 'Reconnect',
            actionPath: '/connect-accounts',
        }),

    aiInsightReady: () =>
        useNotificationStore.getState().addNotification({
            type: 'info',
            title: 'Weekly AI Insight Ready',
            message: 'Your weekly performance analysis is ready. See what changed and what to optimize next.',
            source: 'ai',
            actionLabel: 'View Insight',
            actionPath: '/dashboard/ai-chat',
        }),

    newSiteConnected: (siteName) =>
        useNotificationStore.getState().addNotification({
            type: 'success',
            title: 'New Website Connected',
            message: `${siteName} has been successfully added to your dashboard.`,
            source: 'system',
            actionLabel: 'View Sites',
            actionPath: '/dashboard/sites',
        }),
};
