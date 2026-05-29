import api from './index';

/**
 * Submits the user contact/support details to the backend API.
 * @param {Object} data - Contains { firstName, lastName, email, message }
 * @returns {Promise} Axios response promise
 */
export const sendSupportMessage = (data) => api.post('/support/contact', data);
