import axiosClient from './axiosClient';

/**
 * Ask the support bot. Works for guests too; when a token is stored axiosClient sends it, so the bot can look up the
 * caller's own orders. `silent401`: an expired token must not throw the visitor to /login just because they chatted.
 * Returns { reply, intent }.
 */
export const askChatbot = (message) => axiosClient.post('/chatbot/ask', { message }, { silent401: true });
