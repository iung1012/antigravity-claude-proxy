/**
 * Utility functions for Antigravity Console
 */

window.utils = {
    // Shared Request Wrapper
    async request(url, options = {}, webuiPassword = '') {
        options.headers = options.headers || {};

        // Prefer session token; fall back to legacy password header
        const sessionToken = localStorage.getItem('ag_session_token');
        if (sessionToken) {
            options.headers['x-session-token'] = sessionToken;
        } else if (webuiPassword) {
            options.headers['x-webui-password'] = webuiPassword;
        }

        const response = await fetch(url, options);

        if (response.status === 401) {
            // Show login overlay instead of native prompt()
            const store = typeof Alpine !== 'undefined' ? Alpine.store('global') : null;
            if (store) store.showLogin = true;
            return { response, newPassword: null };
        }

        return { response, newPassword: null };
    },

    formatTimeUntil(isoTime) {
        const store = Alpine.store('global');
        const diff = new Date(isoTime) - new Date();
        if (diff <= 0) return store ? store.t('ready') : 'READY';
        const mins = Math.floor(diff / 60000);
        const hrs = Math.floor(mins / 60);

        const hSuffix = store ? store.t('timeH') : 'H';
        const mSuffix = store ? store.t('timeM') : 'M';

        if (hrs > 0) return `${hrs}${hSuffix} ${mins % 60}${mSuffix}`;
        return `${mins}${mSuffix}`;
    },

    getThemeColor(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    },

    /**
     * Debounce function - delays execution until after specified wait time
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};
