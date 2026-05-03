/**
 * Global Store for Antigravity Console
 * Handles Translations, Toasts, and Shared Config
 */

document.addEventListener('alpine:init', () => {
    Alpine.store('global', {
        async init() {
            // Check authentication before anything else
            await this.checkAuth();

            // Hash-based routing
            const validTabs = ['dashboard', 'models', 'accounts', 'logs', 'settings'];
            const validSettingsTabs = ['ui', 'claude', 'models', 'server'];
            const getHash = () => window.location.hash.substring(1);

            const parseHash = (hash) => {
                const [tab, subtab] = hash.split('/');
                return { tab, subtab };
            };

            // 1. Initial load from hash
            const { tab: initialTab, subtab: initialSubtab } = parseHash(getHash());
            if (validTabs.includes(initialTab)) {
                this.activeTab = initialTab;
                if (initialTab === 'settings' && validSettingsTabs.includes(initialSubtab)) {
                    this.settingsTab = initialSubtab;
                }
            }

            // 2. Sync State -> URL
            Alpine.effect(() => {
                if (!validTabs.includes(this.activeTab)) return;
                let target = this.activeTab;
                if (this.activeTab === 'settings' && this.settingsTab !== 'ui') {
                    target = `settings/${this.settingsTab}`;
                }
                if (getHash() !== target) {
                    window.location.hash = target;
                }
            });

            // 3. Sync URL -> State (Back/Forward buttons)
            window.addEventListener('hashchange', () => {
                const { tab, subtab } = parseHash(getHash());
                if (validTabs.includes(tab)) {
                    if (this.activeTab !== tab) {
                        this.activeTab = tab;
                    }
                    if (tab === 'settings') {
                        this.settingsTab = validSettingsTabs.includes(subtab) ? subtab : 'ui';
                    }
                }
            });

            // 4. Fetch version from API
            this.fetchVersion();
        },

        async fetchVersion() {
            try {
                const response = await fetch('/api/config');
                if (response.ok) {
                    const data = await response.json();
                    if (data.version) {
                        this.version = data.version;
                    }
                    // Update maxAccounts in data store
                    if (data.config && typeof data.config.maxAccounts === 'number') {
                        Alpine.store('data').maxAccounts = data.config.maxAccounts;
                    }
                }
            } catch (error) {
                console.debug('Could not fetch version:', error);
            }
        },

        // App State
        version: '1.0.0',
        activeTab: 'dashboard',
        settingsTab: 'ui',
        webuiPassword: localStorage.getItem('antigravity_webui_password') || '',

        // Auth state
        showLogin: false,
        loginPassword: '',
        loginError: '',
        loginLoading: false,

        async checkAuth() {
            try {
                const token = localStorage.getItem('ag_session_token') || '';
                const res = await fetch('/api/auth/check', {
                    headers: token ? { 'x-session-token': token } : {}
                });
                const data = await res.json();
                if (data.requiresPassword && !data.authenticated) {
                    this.showLogin = true;
                }
            } catch (_) {
                // network error — allow app to load and fail naturally
            }
        },

        async login() {
            this.loginLoading = true;
            this.loginError = '';
            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: this.loginPassword })
                });
                const data = await res.json();
                if (data.status === 'ok') {
                    if (data.token) localStorage.setItem('ag_session_token', data.token);
                    this.showLogin = false;
                    this.loginPassword = '';
                    // Trigger data refresh after login
                    if (typeof Alpine !== 'undefined') {
                        Alpine.store('data')?.fetchData?.();
                    }
                } else {
                    this.loginError = data.error || this.t('loginInvalidPassword');
                }
            } catch (_) {
                this.loginError = this.t('loginConnError');
            } finally {
                this.loginLoading = false;
            }
        },

        async logout() {
            const token = localStorage.getItem('ag_session_token');
            if (token) {
                try {
                    await fetch('/api/auth/logout', {
                        method: 'POST',
                        headers: { 'x-session-token': token }
                    });
                } catch (_) {}
                localStorage.removeItem('ag_session_token');
            }
            this.showLogin = true;
        },

        // i18n
        lang: localStorage.getItem('app_lang') || 'en',
        translations: window.translations || {},

        // Toast Messages
        toast: null,

        // OAuth Progress
        oauthProgress: {
            active: false,
            current: 0,
            max: 60,
            cancel: null
        },

        t(key, params = {}) {
            let str = this.translations[this.lang][key] || key;
            if (typeof str === 'string') {
                Object.keys(params).forEach(p => {
                    str = str.replace(`{${p}}`, params[p]);
                });
            }
            return str;
        },

        setLang(l) {
            this.lang = l;
            localStorage.setItem('app_lang', l);
        },

        showToast(message, type = 'info') {
            const id = Date.now();
            this.toast = { message, type, id };
            setTimeout(() => {
                if (this.toast && this.toast.id === id) this.toast = null;
            }, 3000);
        }
    });
});
