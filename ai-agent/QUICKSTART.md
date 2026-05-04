# AI Agent Quick Start Guide

## Prerequisites Check

Before starting the AI Agent, ensure:

1. ✅ Backend is running on port 5000
2. ✅ PostgreSQL database is running (via Docker)
3. ✅ Node.js 18+ is installed

## Step-by-Step Startup

### 1. Start Backend (if not already running)

Open a terminal in the backend directory:

```powershell
cd backend
docker-compose up -d
npm run dev
```

Wait for:
```
Backend running on port 5000
```

### 2. Start AI Agent

Open a NEW terminal in the ai-agent directory:

```powershell
cd ai-agent
npm start
```

You should see:
```
============================================================
AI AGENT: Service started on port 8080
AI AGENT: Backend URL: http://localhost:5000
============================================================
AI AGENT: Verifying backend connectivity...
AI AGENT: ✓ Successfully connected to backend
AI AGENT: ✓ Fetched X payments
============================================================
AI AGENT: Ready to serve requests
AI AGENT: Summary endpoint: http://localhost:8080/reconciliation/summary
============================================================
```

### 3. Test the Service

Open a THIRD terminal and run:

```powershell
# Test health endpoint
Invoke-RestMethod -Uri "http://localhost:8080/health"

# Test summary endpoint
$summary = Invoke-RestMethod -Uri "http://localhost:8080/reconciliation/summary"
$summary | ConvertTo-Json -Depth 5
```

## Expected Output

### Health Check Response
```json
{
  "status": "ok",
  "service": "countypay-ai-agent",
  "version": "1.0.0",
  "timestamp": "2026-05-02T08:00:00.000Z"
}
```

### Summary Response
```json
{
  "totalCollectedToday": 0,
  "totalTransactions": 0,
  "completedTransactions": 0,
  "pendingTransactions": 0,
  "byFeeType": {},
  "byCounty": {},
  "anomalies": [],
  "anomalyCount": 0,
  "lastUpdated": "2026-05-02T08:00:00.000Z"
}
```

*Note: If backend has no transactions yet, all values will be 0/empty.*

## Troubleshooting

### Problem: "Failed to connect to backend"

**Solution:**
1. Check if backend is running: `http://localhost:5000/health`
2. Verify `.env` file has correct `BACKEND_URL`
3. Check backend logs for errors

### Problem: "Login failed"

**Solution:**
1. Verify admin credentials in `.env`:
   - `ADMIN_PHONE=254700000000`
   - `ADMIN_PASSWORD=admin123`
2. Check if admin user exists in backend database
3. Try logging in manually via backend API

### Problem: Port 8080 already in use

**Solution:**
1. Change `PORT` in `.env` to another port (e.g., 8081)
2. Update frontend to call new port
3. Restart the service

## Creating Test Data

To see the AI Agent in action, create some test payments:

```powershell
# Login as test user
$login = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"phone":"254712345678","password":"user123"}'
$token = $login.token

# Get available fees
$counties = Invoke-RestMethod -Uri "http://localhost:5000/api/counties"
$feeId = $counties[0].fees[0].id

# Create a payment
$payment = Invoke-RestMethod -Uri "http://localhost:5000/api/payments" -Method POST -Headers @{Authorization="Bearer $token"} -ContentType "application/json" -Body "{`"feeId`":`"$feeId`",`"phoneNumber`":`"254712345678`",`"paymentMethod`":`"stripe`"}"

# Wait 2 seconds for processing
Start-Sleep -Seconds 2

# Check AI Agent summary
$summary = Invoke-RestMethod -Uri "http://localhost:8080/reconciliation/summary"
$summary | ConvertTo-Json -Depth 5
```

## Next Steps

1. ✅ Service is running
2. ✅ Backend connectivity verified
3. ✅ Summary endpoint tested
4. 🔄 Share URL with Frontend Developer: `http://localhost:8080/reconciliation/summary`
5. 🔄 Test with real payment data
6. 🔄 Verify anomaly detection works

## Integration with Frontend

Tell Person 4 (Frontend Developer) to:

1. Poll this endpoint every 30 seconds:
   ```
   GET http://localhost:8080/reconciliation/summary
   ```

2. Use the response to populate:
   - KPI cards (totalCollectedToday, totalTransactions, etc.)
   - Revenue chart (byFeeType data)
   - Anomaly panel (anomalies array)

## Demo Preparation

Before the demo:

1. ✅ Ensure backend has sample transactions
2. ✅ Verify anomaly detection is working
3. ✅ Test the complete flow end-to-end
4. ✅ Prepare your speaking points (see README.md)

## Stopping the Service

Press `Ctrl+C` in the terminal where the service is running.

The service will shut down gracefully:
```
AI AGENT: Shutting down gracefully...
```

---

**Need help?** Check the full README.md or create a GitHub issue.