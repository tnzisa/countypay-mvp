# CountyPay Backend API

Backend service for CountyPay - A unified digital revenue collection platform with blockchain integration.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Blockchain:** Stellar (Testnet)
- **Authentication:** JWT

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

The `.env` file is already configured with:
- Database connection string
- JWT secret
- Stellar network settings
- Port configuration

### 3. Setup Database

Make sure PostgreSQL is running (via Docker or locally), then:

```bash
# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio to view/edit data
npm run prisma:studio
```

### 4. Setup Stellar Testnet Account

1. Visit https://laboratory.stellar.org/#account-creator?network=test
2. Click "Generate keypair" to create a new account
3. Fund the account using the "Get test network lumens" button
4. Copy the **Secret Key** and add it to `.env`:
   ```
   STELLAR_SECRET=YOUR_SECRET_KEY_HERE
   ```

### 5. Start the Server

```bash
npm run dev
```

The server will start on http://localhost:5000

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile

### Counties & Fees
- `GET /api/counties` - Get all counties
- `GET /api/counties/:id` - Get single county
- `GET /api/counties/:id/fees` - Get fees for a county
- `POST /api/counties` - Create county (Admin only)
- `POST /api/counties/:id/fees` - Create fee (Admin only)

### Payments
- `POST /api/payments` - Create new payment
- `GET /api/payments/my-transactions` - Get user's transactions
- `GET /api/payments/:id` - Get transaction by ID
- `GET /api/payments/ref/:ref` - Get transaction by reference
- `GET /api/payments/admin/all` - Get all transactions (Admin only)

### Blockchain
- `GET /api/blockchain/verify/:txId` - Verify transaction on blockchain
- `GET /api/blockchain/transaction/:transactionId` - Get blockchain details
- `GET /api/blockchain/explorer/:txId` - Get explorer URL

## Testing with Postman/Thunder Client

### 1. Register a User
```http
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "phone": "254712345678",
  "name": "John Doe",
  "password": "password123",
  "email": "john@example.com"
}
```

### 2. Login
```http
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "phone": "254712345678",
  "password": "password123"
}
```

Copy the `token` from the response.

### 3. Create a County (Admin)
First, manually update a user's role to 'admin' in the database, then:

```http
POST http://localhost:5000/api/counties
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "name": "Nairobi County",
  "code": "NRB"
}
```

### 4. Create a Fee
```http
POST http://localhost:5000/api/counties/COUNTY_ID/fees
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "name": "Business Permit",
  "description": "Annual business permit fee",
  "amount": 5000
}
```

### 5. Make a Payment
```http
POST http://localhost:5000/api/payments
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "feeId": "FEE_ID_HERE",
  "phoneNumber": "254712345678",
  "paymentMethod": "mpesa"
}
```

## Database Schema

### User
- id, phone, name, email, password, role, createdAt

### County
- id, name, code, createdAt

### Fee
- id, name, description, amount, countyId, createdAt

### Transaction
- id, amount, status, paymentMethod, phoneNumber, transactionRef
- blockchainTxId, blockchainHash, userId, feeId
- createdAt, updatedAt

## Blockchain Integration

Transactions are automatically recorded on the Stellar testnet blockchain:
- Each payment creates a blockchain record
- Transaction data is stored using Stellar's `manageData` operation
- Blockchain transaction IDs are stored in the database
- Verification can be done via the API or Stellar Explorer

## Development Notes

- Payment processing is simulated (2-second delay)
- In production, integrate with actual payment gateways (M-Pesa, etc.)
- Blockchain recording happens asynchronously
- Failed blockchain records don't prevent payment completion

## Next Steps

1. ✅ Setup database and run migrations
2. ✅ Generate Stellar keypair and fund it
3. ✅ Test all API endpoints
4. 🔄 Integrate with frontend
5. 🔄 Add M-Pesa integration
6. 🔄 Add USSD service integration

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Run `npm run prisma:migrate` again

### Blockchain Issues
- Ensure Stellar account is funded
- Check STELLAR_SECRET in .env
- Verify network connectivity

### Port Already in Use
- Change PORT in .env
- Or kill the process using port 5000

## Team Integration

Share this API documentation with:
- **Frontend Team:** For API endpoint integration
- **USSD Team:** For payment processing flow
- **DevOps Team:** For deployment configuration