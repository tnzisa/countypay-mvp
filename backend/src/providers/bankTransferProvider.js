/**
 * Bank Transfer Payment Provider
 * Handles bank transfer payments
 */

/**
 * Process bank transfer payment
 */
async function process({ amount, phoneNumber, transactionRef, userId }) {
  try {
    console.log(`Bank Transfer: Processing payment KES ${amount}`);

    // For MVP, simulate bank transfer taking longer (10 seconds for demo)
    // In production, integrate with bank APIs or payment aggregators
    return new Promise((resolve) => {
      setTimeout(() => {
        const bankRef = `BANK-${Date.now()}`;
        console.log(`Bank Transfer: Payment initiated - Reference: ${bankRef}`);
        resolve({
          success: true,
          transactionRef,
          blockchainTxId: bankRef,
          blockchainHash: `BANK-HASH-${Date.now()}`,
          provider: 'bank_transfer'
        });
      }, 10000);
    });
  } catch (error) {
    console.error('Bank Transfer: Payment failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  process
};
