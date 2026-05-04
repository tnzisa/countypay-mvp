const StellarSdk = require('stellar-sdk');

// Use testnet for MVP
const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
const networkPassphrase = StellarSdk.Networks.TESTNET;

// IMPORTANT: Generate your own keypair for production!
// To generate: const keypair = StellarSdk.Keypair.random();
// console.log('Public Key:', keypair.publicKey());
// console.log('Secret Key:', keypair.secret());
// Store the secret in .env as STELLAR_SECRET

const SOURCE_SECRET = process.env.STELLAR_SECRET;

if (!SOURCE_SECRET) {
  console.warn('WARNING: STELLAR_SECRET not set in environment. Blockchain recording disabled.');
}

let sourceKeypair;
try {
  sourceKeypair = StellarSdk.Keypair.fromSecret(SOURCE_SECRET);
} catch (error) {
  console.error('Invalid Stellar secret key. Please set STELLAR_SECRET in .env');
}

/**
 * Record a transaction on the Stellar blockchain
 * @param {string} transactionId - The database transaction ID
 * @returns {Promise<Object>} Blockchain transaction details
 */
async function recordOnBlockchain(transactionId) {
  try {
    const { prisma } = require('../lib/prisma');
    
    // Get transaction details from database
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        fee: { include: { county: true } },
        user: true
      }
    });
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    // Load source account from Stellar network
    const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());
    
    // Create transaction data as memo (Stellar has 64 byte limit for manage_data)
    const txData = JSON.stringify({
      ref: transaction.transactionRef,
      amt: transaction.amount,
      county: transaction.fee.county.code,
      fee: transaction.fee.name.substring(0, 20),
      ts: new Date().toISOString()
    });
    
    // Build Stellar transaction
    const stellarTx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase
    })
      .addOperation(
        StellarSdk.Operation.manageData({
          name: `cp_${transaction.transactionRef.substring(0, 50)}`,
          value: txData.substring(0, 64) // Stellar data value limit
        })
      )
      .setTimeout(30)
      .build();
    
    // Sign transaction
    stellarTx.sign(sourceKeypair);
    
    // Submit to Stellar network
    const result = await server.submitTransaction(stellarTx);
    
    console.log('Blockchain transaction recorded:', {
      id: result.id,
      hash: result.hash,
      ledger: result.ledger
    });
    
    return {
      txId: result.id,
      hash: result.hash,
      ledger: result.ledger,
      success: true
    };
  } catch (error) {
    console.error('Blockchain recording failed:', error);
    
    // Return error details but don't throw - payment can still succeed
    return {
      success: false,
      error: error.message,
      txId: null,
      hash: null
    };
  }
}

/**
 * Verify a transaction exists on the blockchain
 * @param {string} blockchainTxId - The Stellar transaction ID
 * @returns {Promise<Object>} Verification result
 */
async function verifyOnBlockchain(blockchainTxId) {
  try {
    const transaction = await server.transactions()
      .transaction(blockchainTxId)
      .call();
    
    return {
      verified: true,
      ledger: transaction.ledger_attr,
      createdAt: transaction.created_at,
      hash: transaction.hash,
      successful: transaction.successful
    };
  } catch (error) {
    console.error('Blockchain verification failed:', error);
    return { 
      verified: false, 
      error: error.message 
    };
  }
}

/**
 * Get blockchain explorer URL for a transaction
 * @param {string} txId - The Stellar transaction ID
 * @returns {string} Explorer URL
 */
function getExplorerUrl(txId) {
  return `https://stellar.expert/explorer/testnet/tx/${txId}`;
}

module.exports = { 
  recordOnBlockchain, 
  verifyOnBlockchain,
  getExplorerUrl
};

// Made with Bob
