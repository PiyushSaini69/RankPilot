import api from './index';

export const askAi = (data) => api.post('/ai/ask', data);
export const getConversations = (siteId) => api.get(`/ai/conversations${siteId ? `?siteId=${siteId}` : ''}`);
export const getConversation = (id) => api.get(`/ai/conversations/${id}`);
export const deleteConversation = (id) => api.delete(`/ai/conversations/${id}`);
export const getWeeklyInsight = (siteId) => api.get(`/ai/weekly-insight${siteId ? `?siteId=${siteId}` : ''}`);
export const refreshWeeklyInsight = (siteId, timezone) => api.post('/ai/weekly-insight/refresh', { ...(siteId ? { siteId } : {}), ...(timezone ? { timezone } : {}) });
export const getSuggestedQuestions = (siteId, timezone) => {
    const params = new URLSearchParams();
    if (siteId) params.append('siteId', siteId);
    if (timezone) params.append('timezone', timezone);
    const query = params.toString();
    return api.get(`/ai/suggested-questions${query ? `?${query}` : ''}`);
};
