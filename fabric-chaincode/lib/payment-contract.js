'use strict';

const { Contract } = require('fabric-contract-api');

class PaymentContract extends Contract {

    async InitLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        
        const payments = [
            {
                paymentId: 'PAYMENT001',
                transactionRef: 'TXN001',
                amount: 1000.00,
                countyCode: 'KE-001',
                feeType: 'BUSINESS_PERMIT',
                phoneNumber: '+254712345678',
                timestamp: new Date().toISOString(),
                status: 'COMPLETED'
            }
        ];

        for (const payment of payments) {
            payment.docType = 'payment';
            await ctx.stub.putState(payment.paymentId, Buffer.from(JSON.stringify(payment)));
            console.info(`Added payment: ${payment.paymentId}`);
        }
        
        console.info('============= END : Initialize Ledger ===========');
    }

    async RecordPayment(ctx, paymentId, transactionRef, amount, countyCode, feeType, phoneNumber, timestamp, status) {
        console.info('============= START : Record Payment ===========');

        const payment = {
            paymentId,
            transactionRef,
            amount: parseFloat(amount),
            countyCode,
            feeType,
            phoneNumber,
            timestamp,
            status,
            docType: 'payment'
        };

        await ctx.stub.putState(paymentId, Buffer.from(JSON.stringify(payment)));
        console.info('============= END : Record Payment ===========');
        
        return JSON.stringify(payment);
    }

    async QueryPayment(ctx, paymentId) {
        console.info('============= START : Query Payment ===========');
        
        const paymentAsBytes = await ctx.stub.getState(paymentId);
        
        if (!paymentAsBytes || paymentAsBytes.length === 0) {
            throw new Error(`Payment ${paymentId} does not exist`);
        }
        
        console.info('============= END : Query Payment ===========');
        return paymentAsBytes.toString();
    }

    async GetPaymentHistory(ctx, paymentId) {
        console.info('============= START : Get Payment History ===========');
        
        const iterator = await ctx.stub.getHistoryForKey(paymentId);
        const allResults = [];
        
        let result = await iterator.next();
        
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            
            allResults.push({
                txId: result.value.txId,
                timestamp: result.value.timestamp,
                isDelete: result.value.is_delete ? result.value.is_delete.toString() : 'false',
                value: record
            });
            
            result = await iterator.next();
        }
        
        await iterator.close();
        console.info('============= END : Get Payment History ===========');
        
        return JSON.stringify(allResults);
    }

}

module.exports = PaymentContract;

// Made with Bob
