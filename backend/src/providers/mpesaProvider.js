/**
 * M-Pesa Payment Provider
 * Handles M-Pesa STK push payments
 */

const axios = require('axios');

// M-Pesa credentials (from environment)
const MPESA_CONFIG = {
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  initiatorName: process.env.MPESA_INITIATOR_NAME || 'testapi',
  initiatorPassword: process.env.MPESA_INITIATOR_PASSWORD,
  businessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE || '174379',
  passKey: process.env.MPESA_PASS_KEY,
  environment: process.env.MPESA_ENVIRONMENT || 'sandbox'
};

const BASE_URL = MPESA_CONFIG.environment === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

let accessToken = null;
let tokenExpiry = 0;

/**
 * Get M-Pesa access token
 */
async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    const auth = Buffer.from(
      `${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`
    ).toString('base64');

    const response = await axios.get(
      `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${auth}`
        }
      }
    );

    accessToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1 min before expiry

    console.log('M-Pesa: Access token obtained');
    return accessToken;
  } catch (error) {
    console.error('M-Pesa: Failed to get access token:', error.message);
    throw new Error('M-Pesa authentication failed');
  }
}

/**
 * Initiate STK push payment
 */
async function process({ amount, phoneNumber, transactionRef, userId }) {
  try {
    console.log(`M-Pesa: Processing payment KES ${amount} to ${phoneNumber}`);

    const token = await getAccessToken();
    
    // Format phone number (remove + and add 254)
    const formattedPhone = phoneNumber.replace(/^\+?254/, '254');

    // For MVP, simulate successful payment after 2 seconds
    // In production, integrate with real M-Pesa API
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`M-Pesa: Payment succeeded for ${transactionRef}`);
        resolve({
          success: true,
          transactionRef,
          blockchainTxId: `MPESA-${transactionRef}`,
          blockchainHash: `HASH-${Date.now()}`,
          provider: 'mpesa'
        });
      }, 2000);
    });
  } catch (error) {
    console.error('M-Pesa: Payment failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  process
};
