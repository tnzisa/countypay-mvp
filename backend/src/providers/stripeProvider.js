/**
 * Stripe Payment Provider
 * Handles card payments via Stripe
 */

// Note: Stripe SDK is loaded lazily to avoid env var issues at module load time
// For MVP, payment processing is simulated

/**
 * Process Stripe payment
 */
async function process({ amount, phoneNumber, transactionRef, userId }) {
  try {
    console.log(`Stripe: Processing payment USD ${(amount / 100).toFixed(2)} (KES ${amount})`);

    // For MVP, simulate successful payment after 1.5 seconds
    // In production, create actual Stripe payment intent
    return new Promise((resolve) => {
      setTimeout(() => {
        const stripeChargeId = `ch_test_${Date.now()}`;
        console.log(`Stripe: Payment succeeded - Charge ID: ${stripeChargeId}`);
        resolve({
          success: true,
          transactionRef,
          blockchainTxId: stripeChargeId,
          blockchainHash: `STRIPE-HASH-${Date.now()}`,
          provider: 'stripe'
        });
      }, 1500);
    });
  } catch (error) {
    console.error('Stripe: Payment failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  process
};
