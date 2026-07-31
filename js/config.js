const HMS_CONFIG = {
    // Base URL for the backend API.
    // Automatically detects if running locally, otherwise uses the deployed backend URL.
    API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:'
        ? 'http://localhost:3000/'
        : 'https://hms-backend-jet-six.vercel.app/'
};

// Session storage helper replacing localStorage reliance
const HMS_SESSION = {
    getAccessToken: () => sessionStorage.getItem('hms_access_token') || localStorage.getItem('hms_access_token'),
    getRefreshToken: () => sessionStorage.getItem('hms_refresh_token') || localStorage.getItem('hms_refresh_token'),
    getCurrentUser: () => {
        try {
            const raw = sessionStorage.getItem('hms_current_user') || localStorage.getItem('hms_current_user');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    },
    setUserSession: (user, accessToken, refreshToken) => {
        if (user) {
            sessionStorage.setItem('hms_current_user', JSON.stringify(user));
            localStorage.setItem('hms_current_user', JSON.stringify(user));
        }
        if (accessToken) {
            sessionStorage.setItem('hms_access_token', accessToken);
            localStorage.setItem('hms_access_token', accessToken);
        }
        if (refreshToken) {
            sessionStorage.setItem('hms_refresh_token', refreshToken);
            localStorage.setItem('hms_refresh_token', refreshToken);
        }
    },
    clearSession: () => {
        sessionStorage.removeItem('hms_access_token');
        sessionStorage.removeItem('hms_refresh_token');
        sessionStorage.removeItem('hms_current_user');
        localStorage.removeItem('hms_access_token');
        localStorage.removeItem('hms_refresh_token');
        localStorage.removeItem('hms_current_user');
    }
};
window.HMS_SESSION = HMS_SESSION;

// Automatically extract tokens from OAuth redirect URL query string if present
(function handleOAuthRedirectTokens() {
    try {
        const params = new URLSearchParams(window.location.search);
        const accessToken = params.get('accesstoken');
        const refreshToken = params.get('refreshtoken');

        if (accessToken || refreshToken) {
            HMS_SESSION.setUserSession(null, accessToken, refreshToken);
        }

        // Clean token parameters from browser address bar while preserving other parameters
        if (accessToken || refreshToken) {
            params.delete('accesstoken');
            params.delete('refreshtoken');
            const remainingSearch = params.toString() ? '?' + params.toString() : '';
            const cleanUrl = window.location.pathname + remainingSearch;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    } catch (e) {
        console.error("Error processing OAuth redirect tokens:", e);
    }
})();

// Global authenticated fetch wrapper that handles automatic silent token refreshing
async function hmsFetch(url, options = {}) {
    options.headers = options.headers || {};
    
    // Add Bearer token if present
    const token = HMS_SESSION.getAccessToken();
    if (token) {
        options.headers['Authorization'] = 'Bearer ' + token;
    }
    
    options.credentials = options.credentials || 'include';

    let response = await fetch(url, options);

    // Intercept 401 Unauthorized errors to perform a silent token refresh
    if (response.status === 401) {
        const refreshToken = HMS_SESSION.getRefreshToken();
        if (refreshToken) {
            console.warn("Access token expired or unauthorized. Attempting silent token refresh...");
            try {
                const refreshResponse = await fetch(`${HMS_CONFIG.API_BASE_URL}api/v1/user/refreshtoken`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({ refreshtoken: refreshToken })
                });

                if (refreshResponse.ok) {
                    const refreshData = await refreshResponse.json();
                    console.log("Token refreshed successfully.");
                    
                    HMS_SESSION.setUserSession(refreshData.user, refreshData.accesstoken, refreshData.refreshtoken);

                    // Retry original request with the new access token
                    options.headers['Authorization'] = 'Bearer ' + refreshData.accesstoken;
                    response = await fetch(url, options);
                } else {
                    console.error("Refresh token expired or invalid. Logging out...");
                    HMS_SESSION.clearSession();
                    window.location.href = 'login-onboarding.html';
                }
            } catch (err) {
                console.error("Error during silent token refresh:", err);
            }
        }
    }

    return response;
}

window.hmsFetch = hmsFetch;

