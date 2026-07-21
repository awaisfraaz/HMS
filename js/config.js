const HMS_CONFIG = {
    // Base URL for the backend API.
    // Automatically detects if running locally, otherwise uses the deployed backend URL.
    API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:'
        ? 'http://localhost:3000/'
        : 'https://backend-silk-eight-15.vercel.app/'
};

// Global authenticated fetch wrapper that handles automatic silent token refreshing
async function hmsFetch(url, options = {}) {
    options.headers = options.headers || {};
    
    // Add Bearer token if present
    const token = localStorage.getItem('hms_access_token');
    if (token) {
        options.headers['Authorization'] = 'Bearer ' + token;
    }
    
    options.credentials = options.credentials || 'include';

    let response = await fetch(url, options);

    // Intercept 401 Unauthorized errors to perform a silent token refresh
    if (response.status === 401) {
        const refreshToken = localStorage.getItem('hms_refresh_token');
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
                    
                    // Update tokens in localStorage
                    localStorage.setItem('hms_access_token', refreshData.accesstoken);
                    if (refreshData.refreshtoken) {
                        localStorage.setItem('hms_refresh_token', refreshData.refreshtoken);
                    }

                    // Retry original request with the new access token
                    options.headers['Authorization'] = 'Bearer ' + refreshData.accesstoken;
                    response = await fetch(url, options);
                } else {
                    console.error("Refresh token expired or invalid. Logging out...");
                    // Logout if refresh token call fails
                    localStorage.removeItem('hms_access_token');
                    localStorage.removeItem('hms_refresh_token');
                    localStorage.removeItem('hms_current_user');
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
