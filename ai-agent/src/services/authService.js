const axios = require('axios');
require('dotenv').config();

// In-memory token cache
let tokenCache = {
  token: null,
  expiresAt: null
};

/**
 * Login to backend and get admin JWT token
 */
async function login() {
  try {
    console.log('AI AGENT: Attempting admin login...');
    
    const response = await axios.post(
      `${process.env.BACKEND_URL}/api/auth/login`,
      {
        phone: process.env.ADMIN_PHONE,
        password: process.env.ADMIN_PASSWORD
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.token) {
      // Cache token for 23 hours (JWT typically expires in 24h)
      tokenCache.token = response.data.token;
      tokenCache.expiresAt = Date.now() + (23 * 60 * 60 * 1000);
      
      console.log('AI AGENT: Admin login successful');
      return response.data.token;
    } else {
      throw new Error('No token received from backend');
    }
  } catch (error) {
    console.error('AI AGENT: Login failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get cached token or fetch new one if expired
 */
async function getToken() {
  // Check if token exists and is not expired
  if (tokenCache.token && tokenCache.expiresAt && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  // Token expired or doesn't exist, fetch new one
  console.log('AI AGENT: Token expired or missing, fetching new token...');
  return await login();
}

/**
 * Get authorization headers for API requests
 */
async function getAuthHeaders() {
  const token = await getToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

module.exports = {
  getToken,
  getAuthHeaders,
  login
};

// Made with Bob
