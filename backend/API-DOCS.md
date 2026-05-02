# CountyPay API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## Endpoints

### Authentication

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "phone": "254712345678",
  "name": "John Doe",
  "password": "password123",
  "email": "john@example.com"  // optional
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "phone": "254712345678",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "citizen"
  }
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "phone": "254712345678",
  "password": "password123"
}
```

**Response:** Same as register

#### Get Current User Profile
```http
GET /auth/me
Authorization: Bearer TOKEN
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "phone": "254712345678",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "citizen",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### Counties & Fees

#### Get All Counties
```http
GET /counties
```

**Response:**
```json
{
  "counties": [
    {
      "id": "uuid",
      "name": "Nairobi County",
      "code": "NRB",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "fees": [...]
    }
  ]
}
```

#### Get Single County
```http
GET /counties/:id
```

#### Get Fees for County
```http
GET /counties/:id/fees
```

**Response:**
```json
{
  "fees": [
    {
      "id": "uuid",
      "name": "Business Permit",
      "description": "Annual business permit fee",
      "amount": 5000,
      "countyId": "uuid",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "county": {...}
    }
  ]
}
```

#### Create County (Admin Only)
```http
POST /counties
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "name": "Machakos County",
  "code": "MCH"
}
```

#### Create Fee (Admin Only)
```http
POST /counties/:id/fees
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "name": "Water Connection Fee",
  "description": "New water connection fee",
  "amount": 3000
}
```

---

### Payments

#### Create Payment
```http
POST /payments
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "feeId": "uuid",
  "phoneNumber": "254712345678",
  "paymentMethod": "mpesa"  // mpesa, ussd, card
}
```

**Response:**
```json
{
  "transaction": {
    "id": "uuid",
    "amount": 5000,
    "status": "pending",
    "paymentMethod": "mpesa",
    "phoneNumber": "254712345678",
    "transactionRef": "CP1234567890ABC",
    "blockchainTxId": null,
    "blockchainHash": null,
    "userId": "uuid",
    "feeId": "uuid",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "fee": {...},
    "user": {...}
  },
  "message": "Payment initiated successfully. Processing..."
}
```

#### Get My Transactions
```http
GET /payments/my-transactions?status=completed&limit=50
Authorization: Bearer TOKEN
```

**Query Parameters:**
- `status` (optional): Filter by status (pending, completed, failed)
- `limit` (optional): Number of transactions to return (default: 50)

#### Get Transaction by ID
```http
GET /payments/:id
Authorization: Bearer TOKEN
```

#### Get Transaction by Reference
```http
GET /payments/ref/:ref
Authorization: Bearer TOKEN
```

#### Get All Transactions (Admin Only)
```http
GET /payments/admin/all?status=completed&limit=100&offset=0
Authorization: Bearer ADMIN_TOKEN
```

---

### Blockchain

#### Verify Transaction on Blockchain
```http
GET /blockchain/verify/:blockchainTxId
Authorization: Bearer TOKEN
```

**Response:**
```json
{
  "verified": true,
  "ledger": 12345,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "hash": "abc123...",
  "successful": true
}
```

#### Get Blockchain Details for Transaction
```http
GET /blockchain/transaction/:transactionId
Authorization: Bearer TOKEN
```

**Response:**
```json
{
  "transaction": {...},
  "blockchain": {
    "recorded": true,
    "txId": "stellar-tx-id",
    "hash": "abc123...",
    "verification": {...},
    "explorerUrl": "https://stellar.expert/explorer/testnet/tx/..."
  }
}
```

#### Get Blockchain Explorer URL
```http
GET /blockchain/explorer/:blockchainTxId
```

---

## Test Credentials

After running the seed script, you have:

**Regular User:**
- Phone: `254712345678`
- Password: `user123`
- Role: `citizen`

**Admin User:**
- Phone: `254700000000`
- Password: `admin123`
- Role: `admin`

---

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Payment Flow

1. **User logs in** → Get JWT token
2. **Get counties** → Display list
3. **Get fees for selected county** → Display fees
4. **Create payment** → Returns transaction with `pending` status
5. **Wait 2-3 seconds** → Payment processes automatically
6. **Get transaction details** → Status changes to `completed`
7. **Verify on blockchain** → Check blockchain record

---

## Integration Notes

### For Frontend Team
- Store JWT token in localStorage or sessionStorage
- Add token to all authenticated requests
- Handle 401 errors by redirecting to login
- Poll transaction status every 2 seconds after payment creation

### For USSD Team
- Use same payment endpoints
- Transaction reference format: `CP{timestamp}{random}`
- Status can be checked via GET `/payments/ref/:ref`

### For Mobile Team
- All endpoints support JSON
- Use standard HTTP methods
- CORS is enabled for all origins in development

---

## Testing

Run the automated test script:
```powershell
.\test-endpoints.ps1
```

Or use the REST Client file:
```
test-api.http
```

---

## Support

For questions or issues:
1. Check the console logs
2. Verify JWT token is valid
3. Ensure database is running
4. Check Stellar account is funded (for blockchain)

**Backend Developer:** [Your Name]
**Last Updated:** 2024-05-01