import api from './index';

export const notificationApi = {
    // Get all notifications
    getNotifications: async () => {
        const response = await api.get('/notifications');
        return response.data;
    },

    // Mark single as read
    markAsRead: async (id) => {
        const response = await api.put(`/notifications/${id}/read`);
        return response.data;
    },

    // Mark all as read
    markAllRead: async () => {
        const response = await api.put('/notifications/read-all');
        return response.data;
    },

    // Delete single
    deleteNotification: async (id) => {
        const response = await api.delete(`/notifications/${id}`);
        return response.data;
    },

    // Clear all read
    clearRead: async () => {
        const response = await api.delete('/notifications/clear-read');
        return response.data;
    },

    // Clear all
    clearAll: async () => {
        const response = await api.delete('/notifications/clear-all');
        return response.data;
    },

    // Create (usually for testing/manual triggering)
    createNotification: async (data) => {
        const response = await api.post('/notifications', data);
        return response.data;
    }
};
