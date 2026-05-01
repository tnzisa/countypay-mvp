# CountyPay Backend - Quick Start Guide

## Prerequisites
- Node.js installed
- PostgreSQL running (Docker or local)
- Git for version control

## Step-by-Step Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Stellar Testnet Account (Important!)

**Option A: Generate New Account**
```bash
# Visit: https://laboratory.stellar.org/#account-creator?network=test
# 1. Click "Generate keypair"
# 2. Copy the Secret Key
# 3. Click "Get test network lumens" to fund the account
```

**Option B: Use Existing Testnet Account**
If you already have a funded Stellar testnet account, use its secret key.

**Add to .env:**
```env
STELLAR_SECRET=YOUR_SECRET_KEY_HERE
```

### 3. Setup Database & Seed Data
```bash
# This single command will:
# - Generate Prisma client
# - Run database migrations
# - Seed initial data (counties, fees, test users)
npm run setup
```

### 4. Start the Server
```bash
npm run dev
```

Server will start at: http://localhost:5000

### 5. Test the API

**Health Check:**
```bash
curl http://localhost:5000/health
```

**Login with Test User:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"254712345678","password":"user123"}'
```

Copy the `token` from the response.

**Get Counties:**
```bash
curl http://localhost:5000/api/counties
```

**Make a Payment:**
```bash
curl -X POST http://localhost:5000/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "feeId": "FEE_ID_FROM_COUNTIES_RESPONSE",
    "phoneNumber": "254712345678",
    "paymentMethod": "mpesa"
  }'
```

## Test Credentials

After running `npm run setup`, you'll have:

**Admin User:**
- Phone: `254700000000`
- Password: `admin123`
- Role: admin

**Regular User:**
- Phone: `254712345678`
- Password: `user123`
- Role: citizen

## Available Counties & Fees

The seed script creates:
- 5 Counties (Nairobi, Mombasa, Kisumu, Nakuru, Kiambu)
- 5 Fee types per county:
  - Business Permit (KES 5,000)
  - Parking Fee (KES 200)
  - Land Rates (KES 15,000)
  - Market Stall Fee (KES 1,500)
  - Building Permit (KES 25,000)

## Useful Commands

```bash
# Development
npm run dev                 # Start server
npm run prisma:studio       # Open Prisma Studio (database GUI)

# Database
npm run prisma:generate     # Generate Prisma client
npm run prisma:migrate      # Run migrations
npm run prisma:seed         # Seed database

# Complete setup
npm run setup               # Generate + Migrate + Seed
```

## Testing Payment Flow

1. **Login** to get JWT token
2. **Get Counties** to see available counties
3. **Get Fees** for a specific county
4. **Create Payment** with a fee ID
5. **Check Transaction** status (auto-completes in 2 seconds)
6. **Verify on Blockchain** using the blockchain API

## Blockchain Verification

After a payment is completed:

```bash
# Get transaction details with blockchain info
curl http://localhost:5000/api/blockchain/transaction/TRANSACTION_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Verify directly on Stellar
curl http://localhost:5000/api/blockchain/verify/BLOCKCHAIN_TX_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### "Port 5000 already in use"
```bash
# Change port in .env
PORT=5001
```

### "Database connection failed"
```bash
# Check if PostgreSQL is running
# Update DATABASE_URL in .env if needed
```

### "Stellar account not funded"
```bash
# Visit: https://laboratory.stellar.org/#account-creator?network=test
# Fund your account with test lumens
```

### "Prisma Client not generated"
```bash
npm run prisma:generate
```

## Next Steps

1. ✅ Backend is running
2. 🔄 Share API documentation with frontend team
3. 🔄 Test all endpoints with Postman/Thunder Client
4. 🔄 Integrate with frontend
5. 🔄 Add real M-Pesa integration
6. 🔄 Connect USSD service

## API Documentation

Full API documentation is available in `README.md`

## Team Collaboration

**For Frontend Team:**
- Base URL: `http://localhost:5000/api`
- All endpoints documented in `README.md`
- JWT token required for protected routes (add as `Authorization: Bearer TOKEN`)

**For USSD Team:**
- Use the same payment endpoints
- Transaction reference format: `CP{timestamp}{random}`
- Status updates via webhook (to be implemented)

**For DevOps Team:**
- Docker Compose configuration needed
- Environment variables in `.env`
- PostgreSQL database required

## Support

If you encounter issues:
1. Check the console logs
2. Verify all environment variables
3. Ensure database is accessible
4. Confirm Stellar account is funded

Happy coding! 🚀