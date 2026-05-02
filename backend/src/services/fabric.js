'use strict';

/**
 * Mock Hyperledger Fabric Service
 * Simulates Fabric SDK operations using in-memory storage
 */

class FabricService {
    constructor() {
        // In-memory ledger (Map acts as the blockchain ledger)
        this.ledger = new Map();
        // History tracking for each payment
        this.history = new Map();
        console.log('FABRIC LEDGER: Service initialized');
    }

    /**
     * Record a new payment to the ledger
     * @param {Object} paymentData - Payment information
     * @returns {Object} Recorded payment with paymentId and timestamp
     */
    async recordPayment(paymentData) {
        console.log('FABRIC LEDGER: Recording payment');
        
        // Generate payment ID if not provided
        const paymentId = paymentData.paymentId || `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = new Date().toISOString();
        
        const payment = {
            paymentId,
            transactionRef: paymentData.transactionRef,
            amount: parseFloat(paymentData.amount),
            countyCode: paymentData.countyCode,
            feeType: paymentData.feeType,
            phoneNumber: paymentData.phoneNumber,
            timestamp,
            status: paymentData.status || 'PENDING',
            docType: 'payment'
        };

        // Store in ledger
        this.ledger.set(paymentId, payment);

        // Add to history
        if (!this.history.has(paymentId)) {
            this.history.set(paymentId, []);
        }
        this.history.get(paymentId).push({
            txId: `TX-${Date.now()}`,
            timestamp,
            isDelete: false,
            value: { ...payment }
        });

        console.log(`FABRIC LEDGER: Payment recorded - ${paymentId}`);
        return payment;
    }

    /**
     * Query a payment by ID
     * @param {string} paymentId - Payment ID to query
     * @returns {Object} Payment data
     * @throws {Error} If payment not found
     */
    async queryPayment(paymentId) {
        console.log(`FABRIC LEDGER: Querying payment - ${paymentId}`);
        
        const payment = this.ledger.get(paymentId);
        
        if (!payment) {
            console.log(`FABRIC LEDGER: Payment not found - ${paymentId}`);
            throw new Error(`Payment ${paymentId} does not exist`);
        }

        console.log(`FABRIC LEDGER: Payment found - ${paymentId}`);
        return payment;
    }

    /**
     * Get payment history (all transactions for a payment)
     * @param {string} paymentId - Payment ID
     * @returns {Array} Array of history records
     */
    async getPaymentHistory(paymentId) {
        console.log(`FABRIC LEDGER: Getting payment history - ${paymentId}`);
        
        const paymentHistory = this.history.get(paymentId);
        
        if (!paymentHistory) {
            console.log(`FABRIC LEDGER: No history found - ${paymentId}`);
            return [];
        }

        console.log(`FABRIC LEDGER: History retrieved - ${paymentId} (${paymentHistory.length} records)`);
        return paymentHistory;
    }

    /**
     * Get all payments (utility method for testing/demo)
     * @returns {Array} All payments in the ledger
     */
    async getAllPayments() {
        console.log('FABRIC LEDGER: Getting all payments');
        return Array.from(this.ledger.values());
    }

    /**
     * Clear the ledger (utility method for testing)
     */
    async clearLedger() {
        console.log('FABRIC LEDGER: Clearing ledger');
        this.ledger.clear();
        this.history.clear();
    }
}

// Export singleton instance
const fabricService = new FabricService();
module.exports = fabricService;

// Made with Bob
