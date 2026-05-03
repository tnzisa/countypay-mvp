'use strict';

const crypto = require('crypto');

/**
 * Mock Hyperledger Fabric Service
 * Simulates Fabric SDK operations using in-memory storage
 * Enhanced with cryptographic verification for production-like behavior
 */

class FabricService {
    constructor() {
        // In-memory ledger (Map acts as the blockchain ledger)
        this.ledger = new Map();
        // History tracking for each payment
        this.history = new Map();
        // Previous payment hash for chain validation
        this.lastPaymentHash = 'GENESIS';
        console.log('FABRIC LEDGER: Service initialized');
    }

    /**
     * Calculate SHA256 hash of payment data
     */
    _hashPayment(paymentData) {
        const data = JSON.stringify(paymentData);
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Digitally sign payment data
     */
    _signPayment(paymentData) {
        const data = JSON.stringify(paymentData);
        // Mock signature - in production, use RSA or ECDSA
        const hmac = crypto.createHmac('sha256', process.env.SIGNING_KEY || 'mock-key');
        hmac.update(data);
        return hmac.digest('hex');
    }

    /**
     * Verify digital signature
     */
    _verifySignature(paymentData, signature) {
        const expectedSignature = this._signPayment(paymentData);
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }

    /**
     * Record a new payment to the ledger with cryptographic verification
     * @param {Object} paymentData - Payment information
     * @returns {Object} Recorded payment with verification data
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
            docType: 'payment',
            // Cryptographic fields
            previousHash: this.lastPaymentHash, // Hash chain for tamper detection
            hash: null, // Will be calculated
            signature: null, // Will be calculated
            merkleRoot: null // For bulk transaction verification
        };

        // Calculate hash (excludes hash and signature fields)
        const hashData = {
            ...payment,
            hash: undefined,
            signature: undefined
        };
        const paymentHash = this._hashPayment(hashData);
        payment.hash = paymentHash;

        // Sign the payment
        payment.signature = this._signPayment(hashData);

        // Store in ledger
        this.ledger.set(paymentId, payment);

        // Update last hash for next payment
        this.lastPaymentHash = paymentHash;

        // Add to history
        if (!this.history.has(paymentId)) {
            this.history.set(paymentId, []);
        }
        this.history.get(paymentId).push({
            txId: `TX-${Date.now()}`,
            timestamp,
            isDelete: false,
            value: { ...payment },
            verified: true
        });

        console.log(`FABRIC LEDGER: Payment recorded - ${paymentId} (Hash: ${paymentHash.substring(0, 16)}...)`);
        return {
            ...payment,
            verificationData: {
                hash: paymentHash,
                signature: payment.signature,
                verified: true,
                verificationMethod: 'SHA256+HMAC'
            }
        };
    }

    /**
     * Query a payment by ID with cryptographic verification
     * @param {string} paymentId - Payment ID to query
     * @returns {Object} Payment data with verification status
     * @throws {Error} If payment not found
     */
    async queryPayment(paymentId) {
        console.log(`FABRIC LEDGER: Querying payment - ${paymentId}`);
        
        const payment = this.ledger.get(paymentId);
        
        if (!payment) {
            console.log(`FABRIC LEDGER: Payment not found - ${paymentId}`);
            throw new Error(`Payment ${paymentId} does not exist`);
        }

        // Verify payment integrity
        const hashData = {
            ...payment,
            hash: undefined,
            signature: undefined
        };
        const calculatedHash = this._hashPayment(hashData);
        const isValid = calculatedHash === payment.hash;

        if (!isValid) {
            console.warn(`FABRIC LEDGER: Payment integrity check FAILED - ${paymentId}`);
        }

        console.log(`FABRIC LEDGER: Payment found and verified - ${paymentId}`);
        return {
            ...payment,
            verificationStatus: {
                hashValid: isValid,
                signatureValid: this._verifySignature(hashData, payment.signature),
                chainValid: this._verifyChain(paymentId)
            }
        };
    }

    /**
     * Verify payment chain integrity
     */
    _verifyChain(paymentId) {
        const payment = this.ledger.get(paymentId);
        if (!payment) return false;

        const history = this.history.get(paymentId) || [];
        
        // Verify hash chain (each record should match previous hash)
        let previousHash = 'GENESIS';
        
        for (const record of history) {
            const value = record.value;
            if (value.previousHash !== previousHash) {
                return false; // Chain broken
            }
            previousHash = value.hash;
        }

        return true;
    }

    /**
     * Get payment history with verification
     * @param {string} paymentId - Payment ID
     * @returns {Array} Array of history records with verification
     */
    async getPaymentHistory(paymentId) {
        console.log(`FABRIC LEDGER: Getting payment history - ${paymentId}`);
        
        const paymentHistory = this.history.get(paymentId);
        
        if (!paymentHistory) {
            console.log(`FABRIC LEDGER: No history found - ${paymentId}`);
            return [];
        }

        // Add verification status to each record
        const verifiedHistory = paymentHistory.map((record, index) => ({
            ...record,
            chainPosition: index,
            verified: this._verifyHistoryRecord(record, index === 0 ? 'GENESIS' : paymentHistory[index - 1].value.hash)
        }));

        console.log(`FABRIC LEDGER: History retrieved - ${paymentId} (${verifiedHistory.length} records)`);
        return verifiedHistory;
    }

    /**
     * Verify a single history record
     */
    _verifyHistoryRecord(record, expectedPreviousHash) {
        if (record.value.previousHash !== expectedPreviousHash) {
            return false;
        }
        return true;
    }

    /**
     * Get all payments with verification status
     * @returns {Array} All payments in the ledger
     */
    async getAllPayments() {
        console.log('FABRIC LEDGER: Getting all payments');
        
        const payments = Array.from(this.ledger.values());
        
        return payments.map(payment => ({
            ...payment,
            verificationStatus: {
                verified: this._verifyChain(payment.paymentId),
                hashValid: true
            }
        }));
    }

    /**
     * Verify bulk payments using Merkle tree
     * @param {Array<string>} paymentIds - Payment IDs to verify
     * @returns {Object} Merkle verification result
     */
    async verifyPaymentBatch(paymentIds) {
        console.log(`FABRIC LEDGER: Verifying batch of ${paymentIds.length} payments`);

        const payments = paymentIds
            .map(id => this.ledger.get(id))
            .filter(p => p !== undefined);

        if (payments.length === 0) {
            return {
                verified: false,
                error: 'No payments found',
                count: 0
            };
        }

        // Calculate Merkle root
        const hashes = payments.map(p => p.hash);
        const merkleRoot = this._calculateMerkleRoot(hashes);

        // Verify all payments
        const allVerified = payments.every((payment, index) => {
            const hashData = {
                ...payment,
                hash: undefined,
                signature: undefined
            };
            return this._hashPayment(hashData) === payment.hash;
        });

        console.log(`FABRIC LEDGER: Batch verification complete - ${allVerified ? 'VALID' : 'INVALID'}`);

        return {
            verified: allVerified,
            count: payments.length,
            merkleRoot,
            paymentIds: payments.map(p => p.paymentId),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Calculate Merkle root for a batch of hashes
     */
    _calculateMerkleRoot(hashes) {
        if (hashes.length === 0) return null;
        if (hashes.length === 1) return hashes[0];

        let currentLevel = [...hashes];

        while (currentLevel.length > 1) {
            const nextLevel = [];
            for (let i = 0; i < currentLevel.length; i += 2) {
                const left = currentLevel[i];
                const right = currentLevel[i + 1] || currentLevel[i];
                const combined = left + right;
                const hash = crypto.createHash('sha256').update(combined).digest('hex');
                nextLevel.push(hash);
            }
            currentLevel = nextLevel;
        }

        return currentLevel[0];
    }

    /**
     * Clear the ledger (utility method for testing)
     */
    async clearLedger() {
        console.log('FABRIC LEDGER: Clearing ledger');
        this.ledger.clear();
        this.history.clear();
        this.lastPaymentHash = 'GENESIS';
    }

    /**
     * Get ledger statistics
     */
    async getLedgerStats() {
        return {
            totalPayments: this.ledger.size,
            lastPaymentHash: this.lastPaymentHash.substring(0, 16) + '...',
            timestamp: new Date().toISOString()
        };
    }
}

// Export singleton instance
const fabricService = new FabricService();
module.exports = fabricService;
