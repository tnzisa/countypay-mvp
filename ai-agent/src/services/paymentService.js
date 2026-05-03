const axios = require('axios');
const { getAuthHeaders } = require('./authService');
require('dotenv').config();

/**
 * Fetch all payment transactions from backend (admin endpoint)
 */
async function getAllPayments() {
  try {
    const headers = await getAuthHeaders();
    
    const response = await axios.get(
      `${process.env.BACKEND_URL}/api/payments/admin/all?limit=1000`,
      { headers }
    );

    const payments = response.data.transactions || [];
    console.log(`AI AGENT: Fetched ${payments.length} payments from backend`);
    
    return payments;
  } catch (error) {
    console.error('AI AGENT: Failed to fetch payments:', error.response?.data || error.message);
    // Return empty array on failure for graceful degradation
    return [];
  }
}

/**
 * Get payments filtered by county code
 */
async function getPaymentsByCounty(countyCode) {
  try {
    const allPayments = await getAllPayments();
    
    const filtered = allPayments.filter(payment => 
      payment.fee?.county?.code === countyCode
    );
    
    console.log(`AI AGENT: Filtered ${filtered.length} payments for county ${countyCode}`);
    return filtered;
  } catch (error) {
    console.error('AI AGENT: Failed to filter payments by county:', error.message);
    return [];
  }
}

/**
 * Get payments created today
 */
function getPaymentsToday(payments) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return payments.filter(payment => {
    const paymentDate = new Date(payment.createdAt);
    paymentDate.setHours(0, 0, 0, 0);
    return paymentDate.getTime() === today.getTime();
  });
}

module.exports = {
  getAllPayments,
  getPaymentsByCounty,
  getPaymentsToday
};

// Made with Bob
